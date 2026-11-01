import { NextResponse } from 'next/server';
import { createGallery, db, getTemplate, guardAdmin, jsonError, rowToAdminGallery } from '@/lib/clientGalleries/db';

export const dynamic = 'force-dynamic';

/**
 * POST /api/admin/client-galleries/batch — création en lot (séance, import
 * en masse) : un dossier facultatif et une galerie par groupe.
 *
 * Corps : { folderName?, folderId?, eventDate?, templateId?, status?,
 *           galleries: [{ key?, title, slug?, templateId?, client_name?, client_email? }] }
 *
 * `templateId` par galerie l'emporte sur celui du lot. Chaque galerie créée
 * renvoie la `key` reçue : le navigateur retrouve ainsi les fichiers du bon
 * groupe même si une création échoue au milieu du lot.
 */
export async function POST(req: Request) {
  const denied = await guardAdmin(req);
  if (denied) return denied;
  const body = await req.json().catch(() => ({}));
  const items: any[] = Array.isArray(body?.galleries) ? body.galleries.filter((x: any) => x?.title?.trim()) : [];
  if (!items.length) return jsonError('Aucune galerie à créer');
  if (items.length > 500) return jsonError('500 galeries maximum par séance');

  let folderId: string | null = body.folderId || null;
  if (!folderId && body.folderName?.trim()) {
    const { data, error } = await db
      .from('client_gallery_folders')
      .insert({
        name: body.folderName.trim(),
        event_date: body.eventDate || null,
        // Sous-dossier du dossier courant si fourni (nécessite la migration des sous-dossiers)
        ...(body.folderParentId ? { parent_id: body.folderParentId } : {}),
      })
      .select('id')
      .single();
    if (error) return jsonError(error.message, 500);
    folderId = data.id;
  }

  const templates = new Map<string, any>();
  const templateFor = async (id: string | null | undefined) => {
    const k = id || '__default__';
    if (!templates.has(k)) templates.set(k, await getTemplate(id || null));
    return templates.get(k);
  };
  const created: (ReturnType<typeof rowToAdminGallery> & { key: string | null })[] = [];
  const failed: { key: string | null; title: string; error: string }[] = [];
  // Séquentiel : garantit des slugs uniques sans conflit d'insertion
  for (const it of items) {
    try {
      const row = await createGallery(
        {
          title: it.title,
          client_name: it.client_name ?? null,
          client_email: it.client_email ?? null,
          event_date: body.eventDate || null,
          folder_id: folderId,
          slug: it.slug || null,
          status: body.status === 'published' ? 'published' : 'draft',
        },
        await templateFor(it.templateId || body.templateId)
      );
      created.push({ ...rowToAdminGallery(row), key: it.key ?? null });
    } catch (e: any) {
      failed.push({ key: it.key ?? null, title: it.title, error: e?.message || 'Erreur' });
    }
  }
  return NextResponse.json({ folderId, galleries: created, failed });
}
