"use client";

import React from 'react';
import {
  Code2,
  Columns2,
  Heading as HeadingIcon,
  Image as ImageIcon,
  Minus,
  MousePointerClick,
  MoveVertical,
  Type,
  type LucideIcon,
} from 'lucide-react';
import {
  DEFAULT_BUTTON,
  DEFAULT_COLUMNS,
  DEFAULT_EMBED,
  DEFAULT_HEADING,
  DEFAULT_IMAGE,
  DEFAULT_RICH_TEXT,
  DEFAULT_SEPARATOR,
  DEFAULT_SPACER,
  NESTABLE_TYPES,
} from './blockDefs';
import {
  ButtonBlock,
  ColumnsBlock,
  EmbedBlock,
  HeadingBlock,
  ImageBlock,
  RichTextBlock,
  SeparatorBlock,
  SpacerBlock,
} from './BlockRenderers';
import {
  ButtonEditor,
  ColumnsEditor,
  EmbedEditor,
  HeadingEditor,
  ImageEditor,
  RichTextEditor,
  SeparatorEditor,
  SpacerEditor,
} from './BlockEditors';

/**
 * REGISTRE DES BLOCS.
 *
 * Ajouter un type de bloc = ajouter une entrée ici. Le menu d'ajout, le rendu,
 * l'éditeur, les valeurs par défaut et le nettoyage des médias en découlent
 * tous automatiquement — il n'y a aucun `switch` de rendu à mettre à jour
 * ailleurs, contrairement aux blocs historiques des *PageClient.
 */

export type BlockCategory = 'contenu' | 'media' | 'mise-en-page' | 'action';

export type BlockDefinition<T = any> = {
  type: string;
  label: string;
  description: string;
  icon: LucideIcon;
  category: BlockCategory;
  defaults: T;
  Render: React.ComponentType<any>;
  Editor: React.ComponentType<any>;
  /** Ressources de stockage à supprimer avec le bloc. */
  storagePaths?: (data: T) => string[];
  /** Normalise / migre une donnée brute venant de la base. */
  migrate?: (raw: any) => T;
  /** Autorisé à l'intérieur d'une colonne. */
  nestable: boolean;
};

export const BLOCK_CATEGORIES: { id: BlockCategory; label: string }[] = [
  { id: 'contenu', label: 'Contenu' },
  { id: 'media', label: 'Média' },
  { id: 'mise-en-page', label: 'Mise en page' },
  { id: 'action', label: 'Action' },
];

/** Complète une donnée brute avec les valeurs par défaut du bloc. */
function withDefaults<T>(defaults: T) {
  return (raw: any): T => ({ ...(defaults as any), ...(raw || {}) });
}

export const BLOCK_REGISTRY: Record<string, BlockDefinition> = {
  heading: {
    type: 'heading',
    label: 'Titre',
    description: 'Titre avec sur-titre facultatif',
    icon: HeadingIcon,
    category: 'contenu',
    defaults: DEFAULT_HEADING,
    Render: HeadingBlock,
    Editor: HeadingEditor,
    migrate: withDefaults(DEFAULT_HEADING),
    nestable: true,
  },
  richtext: {
    type: 'richtext',
    label: 'Texte',
    description: 'Paragraphes, listes et liens',
    icon: Type,
    category: 'contenu',
    defaults: DEFAULT_RICH_TEXT,
    Render: RichTextBlock,
    Editor: RichTextEditor,
    migrate: withDefaults(DEFAULT_RICH_TEXT),
    nestable: true,
  },
  image: {
    type: 'image',
    label: 'Image',
    description: 'Image avec légende et format réglable',
    icon: ImageIcon,
    category: 'media',
    defaults: DEFAULT_IMAGE,
    Render: ImageBlock,
    Editor: ImageEditor,
    migrate: withDefaults(DEFAULT_IMAGE),
    // Le fichier est retiré du stockage quand le bloc est supprimé
    storagePaths: (d) => (d?.image?.path ? [d.image.path] : []),
    nestable: true,
  },
  button: {
    type: 'button',
    label: 'Bouton',
    description: 'Lien vers une page ou une adresse externe',
    icon: MousePointerClick,
    category: 'action',
    defaults: DEFAULT_BUTTON,
    Render: ButtonBlock,
    Editor: ButtonEditor,
    migrate: withDefaults(DEFAULT_BUTTON),
    nestable: true,
  },
  separator: {
    type: 'separator',
    label: 'Séparateur',
    description: 'Filet horizontal entre deux sections',
    icon: Minus,
    category: 'mise-en-page',
    defaults: DEFAULT_SEPARATOR,
    Render: SeparatorBlock,
    Editor: SeparatorEditor,
    migrate: withDefaults(DEFAULT_SEPARATOR),
    nestable: true,
  },
  spacer: {
    type: 'spacer',
    label: 'Espace',
    description: 'Espace vertical, réglable par appareil',
    icon: MoveVertical,
    category: 'mise-en-page',
    defaults: DEFAULT_SPACER,
    Render: SpacerBlock,
    Editor: SpacerEditor,
    migrate: withDefaults(DEFAULT_SPACER),
    nestable: true,
  },
  columns: {
    type: 'columns',
    label: 'Colonnes',
    description: 'De 2 à 4 colonnes contenant d’autres blocs',
    icon: Columns2,
    category: 'mise-en-page',
    defaults: DEFAULT_COLUMNS,
    Render: ColumnsBlock,
    Editor: ColumnsEditor,
    migrate: (raw: any) => {
      const merged = { ...DEFAULT_COLUMNS, ...(raw || {}) };
      // Une sauvegarde antérieure peut porter moins de colonnes que la
      // disposition ne l'exige : on complète pour éviter un rendu tronqué.
      if (!Array.isArray(merged.columns)) merged.columns = [[], []];
      return merged;
    },
    // Les images imbriquées sont nettoyées avec le bloc conteneur
    storagePaths: (d: any) =>
      (d?.columns || [])
        .flat()
        .map((n: any) => n?.data?.image?.path)
        .filter(Boolean),
    nestable: false,
  },
  embed: {
    type: 'embed',
    label: 'Intégration',
    description: 'Lecteur vidéo, carte ou formulaire externe',
    icon: Code2,
    category: 'media',
    defaults: DEFAULT_EMBED,
    Render: EmbedBlock,
    Editor: EmbedEditor,
    migrate: withDefaults(DEFAULT_EMBED),
    nestable: false,
  },
};

export const BLOCK_LIST = Object.values(BLOCK_REGISTRY);

export function getBlockDefinition(type: string): BlockDefinition | undefined {
  return BLOCK_REGISTRY[type];
}

/** Blocs proposés à l'intérieur d'une colonne. */
export const NESTABLE_BLOCKS = BLOCK_LIST.filter(
  (b) => b.nestable && NESTABLE_TYPES.includes(b.type)
);

/** Applique la migration du bloc à une donnée brute. */
export function normalizeBlockData(type: string, raw: any): any {
  const def = getBlockDefinition(type);
  if (!def) return raw ?? {};
  return def.migrate ? def.migrate(raw) : { ...(def.defaults as any), ...(raw || {}) };
}

/** Chemins de stockage à purger lors de la suppression d'un bloc. */
export function storagePathsForBlock(type: string, data: any): string[] {
  const def = getBlockDefinition(type);
  if (!def?.storagePaths) return [];
  try {
    return def.storagePaths(data) || [];
  } catch {
    return [];
  }
}
