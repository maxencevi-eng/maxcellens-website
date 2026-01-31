"use client";

import React, { useEffect, useState } from "react";
import { PAGE_SEO_SLUGS, type PageSeoSlug } from "../../lib/pageSeo";
import styles from "./SeoCommandCenter.module.css";

const SLUG_LABELS: Record<string, string> = {
  home: "Accueil",
  contact: "Contact",
  animation: "Animation",
  realisation: "Réalisation",
  evenement: "Évènement",
  corporate: "Corporate",
  portrait: "Portrait",
  galeries: "Galeries",
  services: "Services",
  admin: "Admin",
};

type SeoForm = {
  meta_title: string;
  meta_description: string;
  h1: string;
  canonical_url: string;
  robots_index: boolean;
  robots_follow: boolean;
  og_title: string;
  og_description: string;
  og_image_path: string;
  og_image_url: string;
  og_type: string;
  og_site_name: string;
  twitter_card: string;
  twitter_title: string;
  twitter_description: string;
  twitter_image_path: string;
  twitter_image_url: string;
  json_ld: string;
};

const emptyForm = (): SeoForm => ({
  meta_title: "",
  meta_description: "",
  h1: "",
  canonical_url: "",
  robots_index: true,
  robots_follow: true,
  og_title: "",
  og_description: "",
  og_image_path: "",
  og_image_url: "",
  og_type: "website",
  og_site_name: "",
  twitter_card: "summary_large_image",
  twitter_title: "",
  twitter_description: "",
  twitter_image_path: "",
  twitter_image_url: "",
  json_ld: "",
});

