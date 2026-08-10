"use client";

import React, { useEffect, useMemo, useState } from 'react';
import {
  AdminModal,
  AdminNotice,
  AdminSection,
  ColorField,
  SelectField,
  SliderField,
} from '../admin';
import MenuItemsField from './MenuItemsField';
import {
  applyMenuOrder,
  buildMenuItems,
  builtinItemId,
  isItemVisible,
  parseMenuOrder,
  parseMenuVisible,
  type MenuItem,
} from './menuItems';
import styles from './MenuEditor.module.css';

/**
 * Éditeur de menu, partagé entre le menu de bureau et le menu mobile.
 *
 * `MenuEditModal` et `MobileMenuEditModal` étaient deux fichiers de 273 lignes
 * quasi identiques : seuls le préfixe des variables CSS et les clés de
 * réglages différaient. Ils délèguent désormais tous les deux à ce composant.
 *
 * Les pages créées depuis l'administration figurent dans la liste au même
 * titre que les pages historiques, et l'ordre est réglable.
 */

export type MenuScope = 'desktop' | 'mobile';

const FONT_OPTIONS = [
  { value: '', label: 'Inter (police du site)' },
  { value: 'Playfair Display, serif', label: 'Playfair Display' },
  { value: 'Roboto, sans-serif', label: 'Roboto' },
  { value: 'Arial, sans-serif', label: 'Arial' },
];

const WEIGHT_OPTIONS = [
  { value: '400', label: '400 — normal' },
  { value: '500', label: '500 — moyen' },
  { value: '600', label: '600 — semi-gras' },
  { value: '700', label: '700 — gras' },
];

/** Visibilité par défaut des entrées historiques. */
const DEFAULT_VISIBLE: Record<string, boolean> = {
  [builtinItemId('realisation')]: true,
  [builtinItemId('evenement')]: true,
  [builtinItemId('corporate')]: true,
  [builtinItemId('portrait')]: true,
  [builtinItemId('animation')]: true,
  [builtinItemId('galleries')]: true,
  [builtinItemId('contact')]: true,
  [builtinItemId('bac')]: false,
  [builtinItemId('admin')]: true,
  [builtinItemId('mentionsLegales')]: false,
  [builtinItemId('politiqueConfidentialite')]: false,
};

/** Clés `site_settings` et variables CSS, par portée. */
function configFor(scope: MenuScope) {
  const p = scope === 'mobile' ? 'navMobile' : 'nav';
  const v = scope === 'mobile' ? '--nav-mobile' : '--nav';
  return {
    keys: {
      fontFamily: `${p}FontFamily`,
      fontSize: `${p}FontSize`,
      fontWeight: `${p}FontWeight`,
      textColor: `${p}TextColor`,
      hoverColor: `${p}HoverTextColor`,
      activeColor: `${p}ActiveTextColor`,
      bgColor: `${p}BgColor`,
      // Visibilité et ordre sont propres à chaque menu : on peut vouloir un
      // menu mobile plus court que le menu de bureau.
      visible: `${p}MenuVisible`,
      order: `${p}MenuOrder`,
    },
    vars: {
      fontFamily: `${v}-font-family`,
      fontSize: `${v}-font-size`,
      fontWeight: `${v}-font-weight`,
      textColor: `${v}-text-color`,
      hoverColor: `${v}-hover-text-color`,
      activeColor: `${v}-active-text-color`,
      bgColor: `${v}-bg-color`,
    },
  };
}

type MenuState = {
  fontFamily: string;
  fontSize: number;
  fontWeight: number;
  textColor: string;
  hoverColor: string;
  activeColor: string;
  bgColor: string;
  visible: Record<string, boolean>;
  order: string[];
};

const DEFAULT_STATE: MenuState = {
  fontFamily: '',
  fontSize: 16,
  fontWeight: 600,
  textColor: '',
  hoverColor: '',
  activeColor: '',
  bgColor: '',
  visible: DEFAULT_VISIBLE,
  order: [],
};

