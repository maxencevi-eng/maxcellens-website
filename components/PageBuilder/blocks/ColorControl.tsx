"use client";

import React from 'react';
import { ColorField, SegmentedField } from '../../admin';
import type { ThemeColor } from './blockDefs';

const TOKEN_OPTIONS = [
  { value: 'text', label: 'Texte' },
  { value: 'primary', label: 'Primaire' },
  { value: 'secondary', label: 'Secondaire' },
  { value: 'accent', label: 'Accent' },
  { value: 'muted', label: 'Discret' },
  { value: 'border', label: 'Bordure' },
] as const;

/**
 * Couleur d'un bloc, liée au centre de style.
 *
 * Un bloc expose d'abord les couleurs du thème ; l'hexadécimal libre reste
 * possible mais demande un choix explicite. C'est ce qui empêche les pages
 * créées depuis l'admin de dériver du thème, comme le faisaient les valeurs
 * en dur de `homeDefaults.ts`.
 */
export default function ColorControl({
  label,
  value,
  onChange,
}: {
  label: string;
  value: ThemeColor;
  onChange: (next: ThemeColor) => void;
}) {
  const isCustom = value?.source === 'custom';

  return (
    <>
      <SegmentedField
        label={label}
        value={isCustom ? 'custom' : 'theme'}
        onChange={(v) =>
          onChange(
            v === 'custom'
              ? { source: 'custom', value: '#213431' }
              : { source: 'theme', token: 'text' }
          )
        }
        options={[
          { value: 'theme', label: 'Couleur du thème' },
          { value: 'custom', label: 'Personnalisée' },
        ]}
      />

      {isCustom ? (
        <ColorField
          value={value.value}
          onChange={(v) => onChange({ source: 'custom', value: v })}
          fallback="#213431"
          hint="Cette couleur ne suivra plus les changements de style du site."
        />
      ) : (
        <SegmentedField
          value={value?.source === 'theme' ? value.token : 'text'}
          onChange={(t) => onChange({ source: 'theme', token: t as any })}
          options={TOKEN_OPTIONS.map((o) => ({ value: o.value, label: o.label }))}
        />
      )}
    </>
  );
}
