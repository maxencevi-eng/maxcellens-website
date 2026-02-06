"use client";

import React, { useEffect, useState } from "react";
import { supabase } from "../../lib/supabase";
import Modal from "../Modal/Modal";

const SITE_SETTINGS_KEY = "admin_page_title";
const TITLE_STYLE_KEY = "admin_page_title_style";
const TITLE_FONT_SIZE_KEY = "admin_page_title_font_size";
const TITLE_FONT_SIZE_MIN = 8;
const TITLE_FONT_SIZE_MAX = 72;

function clampTitleFontSize(n: number): number {
  return Math.min(TITLE_FONT_SIZE_MAX, Math.max(TITLE_FONT_SIZE_MIN, n));
}

export type AdminTitleStyleKey = "p" | "h1" | "h2" | "h3" | "h4" | "h5";

const TITLE_STYLE_OPTIONS: { value: AdminTitleStyleKey; label: string }[] = [
  { value: "p", label: "Paragraphe" },
  { value: "h1", label: "Titre 1" },
  { value: "h2", label: "Titre 2" },
  { value: "h3", label: "Titre 3" },
  { value: "h4", label: "Titre 4" },
  { value: "h5", label: "Titre 5" },
];

const TITLE_STYLE_CSS: Record<AdminTitleStyleKey, React.CSSProperties> = {
  h1: { fontSize: "1.75rem", fontWeight: 700, lineHeight: 1.2 },
  h2: { fontSize: "1.5rem", fontWeight: 700, lineHeight: 1.25 },
  h3: { fontSize: "1.25rem", fontWeight: 600, lineHeight: 1.3 },
  h4: { fontSize: "1.1rem", fontWeight: 600, lineHeight: 1.35 },
  h5: { fontSize: "1rem", fontWeight: 600, lineHeight: 1.4 },
  p: { fontSize: "1rem", fontWeight: 400, lineHeight: 1.5 },
};

export default function AdminTitleBlock({
  initialTitle,
  initialTitleStyle = "h1",
  initialTitleFontSize,
}: { initialTitle: string; initialTitleStyle?: AdminTitleStyleKey; initialTitleFontSize?: number | null }) {
  const [title, setTitle] = useState(initialTitle || "Administration");
  const [titleStyle, setTitleStyle] = useState<AdminTitleStyleKey>(
    TITLE_STYLE_OPTIONS.some((o) => o.value === initialTitleStyle) ? initialTitleStyle : "h1"
  );
  const [titleFontSize, setTitleFontSize] = useState<number | undefined>(
    initialTitleFontSize != null && initialTitleFontSize >= TITLE_FONT_SIZE_MIN && initialTitleFontSize <= TITLE_FONT_SIZE_MAX ? initialTitleFontSize : undefined
  );
  const [isAdmin, setIsAdmin] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [editValue, setEditValue] = useState(title);
  const [editStyle, setEditStyle] = useState<AdminTitleStyleKey>(titleStyle);
  const [editFontSize, setEditFontSize] = useState<number | "">(titleFontSize ?? "");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setTitle(initialTitle || "Administration");
  }, [initialTitle]);

  useEffect(() => {
    setTitleStyle(TITLE_STYLE_OPTIONS.some((o) => o.value === initialTitleStyle) ? initialTitleStyle : "h1");
  }, [initialTitleStyle]);

  useEffect(() => {
    setTitleFontSize(initialTitleFontSize != null && initialTitleFontSize >= TITLE_FONT_SIZE_MIN && initialTitleFontSize <= TITLE_FONT_SIZE_MAX ? initialTitleFontSize : undefined);
  }, [initialTitleFontSize]);

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

  function openModal() {
    setEditValue(title);
    setEditStyle(titleStyle);
    setEditFontSize(titleFontSize ?? "");
    setModalOpen(true);
  }

  async function save() {
    setSaving(true);
    try {
      const newTitle = editValue.trim() || "Administration";
      const newFontSize = editFontSize === "" ? undefined : clampTitleFontSize(Number(editFontSize));
      const [respTitle, respStyle, respFs] = await Promise.all([
        fetch("/api/admin/site-settings", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ key: SITE_SETTINGS_KEY, value: newTitle }),
        }),
        fetch("/api/admin/site-settings", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ key: TITLE_STYLE_KEY, value: editStyle }),
        }),
        fetch("/api/admin/site-settings", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ key: TITLE_FONT_SIZE_KEY, value: newFontSize == null ? "" : String(newFontSize) }),
        }),
      ]);
      if (!respTitle.ok || !respStyle.ok || !respFs.ok) throw new Error("Enregistrement échoué");
      setTitle(newTitle);
      setTitleStyle(editStyle);
      setTitleFontSize(newFontSize);
      setModalOpen(false);
    } catch (_) {
      // could set error message
    } finally {
      setSaving(false);
    }
  }

  const TitleTag = titleStyle;
  const titleInlineStyle: React.CSSProperties = {
    color: "var(--muted)",
    margin: 0,
    ...TITLE_STYLE_CSS[titleStyle],
    ...(titleFontSize != null ? { fontSize: `${titleFontSize}px` } : {}),
  };

  return (
    <>
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          gap: 12,
          marginBottom: 12,
          flexWrap: "wrap",
          textAlign: "center",
        }}
      >
        <TitleTag style={titleInlineStyle}>{title}</TitleTag>
        {isAdmin && (
          <button
            type="button"
            onClick={openModal}
            style={{
              padding: "4px 10px",
              fontSize: 13,
              border: "1px solid #ddd",
              borderRadius: 6,
              background: "#fff",
              cursor: "pointer",
            }}
          >
            Modifier le titre
          </button>
        )}
      </div>

      {modalOpen && (
        <Modal
          title="Modifier le bloc titre"
          onClose={() => setModalOpen(false)}
          footer={
            <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
              <button type="button" className="menu-item" onClick={() => setModalOpen(false)}>
                Annuler
              </button>
              <button type="button" className="menu-item" onClick={save} disabled={saving}>
                {saving ? "Enregistrement…" : "Enregistrer"}
              </button>
            </div>
          }
        >
          <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            <label style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              <span style={{ fontWeight: 600 }}>Titre</span>
              <input
                type="text"
                value={editValue}
                onChange={(e) => setEditValue(e.target.value)}
                placeholder="Administration"
                style={{ padding: "8px 10px", borderRadius: 6, border: "1px solid #ddd", fontSize: 14 }}
              />
            </label>
            <label style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              <span style={{ fontWeight: 600 }}>Style du titre</span>
              <select
                value={editStyle}
                onChange={(e) => setEditStyle(e.target.value as AdminTitleStyleKey)}
                style={{ padding: "8px 10px", borderRadius: 6, border: "1px solid #ddd", fontSize: 14, maxWidth: 200 }}
              >
                {TITLE_STYLE_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>{opt.label}</option>
                ))}
              </select>
            </label>
            <label style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              <span style={{ fontWeight: 600 }}>Taille du titre (px)</span>
              <input
                type="number"
                min={TITLE_FONT_SIZE_MIN}
                max={TITLE_FONT_SIZE_MAX}
                value={editFontSize === "" ? "" : editFontSize}
                onChange={(e) => setEditFontSize(e.target.value === "" ? "" : clampTitleFontSize(Number(e.target.value)))}
                placeholder="optionnel (8–72)"
                style={{ padding: "8px 10px", borderRadius: 6, border: "1px solid #ddd", fontSize: 14, maxWidth: 120 }}
              />
            </label>
          </div>
        </Modal>
      )}
    </>
  );
}
