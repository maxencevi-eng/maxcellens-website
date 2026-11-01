"use client";

import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import {
  ArrowDown,
  CalendarClock,
  ChevronLeft,
  ChevronRight,
  Download,
  ExternalLink,
  Heart,
  Image as ImageIcon,
  Loader2,
  Pause,
  Play,
  X,
} from 'lucide-react';
import {
  formatBytes,
  formatDuration,
  type ClientPhoto,
  type DesignSettings,
  type DownloadSettings,
  type FavoriteSettings,
  type GallerySet,
} from '../../lib/clientGalleries/types';
import ClientShell from './ClientShell';
import Brand from './Brand';
import styles from './ClientGallery.module.css';

type Props = {
  slug: string;
  title: string;
  date: string | null;
  clientName: string | null;
  intro: string | null;
  expiresAt: string | null;
  design: DesignSettings;
  cover: ClientPhoto | null;
  sets: GallerySet[];
  photos: ClientPhoto[];
  download: DownloadSettings;
  pinRequired: boolean;
  favorites: FavoriteSettings;
  initialFavorites: string[];
  identified: boolean;
  /** Mode review : les vidéos ouvrent la salle de commentaires. */
  review?: boolean;
  /** Logo du site (en-tête) ; texte « Maxcellens » à défaut. */
  logo?: string | null;
  /** Jeton d'aperçu admin : transmis aux routes pour tout tester, brouillons compris. */
  previewToken: string | null;
  /** État réel de la galerie, affiché dans le bandeau d'aperçu. */
  availability: 'ok' | 'draft' | 'expired';
};

type DlRequest = { scope: 'photo' | 'set' | 'all' | 'favorites'; photoId?: string; setId?: string | null; size: 'original' | 'web' };

const SLIDE_MS = 4000;
const NO_SET = '__none__';

/* ── Chargement paresseux relatif à la zone de défilement ───────────────── */

const ObserverCtx = createContext<IntersectionObserver | null>(null);

function useLazyObserver(root: React.RefObject<HTMLDivElement | null>) {
  const [io, setIo] = useState<IntersectionObserver | null>(null);
  useEffect(() => {
    const obs = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          if (!e.isIntersecting) continue;
          const img = e.target as HTMLImageElement;
          if (img.dataset.srcset) img.srcset = img.dataset.srcset;
          if (img.dataset.src) img.src = img.dataset.src;
          obs.unobserve(img);
        }
      },
      { root: root.current, rootMargin: '900px 0px' }
    );
    setIo(obs);
    return () => obs.disconnect();
  }, [root]);
  return io;
}

function LazyImg({ src, srcSet, sizes, alt }: { src: string; srcSet?: string; sizes?: string; alt: string }) {
  const io = useContext(ObserverCtx);
  const ref = useRef<HTMLImageElement>(null);
  const [loaded, setLoaded] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el || !io) return;
    io.observe(el);
    return () => io.unobserve(el);
  }, [io]);
  return (
    <img
      ref={ref}
      data-src={src}
      data-srcset={srcSet}
      sizes={sizes}
      alt={alt}
      draggable={false}
      decoding="async"
      data-loaded={loaded}
      onLoad={() => setLoaded(true)}
      onContextMenu={(e) => e.preventDefault()}
    />
  );
}

/* ── Mise en page justifiée ────────────────────────────────────────────── */

function useWidth(ref: React.RefObject<HTMLDivElement | null>) {
  const [w, setW] = useState(0);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const ro = new ResizeObserver(() => setW(el.clientWidth));
    ro.observe(el);
    setW(el.clientWidth);
    return () => ro.disconnect();
  }, [ref]);
  return w;
}

function justify(items: ClientPhoto[], width: number, target: number, gap: number) {
  const rows: { items: ClientPhoto[]; h: number }[] = [];
  let row: ClientPhoto[] = [];
  let sum = 0;
  for (const it of items) {
    row.push(it);
    sum += it.w / it.h;
    const h = (width - gap * (row.length - 1)) / sum;
    if (h <= target) {
      rows.push({ items: row, h });
      row = [];
      sum = 0;
    }
  }
  if (row.length) rows.push({ items: row, h: Math.min(target, (width - gap * (row.length - 1)) / sum) });
  return rows;
}

/* ── Composant principal ───────────────────────────────────────────────── */

