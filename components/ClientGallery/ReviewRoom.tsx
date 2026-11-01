"use client";

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ArrowLeft, Check, CheckCircle2, Clock, CornerDownRight, Loader2, Maximize, Pause, Play, Send, Volume2, VolumeX, X } from 'lucide-react';
import { formatTimecode, type ReviewComment, type ReviewSubmission } from '../../lib/clientGalleries/types';
import styles from './ReviewRoom.module.css';

/**
 * Salle de review vidéo : lecteur, repères des commentaires sur la ligne de
 * temps, fil de commentaires horodatés, saisie et validation.
 *
 * Partagée par le client (/client/<slug>/review/<vidéo>) et l'admin (onglet
 * Reviews). Les échanges réseau passent par `transport`, propre à chaque côté.
 */

export type ReviewTransport = {
  load: () => Promise<{ comments: ReviewComment[]; identified?: boolean; lastSubmission?: string | null; submissions?: ReviewSubmission[] }>;
  act: (body: Record<string, any>) => Promise<{ comments?: ReviewComment[] }>;
  identify?: (name: string, email: string) => Promise<void>;
};

type Props = {
  mode: 'client' | 'admin';
  galleryTitle: string;
  videoName: string;
  src: string;
  poster?: string | null;
  transport: ReviewTransport;
  onBack?: () => void;
  backLabel?: string;
};

function initials(name: string | null | undefined) {
  const parts = String(name || '?').trim().split(/\s+/);
  return ((parts[0]?.[0] || '') + (parts[1]?.[0] || '')).toUpperCase() || '?';
}
function ago(iso: string) {
  const d = (Date.now() - new Date(iso).getTime()) / 1000;
  if (d < 60) return 'à l’instant';
  if (d < 3600) return `il y a ${Math.floor(d / 60)} min`;
  if (d < 86400) return `il y a ${Math.floor(d / 3600)} h`;
  return new Date(iso).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' });
}

