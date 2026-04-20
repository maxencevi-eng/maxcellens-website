export type Project = {
  id: string;
  title: string;
  slug: string;
  description?: string;
  image_url: string;
  video_url?: string;
  width?: number;
  height?: number;
  type?: 'photo' | 'video';
  published_at?: string;
};