export default function ClientGallery(rawProps: Props) {
  const preview = !!rawProps.previewToken;

  // Aperçu admin : l'onglet Présentation envoie ses réglages non enregistrés
  // (postMessage, même origine) pour un rendu instantané.
  const [live, setLive] = useState<{ design?: DesignSettings; intro?: string | null }>({});
  // Le bandeau d'aperçu n'est rendu qu'après montage : en session admin, des outils injectés
  // dans la page faisaient diverger le HTML serveur et l'hydratation.
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  useEffect(() => {
    if (!preview) return;
    const onMsg = (e: MessageEvent) => {
      if (e.origin !== window.location.origin || e.data?.type !== 'cg-live') return;
      setLive({ design: e.data.design, intro: e.data.intro });
    };
    window.addEventListener('message', onMsg);
    window.parent?.postMessage({ type: 'cg-ready' }, window.location.origin);
    return () => window.removeEventListener('message', onMsg);
  }, [preview]);
  const props: Props = {
    ...rawProps,
    ...(live.design ? { design: live.design } : {}),
    ...('intro' in live ? { intro: live.intro ?? null } : {}),
  };

  const { slug, title, date, design, cover, sets, photos, download, favorites, previewToken } = props;
  const jsonHeaders: Record<string, string> = { 'Content-Type': 'application/json', ...(previewToken ? { 'x-cg-preview': previewToken } : {}) };
  const scrollRef = useRef<HTMLDivElement>(null);
  const barRef = useRef<HTMLDivElement>(null);
  const io = useLazyObserver(scrollRef);

  const [view, setView] = useState<string>('all');
  const [favs, setFavs] = useState<Set<string>>(() => new Set(props.initialFavorites));
  const [identified, setIdentified] = useState(props.identified);
  const [lb, setLb] = useState<{ list: ClientPhoto[]; i: number } | null>(null);
  const [playing, setPlaying] = useState(false);
  const [dlOpen, setDlOpen] = useState(false);
  const [identifyFor, setIdentifyFor] = useState<string | null>(null);
  const [pinFor, setPinFor] = useState<DlRequest | null>(null);
  const [pin, setPin] = useState<string>('');
  const [toast, setToast] = useState<string | null>(null);
  const [zip, setZip] = useState<{ done: number; total: number; label: string } | null>(null);

  const say = useCallback((t: string) => {
    setToast(t);
    window.clearTimeout((say as any)._t);
    (say as any)._t = window.setTimeout(() => setToast(null), 2600);
  }, []);

  // Une visite comptée par session de navigation (jamais en aperçu admin)
  useEffect(() => {
    if (preview) return;
    const k = `cgview_${slug}`;
    try {
      if (sessionStorage.getItem(k)) return;
      sessionStorage.setItem(k, '1');
    } catch {}
    fetch(`/api/client/${slug}/view`, { method: 'POST' }).catch(() => {});
  }, [slug, preview]);

  const canPhoto = download.enabled && download.scopes.includes('photo');
  const canBulk = download.enabled && download.scopes.some((s) => s !== 'photo');

  /* Sections affichées selon le filtre courant */
  const sections = useMemo(() => {
    if (view === 'favorites') return [{ id: 'fav', name: 'Vos favoris', items: photos.filter((p) => favs.has(p.id)) }];
    const bySet = new Map<string, ClientPhoto[]>();
    for (const p of photos) {
      const k = p.set_id && sets.some((s) => s.id === p.set_id) ? p.set_id : NO_SET;
      if (!bySet.has(k)) bySet.set(k, []);
      bySet.get(k)!.push(p);
    }
    const list = [
      ...(bySet.get(NO_SET)?.length ? [{ id: NO_SET, name: '', items: bySet.get(NO_SET)! }] : []),
      ...sets.map((s) => ({ id: s.id, name: s.name, items: bySet.get(s.id) || [] })).filter((s) => s.items.length),
    ];
    return view === 'all' ? list : list.filter((s) => s.id === view);
  }, [view, photos, sets, favs]);

  const visual = useMemo(() => sections.flatMap((s) => s.items.filter((p) => p.kind !== 'file')), [sections]);
  const files = useMemo(() => sections.flatMap((s) => s.items.filter((p) => p.kind === 'file')), [sections]);
  const counts = useMemo(() => {
    const c = { image: 0, video: 0, file: 0 };
    photos.forEach((p) => c[p.kind]++);
    return c;
  }, [photos]);

  const scrollToGallery = () => {
    const sc = scrollRef.current;
    const bar = barRef.current;
    if (sc && bar) sc.scrollTo({ top: bar.offsetTop, behavior: 'smooth' });
  };

  /* ── Favoris ── */
  async function toggleFav(id: string) {
    if (!favorites.enabled) return;
    if (!identified) {
      setIdentifyFor(id);
      return;
    }
    const on = !favs.has(id);
    const next = new Set(favs);
    on ? next.add(id) : next.delete(id);
    setFavs(next);
    const res = await fetch(`/api/client/${slug}/favorite`, {
      method: 'POST',
      headers: jsonHeaders,
      body: JSON.stringify({ photoId: id, on }),
    }).catch(() => null);
    if (!res || !res.ok) {
      const j = res ? await res.json().catch(() => ({})) : {};
      setFavs((cur) => {
        const r = new Set(cur);
        on ? r.delete(id) : r.add(id);
        return r;
      });
      if (j.error === 'identify') {
        setIdentified(false);
        setIdentifyFor(id);
      } else say(j.error || 'Action impossible pour le moment');
    }
  }

  /* ── Téléchargements ── */
  async function requestDownload(req: DlRequest, pinValue = pin) {
    const zipMode = req.scope !== 'photo';
    // Le sélecteur d'enregistrement doit s'ouvrir pendant le geste de l'utilisateur
    let writable: any = null;
    const w = window as any;
    if (zipMode && typeof w.showSaveFilePicker === 'function') {
      try {
        const handle = await w.showSaveFilePicker({
          suggestedName: `${title.replace(/[\\/:*?"<>|]/g, '')}.zip`,
          types: [{ description: 'Archive ZIP', accept: { 'application/zip': ['.zip'] } }],
        });
        writable = await handle.createWritable();
      } catch (e: any) {
        if (e?.name === 'AbortError') return;
      }
    }

    const res = await fetch(`/api/client/${slug}/download`, {
      method: 'POST',
      headers: jsonHeaders,
      body: JSON.stringify({ ...req, pin: pinValue || undefined }),
    }).catch(() => null);
    const j = res ? await res.json().catch(() => ({})) : {};
    if (!res || !res.ok) {
      try {
        await writable?.abort();
      } catch {}
      if (j.error === 'pin') {
        setPin('');
        setPinFor(req);
        return;
      }
      say(j.error || 'Téléchargement impossible');
      return;
    }
    if (pinFor) setPinFor(null);

    if (!zipMode) {
      window.location.href = j.files[0].url;
      return;
    }
    await runZip(j.files, writable);
  }

  async function runZip(list: { name: string; url: string; size: number | null }[], writable: any) {
    const total = list.length;
    const totalBytes = list.reduce((a, f) => a + (f.size || 0), 0);
    if (!writable && totalBytes > 1.8e9) {
      say('Archive trop lourde pour ce navigateur : téléchargez set par set, ou utilisez Chrome / Edge.');
      return;
    }
    setDlOpen(false);
    setZip({ done: 0, total, label: 'Préparation…' });
    try {
      const { downloadZip } = await import('client-zip');
      let done = 0;
      async function* entries() {
        for (const f of list) {
          const r = await fetch(f.url);
          if (!r.ok) throw new Error(`${f.name} : ${r.status}`);
          yield { name: f.name, input: r, ...(f.size ? { size: f.size } : {}) };
          done++;
          setZip({ done, total, label: `${f.name}` });
        }
      }
      const zipRes = downloadZip(entries());
      if (writable) {
        await zipRes.body!.pipeTo(writable);
      } else {
        const blob = await zipRes.blob();
        const a = document.createElement('a');
        a.href = URL.createObjectURL(blob);
        a.download = `${title.replace(/[\\/:*?"<>|]/g, '')}.zip`;
        document.body.appendChild(a);
        a.click();
        a.remove();
        setTimeout(() => URL.revokeObjectURL(a.href), 60_000);
      }
      setZip({ done: total, total, label: 'Terminé' });
      setTimeout(() => setZip(null), 2500);
    } catch (e: any) {
      setZip(null);
      say(`Le téléchargement a échoué${e?.message ? ` (${e.message})` : ''}. Réessayez.`);
    }
  }

  /* ── Visionneuse ── */
  const open = (p: ClientPhoto) => {
    // Mode review : la vidéo s'ouvre dans sa salle de commentaires
    if (p.kind === 'video' && props.review) {
      window.location.href = `/client/${slug}/review/${p.id}${previewToken ? `?preview=${previewToken}` : ''}`;
      return;
    }
    const i = visual.findIndex((x) => x.id === p.id);
    if (i >= 0) setLb({ list: visual, i });
  };
  const step = useCallback(
    (d: number, imagesOnly = false) =>
      setLb((cur) => {
        if (!cur) return cur;
        const n = cur.list.length;
        let i = cur.i;
        for (let k = 0; k < n; k++) {
          i = (i + d + n) % n;
          if (!imagesOnly || cur.list[i].kind === 'image') break;
        }
        return { ...cur, i };
      }),
    []
  );

  useEffect(() => {
    if (!playing || !lb) return;
    const t = window.setInterval(() => step(1, true), SLIDE_MS);
    return () => window.clearInterval(t);
  }, [playing, lb, step]);

  useEffect(() => {
    if (!lb) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'ArrowRight') step(1);
      else if (e.key === 'ArrowLeft') step(-1);
      else if (e.key === 'Escape') {
        setLb(null);
        setPlaying(false);
      } else if (e.key === ' ' && lb.list[lb.i].kind !== 'video') {
        e.preventDefault();
        setPlaying((p) => !p);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [lb, step]);

  // Préchargement des voisines
  useEffect(() => {
    if (!lb) return;
    for (const d of [1, -1, 2]) {
      const p = lb.list[(lb.i + d + lb.list.length) % lb.list.length];
      if (p?.kind === 'image') {
        const im = new Image();
        im.src = pickLarge(p);
      }
    }
  }, [lb]);

  const startSlideshow = () => {
    const imgs = visual.filter((p) => p.kind === 'image');
    if (!imgs.length) return;
    setLb({ list: visual, i: visual.indexOf(imgs[0]) });
    setPlaying(true);
  };

  const touch = useRef<{ x: number; y: number } | null>(null);

  const theme = design.theme;
  const gap = design.gap;

  return (
    <ObserverCtx.Provider value={io}>
      <ClientShell theme={theme} font={design.font} scrollRef={scrollRef}>
        <Cover design={design} cover={cover} title={title} date={date} logo={props.logo} onEnter={scrollToGallery} />

        <Intro {...props} counts={counts} />

        <div className={styles.bar} ref={barRef}>
          <div className={styles.barIn}>
            <div className={styles.barTitle}>
              <span>{title}</span>
              <small>Maxcellens · {photos.length} {photos.length > 1 ? 'éléments' : 'élément'}</small>
            </div>
            <div className={styles.sets} role="toolbar" aria-label="Sections">
              {sets.length > 0 || favorites.enabled ? (
                <button className={styles.setBtn} aria-pressed={view === 'all'} onClick={() => setView('all')}>
                  Tout
                </button>
              ) : null}
              {sets.map((s) =>
                photos.some((p) => p.set_id === s.id) ? (
                  <button key={s.id} className={styles.setBtn} aria-pressed={view === s.id} onClick={() => setView(s.id)}>
                    {s.name}
                  </button>
                ) : null
              )}
            </div>
            <div className={styles.actions}>
              {favorites.enabled ? (
                <button
                  className={styles.act}
                  aria-pressed={view === 'favorites'}
                  onClick={() => (identified ? setView(view === 'favorites' ? 'all' : 'favorites') : setIdentifyFor('__view__'))}
                  title="Mes favoris"
                >
                  <Heart size={17} />
                  <span className={styles.count}>{favs.size}</span>
                </button>
              ) : null}
              {counts.image > 1 ? (
                <button className={styles.act} onClick={startSlideshow}>
                  <Play size={16} />
                  <span className={styles.actLabel}>Diaporama</span>
                </button>
              ) : null}
              {canBulk ? (
                <button className={`${styles.act} ${styles.actPrimary}`} onClick={() => setDlOpen(true)}>
                  <Download size={17} />
                  <span className={styles.actLabel}>Télécharger</span>
                </button>
              ) : null}
            </div>
          </div>
        </div>

        {sections.every((s) => !s.items.length) ? (
          <div className={styles.empty}>
            {view === 'favorites' ? 'Touchez ♥ sur une photo pour l’ajouter à vos favoris.' : 'Les photos arrivent bientôt.'}
          </div>
        ) : null}

        {sections.map((s, si) => {
          const vis = s.items.filter((p) => p.kind !== 'file');
          if (!vis.length) return null;
          return (
            <section className={styles.section} key={s.id}>
              {s.name ? (
                <div className={`${styles.setHead} ${si === 0 ? styles.firstSet : ''}`}>
                  <h2>{s.name}</h2>
                  <span>{vis.length}</span>
                </div>
              ) : (
                <div style={{ height: 20 }} />
              )}
              <Grid
                items={vis}
                design={design}
                favs={favs}
                favEnabled={favorites.enabled}
                canDownload={canPhoto}
                onOpen={open}
                onFav={toggleFav}
                onDownload={(p) => requestDownload({ scope: 'photo', photoId: p.id, size: download.sizes.includes('original') ? 'original' : 'web' })}
                reviewMode={!!props.review}
              />
            </section>
          );
        })}

        {files.length ? (
          <section className={styles.section}>
            <div className={styles.setHead}>
              <h2>Documents</h2>
              <span>{files.length}</span>
            </div>
            <div className={styles.files}>
              {files.map((f) => (
                <div className={styles.file} key={f.id}>
                  <div className={styles.fileIcon}>{f.ext.slice(0, 4)}</div>
                  <div className={styles.fileMeta}>
                    <b title={f.name}>{f.name}</b>
                    <small>{formatBytes(f.size)}</small>
                  </div>
                  <div className={styles.fileActs}>
                    {f.src ? (
                      <a className={styles.fileBtn} href={f.src} target="_blank" rel="noopener noreferrer" title="Ouvrir" data-no-transition>
                        <ExternalLink size={17} />
                      </a>
                    ) : null}
                    {canPhoto ? (
                      <button className={styles.fileBtn} title="Télécharger" onClick={() => requestDownload({ scope: 'photo', photoId: f.id, size: 'original' })}>
                        <Download size={17} />
                      </button>
                    ) : null}
                  </div>
                </div>
              ))}
            </div>
          </section>
        ) : null}

        <footer className={styles.foot}>
          <Brand logo={props.logo} className={styles.footBrand} size="lg" />
          <p>
            Photographe &amp; Vidéaste ·{' '}
            <a href="/" data-no-transition>
              maxcellens.com
            </a>
          </p>
          {props.expiresAt ? (
            <div className={styles.expire}>
              <CalendarClock size={15} /> Disponible jusqu’au {props.expiresAt}
            </div>
          ) : null}
        </footer>

        {preview && mounted ? (
          <div className={styles.previewBadge} data-warn={props.availability !== 'ok'}>
            {props.availability === 'draft'
              ? 'Aperçu — galerie en brouillon : publiez-la pour que le client y accède'
              : props.availability === 'expired'
                ? 'Aperçu — galerie expirée : le client voit « plus disponible »'
                : 'Aperçu administrateur — visites et téléchargements non comptés'}
          </div>
        ) : null}

        {/* ── Visionneuse ── */}
        {lb ? (
          <Lightbox
            lb={lb}
            playing={playing}
            favs={favs}
            favEnabled={favorites.enabled}
            canDownload={canPhoto}
            onClose={() => {
              setLb(null);
              setPlaying(false);
            }}
            onStep={step}
            onJump={(i) => setLb({ ...lb, i })}
            onTogglePlay={() => setPlaying((p) => !p)}
            onFav={toggleFav}
            onDownload={(p) => requestDownload({ scope: 'photo', photoId: p.id, size: download.sizes.includes('original') ? 'original' : 'web' })}
            touch={touch}
          />
        ) : null}

        {dlOpen ? (
          <DownloadDialog
            sets={sets.filter((s) => photos.some((p) => p.set_id === s.id))}
            hasUnsorted={photos.some((p) => !p.set_id || !sets.some((s) => s.id === p.set_id))}
            photos={photos}
            favCount={favs.size}
            download={download}
            favoritesEnabled={favorites.enabled}
            onClose={() => setDlOpen(false)}
            onGo={(req) => requestDownload(req)}
          />
        ) : null}

        {pinFor ? (
          <Dialog title="Code de téléchargement" onClose={() => setPinFor(null)}>
            <p className={styles.sub}>Saisissez le code à 4 chiffres communiqué par Maxcellens.</p>
            <form
              onSubmit={(e) => {
                e.preventDefault();
                requestDownload(pinFor, pin);
              }}
            >
              <input
                className={styles.input}
                inputMode="numeric"
                autoFocus
                maxLength={8}
                value={pin}
                onChange={(e) => setPin(e.target.value.replace(/\D/g, ''))}
                style={{ letterSpacing: '0.5em', textAlign: 'center', fontSize: 22 }}
                aria-label="Code"
              />
              <button className={styles.primary} type="submit" disabled={pin.length < 4}>
                Valider
              </button>
            </form>
          </Dialog>
        ) : null}

        {identifyFor ? (
          <IdentifyDialog
            slug={slug}
            headers={jsonHeaders}
            onClose={() => setIdentifyFor(null)}
            onDone={(serverFavs) => {
              setIdentified(true);
              const pending = identifyFor;
              setIdentifyFor(null);
              const next = new Set(serverFavs);
              setFavs(next);
              if (pending === '__view__') setView('favorites');
              else if (pending && !next.has(pending)) setTimeout(() => toggleFavAfterIdentify(pending), 0);
            }}
          />
        ) : null}

        {zip ? (
          <div className={styles.overlay}>
            <div className={styles.dialog}>
              <h2>{zip.done >= zip.total ? 'Téléchargement terminé' : 'Téléchargement en cours'}</h2>
              <p className={styles.sub}>Gardez cette page ouverte jusqu’à la fin.</p>
              <div className={styles.progress}>
                <small>
                  <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '70%' }}>{zip.label}</span>
                  <span>
                    {zip.done} / {zip.total}
                  </span>
                </small>
                <div className={styles.progressBar}>
                  <i style={{ width: `${Math.round((zip.done / Math.max(1, zip.total)) * 100)}%` }} />
                </div>
              </div>
            </div>
          </div>
        ) : null}

        {toast ? (
          <div className={styles.toast} role="status">
            {toast}
          </div>
        ) : null}
      </ClientShell>
    </ObserverCtx.Provider>
  );

  // Après identification, on rejoue le ♥ demandé (l'état `identified` vient de passer à vrai)
  async function toggleFavAfterIdentify(id: string) {
    setFavs((cur) => new Set(cur).add(id));
    const res = await fetch(`/api/client/${slug}/favorite`, {
      method: 'POST',
      headers: jsonHeaders,
      body: JSON.stringify({ photoId: id, on: true }),
    }).catch(() => null);
    if (!res?.ok) {
      const j = res ? await res.json().catch(() => ({})) : {};
      setFavs((cur) => {
        const r = new Set(cur);
        r.delete(id);
        return r;
      });
      say(j.error || 'Action impossible pour le moment');
    }
  }
}

