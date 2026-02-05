/** @type {import('next').NextConfig} */
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL ?? '';
let supabaseHostname = '';
try {
  supabaseHostname = new URL(supabaseUrl).hostname;
} catch (e) {
  // ignore
}

const nextConfig = {
  reactStrictMode: true,
  images: {
    remotePatterns: [
      ...(supabaseHostname ? [{ protocol: 'https', hostname: supabaseHostname }] : []),
      { protocol: 'https', hostname: 'images.unsplash.com' },
    ],
  },
  async headers() {
    return [
      {
        source: '/_next/static/:path*',
        headers: [
          { key: 'Cache-Control', value: 'public, max-age=31536000, immutable' },
        ],
      },
    ];
  },
  async redirects() {
    return [
      { source: '/galleries', destination: '/galeries', permanent: true },
      { source: '/production', destination: '/realisation', permanent: true },
      { source: '/services/production', destination: '/realisation', permanent: true },
      { source: '/services/realisation', destination: '/realisation', permanent: true },
      { source: '/services/evenement', destination: '/evenement', permanent: true },
      { source: '/services/corporate', destination: '/corporate', permanent: true },
      { source: '/services/portrait', destination: '/portrait', permanent: true },
      { source: '/services/animation', destination: '/animation', permanent: true },
      { source: '/services', destination: '/', permanent: true },
    ];
  },
};

export default nextConfig;
