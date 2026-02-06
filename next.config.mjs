import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

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
      {
        source: '/favicon.svg',
        headers: [
          { key: 'Cache-Control', value: 'public, max-age=31536000, immutable' },
        ],
      },
      {
        source: '/og-image.jpg',
        headers: [
          { key: 'Cache-Control', value: 'public, max-age=31536000, immutable' },
        ],
      },
      {
        source: '/robots.txt',
        headers: [
          { key: 'Cache-Control', value: 'public, max-age=86400, s-maxage=86400' },
        ],
      },
      {
        source: '/sitemap.xml',
        headers: [
          { key: 'Cache-Control', value: 'public, max-age=86400, s-maxage=86400' },
        ],
      },
    ];
  },
  reactCompiler: false,
  experimental: {
    optimizePackageImports: ['lucide-react', 'framer-motion'],
  },
  // Stub @tiptap/react (projet migré sur Lexical) pour éviter erreurs HMR / chunks fantômes
  // Turbopack n'accepte pas les chemins absolus Windows → chemins relatifs au projet
  turbopack: {
    root: __dirname,
    resolveAlias: {
      '@tiptap/react': './lib/stub-tiptap-react.ts',
      '@tiptap/react/dist/index.js': './lib/stub-tiptap-react.ts',
    },
  },
  webpack: (config) => {
    config.resolve.alias = {
      ...config.resolve?.alias,
      '@tiptap/react': path.resolve(__dirname, 'lib/stub-tiptap-react.ts'),
    };
    return config;
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