export default function ReviewRoom({ mode, galleryTitle, videoName, src, poster, transport, onBack, backLabel = 'Retour à la galerie' }: Props) {
  const video = useRef<HTMLVideoElement>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const [comments, setComments] = useState<ReviewComment[]>([]);
  const [submissions, setSubmissions] = useState<ReviewSubmission[]>([]);
  const [identified, setIdentified] = useState(mode === 'admin');
  const [lastSubmission, setLastSubmission] = useState<string | null>(null);
  const [loaded, setLoaded] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [time, setTime] = useState(0);
  const wrap = useRef<HTMLDivElement>(null);
  const [playing, setPlaying] = useState(false);
  const [muted, setMuted] = useState(false);
  const [idle, setIdle] = useState(false);
  const idleTimer = useRef<number | undefined>(undefined);
  // Contrôles masqués après 2,5 s sans mouvement pendant la lecture
  const wake = () => {
    setIdle(false);
    window.clearTimeout(idleTimer.current);
    idleTimer.current = window.setTimeout(() => setIdle(true), 2500);
  };
  const togglePlay = () => {
    const v = video.current;
    if (!v) return;
    if (v.paused) v.play().catch(() => {});
    else v.pause();
    wake();
  };
  const toggleFullscreen = () => {
    const el = wrap.current as any;
    if (!el) return;
    if (document.fullscreenElement) document.exitFullscreen().catch(() => {});
    else if (el.requestFullscreen) el.requestFullscreen().catch(() => {});
    else (video.current as any)?.webkitEnterFullscreen?.(); // iPhone : plein écran natif
  };
  const [duration, setDuration] = useState(0);
  const [text, setText] = useState('');
  const [linkTime, setLinkTime] = useState(true);
  const [capturedTime, setCapturedTime] = useState<number | null>(null);
  const [replyTo, setReplyTo] = useState<ReviewComment | null>(null);
  const [sending, setSending] = useState(false);
  const [order, setOrder] = useState<'time' | 'date'>('time');
  const [onlyOpen, setOnlyOpen] = useState(false);
  const [active, setActive] = useState<string | null>(null);
  const [submitOpen, setSubmitOpen] = useState(false);
  const [toast, setToast] = useState<string | null>(null);

  const say = (t: string) => {
    setToast(t);
    window.setTimeout(() => setToast(null), 2800);
  };

  const refresh = useCallback(async () => {
    try {
      const j = await transport.load();
      setComments(j.comments || []);
      if (j.submissions) setSubmissions(j.submissions);
      if (j.identified !== undefined) setIdentified(mode === 'admin' || !!j.identified);
      if (j.lastSubmission !== undefined) setLastSubmission(j.lastSubmission);
      setError(null);
    } catch (e: any) {
      setError(e.message);
    }
    setLoaded(true);
  }, [transport, mode]);

  // Chargement + rafraîchissement régulier (réponses de l'autre côté)
  useEffect(() => {
    refresh();
    const t = window.setInterval(() => document.visibilityState === 'visible' && refresh(), 15000);
    return () => window.clearInterval(t);
  }, [refresh]);

  /* ── Vidéo ── */
  // Raccourcis : Espace = lecture/pause, ← → = ±5 s (hors saisie de texte)
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement;
      if (t && (t.tagName === 'TEXTAREA' || t.tagName === 'INPUT' || t.isContentEditable)) return;
      const v = video.current;
      if (!v) return;
      if (e.key === ' ') {
        e.preventDefault();
        if (v.paused) v.play().catch(() => {});
        else v.pause();
      } else if (e.key === 'ArrowRight') seek(v.currentTime + 5);
      else if (e.key === 'ArrowLeft') seek(v.currentTime - 5);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }); // eslint-disable-line react-hooks/exhaustive-deps

  // Les métadonnées peuvent être chargées avant l'hydratation : on relit la durée au montage
  useEffect(() => {
    const v = video.current;
    if (v && v.readyState >= 1 && v.duration) setDuration(v.duration);
  }, [src]);
  const seek = (t: number) => {
    const v = video.current;
    if (!v) return;
    v.currentTime = Math.max(0, Math.min(t, (v.duration || t) - 0.05));
    setTime(v.currentTime);
  };
  const currentTimecode = capturedTime ?? time;

  /* ── Fil : racines + réponses ── */
  const roots = useMemo(() => {
    let r = comments.filter((c) => !c.parent_id);
    if (onlyOpen) r = r.filter((c) => !c.resolved);
    return r.sort((a, b) =>
      order === 'time'
        ? (a.timecode ?? Infinity) - (b.timecode ?? Infinity) || a.created_at.localeCompare(b.created_at)
        : a.created_at.localeCompare(b.created_at)
    );
  }, [comments, order, onlyOpen]);
  const replies = useMemo(() => {
    const m = new Map<string, ReviewComment[]>();
    for (const c of comments) if (c.parent_id) (m.get(c.parent_id) || m.set(c.parent_id, []).get(c.parent_id)!).push(c);
    return m;
  }, [comments]);
  const markers = comments.filter((c) => !c.parent_id && c.timecode != null);
  const openCount = comments.filter((c) => !c.parent_id && !c.resolved && c.author_role === 'client').length;
  const mineSinceSubmit = comments.filter((c) => c.mine && (!lastSubmission || c.created_at > lastSubmission)).length;

  const focusComment = (c: ReviewComment) => {
    setActive(c.id);
    if (c.timecode != null) seek(c.timecode);
    document.getElementById(`rc-${c.id}`)?.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
  };

  /* ── Actions ── */
  const run = async (body: Record<string, any>, ok?: string) => {
    try {
      const j = await transport.act(body);
      if (j.comments) setComments(j.comments);
      if (ok) say(ok);
      return true;
    } catch (e: any) {
      if (e.message === 'identify') setIdentified(false);
      else say(e.message || 'Action impossible');
      return false;
    }
  };

  const send = async () => {
    const body = text.trim();
    if (!body || sending) return;
    setSending(true);
    const parent = replyTo;
    const ok = await run({
      action: mode === 'admin' ? 'reply' : 'comment',
      body,
      timecode: parent ? null : linkTime ? currentTimecode : null,
      parent_id: parent?.id || null,
    });
    setSending(false);
    if (ok) {
      setText('');
      setReplyTo(null);
      setCapturedTime(null);
      window.setTimeout(() => listRef.current?.scrollTo({ top: listRef.current.scrollHeight }), 50);
    }
  };

  /* ── Rendu d'un commentaire ── */
  const renderComment = (c: ReviewComment, isReply = false) => (
    <div key={c.id} id={`rc-${c.id}`} className={`${styles.comment} ${isReply ? styles.reply : ''}`} data-active={active === c.id} data-resolved={c.resolved}>
      <div className={styles.cHead}>
        <span className={styles.avatar} data-role={c.author_role}>
          {c.author_role === 'admin' ? 'M' : initials(c.author_name)}
        </span>
        <span className={styles.cName}>{c.author_role === 'admin' ? 'Maxcellens' : c.author_name || 'Client'}</span>
        <span className={styles.cDate}>{ago(c.created_at)}</span>
        {c.resolved ? <span className={styles.resolvedTag}>Traité</span> : null}
        {!isReply ? (
          c.timecode != null ? (
            <button className={styles.tc} onClick={() => focusComment(c)} title="Aller à ce moment">
              {formatTimecode(c.timecode)}
            </button>
          ) : (
            <span className={styles.tcGeneral}>Général</span>
          )
        ) : null}
      </div>
      <div className={styles.cBody}>{c.body}</div>
      <div className={styles.cActions}>
        {!isReply ? (
          <button
            onClick={() => {
              setReplyTo(c);
              (document.getElementById('rr-text') as HTMLTextAreaElement | null)?.focus();
            }}
          >
            Répondre
          </button>
        ) : null}
        {mode === 'admin' && !isReply ? (
          <button onClick={() => run({ action: 'resolve', id: c.id, resolved: !c.resolved, photoId: c.photo_id }, c.resolved ? 'Rouvert' : 'Marqué comme traité')}>
            {c.resolved ? 'Rouvrir' : 'Marquer traité'}
          </button>
        ) : null}
        {mode === 'admin' || c.mine ? (
          <button className={styles.danger} onClick={() => run({ action: 'delete', id: c.id, photoId: c.photo_id }, 'Commentaire supprimé')}>
            Supprimer
          </button>
        ) : null}
      </div>
    </div>
  );

  return (
    <div className={styles.room} data-mode={mode} data-no-transition>
      <header className={styles.head}>
        {onBack ? (
          <button className={styles.back} onClick={onBack}>
            <ArrowLeft size={16} /> <span className={styles.backLabel}>{backLabel}</span>
          </button>
        ) : null}
        <div className={styles.titles}>
          <b title={videoName}>{videoName}</b>
          <small>
            {galleryTitle} · Review vidéo
          </small>
        </div>
        {mode === 'client' ? (
          <>
            {lastSubmission ? (
              <span className={styles.status}>
                <CheckCircle2 size={15} /> Review envoyée {ago(lastSubmission)}
              </span>
            ) : null}
            <button className={styles.done} onClick={() => setSubmitOpen(true)} disabled={!identified || (!!lastSubmission && mineSinceSubmit === 0)}>
              <Check size={17} /> {lastSubmission ? 'Envoyer mes nouveaux commentaires' : 'J’ai terminé ma review'}
            </button>
          </>
        ) : (
          <span className={styles.status} style={{ color: openCount ? '#e8c27a' : undefined }}>
            {openCount ? `${openCount} à traiter` : 'Tout est traité'}
          </span>
        )}
      </header>

      <div className={styles.body}>
        <section className={styles.stage}>
          {/* Lecteur maison : la barre de progression porte les pastilles des commentaires,
              y compris en plein écran (le plein écran porte sur tout le cadre). */}
          <div
            className={styles.videoWrap}
            ref={wrap}
            data-playing={playing}
            data-idle={idle && playing}
            onMouseMove={wake}
            onTouchStart={wake}
          >
            <video
              ref={video}
              src={src}
              poster={poster || undefined}
              playsInline
              preload="metadata"
              onClick={togglePlay}
              onPlay={() => setPlaying(true)}
              onPause={() => setPlaying(false)}
              onTimeUpdate={(e) => {
                setTime(e.currentTarget.currentTime);
                if (!duration && e.currentTarget.duration) setDuration(e.currentTarget.duration);
              }}
              onLoadedMetadata={(e) => setDuration(e.currentTarget.duration || 0)}
              onDurationChange={(e) => setDuration(e.currentTarget.duration || 0)}
              onVolumeChange={(e) => setMuted(e.currentTarget.muted)}
              onContextMenu={(e) => e.preventDefault()}
            />
            {!playing ? (
              <button className={styles.bigPlay} onClick={togglePlay} aria-label="Lecture">
                <Play size={30} />
              </button>
            ) : null}
            <div className={styles.controls}>
              <div
                className={styles.bar}
                onPointerDown={(e) => {
                  if (!duration) return;
                  const el = e.currentTarget;
                  el.setPointerCapture(e.pointerId);
                  const at = (x: number) => {
                    const r = el.getBoundingClientRect();
                    seek(Math.max(0, Math.min(1, (x - r.left) / r.width)) * duration);
                  };
                  at(e.clientX);
                  const move = (ev: PointerEvent) => at(ev.clientX);
                  const up = () => {
                    el.removeEventListener('pointermove', move);
                    el.removeEventListener('pointerup', up);
                  };
                  el.addEventListener('pointermove', move);
                  el.addEventListener('pointerup', up);
                }}
              >
                <div className={styles.barTrack}>
                  <div className={styles.barFill} style={{ width: duration ? `${(time / duration) * 100}%` : 0 }} />
                  <div className={styles.barHead} style={{ left: duration ? `${(time / duration) * 100}%` : 0 }} />
                </div>
                {duration
                  ? markers.map((m) => (
                      <button
                        key={m.id}
                        className={styles.pin}
                        data-role={m.author_role}
                        data-resolved={m.resolved}
                        data-active={active === m.id}
                        style={{ left: `${Math.min(100, (m.timecode! / duration) * 100)}%` }}
                        onPointerDown={(e) => e.stopPropagation()}
                        onClick={(e) => {
                          e.stopPropagation();
                          focusComment(m);
                        }}
                        aria-label={`Commentaire à ${formatTimecode(m.timecode)}`}
                      >
                        <span className={styles.pinTip}>
                          <b>
                            {formatTimecode(m.timecode)} · {m.author_role === 'admin' ? 'Maxcellens' : m.author_name || 'Client'}
                          </b>
                          {m.body.length > 90 ? `${m.body.slice(0, 90)}…` : m.body}
                        </span>
                      </button>
                    ))
                  : null}
              </div>
              <div className={styles.ctrlRow}>
                <button className={styles.ctrlBtn} onClick={togglePlay} aria-label={playing ? 'Pause' : 'Lecture'}>
                  {playing ? <Pause size={18} /> : <Play size={18} />}
                </button>
                <span className={styles.ctrlTime}>
                  {formatTimecode(time) || '0:00'} / {formatTimecode(duration) || '0:00'}
                </span>
                <span style={{ flex: 1 }} />
                <span className={styles.ctrlCount}>
                  {markers.length} commentaire{markers.length > 1 ? 's' : ''}
                </span>
                <button
                  className={styles.ctrlBtn}
                  onClick={() => {
                    const v = video.current;
                    if (v) v.muted = !v.muted;
                  }}
                  aria-label={muted ? 'Activer le son' : 'Couper le son'}
                >
                  {muted ? <VolumeX size={18} /> : <Volume2 size={18} />}
                </button>
                <button className={styles.ctrlBtn} onClick={toggleFullscreen} aria-label="Plein écran">
                  <Maximize size={17} />
                </button>
              </div>
            </div>
          </div>
          <div className={styles.stageMeta}>
            <span>Les pastilles sur la barre de lecture marquent les commentaires : survolez-les, cliquez pour y aller.</span>
            <span className={styles.legend}>
              <span>
                <i /> Client
              </span>
              <span>
                <i data-role="admin" /> Maxcellens
              </span>
            </span>
          </div>
        </section>

        <aside className={styles.panel}>
          <div className={styles.panelHead}>
            <b>Commentaires</b>
            <span className={styles.count}>{comments.length}</span>
            <div className={styles.seg}>
              <button aria-pressed={order === 'time'} onClick={() => setOrder('time')}>
                Par moment
              </button>
              <button aria-pressed={order === 'date'} onClick={() => setOrder('date')}>
                Récents
              </button>
              {mode === 'admin' ? (
                <button aria-pressed={onlyOpen} onClick={() => setOnlyOpen((v) => !v)}>
                  À traiter
                </button>
              ) : null}
            </div>
          </div>

          {mode === 'admin' && submissions.length ? (
            <div className={styles.subs}>
              {submissions.map((s) => (
                <div key={s.id} className={styles.sub} data-unseen={!s.seen_at}>
                  <span>
                    <b>{s.visitor_name || s.visitor_email || 'Client'}</b> a terminé sa review · {ago(s.created_at)} · {s.comment_count} commentaire
                    {s.comment_count > 1 ? 's' : ''}
                    {s.message ? <span className={styles.subMsg}> — « {s.message} »</span> : null}
                  </span>
                </div>
              ))}
            </div>
          ) : null}

          <div className={styles.list} ref={listRef}>
            {error ? <div className={styles.error} style={{ padding: 12 }}>{error}</div> : null}
            {loaded && !roots.length ? (
              <div className={styles.empty}>
                {mode === 'client' ? (
                  <>
                    Mettez la vidéo en pause au bon moment, puis écrivez votre remarque : elle sera liée à cet instant.
                    <br />
                    Quand vous avez fini, cliquez sur « J’ai terminé ma review ».
                  </>
                ) : (
                  'Aucun commentaire pour l’instant.'
                )}
              </div>
            ) : null}
            {roots.map((c) => (
              <React.Fragment key={c.id}>
                {renderComment(c)}
                {(replies.get(c.id) || []).map((r) => renderComment(r, true))}
              </React.Fragment>
            ))}
          </div>

          <div className={styles.composer}>
            {!identified && transport.identify ? (
              <IdentifyBox onDone={async (n, e) => {
                await transport.identify!(n, e);
                setIdentified(true);
                refresh();
              }} />
            ) : (
              <>
                {replyTo ? (
                  <div className={styles.replyTo}>
                    <CornerDownRight size={14} /> Réponse à {replyTo.author_role === 'admin' ? 'Maxcellens' : replyTo.author_name || 'Client'}
                    <button onClick={() => setReplyTo(null)} aria-label="Annuler la réponse">
                      <X size={14} />
                    </button>
                  </div>
                ) : null}
                <div className={styles.box}>
                  <textarea
                    id="rr-text"
                    value={text}
                    placeholder={replyTo ? 'Votre réponse…' : linkTime ? `Votre remarque à ${formatTimecode(currentTimecode)}…` : 'Votre remarque générale…'}
                    onFocus={() => {
                      // On fige l'instant : la vidéo se met en pause pendant la saisie
                      const v = video.current;
                      if (v && !v.paused) v.pause();
                      if (capturedTime == null) setCapturedTime(v?.currentTime ?? time);
                    }}
                    onChange={(e) => setText(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && !e.shiftKey) {
                        e.preventDefault();
                        send();
                      }
                    }}
                  />
                  <div className={styles.boxBar}>
                    {!replyTo ? (
                      <button
                        className={styles.tcToggle}
                        aria-pressed={linkTime}
                        onClick={() => {
                          setLinkTime((v) => !v);
                          setCapturedTime(video.current?.currentTime ?? time);
                        }}
                        title="Lier le commentaire à ce moment de la vidéo"
                      >
                        <Clock size={13} /> {linkTime ? formatTimecode(currentTimecode) : 'Sans moment'}
                      </button>
                    ) : null}
                    {capturedTime != null && !replyTo ? (
                      <button className={styles.tcToggle} onClick={() => setCapturedTime(video.current?.currentTime ?? time)} title="Reprendre l’instant actuel de la vidéo">
                        ↻
                      </button>
                    ) : null}
                    <button className={styles.send} onClick={send} disabled={!text.trim() || sending}>
                      {sending ? <Loader2 size={14} /> : <Send size={14} />} Envoyer
                    </button>
                  </div>
                </div>
                <div className={styles.hint}>Entrée pour envoyer · Maj+Entrée pour aller à la ligne</div>
              </>
            )}
          </div>
        </aside>
      </div>

      {submitOpen ? (
        <SubmitDialog
          count={mineSinceSubmit}
          onClose={() => setSubmitOpen(false)}
          onSubmit={async (message) => {
            const ok = await run({ action: 'submit', message });
            if (ok) {
              setLastSubmission(new Date().toISOString());
              return true;
            }
            return false;
          }}
        />
      ) : null}
      {toast ? <div className={styles.toast}>{toast}</div> : null}
    </div>
  );
}