/* ── Couverture ────────────────────────────────────────────────────────── */

function coverImg(cover: ClientPhoto, design: DesignSettings) {
  const pos = design.focus ? `${design.focus.x * 100}% ${design.focus.y * 100}%` : '50% 50%';
  return (
    <img
      className={styles.coverImg}
      src={cover.screen}
      srcSet={`${cover.screen} 1600w${cover.web ? `, ${cover.web} 2560w` : ''}`}
      sizes="100vw"
      alt=""
      fetchPriority="high"
      style={{ objectPosition: pos }}
      onContextMenu={(e) => e.preventDefault()}
    />
  );
}

function Cover({
  design,
  cover,
  title,
  date,
  onEnter,
  logo,
}: {
  design: DesignSettings;
  cover: ClientPhoto | null;
  title: string;
  date: string | null;
  onEnter: () => void;
  logo?: string | null;
}) {
  const btn = (
    <button className={styles.coverBtn} onClick={onEnter}>
      Voir la galerie <ArrowDown size={16} />
    </button>
  );
  if (!cover || design.cover === 'minimal') {
    return (
      <header className={styles.coverMinimal}>
        <Brand logo={logo} className={styles.brandInline} size="lg" />
        <h1 className={styles.coverTitle}>{title}</h1>
        {date ? <div className={styles.coverDate}>{date}</div> : null}
      </header>
    );
  }
  if (design.cover === 'editorial') {
    return (
      <header className={styles.editorial}>
        <div className={styles.editorialTop}>
          <Brand logo={logo} className={styles.editorialBrand} />
          <span>{date || ''}</span>
        </div>
        <h1 className={styles.editorialTitle}>{title}</h1>
        <div className={styles.editorialImg}>
          {coverImg(cover, design)}
          <button className={styles.editorialBtn} onClick={onEnter}>
            Voir la galerie <ArrowDown size={16} />
          </button>
        </div>
      </header>
    );
  }
  const text = (
    <div className={styles.coverText}>
      <div>
        <h1 className={styles.coverTitle}>{title}</h1>
        {date ? <div className={styles.coverDate}>{date}</div> : null}
      </div>
      {btn}
    </div>
  );
  if (design.cover === 'frame') {
    return (
      <header className={styles.cover} data-layout="frame">
        <div className={styles.frameIn}>
          {coverImg(cover, design)}
          <Brand logo={logo} tone="light" className={styles.brand} />
          {text}
        </div>
      </header>
    );
  }
  return (
    <header className={styles.cover} data-layout={design.cover}>
      {coverImg(cover, design)}
      <Brand logo={logo} tone="light" className={styles.brand} />
      {text}
      <ArrowDown size={20} className={styles.scrollHint} aria-hidden />
    </header>
  );
}

