/**
 * Types partagés (serveur + navigateur) des galeries clients.
 * Aucun import serveur ici : ce fichier est importé par les composants client.
 */

export type AccessMode = 'password' | 'link' | 'public';
export type DownloadSize = 'original' | 'web';
export type DownloadScope = 'photo' | 'set' | 'all' | 'favorites';

export type DownloadSettings = {
  enabled: boolean;
  sizes: DownloadSize[];
  scopes: DownloadScope[];
  pin: boolean;
};

export type FavoriteSettings = {
  enabled: boolean;
  limit: number | null;
};

export type CoverLayout = 'full' | 'center' | 'split' | 'frame' | 'editorial' | 'minimal';
export type Theme = 'light' | 'sand' | 'stone' | 'night';
export type FontPair = 'serif' | 'sans' | 'modern';
export type GridStyle = 'justified' | 'masonry' | 'square';

export type DesignSettings = {
  cover: CoverLayout;
  theme: Theme;
  font: FontPair;
  grid: GridStyle;
  gap: number;
  /** Afficher le nom des fichiers au-dessus des vignettes (côté client). */
  showNames: boolean;
  /** Images par ligne sur ordinateur (2 à 6) ; réduit automatiquement sur tablette et mobile. */
  columns: number;
  focus?: { x: number; y: number };
};

export const DEFAULT_DOWNLOAD: DownloadSettings = {
  enabled: true,
  sizes: ['original', 'web'],
  scopes: ['photo', 'set', 'all', 'favorites'],
  pin: false,
};
export const DEFAULT_FAVORITES: FavoriteSettings = { enabled: false, limit: null };
export const DEFAULT_DESIGN: DesignSettings = {
  cover: 'full',
  theme: 'light',
  font: 'serif',
  grid: 'justified',
  gap: 8,
  columns: 4,
  showNames: false,
};

export function normalizeDownload(v: any): DownloadSettings {
  const d = { ...DEFAULT_DOWNLOAD, ...(v && typeof v === 'object' ? v : {}) };
  d.sizes = Array.isArray(d.sizes) ? d.sizes.filter((s: any) => s === 'original' || s === 'web') : DEFAULT_DOWNLOAD.sizes;
  d.scopes = Array.isArray(d.scopes)
    ? d.scopes.filter((s: any) => ['photo', 'set', 'all', 'favorites'].includes(s))
    : DEFAULT_DOWNLOAD.scopes;
  d.enabled = !!d.enabled && d.sizes.length > 0 && d.scopes.length > 0;
  d.pin = !!d.pin;
  return d;
}
/** Mode review : les vidéos s'ouvrent dans une salle de commentaires horodatés. */
export type ReviewSettings = { enabled: boolean };
export function normalizeReview(v: any): ReviewSettings {
  return { enabled: !!(v && typeof v === 'object' && v.enabled) };
}

export function normalizeFavorites(v: any): FavoriteSettings {
  const f = { ...DEFAULT_FAVORITES, ...(v && typeof v === 'object' ? v : {}) };
  const limit = Number(f.limit);
  return { enabled: !!f.enabled, limit: Number.isFinite(limit) && limit > 0 ? Math.round(limit) : null };
}
export function normalizeDesign(v: any): DesignSettings {
  const d = { ...DEFAULT_DESIGN, ...(v && typeof v === 'object' ? v : {}) };
  if (!['full', 'center', 'split', 'frame', 'editorial', 'minimal'].includes(d.cover)) d.cover = 'full';
  if (!['light', 'sand', 'stone', 'night'].includes(d.theme)) d.theme = 'light';
  if (!['serif', 'sans', 'modern'].includes(d.font)) d.font = 'serif';
  if (!['justified', 'masonry', 'square'].includes(d.grid)) d.grid = 'justified';
  const gap = Number(d.gap);
  d.gap = Number.isFinite(gap) ? Math.max(0, Math.min(24, Math.round(gap))) : 8;
  d.showNames = !!d.showNames;
  const columns = Number(d.columns);
  d.columns = Number.isFinite(columns) ? Math.max(2, Math.min(6, Math.round(columns))) : 4;
  if (d.focus && (typeof d.focus.x !== 'number' || typeof d.focus.y !== 'number')) delete d.focus;
  return d;
}

