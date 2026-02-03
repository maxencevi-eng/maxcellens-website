"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { supabase } from "../../lib/supabase";
import GalleriesPagesEditor, { type GallerySubPageEntry } from "./GalleriesPagesEditor";

const DEFAULT_HEADER =
  "https://images.unsplash.com/photo-1504198453319-5ce911bafcde?auto=format&fit=crop&w=1600&q=80";

export default function GalleriesMenuClient() {
  const [pages, setPages] = useState<GallerySubPageEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const [editOpen, setEditOpen] = useState(false);

  useEffect(() => {
    let mounted = true;
    supabase.auth.getUser().then(({ data }) => {
      if (!mounted) return;
      setIsAdmin(Boolean((data as any).user));
    });
    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
      setIsAdmin(Boolean(session?.user));
    });
    return () => {
      mounted = false;
      try {
        (listener as any)?.subscription?.unsubscribe?.();
      } catch (_) {}
    };
  }, []);

  useEffect(() => {
    async function load() {
      try {
        const res = await fetch("/api/admin/site-settings?keys=gallery_pages");
        const json = await res.json();
        const raw = json?.settings?.gallery_pages;
        if (raw) {
          const parsed = JSON.parse(raw);
          const list = parsed?.pages ?? [];
          setPages(list);
        }
      } catch (_) {
        // ignore
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  if (loading) {
    return (
      <div className="container" style={{ padding: "1.5rem 0" }}>
        <p style={{ color: "var(--muted)" }}>Chargement…</p>
      </div>
    );
  }

  return (
    <div className="container" style={{ padding: "1.5rem 0" }}>
      {isAdmin && (
        <div style={{ marginBottom: 12, display: "flex", justifyContent: "flex-end" }}>
          <button
            type="button"
            className="btn-secondary"
            onClick={() => setEditOpen(true)}
            style={{
              background: "#111",
              color: "#fff",
              border: "none",
              padding: "8px 12px",
              borderRadius: 6,
              boxShadow: "0 6px 14px rgba(0,0,0,0.08)",
            }}
          >
            Modifier les sous-pages
          </button>
        </div>
      )}
      {pages.length === 0 ? (
        <p style={{ color: "var(--muted)" }}>
          Aucune galerie pour le moment.
          {isAdmin && " Cliquez sur « Modifier les sous-pages » pour en ajouter."}
        </p>
      ) : (
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))",
            gap: "1.5rem",
          }}
        >
          {pages.map((p) => (
            <Link
              key={p.id}
              href={`/galeries/${encodeURIComponent(p.slug)}`}
              data-analytics-id={`Galeries|${(p.name || p.slug || 'Galerie').toString().slice(0, 40)}`}
              style={{
                display: "block",
                borderRadius: 8,
                overflow: "hidden",
                boxShadow: "0 4px 14px rgba(0,0,0,0.08)",
                textDecoration: "none",
                color: "inherit",
                transition: "transform 0.2s, box-shadow 0.2s",
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.transform = "translateY(-4px)";
                e.currentTarget.style.boxShadow = "0 8px 24px rgba(0,0,0,0.12)";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = "";
                e.currentTarget.style.boxShadow = "0 4px 14px rgba(0,0,0,0.08)";
              }}
            >
              <div
                style={{
                  aspectRatio: "16/10",
                  background: "#e5e7eb",
                  backgroundImage: p.headerImageUrl
                    ? `url(${p.headerImageUrl})`
                    : `url(${DEFAULT_HEADER})`,
                  backgroundSize: "cover",
                  backgroundPosition: "center",
                }}
              />
              <div style={{ padding: "1rem 1.25rem" }}>
                <h3 style={{ margin: 0, fontSize: "1.1rem", fontWeight: 600 }}>
                  {p.name || p.slug || "Galerie"}
                </h3>
              </div>
            </Link>
          ))}
        </div>
      )}
      {editOpen && (
        <GalleriesPagesEditor
          pages={pages}
          onClose={() => setEditOpen(false)}
          onSaved={() => {
            setEditOpen(false);
            fetch("/api/admin/site-settings?keys=gallery_pages")
              .then((r) => r.json())
              .then((json) => {
                const raw = json?.settings?.gallery_pages;
                if (raw) {
                  const parsed = JSON.parse(raw);
                  setPages(parsed?.pages ?? []);
                }
              })
              .catch(() => {});
          }}
        />
      )}
    </div>
  );
}