/* ── Mot d'accueil ─────────────────────────────────────────────────────── */

function Intro(p: Props & { counts: { image: number; video: number; file: number } }) {
  const first = (p.clientName || '').trim().split(/\s+/)[0];
  const parts: string[] = [];
  if (p.counts.image) parts.push(`${p.counts.image} photo${p.counts.image > 1 ? 's' : ''}`);
  if (p.counts.video) parts.push(`${p.counts.video} vidéo${p.counts.video > 1 ? 's' : ''}`);
  if (p.counts.file) parts.push(`${p.counts.file} document${p.counts.file > 1 ? 's' : ''}`);
  return (
    <div className={styles.intro}>
      <div className={styles.introKicker}>{first ? `Bonjour ${first}` : 'Bienvenue'}</div>
      {p.intro ? (
        <p className={styles.introText}>{p.intro}</p>
      ) : (
        <p className={styles.introText}>Voici votre galerie. Bonne découverte.</p>
      )}
      <div className={styles.introMeta}>
        {parts.length ? (
          <span>
            <ImageIcon size={14} /> {parts.join(' · ')}
          </span>
        ) : null}
        {p.download.enabled ? (
          <span>
            <Download size={14} /> Téléchargement {p.download.sizes.includes('original') ? 'haute définition' : 'web'}
          </span>
        ) : null}
        {p.favorites.enabled ? (
          <span>
            <Heart size={14} /> {p.favorites.limit ? `Sélectionnez jusqu’à ${p.favorites.limit} favoris` : 'Marquez vos favoris'}
          </span>
        ) : null}
      </div>
      <div className={styles.introRule} />
    </div>
  );
}

