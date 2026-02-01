"use client";

import React, { useState, useRef } from "react";
import Modal from "../Modal/Modal";

export type GallerySubPageEntry = {
  id: string;
  slug: string;
  name: string;
  headerImageUrl?: string;
  headerImagePath?: string;
  headerImageFocus?: { x: number; y: number };
};

const PAGE_SIZE = 5;

function slugify(s: string): string {
  return s
    .toLowerCase()
    .trim()
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .replace(/\s+/g, "-")
    .replace(/[^a-z0-9-]/g, "")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "") || "galerie";
}

export default function GalleriesPagesEditor({
  pages: initialPages,
  onClose,
  onSaved,
}: {
  pages: GallerySubPageEntry[];
  onClose: () => void;
  onSaved?: () => void;
}) {
  const [pages, setPages] = useState<GallerySubPageEntry[]>(() =>
    initialPages.length ? [...initialPages] : []
  );
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const fileRefs = useRef<Record<string, HTMLInputElement | null>>({});
  /** Si une galerie a été renommée après import de photos, indiquer l'ancien slug pour rattacher les photos. */
  const [attachOldSlug, setAttachOldSlug] = useState<Record<string, string>>({});
  const [currentPage, setCurrentPage] = useState(1);

  const totalPages = Math.max(1, Math.ceil(pages.length / PAGE_SIZE));
  const startIndex = (currentPage - 1) * PAGE_SIZE;
  const visiblePages = pages.slice(startIndex, startIndex + PAGE_SIZE);

  function updatePage(id: string, patch: Partial<GallerySubPageEntry>) {
    setPages((prev) =>
      prev.map((p) => (p.id === id ? { ...p, ...patch } : p))
    );
  }

  function addPage() {
    const id = `gallery-${Date.now()}`;
    const name = "Nouvelle galerie";
    setPages((prev) => [
      ...prev,
      { id, slug: slugify(name), name, headerImageUrl: undefined, headerImagePath: undefined, headerImageFocus: undefined },
    ]);
    setCurrentPage(Math.ceil((pages.length + 1) / PAGE_SIZE));
  }

  function removePage(id: string) {
    setPages((prev) => prev.filter((p) => p.id !== id));
    const newTotal = Math.max(1, Math.ceil((pages.length - 1) / PAGE_SIZE));
    if (currentPage > newTotal) setCurrentPage(newTotal);
  }

  function moveUp(id: string) {
    setPages((prev) => {
      const i = prev.findIndex((p) => p.id === id);
      if (i <= 0) return prev;
      const copy = [...prev];
      [copy[i - 1], copy[i]] = [copy[i], copy[i - 1]];
      return copy;
    });
  }

  function moveDown(id: string) {
    setPages((prev) => {
      const i = prev.findIndex((p) => p.id === id);
      if (i < 0 || i >= prev.length - 1) return prev;
      const copy = [...prev];
      [copy[i], copy[i + 1]] = [copy[i + 1], copy[i]];
      return copy;
    });
  }

  async function uploadHeader(pageId: string, file: File) {
    const page = pages.find((p) => p.id === pageId);
    if (!page) return;
    try {
      const fd = new FormData();
      fd.append("file", file);
      fd.append("page", "galleries");
      fd.append("kind", "image");
      fd.append("folder", `Galleries/${page.slug || "temp"}`);
      if (page.headerImagePath) fd.append("old_path", page.headerImagePath);
      const res = await fetch("/api/admin/upload-hero-media", { method: "POST", body: fd });
      const json = await res.json();
      if (json?.url) {
        updatePage(pageId, { headerImageUrl: json.url, headerImagePath: json.path });
      } else if (json?.error) {
        setMessage("Erreur upload: " + json.error);
      }
    } catch (e) {
      setMessage("Erreur upload");
    }
  }

  async function save() {
    setSaving(true);
    setMessage(null);
    try {
      // Galeries supprimées : supprimer dossier photos (medias), images et clé gallery_photos_<slug>
      const removedPages = initialPages.filter((p) => !pages.some((x) => x.id === p.id));
      for (const p of removedPages) {
        const slug = p.slug ? slugify(p.slug) : "";
        if (!slug) continue;
        try {
          const delRes = await fetch("/api/admin/delete-gallery", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ slug, headerImagePath: p.headerImagePath ?? "" }),
          });
          if (!delRes.ok) {
            const err = await delRes.json().catch(() => ({}));
            console.warn("delete-gallery failed for", slug, err);
          }
        } catch (e) {
          console.warn("delete-gallery error for", slug, e);
        }
      }

      // Migrer les photos quand le slug change : gallery_photos_<ancienSlug> → gallery_photos_<nouveauSlug>
      for (const p of pages) {
        const orig = initialPages.find((i) => i.id === p.id);
        const rawOld =
          attachOldSlug[p.id]?.trim() || (orig && orig.slug !== p.slug ? orig.slug : "");
        const oldSlug = rawOld ? slugify(rawOld) : "";
        if (oldSlug && oldSlug !== p.slug) {
          const migrateRes = await fetch("/api/admin/migrate-gallery-photos", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ oldSlug, newSlug: p.slug }),
          });
          if (!migrateRes.ok) {
            const err = await migrateRes.json().catch(() => ({}));
            throw new Error(err?.error || "Migration des photos échouée");
          }
        }
      }

      const payload = {
        key: "gallery_pages",
        value: JSON.stringify({ pages }),
      };
      const resp = await fetch("/api/admin/site-settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!resp.ok) throw new Error("Enregistrement échoué");

      // Synchroniser l’image de couverture vers le hero (galeries-<slug>) pour que hero et modal restent liés
      for (const p of pages) {
        const slug = p.slug ? slugify(p.slug) : "";
        if (!slug) continue;
        const heroPage = `galeries-${slug}`;
        try {
          await fetch("/api/admin/hero", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              page: heroPage,
              mode: "image",
              settings:
                p.headerImageUrl || p.headerImagePath
                  ? {
                      url: p.headerImageUrl ?? "",
                      path: p.headerImagePath ?? undefined,
                      focus: p.headerImageFocus ?? undefined,
                    }
                  : { url: "", path: undefined, focus: undefined },
            }),
          });
        } catch (e) {
          console.warn("hero sync for", heroPage, e);
        }
      }

      onSaved?.();
      onClose();
    } catch (e) {
      setMessage(e instanceof Error ? e.message : "Erreur");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Modal
      title="Modifier les sous-pages Galeries"
      onClose={onClose}
      footer={
        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
          {message && <span style={{ color: "var(--muted)", fontSize: 13 }}>{message}</span>}
          <button className="menu-item" onClick={onClose}>Annuler</button>
          <button className="menu-item" onClick={save} disabled={saving}>
            {saving ? "Enregistrement…" : "Enregistrer"}
          </button>
        </div>
      }
    >
      <p style={{ fontSize: 13, color: "var(--muted)", marginBottom: 12 }}>
        Ces sous-pages apparaissent sur la page Galeries. Chaque galerie a un nom et une image de présentation (header).
        Si vous renommez une galerie, les photos déjà importées sont automatiquement rattachées au nouveau nom.
      </p>
      <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        {visiblePages.map((p) => (
          <div
            key={p.id}
            style={{
              border: "1px solid #eee",
              borderRadius: 8,
              padding: 12,
              display: "grid",
              gridTemplateColumns: "80px 1fr auto",
              gap: 12,
              alignItems: "center",
            }}
          >
            <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
              <div
                style={{
                  width: 80,
                  height: 56,
                  borderRadius: 6,
                  background: "#f0f0f0",
                  overflow: "hidden",
                  position: "relative",
                }}
              >
                {p.headerImageUrl ? (
                  <>
                    <img
                      src={p.headerImageUrl}
                      alt=""
                      style={{
                        width: "100%",
                        height: "100%",
                        objectFit: "cover",
                        objectPosition: p.headerImageFocus ? `${p.headerImageFocus.x}% ${p.headerImageFocus.y}%` : "50% 50%",
                        cursor: "crosshair",
                      }}
                      onClick={(e) => {
                        const t = e.currentTarget;
                        const rect = t.getBoundingClientRect();
                        const x = Math.min(100, Math.max(0, Math.round(((e.clientX - rect.left) / rect.width) * 100)));
                        const y = Math.min(100, Math.max(0, Math.round(((e.clientY - rect.top) / rect.height) * 100)));
                        updatePage(p.id, { headerImageFocus: { x, y } });
                      }}
                    />
                    {p.headerImageFocus ? (
                      <div
                        style={{
                          position: "absolute",
                          left: `calc(${p.headerImageFocus.x}% - 5px)`,
                          top: `calc(${p.headerImageFocus.y}% - 5px)`,
                          width: 10,
                          height: 10,
                          background: "#fff",
                          border: "2px solid #111",
                          borderRadius: 999,
                          pointerEvents: "none",
                        }}
                      />
                    ) : null}
                  </>
                ) : (
                  <div style={{ width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 11, color: "#999" }}>
                    Image
                  </div>
                )}
              </div>
              {p.headerImageUrl ? (
                <span style={{ fontSize: 10, color: "var(--muted)" }}>Focus : clic</span>
              ) : null}
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              <input
                type="text"
                value={p.name}
                onChange={(e) => {
                  const name = e.target.value;
                  updatePage(p.id, { name, slug: slugify(name) });
                }}
                placeholder="Nom de la galerie"
                style={{ padding: "6px 8px", borderRadius: 6, border: "1px solid #ddd" }}
              />
              <span style={{ fontSize: 11, color: "var(--muted)" }}>
                URL : /galeries/{p.slug || "…"}
              </span>
              <label style={{ fontSize: 11, color: "var(--muted)", display: "flex", flexDirection: "column", gap: 4 }}>
                Si les photos ne s’affichent plus (galerie renommée après import), indiquez l’ancien slug :
                <input
                  type="text"
                  value={attachOldSlug[p.id] ?? ""}
                  onChange={(e) => setAttachOldSlug((prev) => ({ ...prev, [p.id]: e.target.value }))}
                  placeholder="ex: nouvelle-galerie"
                  style={{ padding: "4px 6px", fontSize: 12, border: "1px solid #ddd", borderRadius: 4, maxWidth: 180 }}
                />
              </label>
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 4, alignItems: "flex-end" }}>
              <input
                ref={(el) => { fileRefs.current[p.id] = el; }}
                type="file"
                accept="image/*"
                style={{ display: "none" }}
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (f) uploadHeader(p.id, f);
                  e.target.value = "";
                }}
              />
              <button
                type="button"
                onClick={() => fileRefs.current[p.id]?.click()}
                style={{ padding: "6px 10px", fontSize: 12 }}
              >
                {p.headerImageUrl ? "Changer image" : "Choisir image"}
              </button>
              <div style={{ display: "flex", gap: 4 }}>
                <button type="button" onClick={() => moveUp(p.id)} title="Monter" style={{ padding: 4 }}>▲</button>
                <button type="button" onClick={() => moveDown(p.id)} title="Descendre" style={{ padding: 4 }}>▼</button>
                <button type="button" onClick={() => removePage(p.id)} style={{ padding: 4, color: "#c00" }}>Suppr.</button>
              </div>
            </div>
          </div>
        ))}
        {pages.length > PAGE_SIZE && (
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: 12,
              padding: "12px 0",
              borderTop: "1px solid #eee",
              flexWrap: "wrap",
            }}
          >
            <button
              type="button"
              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              disabled={currentPage <= 1}
              style={{ padding: "6px 12px", minWidth: 90 }}
            >
              ◀ Précédent
            </button>
            <span style={{ fontSize: 13, color: "var(--muted)" }}>
              Page {currentPage} sur {totalPages} ({pages.length} galerie{pages.length !== 1 ? "s" : ""})
            </span>
            <button
              type="button"
              onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
              disabled={currentPage >= totalPages}
              style={{ padding: "6px 12px", minWidth: 90 }}
            >
              Suivant ▶
            </button>
          </div>
        )}
        <button
          type="button"
          onClick={addPage}
          style={{ padding: "8px 12px", border: "1px dashed #ccc", borderRadius: 6, background: "#fafafa" }}
        >
          + Ajouter une sous-page
        </button>
      </div>
    </Modal>
  );
}
