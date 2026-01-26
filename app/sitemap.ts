import { fetchProjects } from '../lib/helpers';

export const dynamic = 'force-dynamic';

export async function GET() {
  // Disable dynamic sitemap route to avoid prerender-time conflicts with public/sitemap.xml
  // The static `public/sitemap.xml` will be served instead.
  return new Response(null, { status: 404 });
}

// For compatibility with Turbopack route entries which import the default export
export default GET;
