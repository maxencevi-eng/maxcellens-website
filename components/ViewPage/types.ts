export type ViewBlockType = 'text' | 'link' | 'video' | 'photo' | 'map';

export type ViewBlockSize = 'square' | 'wide' | 'compact' | 'tall' | 'large';
// square  = 1 col × 1 row
// wide    = 2 cols × 1 row
// compact = 2 cols × ~half row (height ~80px)
// tall    = 1 col × 2 rows
// large   = 2 cols × 2 rows

export type Align = 'left' | 'center' | 'right';

export type TitleStyleKey = 'h1' | 'h2' | 'h3' | 'h4' | 'h5' | 'p';

export interface ViewBlock {
  id: string;
  type: ViewBlockType;
  size: ViewBlockSize;
  backgroundColor?: string;
  textColor?: string;
  caption?: string;
  noShadow?: boolean;

  // TEXT block
  textHtml?: string;
  fontSize?: number;
  fontFamily?: string;
  align?: Align;

  // LINK block
  url?: string;
  linkTitle?: string;
  linkDescription?: string;
  linkFaviconUrl?: string;
  linkImageUrl?: string;
  linkImagePath?: string;

  // VIDEO block
  videoUrl?: string;

  // PHOTO block
  photos?: Array<{ url: string; path?: string; focus?: { x: number; y: number } }>;
  photoInterval?: number; // seconds between slides, 0 = manual
  hideCounter?: boolean;

  // MAP block
  mapQuery?: string;
}

export interface ViewProfile {
  imageUrl?: string;
  imagePath?: string;
  title?: string;
  titleStyle?: TitleStyleKey;
  titleFontSize?: number;
  titleColor?: string;
  titleAlign?: Align;
  subtitle?: string;
  subtitleFontSize?: number;
  subtitleColor?: string;
  subtitleAlign?: Align;
  backgroundImageUrl?: string;
  backgroundImagePath?: string;
}