export default function SeoCommandCenterModal({
  onClose,
  onSaved,
}: {
  onClose: () => void;
  onSaved?: () => void;
}) {
  const [slug, setSlug] = useState<PageSeoSlug>("home");
  const [form, setForm] = useState<SeoForm>(emptyForm());
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [ogUploading, setOgUploading] = useState(false);
  const [twitterUploading, setTwitterUploading] = useState(false);

  useEffect(() => {
    let mounted = true;
    async function load() {
      setLoading(true);
      setError(null);
      try {
        const resp = await fetch(`/api/admin/page-seo?slug=${encodeURIComponent(slug)}`);
        const json = await resp.json();
        if (!mounted) return;
        if (!resp.ok) {
          setForm(emptyForm());
          return;
        }
        const seo = json?.seo;
        if (!seo) {
          setForm(emptyForm());
          return;
        }
        setForm({
          meta_title: seo.meta_title ?? "",
          meta_description: seo.meta_description ?? "",
          h1: seo.h1 ?? "",
          canonical_url: seo.canonical_url ?? "",
          robots_index: seo.robots_index !== false,
          robots_follow: seo.robots_follow !== false,
          og_title: seo.og_title ?? "",
          og_description: seo.og_description ?? "",
          og_image_path: seo.og_image_path ?? "",
          og_image_url: seo.og_image_url ?? "",
          og_type: seo.og_type ?? "website",
          og_site_name: seo.og_site_name ?? "",
          twitter_card: seo.twitter_card ?? "summary_large_image",
          twitter_title: seo.twitter_title ?? "",
          twitter_description: seo.twitter_description ?? "",
          twitter_image_path: seo.twitter_image_path ?? "",
          twitter_image_url: seo.twitter_image_url ?? "",
          json_ld: seo.json_ld ?? "",
        });
      } catch {
        if (mounted) setForm(emptyForm());
      } finally {
        if (mounted) setLoading(false);
      }
    }
    load();
    return () => {
      mounted = false;
    };
  }, [slug]);

  async function handleOgImage(file: File | null) {
    if (!file) return;
    setOgUploading(true);
    setError(null);
    try {
      const fd = new FormData();
      fd.append("file", file);
      fd.append("slug", slug);
      fd.append("type", "og");
      const resp = await fetch("/api/admin/upload-seo-image", { method: "POST", body: fd });
      const json = await resp.json();
      if (!resp.ok) throw new Error(json?.error ?? "Upload échoué");
      setForm((prev) => ({
        ...prev,
        og_image_path: json.path ?? "",
        og_image_url: json.url ?? "",
      }));
    } catch (e: any) {
      setError(e?.message ?? "Erreur upload OG");
    } finally {
      setOgUploading(false);
    }
  }

  async function removeOgImage() {
    if (!form.og_image_path) return;
    setError(null);
    try {
      const resp = await fetch("/api/admin/delete-seo-image", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ path: form.og_image_path }),
      });
      if (!resp.ok) throw new Error("Suppression échouée");
      setForm((prev) => ({ ...prev, og_image_path: "", og_image_url: "" }));
    } catch (e: any) {
      setError(e?.message ?? "Erreur suppression");
    }
  }

  async function handleTwitterImage(file: File | null) {
    if (!file) return;
    setTwitterUploading(true);
    setError(null);
    try {
      const fd = new FormData();
      fd.append("file", file);
      fd.append("slug", slug);
      fd.append("type", "twitter");
      const resp = await fetch("/api/admin/upload-seo-image", { method: "POST", body: fd });
      const json = await resp.json();
      if (!resp.ok) throw new Error(json?.error ?? "Upload échoué");
      setForm((prev) => ({
        ...prev,
        twitter_image_path: json.path ?? "",
        twitter_image_url: json.url ?? "",
      }));
    } catch (e: any) {
      setError(e?.message ?? "Erreur upload Twitter");
    } finally {
      setTwitterUploading(false);
    }
  }

  async function removeTwitterImage() {
    if (!form.twitter_image_path) return;
    setError(null);
    try {
      const resp = await fetch("/api/admin/delete-seo-image", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ path: form.twitter_image_path }),
      });
      if (!resp.ok) throw new Error("Suppression échouée");
      setForm((prev) => ({ ...prev, twitter_image_path: "", twitter_image_url: "" }));
    } catch (e: any) {
      setError(e?.message ?? "Erreur suppression");
    }
  }

  async function save() {
    setSaving(true);
    setError(null);
    setSuccess(null);
    try {
      const resp = await fetch("/api/admin/page-seo", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          page_slug: slug,
          meta_title: form.meta_title || null,
          meta_description: form.meta_description || null,
          h1: form.h1 || null,
          canonical_url: form.canonical_url || null,
          robots_index: form.robots_index,
          robots_follow: form.robots_follow,
          og_title: form.og_title || null,
          og_description: form.og_description || null,
          og_image_path: form.og_image_path || null,
          og_type: form.og_type || "website",
          og_site_name: form.og_site_name || null,
          twitter_card: form.twitter_card || "summary_large_image",
          twitter_title: form.twitter_title || null,
          twitter_description: form.twitter_description || null,
          twitter_image_path: form.twitter_image_path || null,
          json_ld: form.json_ld?.trim() || null,
        }),
      });
      const json = await resp.json();
      if (!resp.ok) throw new Error(json?.error ?? "Sauvegarde échouée");
      setSuccess("Sauvegardé");
      onSaved?.();
    } catch (e: any) {
      setError(e?.message ?? "Erreur");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className={styles.seoModalOverlay}>
      <div className={styles.seoModal}>
        <div className={styles.seoModalHeader}>
          <h2>SEO Command Center</h2>
          <button type="button" onClick={onClose} aria-label="Fermer" className={styles.seoClose}>
            ✕
          </button>
        </div>

        <div className={styles.seoPageSelect}>
          <label className={styles.seoLabel}>Page</label>
          <select
            value={slug}
            onChange={(e) => setSlug(e.target.value as PageSeoSlug)}
            className={styles.seoInput}
            style={{ maxWidth: 220 }}
          >
            {PAGE_SEO_SLUGS.map((s) => (
              <option key={s} value={s}>
                {SLUG_LABELS[s] ?? s}
              </option>
            ))}
          </select>
        </div>

        {loading ? (
          <div className={styles.seoLoading}>Chargement…</div>
        ) : (
          <div className={styles.seoModalBody}>
            {/* Basic */}
            <section className={styles.seoSection}>
              <h3>Basique</h3>
              <div className={styles.seoField}>
                <label className={styles.seoLabel}>Meta Title</label>
                <input
                  type="text"
                  value={form.meta_title}
                  onChange={(e) => setForm((f) => ({ ...f, meta_title: e.target.value }))}
                  className={styles.seoInput}
                  placeholder="Titre de la page (onglet, SERP)"
                />
              </div>
              <div className={styles.seoField}>
                <label className={styles.seoLabel}>Meta Description</label>
                <textarea
                  value={form.meta_description}
                  onChange={(e) => setForm((f) => ({ ...f, meta_description: e.target.value }))}
                  className={styles.seoInput}
                  rows={2}
                  placeholder="Description pour les moteurs de recherche"
                />
              </div>
              <div className={styles.seoField}>
                <label className={styles.seoLabel}>H1 principal</label>
                <input
                  type="text"
                  value={form.h1}
                  onChange={(e) => setForm((f) => ({ ...f, h1: e.target.value }))}
                  className={styles.seoInput}
                  placeholder="Titre H1 affiché sur la page"
                />
              </div>
            </section>

            {/* Technique */}
            <section className={styles.seoSection}>
              <h3>Technique</h3>
              <div className={styles.seoField}>
                <label className={styles.seoLabel}>Canonical URL</label>
                <input
                  type="url"
                  value={form.canonical_url}
                  onChange={(e) => setForm((f) => ({ ...f, canonical_url: e.target.value }))}
                  className={styles.seoInput}
                  placeholder="https://..."
                />
              </div>
              <div className={`${styles.seoField} ${styles.seoCheckboxes}`}>
                <label className={styles.seoLabel}>Robots</label>
                <label>
                  <input
                    type="checkbox"
                    checked={form.robots_index}
                    onChange={(e) => setForm((f) => ({ ...f, robots_index: e.target.checked }))}
                  />
                  index
                </label>
                <label>
                  <input
                    type="checkbox"
                    checked={form.robots_follow}
                    onChange={(e) => setForm((f) => ({ ...f, robots_follow: e.target.checked }))}
                  />
                  follow
                </label>
              </div>
            </section>

            {/* Open Graph */}
            <section className={styles.seoSection}>
              <h3>Open Graph (Facebook, LinkedIn)</h3>
              <div className={styles.seoField}>
                <label className={styles.seoLabel}>OG Title</label>
                <input
                  type="text"
                  value={form.og_title}
                  onChange={(e) => setForm((f) => ({ ...f, og_title: e.target.value }))}
                  className={styles.seoInput}
                />
              </div>
              <div className={styles.seoField}>
                <label className={styles.seoLabel}>OG Description</label>
                <textarea
                  value={form.og_description}
                  onChange={(e) => setForm((f) => ({ ...f, og_description: e.target.value }))}
                  className={styles.seoInput}
                  rows={2}
                />
              </div>
              <div className={styles.seoField}>
                <label className={styles.seoLabel}>OG Image</label>
                <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={(e) => {
                      const f = e.target.files?.[0];
                      if (f) handleOgImage(f);
                      e.target.value = "";
                    }}
                  />
                  {ogUploading && <span style={{ fontSize: 13, color: "var(--muted)" }}>Upload…</span>}
                  {form.og_image_url && (
                    <>
                      <img
                        src={form.og_image_url}
                        alt="OG"
                        style={{ width: 120, height: 63, objectFit: "cover", borderRadius: 6 }}
                      />
                      <button type="button" className="btn-secondary" onClick={removeOgImage}>
                        Supprimer
                      </button>
                    </>
                  )}
                </div>
              </div>
              <div className={styles.seoField}>
                <label className={styles.seoLabel}>OG Type</label>
                <select
                  value={form.og_type}
                  onChange={(e) => setForm((f) => ({ ...f, og_type: e.target.value }))}
                  className={styles.seoInput}
                  style={{ maxWidth: 200 }}
                >
                  <option value="website">website</option>
                  <option value="article">article</option>
                </select>
              </div>
              <div className={styles.seoField}>
                <label className={styles.seoLabel}>OG Site Name</label>
                <input
                  type="text"
                  value={form.og_site_name}
                  onChange={(e) => setForm((f) => ({ ...f, og_site_name: e.target.value }))}
                  className={styles.seoInput}
                />
              </div>
            </section>

            {/* Twitter */}
            <section className={styles.seoSection}>
              <h3>Twitter</h3>
              <div className={styles.seoField}>
                <label className={styles.seoLabel}>Twitter Card</label>
                <select
                  value={form.twitter_card}
                  onChange={(e) => setForm((f) => ({ ...f, twitter_card: e.target.value }))}
                  className={styles.seoInput}
                  style={{ maxWidth: 220 }}
                >
                  <option value="summary_large_image">summary_large_image</option>
                  <option value="summary">summary</option>
                </select>
              </div>
              <div className={styles.seoField}>
                <label className={styles.seoLabel}>Twitter Title</label>
                <input
                  type="text"
                  value={form.twitter_title}
                  onChange={(e) => setForm((f) => ({ ...f, twitter_title: e.target.value }))}
                  className={styles.seoInput}
                />
              </div>
              <div className={styles.seoField}>
                <label className={styles.seoLabel}>Twitter Description</label>
                <textarea
                  value={form.twitter_description}
                  onChange={(e) => setForm((f) => ({ ...f, twitter_description: e.target.value }))}
                  className={styles.seoInput}
                  rows={2}
                />
              </div>
              <div className={styles.seoField}>
                <label className={styles.seoLabel}>Twitter Image</label>
                <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={(e) => {
                      const f = e.target.files?.[0];
                      if (f) handleTwitterImage(f);
                      e.target.value = "";
                    }}
                  />
                  {twitterUploading && (
                    <span style={{ fontSize: 13, color: "var(--muted)" }}>Upload…</span>
                  )}
                  {form.twitter_image_url && (
                    <>
                      <img
                        src={form.twitter_image_url}
                        alt="Twitter"
                        style={{ width: 120, height: 63, objectFit: "cover", borderRadius: 6 }}
                      />
                      <button type="button" className="btn-secondary" onClick={removeTwitterImage}>
                        Supprimer
                      </button>
                    </>
                  )}
                </div>
              </div>
            </section>

            {/* Structured Data */}
            <section className={styles.seoSection}>
              <h3>Structured Data (JSON-LD)</h3>
              <div className={styles.seoField}>
                <label className={styles.seoLabel}>JSON-LD personnalisé</label>
                <textarea
                  value={form.json_ld}
                  onChange={(e) => setForm((f) => ({ ...f, json_ld: e.target.value }))}
                  className={styles.seoInput}
                  rows={6}
                  placeholder='{"@context":"https://schema.org",...}'
                  style={{ fontFamily: "monospace", fontSize: 12 }}
                />
              </div>
            </section>
          </div>
        )}

        <div className={styles.seoModalFooter}>
          {error && <div className={styles.seoError}>{error}</div>}
          {success && <div className={styles.seoSuccess}>{success}</div>}
          <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
            <button type="button" className="btn-secondary" onClick={onClose} disabled={saving}>
              Fermer
            </button>
            <button type="button" className="btn-primary" onClick={save} disabled={saving || loading}>
              {saving ? "Enregistrement…" : "Enregistrer"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
