import { NextResponse } from 'next/server';
import { createGallery, db, getTemplate, guardAdmin, jsonError, rowToAdminGallery } from '@/lib/clientGalleries/db';

export const dynamic = 'force-dynamic';

/**
 * POST /api/admin/client-galleries/batch — séance (portraits corporate…) :
 * crée un dossier et une galerie par personne, toutes depuis le même modèle.
 *
 * Corps : { folderName, eventDate?, templateId?, titlePrefix?, status?,
 *           galleries: [{ title, client_name?, client_email? }] }
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
      .insert({ name: body.folderName.trim(), event_date: body.eventDate || null })
      .select('id')
      .single();
    if (error) return jsonError(error.message, 500);
    folderId = data.id;
  }

  const template = await getTemplate(body.templateId);
  const created = [];
  const failed: { title: string; error: string }[] = [];
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
        template
      );
      created.push(rowToAdminGallery(row));
    } catch (e: any) {
      failed.push({ title: it.title, error: e?.message || 'Erreur' });
    }
  }
  return NextResponse.json({ folderId, galleries: created, failed });
}
