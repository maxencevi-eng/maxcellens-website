"use client";

import React, { useEffect, useRef, useState } from 'react';
import { motion } from 'framer-motion';
import { Play } from 'lucide-react';
import {
  AdminButton,
  AdminModal,
  AdminNotice,
  AdminSection,
  ColorField,
  SegmentedField,
  SliderField,
  ToggleField,
} from '../admin';
import { useTransitionSettings } from './TransitionProvider';
import {
  EASE_COVER,
  EASE_REVEAL,
  phaseDurations,
  type TransitionSettings,
  type TransitionStyle,
} from './transitionSettings';
import { getFrames } from './PageTransitionOverlay';
import styles from './TransitionsEditor.module.css';

const STYLE_OPTIONS: { value: TransitionStyle; label: string; title: string }[] = [
  { value: 'curtain', label: 'Rideau', title: 'Un voile monte, couvre, puis remonte pour révéler' },
  { value: 'fade', label: 'Fondu', title: 'Fondu simple — le plus discret' },
  { value: 'slide', label: 'Glissement', title: 'Le voile traverse l’écran latéralement' },
  { value: 'mask', label: 'Iris', title: 'Révélation par un cercle qui s’ouvre' },
];

/**
 * Transitions & effets.
 *
 * Nouveauté : l'aperçu rejoue la transition dans la modale, sans naviguer.
 * Régler une durée à l'aveugle demandait auparavant de fermer, cliquer un
 * lien, revenir — pour chaque essai.
 */
export default function TransitionsEditor({ onClose }: { onClose: () => void }) {
  const { settings, setSettings, saveSettings } = useTransitionSettings();
  const [local, setLocal] = useState<TransitionSettings>(settings);
  const [baseline, setBaseline] = useState<string>(() => JSON.stringify(settings));
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  /** Passe à true à la première modification de l'utilisateur. */
  const touched = useRef(false);

  /**
   * Le provider charge les réglages de façon asynchrone. Tant que
   * l'utilisateur n'a rien saisi, on suit ses valeurs — et on recale la
   * référence de comparaison avec. Sans cela, `dirty` restait vrai en
   * permanence et le garde-fou de fermeture se déclenchait à tort.
   */
  useEffect(() => {
    if (touched.current) return;
    setLocal(settings);
    setBaseline(JSON.stringify(settings));
  }, [settings]);

  function update(patch: Partial<TransitionSettings>) {
    touched.current = true;
    setSaved(false);
    setLocal((s) => ({ ...s, ...patch }));
  }

  const dirty = JSON.stringify(local) !== baseline;

  async function save() {
    setSaving(true);
    setSettings(local);
    await saveSettings(local);
    setBaseline(JSON.stringify(local));
    setSaving(false);
    setSaved(true);
  }

  function handleClose() {
    // L'aperçu ne modifie que l'état local : rien à restaurer côté site.
    onClose();
  }

  return (
    <AdminModal
      title="Transitions & effets"
      subtitle="Animation jouée lors d’un changement de page."
      size="lg"
      onClose={handleClose}
      dirty={dirty}
      saving={saving}
      saved={saved}
      onSave={save}
    >
      <TransitionPreview settings={local} />

      <AdminSection title="Activation">
        <ToggleField
          label="Activer les transitions de page"
          checked={local.enabled}
          onChange={(v) => update({ enabled: v })}
          hint="Désactivé, les liens naviguent sans animation."
        />
      </AdminSection>

      <AdminSection title="Style" columns={1}>
        <SegmentedField<TransitionStyle>
          value={local.style}
          onChange={(v) => update({ style: v })}
          options={STYLE_OPTIONS}
          hint="Le style est remplacé par un fondu court si le visiteur a demandé de réduire les animations."
        />
        <ColorField
          label="Couleur du voile"
          value={local.overlayColor}
          onChange={(v) => update({ overlayColor: v })}
          fallback="#172622"
        />
      </AdminSection>

      <AdminSection title="Rythme" columns={2}>
        <SliderField
          label="Durée totale"
          value={Math.round(local.duration * 100)}
          onChange={(v) => update({ duration: v / 100 })}
          min={20}
          max={160}
          unit="cs"
          hint={`${local.duration.toFixed(2)} s — répartie entre recouvrement et révélation.`}
        />
        <SliderField
          label="Recouvrement minimal"
          value={Math.round(local.minCover * 100)}
          onChange={(v) => update({ minCover: v / 100 })}
          min={0}
          max={80}
          unit="cs"
          hint="Empêche le clignotement quand la page est déjà en cache."
        />
        <SliderField
          label="Attente maximale"
          value={Math.round(local.maxWait * 10)}
          onChange={(v) => update({ maxWait: v / 10 })}
          min={5}
          max={50}
          unit="ds"
          hint={`${local.maxWait.toFixed(1)} s — au-delà, la page s’ouvre même si elle n’est pas prête.`}
        />
      </AdminSection>

      <AdminSection title="Confort de navigation">
        <ToggleField
          label="Précharger les pages au survol"
          checked={local.prefetch}
          onChange={(v) => update({ prefetch: v })}
          hint="Charge la page destination dès que le curseur passe sur un lien. C’est le réglage qui supprime le temps mort avant l’ouverture."
        />
        <ToggleField
          label="Afficher un indicateur si l’attente dépasse 0,4 s"
          checked={local.showProgress}
          onChange={(v) => update({ showProgress: v })}
          hint="Sur une page lente, évite un écran parfaitement immobile."
        />
      </AdminSection>

      {!local.prefetch ? (
        <AdminNotice tone="warning">
          Sans préchargement, le chargement de la page ne démarre qu’au clic :
          l’attente derrière le voile sera plus longue.
        </AdminNotice>
      ) : null}
    </AdminModal>
  );
}