function IdentifyBox({ onDone }: { onDone: (name: string, email: string) => Promise<void> }) {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  return (
    <form
      className={styles.identify}
      onSubmit={async (e) => {
        e.preventDefault();
        setBusy(true);
        setError(null);
        try {
          await onDone(name.trim(), email.trim());
        } catch (err: any) {
          setError(err.message || 'Une erreur est survenue');
        }
        setBusy(false);
      }}
    >
      <p>Pour commenter, indiquez votre nom et votre e-mail.</p>
      <input className={styles.input} placeholder="Prénom et nom" value={name} onChange={(e) => setName(e.target.value)} autoComplete="name" required />
      <input className={styles.input} type="email" placeholder="Adresse e-mail" value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="email" required />
      {error ? <div className={styles.error}>{error}</div> : null}
      <button className={styles.send} style={{ marginLeft: 0, justifyContent: 'center' }} disabled={busy || !email.trim() || !name.trim()}>
        Commencer la review
      </button>
    </form>
  );
}

function SubmitDialog({ count, onClose, onSubmit }: { count: number; onClose: () => void; onSubmit: (message: string) => Promise<boolean> }) {
  const [message, setMessage] = useState('');
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);
  return (
    <div className={styles.overlay} onClick={(e) => e.target === e.currentTarget && !busy && onClose()}>
      <div className={styles.dialog} role="dialog" aria-modal="true">
        {done ? (
          <div className={styles.thanks}>
            <CheckCircle2 size={44} />
            <h2 style={{ marginTop: 10 }}>Merci, c’est envoyé !</h2>
            <p>Maxcellens a été prévenu et revient vers vous. Vous pouvez continuer à commenter si besoin.</p>
            <div className={styles.dialogBar} style={{ justifyContent: 'center' }}>
              <button className={styles.done} onClick={onClose}>
                Fermer
              </button>
            </div>
          </div>
        ) : (
          <>
            <h2>Terminer ma review</h2>
            <p>
              {count
                ? `${count} commentaire${count > 1 ? 's' : ''} ${count > 1 ? 'seront transmis' : 'sera transmis'} à Maxcellens.`
                : 'Aucun nouveau commentaire : vous pouvez tout de même valider la vidéo telle quelle.'}
            </p>
            <textarea className={styles.input} placeholder="Un mot pour accompagner votre review (facultatif)" value={message} onChange={(e) => setMessage(e.target.value)} />
            <div className={styles.dialogBar}>
              <button className={styles.ghost} onClick={onClose} disabled={busy}>
                Annuler
              </button>
              <button
                className={styles.done}
                disabled={busy}
                onClick={async () => {
                  setBusy(true);
                  const ok = await onSubmit(message.trim());
                  setBusy(false);
                  if (ok) setDone(true);
                }}
              >
                {busy ? <Loader2 size={16} /> : <Check size={16} />} Envoyer à Maxcellens
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
