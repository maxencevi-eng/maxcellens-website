import { ImageResponse } from 'next/og';

export const runtime = 'edge';
export const alt = 'Maxcellens — Vidéaste & Photographe Indépendant';
export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL ?? '';
const logoUrl = supabaseUrl
  ? `${supabaseUrl}/storage/v1/object/public/site-assets/logos/header-logo.webp`
  : '';

export default async function Image() {
  return new ImageResponse(
    (
      <div
        style={{
          background: '#213431',
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 28,
        }}
      >
        {logoUrl && (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={logoUrl}
            alt=""
            style={{ maxWidth: 260, maxHeight: 140, objectFit: 'contain' }}
          />
        )}
        <p
          style={{
            color: '#F2F0EB',
            fontSize: 52,
            fontWeight: 700,
            margin: 0,
            letterSpacing: '-1px',
          }}
        >
          Maxcellens
        </p>
        <p style={{ color: '#8fa89f', fontSize: 26, margin: 0 }}>
          Vidéaste &amp; Photographe Indépendant
        </p>
      </div>
    ),
    { ...size }
  );
}