/** Rejoue la transition en boucle dans un cadre, avec les réglages courants. */
function TransitionPreview({ settings }: { settings: TransitionSettings }) {
  const [phase, setPhase] = useState<'idle' | 'covering' | 'covered' | 'revealing'>('idle');
  const timers = useRef<ReturnType<typeof setTimeout>[]>([]);

  useEffect(() => () => { timers.current.forEach(clearTimeout); }, []);

  function play() {
    timers.current.forEach(clearTimeout);
    timers.current = [];
    setPhase('covering');
  }

  const { cover, reveal } = phaseDurations(settings.duration);
  const frames = getFrames(settings.style);
  const revealing = phase === 'revealing';

  function onComplete() {
    if (phase === 'covering') {
      setPhase('covered');
      // Simule une attente réseau courte, pour montrer l'enchaînement réel
      timers.current.push(setTimeout(() => setPhase('revealing'), Math.max(120, settings.minCover * 1000)));
    } else if (phase === 'revealing') {
      setPhase('idle');
    }
  }

  return (
    <div className={styles.preview}>
      <div className={styles.stage}>
        <div className={styles.fakePage}>
          <span className={styles.fakeBar} />
          <span className={styles.fakeBlock} />
          <span className={styles.fakeBlock} style={{ width: '62%' }} />
        </div>

        {phase !== 'idle' ? (
          <motion.div
            className={styles.veil}
            style={{ background: settings.overlayColor }}
            initial={frames.initial}
            animate={revealing ? frames.reveal : frames.cover}
            transition={{
              duration: revealing ? reveal : cover,
              ease: revealing ? EASE_REVEAL : EASE_COVER,
            }}
            onAnimationComplete={onComplete}
          />
        ) : null}
      </div>

      <div className={styles.previewBar}>
        <AdminButton
          size="sm"
          variant="secondary"
          leadingIcon={<Play size={14} aria-hidden="true" />}
          onClick={play}
          disabled={phase !== 'idle'}
        >
          Rejouer l’aperçu
        </AdminButton>
        <span className={styles.previewMeta}>
          recouvrement {Math.round(cover * 1000)} ms · révélation {Math.round(reveal * 1000)} ms
        </span>
      </div>
    </div>
  );
}