/* ── Grille ────────────────────────────────────────────────────────────── */

function Grid({
  items,
  design,
  favs,
  favEnabled,
  canDownload,
  onOpen,
  onFav,
  onDownload,
  reviewMode = false,
}: {
  items: ClientPhoto[];
  design: DesignSettings;
  favs: Set<string>;
  favEnabled: boolean;
  canDownload: boolean;
  onOpen: (p: ClientPhoto) => void;
  onFav: (id: string) => void;
  onDownload: (p: ClientPhoto) => void;
  reviewMode?: boolean;
}) {
  // Nom du fichier au-dessus de la vignette (réglage Présentation)
  const showNames = !!design.showNames;
  const CAPTION = 28;
  const label = (p: ClientPhoto) => p.name.replace(/\.[^.]+$/, '');
  const ref = useRef<HTMLDivElement>(null);
  const width = useWidth(ref);
  const gap = design.gap;
  // Images par ligne choisies dans l'admin (sur ordinateur) ; réduites sur tablette et mobile
  const wanted = design.columns || 4;
  const cols = width < 600 ? Math.max(1, Math.round(wanted / 2)) : width < 1100 ? Math.max(2, wanted - 1) : wanted;
  // Justifiée : hauteur de ligne calculée pour tenir ~cols photos d'un format moyen
  const avgRatio = items.length ? items.reduce((a, p) => a + p.w / p.h, 0) / items.length : 1.5;
  const target = Math.max(120, (width - gap * (cols - 1)) / (cols * avgRatio));

  const tile = (p: ClientPhoto, style: React.CSSProperties, sizePx: number) => (
    <div
      key={p.id}
      className={styles.tile}
      style={{ ...style, backgroundImage: p.ph ? `url(${p.ph})` : undefined }}
      onClick={() => onOpen(p)}
      role="button"
      tabIndex={0}
      aria-label={p.kind === 'video' ? `Lire ${p.name}` : `Agrandir ${p.name}`}
      onKeyDown={(e) => {
        if (e.key === 'Enter') onOpen(p);
      }}
    >
      {p.thumb ? (
        <LazyImg src={p.thumb} srcSet={`${p.thumb} 640w, ${p.screen} 1600w`} sizes={`${Math.ceil(sizePx)}px`} alt={p.name} />
      ) : null}
      {p.kind === 'video' ? (
        <>
          <div className={styles.play}>
            <span>
              <Play size={22} />
            </span>
          </div>
          {p.duration ? <span className={styles.duration}>{formatDuration(p.duration)}</span> : null}
          {reviewMode ? <span className={styles.reviewBadge}>Review</span> : null}
        </>
      ) : null}
      {favEnabled && favs.has(p.id) ? (
        <span className={styles.favBadge}>
          <Heart size={18} />
        </span>
      ) : null}
      {favEnabled || canDownload ? (
        <div className={styles.tileActions} onClick={(e) => e.stopPropagation()}>
          {favEnabled ? (
            <button className={`${styles.tileBtn} ${favs.has(p.id) ? styles.faved : ''}`} onClick={() => onFav(p.id)} aria-label="Favori">
              <Heart size={16} />
            </button>
          ) : null}
          {canDownload ? (
            <button className={styles.tileBtn} onClick={() => onDownload(p)} aria-label="Télécharger">
              <Download size={16} />
            </button>
          ) : null}
        </div>
      ) : null}
    </div>
  );

  /** Vignette, précédée de son nom si l'option est active. */
  const cell = (p: ClientPhoto, wrapStyle: React.CSSProperties, tileStyle: React.CSSProperties, sizePx: number) =>
    showNames ? (
      <div key={p.id} className={styles.cell} style={wrapStyle}>
        <div className={styles.caption} style={{ height: CAPTION }} title={p.name}>
          {label(p)}
        </div>
        {tile(p, tileStyle, sizePx)}
      </div>
    ) : (
      tile(p, { ...wrapStyle, ...tileStyle }, sizePx)
    );

  if (design.grid === 'square') {
    return (
      <div ref={ref} className={styles.square} style={{ ['--gap' as any]: `${gap}px`, gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))` }}>
        {items.map((p) => cell(p, {}, {}, width / cols))}
      </div>
    );
  }
  if (design.grid === 'masonry') {
    return (
      <div ref={ref} className={styles.masonry} style={{ ['--gap' as any]: `${gap}px`, columnCount: cols }}>
        {items.map((p) => cell(p, {}, { aspectRatio: `${p.w} / ${p.h}` }, width / cols))}
      </div>
    );
  }
  const rows = width ? justify(items, width, target, gap) : [];
  return (
    <div ref={ref} className={styles.justified} style={{ gap }}>
      {rows.map((r, i) => (
        <div className={styles.row} key={i} style={{ gap, height: r.h + (showNames ? CAPTION : 0) }}>
          {r.items.map((p) => {
            const w = (r.h * p.w) / p.h;
            return showNames ? cell(p, { width: w, flex: 'none' }, { width: '100%', height: r.h }, w) : tile(p, { width: w, height: r.h }, w);
          })}
        </div>
      ))}
    </div>
  );
}

/* ── Visionneuse ───────────────────────────────────────────────────────── */

function goodConnection() {
  const c = (navigator as any).connection;
  if (!c) return true;
  if (c.saveData) return false;
  return !c.effectiveType || c.effectiveType === '4g';
}
function pickLarge(p: ClientPhoto) {
  if (typeof window === 'undefined') return p.screen;
  const px = Math.max(window.innerWidth, window.innerHeight) * (window.devicePixelRatio || 1);
  return p.web && px > 1900 && goodConnection() ? p.web : p.screen;
}

function Lightbox({
  lb,
  playing,
  favs,
  favEnabled,
  canDownload,
  onClose,
  onStep,
  onJump,
  onTogglePlay,
  onFav,
  onDownload,
  touch,
}: {
  lb: { list: ClientPhoto[]; i: number };
  playing: boolean;
  favs: Set<string>;
  favEnabled: boolean;
  canDownload: boolean;
  onClose: () => void;
  onStep: (d: number) => void;
  onJump: (i: number) => void;
  onTogglePlay: () => void;
  onFav: (id: string) => void;
  onDownload: (p: ClientPhoto) => void;
  touch: React.MutableRefObject<{ x: number; y: number } | null>;
}) {
  const p = lb.list[lb.i];
  // Fenêtre fixe de miniatures : toujours le même nombre, décalée aux extrémités
  const STRIP = 9;
  const n = lb.list.length;
  const start = Math.max(0, Math.min(lb.i - Math.floor(STRIP / 2), n - STRIP));
  const strip = lb.list.slice(start, start + STRIP).map((x, k) => ({ x, i: start + k }));
  return (
    <div
      className={styles.lb}
      data-playing={playing}
      style={{ ['--slide-ms' as any]: `${SLIDE_MS}ms` }}
      role="dialog"
      aria-modal="true"
      aria-label="Visionneuse"
      onPointerDown={(e) => (touch.current = { x: e.clientX, y: e.clientY })}
      onPointerUp={(e) => {
        const t = touch.current;
        touch.current = null;
        if (!t || p.kind === 'video') return;
        const dx = e.clientX - t.x;
        const dy = e.clientY - t.y;
        if (Math.abs(dx) > 50 && Math.abs(dx) > Math.abs(dy)) onStep(dx < 0 ? 1 : -1);
        else if (dy > 90) onClose();
      }}
    >
      <div className={styles.lbTop}>
        <span className={styles.lbCounter}>
          {lb.i + 1} / {lb.list.length}
        </span>
        <span className={styles.lbName}>{p.name}</span>
        <span className={styles.lbSpacer} />
        {favEnabled ? (
          <button className={`${styles.lbBtn} ${favs.has(p.id) ? styles.faved : ''}`} onClick={() => onFav(p.id)} aria-label="Favori">
            <Heart size={20} fill={favs.has(p.id) ? 'currentColor' : 'none'} />
          </button>
        ) : null}
        {canDownload ? (
          <button className={styles.lbBtn} onClick={() => onDownload(p)} aria-label="Télécharger">
            <Download size={20} />
          </button>
        ) : null}
        {p.kind === 'image' && lb.list.length > 1 ? (
          <button className={styles.lbBtn} onClick={onTogglePlay} aria-label={playing ? 'Pause' : 'Diaporama'}>
            {playing ? <Pause size={20} /> : <Play size={20} />}
          </button>
        ) : null}
        <button className={styles.lbBtn} onClick={onClose} aria-label="Fermer">
          <X size={22} />
        </button>
      </div>

      <div className={styles.lbStage}>
        {p.kind === 'video' ? (
          <video key={p.id} className={styles.lbVideo} src={p.src || undefined} poster={p.screen || undefined} controls autoPlay playsInline controlsList="nodownload" />
        ) : (
          <img key={p.id} src={pickLarge(p)} alt={p.name} draggable={false} onContextMenu={(e) => e.preventDefault()} />
        )}
      </div>

      {lb.list.length > 1 ? (
        <>
          <button className={`${styles.lbNav} ${styles.lbPrev}`} onClick={() => onStep(-1)} aria-label="Précédente">
            <ChevronLeft size={26} />
          </button>
          <button className={`${styles.lbNav} ${styles.lbNext}`} onClick={() => onStep(1)} aria-label="Suivante">
            <ChevronRight size={26} />
          </button>
          <div className={styles.lbStrip}>
            {strip.map(({ x, i }) => (
              <button key={x.id} aria-current={i === lb.i} onClick={() => onJump(i)} aria-label={`Photo ${i + 1}`}>
                {x.thumb ? <img src={x.thumb} alt="" /> : null}
              </button>
            ))}
          </div>
        </>
      ) : null}
      <div key={`${lb.i}-${playing}`} className={styles.lbProgress} />
    </div>
  );
}

/* ── Dialogues ─────────────────────────────────────────────────────────── */

function Dialog({ title, sub, onClose, children }: { title: string; sub?: string; onClose: () => void; children: React.ReactNode }) {
  useEffect(() => {
    const k = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', k);
    return () => window.removeEventListener('keydown', k);
  }, [onClose]);
  return (
    <div className={styles.overlay} onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className={styles.dialog} role="dialog" aria-modal="true" aria-label={title}>
        <button className={styles.dialogClose} onClick={onClose} aria-label="Fermer">
          <X size={18} />
        </button>
        <h2>{title}</h2>
        {sub ? <p className={styles.sub}>{sub}</p> : null}
        {children}
      </div>
    </div>
  );
}

function Option({ checked, onClick, title, sub }: { checked: boolean; onClick: () => void; title: string; sub?: string }) {
  return (
    <button className={styles.option} role="radio" aria-checked={checked} onClick={onClick}>
      <div>
        <b>{title}</b>
        {sub ? <small>{sub}</small> : null}
      </div>
      <span className={styles.radio} />
    </button>
  );
}

function DownloadDialog({
  sets,
  hasUnsorted,
  photos,
  favCount,
  download,
  favoritesEnabled,
  onClose,
  onGo,
}: {
  sets: GallerySet[];
  hasUnsorted: boolean;
  photos: ClientPhoto[];
  favCount: number;
  download: DownloadSettings;
  favoritesEnabled: boolean;
  onClose: () => void;
  onGo: (r: DlRequest) => void;
}) {
  const scopes = download.scopes.filter((s) => s !== 'photo' && (s !== 'favorites' || (favoritesEnabled && favCount > 0)) && (s !== 'set' || sets.length > 0));
  const [scope, setScope] = useState<DlRequest['scope']>((scopes[0] as any) || 'all');
  const [setId, setSetId] = useState<string>(sets[0]?.id || '');
  const [size, setSize] = useState<'original' | 'web'>(download.sizes.includes('original') ? 'original' : 'web');
  const [busy, setBusy] = useState(false);

  const totalOriginal = photos.reduce((a, p) => a + p.size, 0);
  const hdNote = formatBytes(totalOriginal);

  return (
    <Dialog title="Télécharger" sub="Les fichiers sont enregistrés dans une archive ZIP." onClose={onClose}>
      {scopes.length > 1 || scopes[0] === 'set' ? <div className={styles.groupLabel}>Quels fichiers ?</div> : null}
      {scopes.includes('all') && scopes.length > 1 ? (
        <Option checked={scope === 'all'} onClick={() => setScope('all')} title="Toute la galerie" sub={`${photos.length} éléments`} />
      ) : null}
      {scopes.includes('set') ? (
        <>
          <Option checked={scope === 'set'} onClick={() => setScope('set')} title="Une section" sub={sets.map((s) => s.name).join(' · ')} />
          {scope === 'set' ? (
            <select className={styles.select} value={setId} onChange={(e) => setSetId(e.target.value)} aria-label="Section">
              {sets.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
              {hasUnsorted ? <option value="">Autres</option> : null}
            </select>
          ) : null}
        </>
      ) : null}
      {scopes.includes('favorites') ? (
        <Option checked={scope === 'favorites'} onClick={() => setScope('favorites')} title="Mes favoris" sub={`${favCount} élément${favCount > 1 ? 's' : ''}`} />
      ) : null}

      {download.sizes.length > 1 ? (
        <>
          <div className={styles.groupLabel}>Quelle taille ?</div>
          <Option checked={size === 'original'} onClick={() => setSize('original')} title="Haute définition" sub={`Fichiers originaux · ~${hdNote} pour toute la galerie`} />
          <Option checked={size === 'web'} onClick={() => setSize('web')} title="Web" sub="2560 px · idéal pour les réseaux et l’e-mail" />
        </>
      ) : null}

      <button
        className={styles.primary}
        disabled={busy}
        onClick={async () => {
          setBusy(true);
          await onGo({ scope, setId: scope === 'set' ? setId || null : undefined, size });
          setBusy(false);
        }}
      >
        {busy ? <Loader2 size={16} /> : <Download size={16} />} Télécharger
      </button>
      <p className={styles.note}>Sur ordinateur, choisissez où enregistrer l’archive. Sur téléphone, elle arrive dans vos Téléchargements / Fichiers.</p>
    </Dialog>
  );
}

function IdentifyDialog({
  slug,
  headers,
  onClose,
  onDone,
}: {
  slug: string;
  headers: Record<string, string>;
  onClose: () => void;
  onDone: (favs: string[]) => void;
}) {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  return (
    <Dialog title="Vos favoris" sub="Indiquez votre nom et votre e-mail : vous retrouverez votre sélection sur tous vos appareils." onClose={onClose}>
      <form
        onSubmit={async (e) => {
          e.preventDefault();
          setBusy(true);
          setError(null);
          const res = await fetch(`/api/client/${slug}/visitor`, {
            method: 'POST',
            headers,
            body: JSON.stringify({ name, email }),
          }).catch(() => null);
          const j = res ? await res.json().catch(() => ({})) : {};
          setBusy(false);
          if (!res?.ok) return setError(j.error || 'Une erreur est survenue');
          onDone(j.favorites || []);
        }}
      >
        <input className={styles.input} placeholder="Prénom et nom" value={name} onChange={(e) => setName(e.target.value)} autoComplete="name" autoFocus />
        <input className={styles.input} type="email" placeholder="Adresse e-mail" value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="email" required />
        {error ? <div className={styles.error}>{error}</div> : null}
        <button className={styles.primary} type="submit" disabled={busy || !email.trim()}>
          Continuer
        </button>
      </form>
    </Dialog>
  );
}