/** Réglages portés par un modèle — copiés dans la galerie à sa création. */
export type TemplateSettings = {
  access_mode?: AccessMode;
  magic_link_enabled?: boolean;
  email_gate?: boolean;
  /** Expiration relative, en mois après la création (0 / null = jamais). */
  expiry_months?: number | null;
  /** id de filigrane ; `true` = premier filigrane disponible (modèles livrés). */
  watermark_id?: string | null;
  watermark?: boolean;
  download?: Partial<DownloadSettings>;
  favorites?: Partial<FavoriteSettings>;
  review?: Partial<ReviewSettings>;
  design?: Partial<DesignSettings>;
  share_message?: string | null;
  /** Mot d'accueil affiché sous la couverture. */
  intro?: string | null;
  tags?: string[];
};

export type Template = {
  id: string;
  name: string;
  description: string | null;
  is_default: boolean;
  settings: TemplateSettings;
  position: number;
};

export type Watermark = {
  id: string;
  name: string;
  kind: 'text' | 'image';
  text: string | null;
  image_data: string | null;
  position: 'tl' | 'tc' | 'tr' | 'cl' | 'c' | 'cr' | 'bl' | 'bc' | 'br' | 'tile';
  scale: number;
  opacity: number;
  margin: number;
  color: string;
  updated_at?: string;
};

export type Folder = {
  id: string;
  name: string;
  event_date: string | null;
  created_at: string;
  /** Dossier parent (null = racine). */
  parent_id?: string | null;
  /** Ordre parmi les dossiers du même parent. */
  position?: number;
};

/** Galerie telle que vue par l'admin (mot de passe déchiffré). */
export type AdminGallery = {
  id: string;
  slug: string;
  title: string;
  client_name: string | null;
  client_email: string | null;
  event_date: string | null;
  folder_id: string | null;
  template_id: string | null;
  tags: string[];
  status: 'draft' | 'published';
  access_mode: AccessMode;
  password: string | null;
  magic_link_enabled: boolean;
  magic_token: string | null;
  /** Aperçu admin (brouillons compris, vues non comptées). */
  preview_token: string;
  email_gate: boolean;
  expires_at: string | null;
  watermark_id: string | null;
  download: DownloadSettings;
  download_pin: string | null;
  favorites: FavoriteSettings;
  review: ReviewSettings;
  design: DesignSettings;
  share_message: string | null;
  intro: string | null;
  cover_photo_id: string | null;
  cover_url: string | null;
  photo_count: number;
  bytes_total: number;
  stored_bytes: number;
  view_count: number;
  download_count: number;
  first_viewed_at: string | null;
  last_viewed_at: string | null;
  last_download_at: string | null;
  created_at: string;
  updated_at: string;
  published_at: string | null;
  deleted_at: string | null;
};

/** Nature d'un élément livré. Les vidéos ont une image extraite pour vignette. */
export type MediaKind = 'image' | 'video' | 'file';

export type AdminPhoto = {
  id: string;
  kind: MediaKind;
  set_id: string | null;
  position: number;
  filename: string;
  ext: string;
  content_type: string;
  width: number | null;
  height: number | null;
  bytes: number;
  stored_bytes: number;
  duration: number | null;
  placeholder: string | null;
  hidden: boolean;
  wm_key: string | null;
  has_web: boolean;
  has_preview: boolean;
  thumb_url: string;
};

export type GallerySet = { id: string; name: string; position: number };

/** Élément envoyé au navigateur du client. */
export type ClientPhoto = {
  id: string;
  kind: MediaKind;
  set_id: string | null;
  name: string;
  ext: string;
  size: number;
  duration: number | null;
  w: number;
  h: number;
  ph: string | null;
  /** Vignettes — vides pour un document sans aperçu. */
  thumb: string;
  screen: string;
  web: string | null;
  /** Vidéo : lecture en streaming ; document : ouverture dans le navigateur. */
  src: string | null;
};

/** Variantes stockées pour chaque élément. */
export type RenditionKind = 'original' | 'thumb' | 'screen' | 'web' | 'thumb-wm' | 'screen-wm';

export const RENDITION_SIZES = { thumb: 640, screen: 1600, web: 2560 } as const;

/** Photos : 40 Mo ; vidéos et documents : 2 Go (envoi direct navigateur → R2). */
export const MAX_IMAGE_BYTES = 40 * 1024 * 1024;
export const MAX_FILE_BYTES = 2 * 1024 * 1024 * 1024;

/** Offre gratuite Cloudflare R2 — sert de repère à la jauge d'espace. */
export const R2_FREE_BYTES = 10 * 1000 * 1000 * 1000;

const IMAGE_EXT = /\.(jpe?g|png|webp|avif|gif|tiff?|heic|heif)$/i;
const VIDEO_EXT = /\.(mp4|mov|m4v|webm|mkv|avi)$/i;

