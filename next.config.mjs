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

// En-têtes de sécurité appliqués à toutes les réponses. La CSP se limite aux
// directives sans risque pour le rendu (le site s'appuie sur des scripts
// inline et des médias tiers : YouTube, Vimeo, OpenStreetMap, Supabase, R2).
const securityHeaders = [
  { key: 'Content-Security-Policy', value: "frame-ancestors 'self'; base-uri 'self'; object-src 'none'; form-action 'self'; upgrade-insecure-requests" },
  { key: 'X-Frame-Options', value: 'SAMEORIGIN' },
  { key: 'X-Content-Type-Options', value: 'nosniff' },
  { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
  { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=(), payment=(), usb=(), interest-cohort=()' },
];

const nextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
  serverExternalPackages: ['sharp'],
  images: {
    // Les images sont compressées en WebP à l'envoi, avec des déclinaisons
    // 480 / 960 / 1600 / 2400 px (lib/imageVariants.ts). Le loader choisit la
    // bonne déclinaison : aucun réencodage à la volée par Vercel.
    loader: 'custom',
    loaderFile: './lib/imageLoader.ts',
    deviceSizes: [480, 640, 960, 1280, 1600, 1920, 2400, 3200],
    imageSizes: [160, 240, 320],
    remotePatterns: [
      ...(supabaseHostname ? [{ protocol: 'https', hostname: supabaseHostname }] : []),
      { protocol: 'https', hostname: 'images.unsplash.com' },
    ],
  },
  async headers() {
    return [
      { source: '/:path*', headers: securityHeaders },
      // Cache « immuable » d'un an : seulement en production, où les fichiers
      // de /_next/static portent un hash de contenu. En développement, leurs
      // noms restent stables d'une modification à l'autre : le navigateur
      // resservait alors d'anciennes feuilles de style à chaque navigation.
      ...(process.env.NODE_ENV === 'production'
        ? [
            {
              source: '/_next/static/:path*',
              headers: [
                { key: 'Cache-Control', value: 'public, max-age=31536000, immutable' },
              ],
            },
          ]
        : []),
      {
        source: '/favicon.svg',
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
    optimizePackageImports: ['lucide-react', 'framer-motion', 'qrcode.react'],
  },
  turbopack: {
    root: __dirname,
  },
  // Serve all BAC system pages at /animation/* (canonical URL)
  async rewrites() {
    return [
      { source: '/animation/:path+', destination: '/bac/:path+' },
    ];
  },
  async redirects() {
    return [
      // Site redirects
      { source: '/galleries', destination: '/galeries', permanent: true },
      { source: '/production', destination: '/realisation', permanent: true },
      { source: '/services/production', destination: '/realisation', permanent: true },
      { source: '/services/realisation', destination: '/realisation', permanent: true },
      { source: '/services/evenement', destination: '/evenement', permanent: true },
      { source: '/services/corporate', destination: '/corporate', permanent: true },
      { source: '/services/portrait', destination: '/portrait', permanent: true },
      { source: '/services/animation', destination: '/animation', permanent: true },
      { source: '/services', destination: '/', permanent: true },
      // BAC: redirect /bac page-routes → /animation/* (API routes excluded via pattern)
      { source: '/bac', destination: '/animation/connexion', permanent: false },
      { source: '/bac/:slug((?!api(?:/|$)).+)', destination: '/animation/:slug', permanent: false },
    ];
  },
};

export default nextConfig;
