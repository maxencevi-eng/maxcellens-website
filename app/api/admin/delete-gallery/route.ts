import { NextResponse } from "next/server";
import { supabaseAdmin } from "../../../../lib/supabaseAdmin";

const BUCKET_MEDIAS = "medias";
const GALLERIES_PREFIX = "Galleries";

/** Extrait un chemin relatif au bucket medias depuis une URL ou un path stocké. */
function toMediasPath(val: string | undefined | null): string | null {
  if (!val || typeof val !== "string") return null;
  const s = val.trim();
  if (!s) return null;
  const m = s.match(/\/storage\/v1\/object\/public\/medias\/(.+)$/i);
  if (m?.[1]) return m[1];
  const base = (process.env.NEXT_PUBLIC_SUPABASE_URL || "").replace(/\/$/, "");
  if (base && s.startsWith(base + "/storage/v1/object/public/medias/")) {
    return s.slice((base + "/storage/v1/object/public/medias/").length);
  }
  if (/^https?:\/\//i.test(s)) return null;
  return s;
}

function normalizeSlug(slug: string): string {
  return slug
    .toLowerCase()
    .trim()
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .replace(/\s+/g, "-")
    .replace(/[^a-z0-9-]/g, "")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "")
    || slug.toLowerCase();
}

/** Liste récursivement tous les fichiers sous un préfixe (Supabase retourne des noms, pas de chemins complets). */
async function listAllPaths(bucket: string, prefix: string): Promise<string[]> {
  const paths: string[] = [];
  const prefixNorm = prefix.replace(/\/+$/, "");

  async function listDir(p: string) {
    const { data, error } = await supabaseAdmin.storage.from(bucket).list(p, { limit: 1000 });
    if (error || !data) return;
    for (const item of data) {
      const fullPath = p ? `${p}/${item.name}` : item.name;
      if (item.id != null) {
        paths.push(fullPath);
      } else {
        await listDir(fullPath);
      }
    }
  }

  await listDir(prefixNorm);
  return paths;
}

export async function POST(req: Request) {
  try {
    if (!supabaseAdmin) {
      return NextResponse.json({ error: "Admin credentials not configured" }, { status: 503 });
    }
    const body = await req.json();
    const slug = body?.slug != null ? String(body.slug).trim() : "";
    const headerImagePath = body?.headerImagePath != null ? String(body.headerImagePath).trim() : "";

    if (!slug) {
      return NextResponse.json({ error: "Missing slug" }, { status: 400 });
    }

    const normalizedSlug = normalizeSlug(slug);
    const photosKey = `gallery_photos_${normalizedSlug}`;
    const pathsToDelete: string[] = [];

    // 1) Récupérer les chemins des photos depuis site_settings
    const { data: row } = await supabaseAdmin
      .from("site_settings")
      .select("value")
      .eq("key", photosKey)
      .maybeSingle();

    if (row?.value) {
      try {
        const parsed = JSON.parse(row.value as string);
        const items = parsed?.items ?? [];
        for (const it of items) {
          const path = toMediasPath(it.image_path ?? it.path ?? it.image_url);
          if (path) pathsToDelete.push(path);
        }
      } catch (_) {
        // ignore parse error
      }
    }

    // 2) Image header de la galerie
    const headerPath = toMediasPath(headerImagePath);
    if (headerPath) pathsToDelete.push(headerPath);

    // 3) Lister tout le dossier Galleries/<slug>/ et supprimer tous les fichiers
    const folderPrefix = `${GALLERIES_PREFIX}/${normalizedSlug}`;
    const listed = await listAllPaths(BUCKET_MEDIAS, folderPrefix);
    for (const p of listed) {
      if (!pathsToDelete.includes(p)) pathsToDelete.push(p);
    }

    // Suppression en lot (Supabase limite ~1000 par appel)
    if (pathsToDelete.length > 0) {
      const chunk = 500;
      for (let i = 0; i < pathsToDelete.length; i += chunk) {
        const slice = pathsToDelete.slice(i, i + chunk);
        const { error: removeError } = await supabaseAdmin.storage.from(BUCKET_MEDIAS).remove(slice);
        if (removeError) {
          console.warn("delete-gallery: remove storage failed", removeError);
        }
      }
    }

    // 4) Supprimer la clé site_settings gallery_photos_<slug>
    await supabaseAdmin.from("site_settings").delete().eq("key", photosKey);

    // 5) Supprimer le hero associé à cette galerie (headers + site_settings hero_galeries-<slug>)
    const heroPage = `galeries-${normalizedSlug}`;
    const heroStoreKey = `hero_${heroPage}`;
    await supabaseAdmin.from("headers").delete().eq("page", heroPage);
    await supabaseAdmin.from("site_settings").delete().eq("key", heroStoreKey);

    return NextResponse.json({ ok: true, deletedPaths: pathsToDelete.length });
  } catch (err: any) {
    console.error("delete-gallery error", err);
    return NextResponse.json({ error: err?.message ?? String(err) }, { status: 500 });
  }
}