export default function MenuEditor({
  scope,
  onClose,
  onSaved,
}: {
  scope: MenuScope;
  onClose: () => void;
  onSaved?: () => void;
}) {
  const config = useMemo(() => configFor(scope), [scope]);
  const [tab, setTab] = useState<'navigation' | 'police' | 'couleurs'>('navigation');
  const [state, setState] = useState<MenuState>(DEFAULT_STATE);
  const [baseline, setBaseline] = useState(JSON.stringify(DEFAULT_STATE));
  const [pages, setPages] = useState<{ slug: string; title: string }[]>([]);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  /** Pages créées depuis l'admin — brouillons compris, pour pouvoir les préparer. */
  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const { supabase } = await import('../../lib/supabase');
        const { data } = await supabase.auth.getSession();
        const token = data?.session?.access_token;
        const resp = await fetch('/api/pages', {
          headers: token ? { Authorization: `Bearer ${token}` } : undefined,
        });
        const json = await resp.json();
        if (!mounted) return;
        setPages(
          (json?.pages || []).map((p: any) => ({ slug: p.slug, title: p.title }))
        );
      } catch (_) {
        // Sans pages dynamiques, seules les entrées historiques s'affichent.
      }
    })();
    return () => { mounted = false; };
  }, []);

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const keys = Object.values(config.keys).join(',');
        const resp = await fetch(`/api/admin/site-settings?keys=${keys}`);
        if (!resp.ok) return;
        const s = (await resp.json())?.settings || {};
        if (!mounted) return;

        const next: MenuState = {
          fontFamily: String(s[config.keys.fontFamily] || ''),
          fontSize: Number(s[config.keys.fontSize]) || 16,
          fontWeight: Number(s[config.keys.fontWeight]) || 600,
          textColor: String(s[config.keys.textColor] || ''),
          hoverColor: String(s[config.keys.hoverColor] || ''),
          activeColor: String(s[config.keys.activeColor] || ''),
          bgColor: String(s[config.keys.bgColor] || ''),
          visible: { ...DEFAULT_VISIBLE, ...parseMenuVisible(s[config.keys.visible]) },
          order: parseMenuOrder(s[config.keys.order]),
        };
        setState(next);
        setBaseline(JSON.stringify(next));
      } catch (_) {
        if (mounted) setError('Chargement des réglages impossible.');
      }
    })();
    return () => { mounted = false; };
  }, [config]);

  /** Entrées disponibles, dans l'ordre enregistré. */
  const items = useMemo(
    () => applyMenuOrder(buildMenuItems(pages), state.order),
    [pages, state.order]
  );

  const dirty = JSON.stringify(state) !== baseline;

  function update(patch: Partial<MenuState>) {
    setSaved(false);
    setState((s) => ({ ...s, ...patch }));
  }

  function toggleItem(id: string, next: boolean) {
    update({ visible: { ...state.visible, [id]: next } });
  }

  function moveItem(id: string, direction: 'up' | 'down') {
    const ids = items.map((i) => i.id);
    const i = ids.indexOf(id);
    const j = direction === 'up' ? i - 1 : i + 1;
    if (i < 0 || j < 0 || j >= ids.length) return;
    [ids[i], ids[j]] = [ids[j], ids[i]];
    update({ order: ids });
  }

  function applyCssVars(s: MenuState) {
    const set = (name: string, value: string) => {
      try { document.documentElement.style.setProperty(name, value); } catch (_) {}
    };
    set(config.vars.fontFamily, s.fontFamily || '');
    set(config.vars.fontSize, `${s.fontSize}px`);
    set(config.vars.fontWeight, String(s.fontWeight));
    set(config.vars.textColor, s.textColor || '');
    set(config.vars.hoverColor, s.hoverColor || '');
    set(config.vars.activeColor, s.activeColor || '');
    set(config.vars.bgColor, s.bgColor || '');
  }

  async function save() {
    setSaving(true);
    setError(null);
    try {
      applyCssVars(state);

      // L'ordre enregistré est celui affiché, y compris les entrées ajoutées
      // en fin de liste et jamais déplacées.
      const orderToSave = items.map((i) => i.id);

      const entries: [string, string][] = [
        [config.keys.fontFamily, state.fontFamily],
        [config.keys.fontSize, String(state.fontSize)],
        [config.keys.fontWeight, String(state.fontWeight)],
        [config.keys.textColor, state.textColor],
        [config.keys.hoverColor, state.hoverColor],
        [config.keys.activeColor, state.activeColor],
        [config.keys.bgColor, state.bgColor],
        [config.keys.visible, JSON.stringify(state.visible)],
        [config.keys.order, JSON.stringify(orderToSave)],
      ];

      const responses = await Promise.all(
        entries.map(([key, value]) =>
          fetch('/api/admin/site-settings', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ key, value }),
          })
        )
      );
      const failed = responses.find((r) => !r.ok);
      if (failed) {
        const j = await failed.json().catch(() => ({}));
        throw new Error((j as any)?.error || 'Échec de l’enregistrement');
      }

      try {
        localStorage.setItem(config.keys.visible, JSON.stringify(state.visible));
        localStorage.setItem(config.keys.order, JSON.stringify(orderToSave));
      } catch (_) {}
      try { window.dispatchEvent(new CustomEvent('site-settings-updated')); } catch (_) {}

      const next = { ...state, order: orderToSave };
      setState(next);
      setBaseline(JSON.stringify(next));
      setSaved(true);
      onSaved?.();
    } catch (e: any) {
      setError(e?.message || 'Échec de l’enregistrement');
    } finally {
      setSaving(false);
    }
  }

  const shownItems = items.filter((i) => isItemVisible(i, state.visible, DEFAULT_VISIBLE));
  const visibleMap: Record<string, boolean> = {};
  for (const item of items) {
    visibleMap[item.id] = isItemVisible(item, state.visible, DEFAULT_VISIBLE);
  }

  return (
    <AdminModal
      title={scope === 'mobile' ? 'Menu mobile' : 'Menu du site'}
      subtitle={
        scope === 'mobile'
          ? 'Entrées et apparence du menu affiché sur petit écran.'
          : 'Entrées visibles, ordre et apparence de la barre de navigation.'
      }
      size="lg"
      onClose={onClose}
      tabs={[
        { id: 'navigation', label: 'Navigation', badge: shownItems.length },
        { id: 'police', label: 'Police' },
        { id: 'couleurs', label: 'Couleurs' },
      ]}
      activeTab={tab}
      onTabChange={(t) => setTab(t as typeof tab)}
      dirty={dirty}
      saving={saving}
      saved={saved}
      error={error}
      onSave={save}
    >
      <div
        className={styles.preview}
        style={{
          fontFamily: state.fontFamily || 'inherit',
          fontSize: state.fontSize,
          fontWeight: state.fontWeight,
          background: state.bgColor || 'transparent',
          color: state.textColor || 'inherit',
        }}
      >
        {shownItems.length === 0 ? (
          <span className={styles.previewEmpty}>Aucune entrée visible</span>
        ) : (
          shownItems.map((item) => (
            <span key={item.id} className={styles.previewItem}>{item.label}</span>
          ))
        )}
      </div>

      {tab === 'navigation' ? (
        <AdminSection
          title="Entrées du menu"
          description="Les flèches règlent l’ordre d’affichage. L’œil masque une entrée sans la supprimer."
        >
          <MenuItemsField
            items={items}
            visible={visibleMap}
            onToggle={toggleItem}
            onMove={moveItem}
          />
          {pages.length === 0 ? (
            <AdminNotice>
              Aucune page créée depuis l’administration. Créez-en une dans
              Structure → Pages : elle apparaîtra ici automatiquement.
            </AdminNotice>
          ) : null}
        </AdminSection>
      ) : null}

      {tab === 'police' ? (
        <AdminSection title="Typographie" columns={2}>
          <SelectField
            label="Police"
            value={state.fontFamily}
            onChange={(v) => update({ fontFamily: v })}
            options={FONT_OPTIONS}
          />
          <SelectField
            label="Épaisseur"
            value={String(state.fontWeight)}
            onChange={(v) => update({ fontWeight: Number(v) })}
            options={WEIGHT_OPTIONS}
          />
          <SliderField
            label="Taille"
            value={state.fontSize}
            onChange={(v) => update({ fontSize: v })}
            min={10}
            max={28}
          />
        </AdminSection>
      ) : null}

      {tab === 'couleurs' ? (
        <>
          <AdminSection title="Texte" columns={2}>
            <ColorField
              label="Couleur du texte"
              value={state.textColor}
              onChange={(v) => update({ textColor: v })}
              fallback="#213431"
              contrastAgainst={state.bgColor || '#f2f0eb'}
            />
            <ColorField
              label="Au survol"
              value={state.hoverColor}
              onChange={(v) => update({ hoverColor: v })}
              fallback="#213431"
              contrastAgainst={state.bgColor || '#f2f0eb'}
            />
            <ColorField
              label="Entrée active"
              value={state.activeColor}
              onChange={(v) => update({ activeColor: v })}
              fallback="#213431"
              contrastAgainst={state.bgColor || '#f2f0eb'}
            />
          </AdminSection>

          <AdminSection title="Fond">
            <ColorField
              label="Fond de la barre"
              value={state.bgColor}
              onChange={(v) => update({ bgColor: v })}
              fallback="#f2f0eb"
              contrastAgainst={state.textColor || '#213431'}
            />
          </AdminSection>

          <AdminNotice>
            Le contraste indiqué doit atteindre AA (4,5) pour un texte de menu de
            taille courante.
          </AdminNotice>
        </>
      ) : null}
    </AdminModal>
  );
}

export type { MenuItem };