/** Images que le navigateur sait décoder pour produire les rendus. */
export function isRenderableImage(type: string, name: string) {
  return /^image\/(jpeg|png|webp|avif|gif)$/.test(type) || /\.(jpe?g|png|webp|avif|gif)$/i.test(name);
}

export function mediaKindOf(type: string, name: string): MediaKind {
  if (isRenderableImage(type, name)) return 'image';
  if (type.startsWith('video/') || VIDEO_EXT.test(name)) return 'video';
  if (type.startsWith('image/') || IMAGE_EXT.test(name)) return 'file'; // TIFF / HEIC : livrés tels quels
  return 'file';
}

export function formatBytes(n: number): string {
  if (!n) return '0 o';
  const u = ['o', 'Ko', 'Mo', 'Go', 'To'];
  const i = Math.min(u.length - 1, Math.floor(Math.log(n) / Math.log(1000)));
  const v = n / Math.pow(1000, i);
  return `${v.toLocaleString('fr-FR', { maximumFractionDigits: v < 10 && i > 1 ? 1 : 0 })} ${u[i]}`;
}

export function formatDuration(sec: number | null | undefined): string {
  if (!sec || !Number.isFinite(sec)) return '';
  const s = Math.round(sec);
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const r = String(s % 60).padStart(2, '0');
  return h ? `${h}:${String(m).padStart(2, '0')}:${r}` : `${m}:${r}`;
}

export function slugify(s: string): string {
  return (
    String(s || '')
      .toLowerCase()
      .normalize('NFD')
      .replace(/\p{Diacritic}/gu, '')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .slice(0, 80) || 'galerie'
  );
}

export function clientUrl(origin: string, slug: string, magicToken?: string | null): string {
  const base = `${origin.replace(/\/$/, '')}/client/${slug}`;
  return magicToken ? `${base}?k=${magicToken}` : base;
}

export const DEFAULT_SHARE_MESSAGE = `Bonjour {client},

Vos photos « {titre} » sont disponibles :
{lien}
{motdepasse_ligne}
{expiration_ligne}
Belle journée,
Maxcellens — Photographe & Vidéaste`;

export function renderShareMessage(
  tpl: string | null | undefined,
  g: Pick<AdminGallery, 'title' | 'client_name' | 'password' | 'access_mode' | 'expires_at' | 'download_pin'>,
  link: string
): string {
  const exp = g.expires_at ? new Date(g.expires_at).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' }) : '';
  const vars: Record<string, string> = {
    client: (g.client_name || '').split(' ')[0] || '',
    titre: g.title,
    lien: link,
    motdepasse: g.password || '',
    motdepasse_ligne: g.access_mode === 'password' && g.password ? `Mot de passe : ${g.password}\n` : '',
    pin: g.download_pin || '',
    expiration: exp,
    expiration_ligne: exp ? `Disponibles jusqu'au ${exp}.\n` : '',
  };
  return (tpl || DEFAULT_SHARE_MESSAGE)
    .replace(/\{(\w+)\}/g, (m, k) => (k in vars ? vars[k] : m))
    .replace(/Bonjour ,/, 'Bonjour,')
    .replace(/\n{3,}/g, '\n\n');
}

/** Signature du filigrane : change dès qu'un réglage change → régénération des rendus. */
export function watermarkKey(w: Pick<Watermark, 'id' | 'updated_at'> | null | undefined): string | null {
  if (!w) return null;
  return `${w.id}:${new Date(w.updated_at || 0).getTime()}`;
}

/* ── Review vidéo ──────────────────────────────────────────────────────── */

export type ReviewComment = {
  id: string;
  photo_id: string;
  author_role: 'client' | 'admin';
  author_name: string | null;
  /** Vrai si le commentaire appartient au visiteur courant (suppression possible). */
  mine?: boolean;
  body: string;
  timecode: number | null;
  parent_id: string | null;
  resolved: boolean;
  created_at: string;
};

export type ReviewSubmission = {
  id: string;
  photo_id: string;
  visitor_name: string | null;
  visitor_email: string | null;
  message: string | null;
  comment_count: number;
  notified: boolean;
  seen_at: string | null;
  created_at: string;
};

/** 75.4 → « 1:15 » ; 3725 → « 1:02:05 ». */
export function formatTimecode(sec: number | null | undefined): string {
  if (sec == null || !Number.isFinite(sec)) return '';
  const s = Math.max(0, Math.floor(sec));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const r = String(s % 60).padStart(2, '0');
  return h ? `${h}:${String(m).padStart(2, '0')}:${r}` : `${m}:${r}`;
}
