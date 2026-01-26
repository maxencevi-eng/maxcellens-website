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
};

export default nextConfig;
