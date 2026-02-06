"use no memo";
"use client";

import React, { useState, useEffect } from "react";
import dynamic from "next/dynamic";
import type {
  HomeIntroData,
  HomeServicesData,
  HomeStatsData,
  HomePortraitBlockData,
  HomeCadreurBlockData,
  HomeAnimationBlockData,
  HomeQuoteData,
  HomeCtaData,
  TitleStyleKey,
} from "./homeDefaults";
import { TITLE_FONT_SIZE_MIN, TITLE_FONT_SIZE_MAX } from "./homeDefaults";

const clampTitleFontSize = (n: number) => Math.min(TITLE_FONT_SIZE_MAX, Math.max(TITLE_FONT_SIZE_MIN, Number(n) || 16));

const getValidTitleStyle = (s: any, def: TitleStyleKey = "h2"): TitleStyleKey => {
  return ["h1", "h2", "h3", "h4", "h5", "p"].includes(s) ? s : def;
};

const parseFontSize = (v: string): number | "" => (v === "" ? "" : clampTitleFontSize(Number(v)));

const DEFAULT_PORTRAIT_TITLES = ["Lifestyle", "Studio", "Entreprise", "Couple"];

const TITLE_STYLE_OPTIONS: { value: TitleStyleKey; label: string }[] = [
  { value: "p", label: "Paragraphe" },
  { value: "h1", label: "Titre 1" },
  { value: "h2", label: "Titre 2" },
  { value: "h3", label: "Titre 3" },
  { value: "h4", label: "Titre 4" },
  { value: "h5", label: "Titre 5" },
];

const RichTextModal = dynamic(() => import("../RichTextModal/RichTextModal"), { ssr: false });

export type HomeBlockKey =
  | "home_intro"
  | "home_services"
  | "home_stats"
  | "home_portrait"
  | "home_cadreur"
  | "home_animation"
  | "home_quote"
  | "home_cta";

type BlockData =
  | HomeIntroData
  | HomeServicesData
  | HomeStatsData
  | HomePortraitBlockData
  | HomeCadreurBlockData
  | HomeAnimationBlockData
  | HomeQuoteData
  | HomeCtaData;

type Props = {
  blockKey: HomeBlockKey;
  initialData: BlockData;
  onClose: () => void;
  onSaved: (key: string, value: string) => void;
};

const LABELS: Record<HomeBlockKey, string> = {
  home_intro: "Bloc Intro",
  home_services: "Bloc Services",
  home_stats: "Bloc Chiffres",
  home_portrait: "Bloc Portrait",
  home_cadreur: "Bloc Cadreur",
  home_animation: "Bloc Animation",
  home_quote: "Citation / Témoignage",
  home_cta: "Bloc CTA",
};

const inputStyle: React.CSSProperties = {
  width: "100%",
  padding: "8px 12px",
  border: "1px solid #e6e6e6",
  borderRadius: 6,
  fontSize: 14,
  boxSizing: "border-box",
};

export default function HomeBlockModal({ blockKey, initialData, onClose, onSaved }: Props) {
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [editingHtml, setEditingHtml] = useState(false);
  const [editingCadreurHtml, setEditingCadreurHtml] = useState(false);
  const [uploadingIndex, setUploadingIndex] = useState<number | null>(null);
  const [deletingServiceIndex, setDeletingServiceIndex] = useState<number | null>(null);

  // Intro
  const [introTitle, setIntroTitle] = useState("");
  const [introSubtitle, setIntroSubtitle] = useState("");
  const [introTitleStyle, setIntroTitleStyle] = useState<TitleStyleKey>("h1");
  const [introSubtitleStyle, setIntroSubtitleStyle] = useState<TitleStyleKey>("p");
  const [introTitleFontSize, setIntroTitleFontSize] = useState<number | "">(16);
  const [introSubtitleFontSize, setIntroSubtitleFontSize] = useState<number | "">(16);
  const [introHtml, setIntroHtml] = useState("");
  const [introBackgroundColor, setIntroBackgroundColor] = useState("");

  // Services (block title/subtitle + items with optional image)
  const [servicesBlockTitle, setServicesBlockTitle] = useState("");
  const [servicesBlockSubtitle, setServicesBlockSubtitle] = useState("");
  const [servicesBlockTitleStyle, setServicesBlockTitleStyle] = useState<TitleStyleKey>("h2");
  const [servicesBlockSubtitleStyle, setServicesBlockSubtitleStyle] = useState<TitleStyleKey>("p");
  const [servicesBlockTitleFontSize, setServicesBlockTitleFontSize] = useState<number | "">(22);
  const [servicesBlockSubtitleFontSize, setServicesBlockSubtitleFontSize] = useState<number | "">(16);
  const [servicesBackgroundColor, setServicesBackgroundColor] = useState("");
  const [serviceItems, setServiceItems] = useState<{ title: string; description: string; href: string; image?: { url: string; path?: string } | null; titleStyle?: TitleStyleKey; descriptionStyle?: TitleStyleKey; titleFontSize?: number }[]>([]);

  // Stats
  const [statItems, setStatItems] = useState<{ value: string; label: string }[]>([]);
  const [statBackgroundColor, setStatBackgroundColor] = useState("");

  // Portrait block (carousel: 4 slides)
  const [portraitBlockTitle, setPortraitBlockTitle] = useState("");
  const [portraitBlockTitleStyle, setPortraitBlockTitleStyle] = useState<TitleStyleKey>("h2");
  const [portraitBlockTitleFontSize, setPortraitBlockTitleFontSize] = useState<number | "">(22);
  const [portraitCtaLabel, setPortraitCtaLabel] = useState("");
  const [portraitCtaHref, setPortraitCtaHref] = useState("");
  const [portraitSlides, setPortraitSlides] = useState<{ title: string; text: string; image?: { url: string; path?: string; focus?: { x: number; y: number } } | null; image2?: { url: string; path?: string; focus?: { x: number; y: number } } | null; titleStyle?: TitleStyleKey; titleFontSize?: number }[]>([]);
  const [portraitCarouselSpeed, setPortraitCarouselSpeed] = useState(5000);
  const [portraitBackgroundColor, setPortraitBackgroundColor] = useState("");
  const [editingSlideIndex, setEditingSlideIndex] = useState<number | null>(null);
  const [uploadingPortraitIndex, setUploadingPortraitIndex] = useState<number | null>(null);
  const [uploadingPortrait2Index, setUploadingPortrait2Index] = useState<number | null>(null);

  // Cadreur block
  const [cadreurTitle, setCadreurTitle] = useState("");
  const [cadreurTitleStyle, setCadreurTitleStyle] = useState<TitleStyleKey>("h2");
  const [cadreurTitleFontSize, setCadreurTitleFontSize] = useState<number | "">(28);
  const [cadreurHtml, setCadreurHtml] = useState("");
  const [cadreurImage, setCadreurImage] = useState<{ url: string; path?: string; focus?: { x: number; y: number } } | null>(null);
  const [cadreurBackgroundColor, setCadreurBackgroundColor] = useState("");

  // Quote (liste de citations + vitesse)
  const [quoteItems, setQuoteItems] = useState<{ text: string; author: string; role?: string; authorStyle?: TitleStyleKey; roleStyle?: TitleStyleKey }[]>([]);
  const [quoteCarouselSpeed, setQuoteCarouselSpeed] = useState(5000);
  const [quoteBackgroundColor, setQuoteBackgroundColor] = useState("");

  // CTA
  const [ctaTitle, setCtaTitle] = useState("");
  const [ctaTitleStyle, setCtaTitleStyle] = useState<TitleStyleKey>("h2");
  const [ctaTitleFontSize, setCtaTitleFontSize] = useState<number | "">(22);
  const [ctaButtonLabel, setCtaButtonLabel] = useState("");
  const [ctaButtonHref, setCtaButtonHref] = useState("");
  const [ctaButtonStyle, setCtaButtonStyle] = useState<"1" | "2">("1");
  const [ctaBackgroundColor, setCtaBackgroundColor] = useState("");

  // Animation block (présentation page Animation)
  const [animationBlockTitle, setAnimationBlockTitle] = useState("");
  const [animationBlockSubtitle, setAnimationBlockSubtitle] = useState("");
  const [animationBlockTitleStyle, setAnimationBlockTitleStyle] = useState<TitleStyleKey>("h2");
  const [animationBlockSubtitleStyle, setAnimationBlockSubtitleStyle] = useState<TitleStyleKey>("p");
  const [animationBlockTitleFontSize, setAnimationBlockTitleFontSize] = useState<number | "">(22);
  const [animationBlockSubtitleFontSize, setAnimationBlockSubtitleFontSize] = useState<number | "">(16);
  const [animationImage, setAnimationImage] = useState<{ url: string; path?: string } | null>(null);
  const [uploadingAnimationImage, setUploadingAnimationImage] = useState(false);
  const [animationBackgroundColor, setAnimationBackgroundColor] = useState("");

  // Portrait CTA button style
  const [portraitCtaButtonStyle, setPortraitCtaButtonStyle] = useState<"1" | "2">("1");

  const computeAnimationBgValue = () => {
    const r = animationBackgroundColor?.trim() || "";
    const ok = /^#?[0-9A-Fa-f]{6}$/.test(r);
    return ok ? (r.startsWith("#") ? r : "#" + r) : "#0f0f12";
  };

  useEffect(() => {
    const d = initialData as any;
    const isValidFontSize = (fs: any) => fs != null && fs >= TITLE_FONT_SIZE_MIN && fs <= TITLE_FONT_SIZE_MAX;
    const getFontSize = (fs: any) => isValidFontSize(fs) ? fs : "";

    if (blockKey === "home_intro") {
      setIntroTitle(d.title ?? "");
      setIntroSubtitle(d.subtitle ?? "");
      setIntroTitleStyle(getValidTitleStyle(d.titleStyle, "h1"));
      setIntroSubtitleStyle(getValidTitleStyle(d.subtitleStyle, "p"));
      setIntroTitleFontSize(getFontSize(d.titleFontSize));
      setIntroSubtitleFontSize(getFontSize(d.subtitleFontSize));
      setIntroHtml(d.html ?? "");
      setIntroBackgroundColor(d.backgroundColor ?? "");
    }
    if (blockKey === "home_services") {
      setServicesBlockTitle(d.blockTitle ?? "Services");
      setServicesBlockSubtitle(d.blockSubtitle ?? "Réalisation, événementiel et corporate — des prestations sur mesure.");
      setServicesBlockTitleStyle(getValidTitleStyle(d.blockTitleStyle, "h2"));
      setServicesBlockSubtitleStyle(getValidTitleStyle(d.blockSubtitleStyle, "p"));
      setServicesBlockTitleFontSize(getFontSize(d.blockTitleFontSize));
      setServicesBlockSubtitleFontSize(getFontSize(d.blockSubtitleFontSize));
      if (d.items) {
        const items = d.items.map((it: any) => ({
          title: it.title ?? "",
          description: it.description ?? "",
          href: it.href ?? "",
          image: it.image ?? null,
          titleStyle: getValidTitleStyle(it.titleStyle, "h3"),
          descriptionStyle: getValidTitleStyle(it.descriptionStyle, "p"),
          titleFontSize: isValidFontSize(it.titleFontSize) ? it.titleFontSize : undefined,
        }));
        setServiceItems(items.length ? items : [{ title: "", description: "", href: "", image: null, titleStyle: "h3", descriptionStyle: "p" }]);
      }
      setServicesBackgroundColor(d.backgroundColor ?? "");
    }
    if (blockKey === "home_stats" && d.items) {
      setStatItems(d.items.length ? d.items : [{ value: "", label: "" }]);
      setStatBackgroundColor(d.backgroundColor ?? "");
    }
    if (blockKey === "home_portrait") {
      setPortraitBlockTitle(d.blockTitle ?? "Portrait");
      setPortraitBlockTitleStyle(getValidTitleStyle(d.blockTitleStyle, "h2"));
      setPortraitBlockTitleFontSize(getFontSize(d.blockTitleFontSize));
      setPortraitCtaLabel(d.ctaLabel ?? "Découvrir le portrait");
      setPortraitCtaHref(d.ctaHref ?? "/portrait");
      setPortraitCtaButtonStyle(d.ctaButtonStyle === "2" ? "2" : "1");
      setPortraitCarouselSpeed(typeof d.carouselSpeed === "number" && d.carouselSpeed >= 2000 ? d.carouselSpeed : 5000);
      setPortraitBackgroundColor(d.backgroundColor ?? "");
      if (Array.isArray(d.slides) && d.slides.length) {
        setPortraitSlides(d.slides.map((s: any) => ({
          title: s.title ?? "",
          text: s.text ?? "",
          image: s.image ? { ...s.image, focus: s.image.focus ?? { x: 50, y: 50 } } : null,
          image2: s.image2 ? { ...s.image2, focus: s.image2.focus ?? { x: 50, y: 50 } } : null,
          titleStyle: getValidTitleStyle(s.titleStyle, "h3"),
          titleFontSize: isValidFontSize(s.titleFontSize) ? s.titleFontSize : undefined,
        })));
      } else {
        setPortraitSlides([
          { title: "Lifestyle", text: "", image: null, image2: null, titleStyle: "h3" },
          { title: "Studio", text: "", image: null, image2: null, titleStyle: "h3" },
          { title: "Entreprise", text: "", image: null, image2: null, titleStyle: "h3" },
          { title: "Couple", text: "", image: null, image2: null, titleStyle: "h3" },
        ]);
      }
    }
    if (blockKey === "home_cadreur") {
      setCadreurTitle(d.title ?? "");
      setCadreurTitleStyle(getValidTitleStyle(d.titleStyle, "h2"));
      setCadreurTitleFontSize(getFontSize(d.titleFontSize));
      setCadreurHtml(d.html ?? "");
      setCadreurImage(d.image ? { ...d.image, focus: (d.image as any).focus ?? { x: 50, y: 50 } } : null);
      setCadreurBackgroundColor(d.backgroundColor ?? "");
    }
    if (blockKey === "home_animation") {
      setAnimationBlockTitle(d.blockTitle ?? "Animation");
      setAnimationBlockSubtitle(d.blockSubtitle ?? "");
      setAnimationBlockTitleStyle(getValidTitleStyle(d.blockTitleStyle, "h2"));
      setAnimationBlockSubtitleStyle(getValidTitleStyle(d.blockSubtitleStyle, "p"));
      setAnimationBlockTitleFontSize(getFontSize(d.blockTitleFontSize));
      setAnimationBlockSubtitleFontSize(getFontSize(d.blockSubtitleFontSize));
      setAnimationImage(d.image ?? null);
      setAnimationBackgroundColor(d.backgroundColor ?? "");
    }
    if (blockKey === "home_quote") {
      if (Array.isArray(d.quotes) && d.quotes.length) {
        setQuoteItems(d.quotes.map((q: any) => ({
          text: q.text ?? "",
          author: q.author ?? "",
          role: q.role ?? "",
          authorStyle: getValidTitleStyle(q.authorStyle, "p"),
          roleStyle: getValidTitleStyle(q.roleStyle, "p"),
        })));
      } else if (d.text != null || d.author != null) {
        setQuoteItems([{
          text: d.text ?? "",
          author: d.author ?? "",
          role: d.role ?? "",
          authorStyle: getValidTitleStyle(d.authorStyle, "p"),
          roleStyle: getValidTitleStyle(d.roleStyle, "p"),
        }]);
      } else {
        setQuoteItems([
          { text: "Un professionnel à l'écoute, des images qui restent.", author: "Client", role: "Témoignage", authorStyle: "p", roleStyle: "p" },
          { text: "Une approche bienveillante et un rendu soigné. Je recommande.", author: "Client", role: "Portrait", authorStyle: "p", roleStyle: "p" },
          { text: "Des photos naturelles et des souvenirs précieux.", author: "Client", role: "Événement", authorStyle: "p", roleStyle: "p" },
        ]);
      }
      setQuoteCarouselSpeed(typeof d.carouselSpeed === "number" && d.carouselSpeed >= 1000 ? d.carouselSpeed : 5000);
      setQuoteBackgroundColor(d.backgroundColor ?? "");
    }
    if (blockKey === "home_cta") {
      setCtaTitle(d.title ?? "");
      setCtaTitleStyle(getValidTitleStyle(d.titleStyle, "h2"));
      setCtaTitleFontSize(getFontSize(d.titleFontSize));
      setCtaButtonLabel(d.buttonLabel ?? "");
      setCtaButtonHref(d.buttonHref ?? "");
      setCtaButtonStyle(d.buttonStyle === "2" ? "2" : "1");
      setCtaBackgroundColor(d.backgroundColor ?? "");
    }
  }, [blockKey, initialData]);

  async function uploadServiceImage(file: File, index: number) {
    setUploadingIndex(index);
    setError(null);
    try {
      const fd = new FormData();
      fd.append("file", file);
      fd.append("page", "home");
      fd.append("kind", "image");
      fd.append("folder", `home/services/${index + 1}`);
      const currentPath = serviceItems[index]?.image?.path;
      if (currentPath) fd.append("old_path", currentPath);
      const resp = await fetch("/api/admin/upload-hero-media", { method: "POST", body: fd });
      const j = await resp.json();
      if (!resp.ok) throw new Error(j?.error ?? "Erreur d'upload");
      if (j?.url) {
        setServiceItems((prev) => prev.map((p, i) => (i === index ? { ...p, image: { url: j.url, path: j.path ?? undefined } } : p)));
      } else throw new Error("Upload: pas d'URL retournée");
    } catch (e: any) {
      setError(e?.message ?? "Erreur upload");
    } finally {
      setUploadingIndex(null);
    }
  }

  async function removeService(index: number) {
    const item = serviceItems[index];
    if (!item) return;
    if (!confirm("Supprimer ce service ? L'image associée sera supprimée du stockage.")) return;
    setDeletingServiceIndex(index);
    setError(null);
    try {
      if (item.image?.path) {
        const resp = await fetch("/api/admin/delete-hero-media", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ page: "home", paths: [item.image.path] }),
        });
        const j = await resp.json();
        if (!resp.ok) console.warn("delete-hero-media:", j?.error ?? resp.status);
      }
      setServiceItems((prev) => prev.filter((_, j) => j !== index));
    } catch (e: any) {
      setError(e?.message ?? "Erreur lors de la suppression");
    } finally {
      setDeletingServiceIndex(null);
    }
  }

  async function uploadAnimationBanner(file: File) {
    setUploadingAnimationImage(true);
    setError(null);
    try {
      const fd = new FormData();
      fd.append("file", file);
      fd.append("page", "home");
      fd.append("kind", "image");
      fd.append("folder", "home/animation/banner");
      if (animationImage?.path) fd.append("old_path", animationImage.path);
      const resp = await fetch("/api/admin/upload-hero-media", { method: "POST", body: fd });
      const j = await resp.json();
      if (!resp.ok) throw new Error(j?.error ?? "Erreur d'upload");
      if (j?.url) {
        setAnimationImage({ url: j.url, path: j.path ?? undefined });
      } else throw new Error("Upload: pas d'URL retournée");
    } catch (e: any) {
      setError(e?.message ?? "Erreur upload");
    } finally {
      setUploadingAnimationImage(false);
    }
  }

  async function uploadPortraitSlideImage(file: File, slideIndex: number) {
    setUploadingPortraitIndex(slideIndex);
    setError(null);
    try {
      const fd = new FormData();
      fd.append("file", file);
      fd.append("page", "home");
      fd.append("kind", "image");
      fd.append("folder", `home/portrait/slide-${slideIndex + 1}`);
      const currentPath = portraitSlides[slideIndex]?.image?.path;
      if (currentPath) fd.append("old_path", currentPath);
      const resp = await fetch("/api/admin/upload-hero-media", { method: "POST", body: fd });
      const j = await resp.json();
      if (!resp.ok) throw new Error(j?.error ?? "Erreur d'upload");
      if (j?.url) {
        setPortraitSlides((prev) => prev.map((s, i) => (i === slideIndex ? { ...s, image: { url: j.url, path: j.path ?? undefined, focus: { x: 50, y: 50 } } } : s)));
      } else throw new Error("Upload: pas d'URL retournée");
    } catch (e: any) {
      setError(e?.message ?? "Erreur upload");
    } finally {
      setUploadingPortraitIndex(null);
    }
  }

  async function uploadPortraitSlideImage2(file: File, slideIndex: number) {
    setUploadingPortrait2Index(slideIndex);
    setError(null);
    try {
      const fd = new FormData();
      fd.append("file", file);
      fd.append("page", "home");
      fd.append("kind", "image");
      fd.append("folder", `home/portrait/slide-${slideIndex + 1}-2`);
      const currentPath = portraitSlides[slideIndex]?.image2?.path;
      if (currentPath) fd.append("old_path", currentPath);
      const resp = await fetch("/api/admin/upload-hero-media", { method: "POST", body: fd });
      const j = await resp.json();
      if (!resp.ok) throw new Error(j?.error ?? "Erreur d'upload");
      if (j?.url) {
        setPortraitSlides((prev) => prev.map((s, i) => (i === slideIndex ? { ...s, image2: { url: j.url, path: j.path ?? undefined, focus: { x: 50, y: 50 } } } : s)));
      } else throw new Error("Upload: pas d'URL retournée");
    } catch (e: any) {
      setError(e?.message ?? "Erreur upload");
    } finally {
      setUploadingPortrait2Index(null);
    }
  }

  async function uploadBlockImage(file: File, block: "cadreur") {
    setError(null);
    try {
      const fd = new FormData();
      fd.append("file", file);
      fd.append("page", "home");
      fd.append("kind", "image");
      fd.append("folder", `home/${block}`);
      if (cadreurImage?.path) fd.append("old_path", cadreurImage.path);
      const resp = await fetch("/api/admin/upload-hero-media", { method: "POST", body: fd });
      const j = await resp.json();
      if (!resp.ok) throw new Error(j?.error ?? "Erreur d'upload");
      if (j?.url) setCadreurImage({ url: j.url, path: j.path ?? undefined, focus: { x: 50, y: 50 } });
      else throw new Error("Upload: pas d'URL retournée");
    } catch (e: any) {
      setError(e?.message ?? "Erreur upload");
    }
  }

  async function save() {
    setSaving(true);
    setError(null);
    let payload: BlockData;
    switch (blockKey) {
      case "home_intro":
        payload = { title: introTitle, subtitle: introSubtitle, titleStyle: introTitleStyle, subtitleStyle: introSubtitleStyle, titleFontSize: introTitleFontSize !== "" ? clampTitleFontSize(introTitleFontSize as number) : undefined, subtitleFontSize: introSubtitleFontSize !== "" ? clampTitleFontSize(introSubtitleFontSize as number) : undefined, html: introHtml, backgroundColor: introBackgroundColor?.trim() || undefined };
        break;
      case "home_services":
        payload = { blockTitle: servicesBlockTitle, blockSubtitle: servicesBlockSubtitle, blockTitleStyle: servicesBlockTitleStyle, blockSubtitleStyle: servicesBlockSubtitleStyle, blockTitleFontSize: servicesBlockTitleFontSize !== "" ? clampTitleFontSize(servicesBlockTitleFontSize as number) : undefined, blockSubtitleFontSize: servicesBlockSubtitleFontSize !== "" ? clampTitleFontSize(servicesBlockSubtitleFontSize as number) : undefined, items: serviceItems.map((it) => ({ ...it, titleFontSize: it.titleFontSize != null && it.titleFontSize >= TITLE_FONT_SIZE_MIN && it.titleFontSize <= TITLE_FONT_SIZE_MAX ? it.titleFontSize : undefined })), backgroundColor: servicesBackgroundColor?.trim() || undefined };
        break;
      case "home_stats":
        payload = { items: statItems, backgroundColor: statBackgroundColor?.trim() || undefined };
        break;
      case "home_portrait":
        payload = { blockTitle: portraitBlockTitle, blockTitleStyle: portraitBlockTitleStyle, blockTitleFontSize: portraitBlockTitleFontSize !== "" ? clampTitleFontSize(portraitBlockTitleFontSize as number) : undefined, ctaLabel: portraitCtaLabel, ctaHref: portraitCtaHref, ctaButtonStyle: portraitCtaButtonStyle, carouselSpeed: portraitCarouselSpeed, slides: portraitSlides.map((s) => ({ ...s, titleFontSize: s.titleFontSize != null && s.titleFontSize >= TITLE_FONT_SIZE_MIN && s.titleFontSize <= TITLE_FONT_SIZE_MAX ? s.titleFontSize : undefined })), backgroundColor: portraitBackgroundColor?.trim() || undefined };
        break;
      case "home_cadreur":
        payload = { title: cadreurTitle, titleStyle: cadreurTitleStyle, titleFontSize: cadreurTitleFontSize !== "" ? clampTitleFontSize(cadreurTitleFontSize as number) : undefined, html: cadreurHtml, image: cadreurImage, backgroundColor: cadreurBackgroundColor?.trim() || undefined };
        break;
      case "home_animation": {
        const rawBg = animationBackgroundColor?.trim() || "";
        const hexMatch = rawBg.replace(/^#/, "").match(/^([0-9A-Fa-f]{3}|[0-9A-Fa-f]{6})$/);
        const backgroundColor = hexMatch ? (hexMatch[1].length === 3 ? "#" + hexMatch[1].split("").map((c) => c + c).join("") : "#" + hexMatch[1]) : undefined;
        payload = { blockTitle: animationBlockTitle, blockSubtitle: animationBlockSubtitle, blockTitleStyle: animationBlockTitleStyle, blockSubtitleStyle: animationBlockSubtitleStyle, blockTitleFontSize: animationBlockTitleFontSize !== "" ? clampTitleFontSize(animationBlockTitleFontSize as number) : undefined, blockSubtitleFontSize: animationBlockSubtitleFontSize !== "" ? clampTitleFontSize(animationBlockSubtitleFontSize as number) : undefined, image: animationImage, backgroundColor };
        break;
      }
      case "home_quote":
        payload = { quotes: quoteItems, carouselSpeed: quoteCarouselSpeed, backgroundColor: quoteBackgroundColor?.trim() || undefined };
        break;
      case "home_cta":
        payload = { title: ctaTitle, titleStyle: ctaTitleStyle, titleFontSize: ctaTitleFontSize !== "" ? clampTitleFontSize(ctaTitleFontSize as number) : undefined, buttonLabel: ctaButtonLabel, buttonHref: ctaButtonHref, buttonStyle: ctaButtonStyle, backgroundColor: ctaBackgroundColor?.trim() || undefined };
        break;
      default:
        setSaving(false);
        return;
    }
    try {
      const resp = await fetch("/api/admin/site-settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ key: blockKey, value: JSON.stringify(payload) }),
      });
      if (!resp.ok) {
        const j = await resp.json().catch(() => ({}));
        throw new Error(j?.error ?? "Erreur sauvegarde");
      }
      window.dispatchEvent(new CustomEvent("site-settings-updated", { detail: { key: blockKey } }));
      onSaved(blockKey, JSON.stringify(payload));
      onClose();
    } catch (e: any) {
      setError(e?.message ?? "Erreur");
    } finally {
      setSaving(false);
    }
  }

  const introBgValue = introBackgroundColor || "#fafaf9";
  const servicesBgValue = servicesBackgroundColor || "#fafaf9";
  const statsBgValue = statBackgroundColor || "#213431";
  const portraitBgValue = portraitBackgroundColor || "#fafaf9";
  const cadreurBgValue = cadreurBackgroundColor || "#fafaf9";
  const quoteBgValue = quoteBackgroundColor || "#fafaf9";
  const ctaBgValue = ctaBackgroundColor || "#213431";
  const animationBgComputed = computeAnimationBgValue();

  const introHtmlContent = introHtml || "<p style='color:#999'>Aucun</p>";
  const cadreurHtmlContent = cadreurHtml || "<p style='color:#999'>Aucun</p>";

  const overlayStyle: React.CSSProperties = {
    position: "fixed",
    inset: 0,
    background: "rgba(0,0,0,0.45)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    zIndex: 9999,
    padding: 16,
  };

  const boxStyle: React.CSSProperties = {
    background: "#fff",
    color: "#000",
    padding: 24,
    width: 560,
    maxWidth: "100%",
    maxHeight: "90vh",
    overflowY: "auto",
    borderRadius: 10,
  };

  return (
    <>
      <div style={overlayStyle} onClick={onClose}>
        <div style={boxStyle} onClick={(e) => e.stopPropagation()}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
            <h3 style={{ margin: 0 }}>{LABELS[blockKey]}</h3>
            <button type="button" onClick={onClose} aria-label="Fermer" style={{ background: "none", border: "none", fontSize: 20, cursor: "pointer" }}>
              ✕
            </button>
          </div>

          {blockKey === "home_intro" && (
            <>
              <div style={{ marginBottom: 12 }}>
                <label style={{ display: "block", fontSize: 13, color: "var(--muted)", marginBottom: 4 }}>Titre</label>
                <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
                  <input type="text" value={introTitle} onChange={(e) => setIntroTitle(e.target.value)} style={{ ...inputStyle, flex: 1, minWidth: 120 }} />
                  <select value={introTitleStyle} onChange={(e) => setIntroTitleStyle(e.target.value as TitleStyleKey)} style={{ ...inputStyle, width: 120 }}>
                    {TITLE_STYLE_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
                  </select>
                  <input type="number" min={TITLE_FONT_SIZE_MIN} max={TITLE_FONT_SIZE_MAX} value={introTitleFontSize === "" ? "" : introTitleFontSize} onChange={(e) => setIntroTitleFontSize(parseFontSize(e.target.value))} placeholder="px" style={{ ...inputStyle, width: 64 }} title="Taille (8–72 px)" />
                </div>
              </div>
              <div style={{ marginBottom: 12 }}>
                <label style={{ display: "block", fontSize: 13, color: "var(--muted)", marginBottom: 4 }}>Sous-titre</label>
                <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
                  <input type="text" value={introSubtitle} onChange={(e) => setIntroSubtitle(e.target.value)} style={{ ...inputStyle, flex: 1, minWidth: 120 }} />
                  <select value={introSubtitleStyle} onChange={(e) => setIntroSubtitleStyle(e.target.value as TitleStyleKey)} style={{ ...inputStyle, width: 120 }}>
                    {TITLE_STYLE_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
                  </select>
                  <input type="number" min={TITLE_FONT_SIZE_MIN} max={TITLE_FONT_SIZE_MAX} value={introSubtitleFontSize === "" ? "" : introSubtitleFontSize} onChange={(e) => setIntroSubtitleFontSize(parseFontSize(e.target.value))} placeholder="px" style={{ ...inputStyle, width: 64 }} title="Taille (8–72 px)" />
                </div>
              </div>
              <div style={{ marginBottom: 12 }}>
                <label style={{ display: "block", fontSize: 13, color: "var(--muted)", marginBottom: 4 }}>Texte</label>
                <div style={{ minHeight: 44, border: "1px solid #e6e6e6", borderRadius: 6, padding: 10, background: "#fff" }} dangerouslySetInnerHTML={{ __html: introHtmlContent }} />
                <button type="button" className="btn-ghost" style={{ marginTop: 8 }} onClick={() => setEditingHtml(true)}>Éditer le texte</button>
              </div>
              <div style={{ marginBottom: 12 }}>
                <label style={{ display: "block", fontSize: 13, color: "var(--muted)", marginBottom: 4 }}>Couleur de fond (optionnel)</label>
                <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                  <input type="color" value={introBgValue} onChange={(e) => setIntroBackgroundColor(e.target.value)} style={{ width: 48, height: 32, padding: 0, border: "1px solid #e6e6e6", borderRadius: 6 }} />
                  <input type="text" value={introBackgroundColor} onChange={(e) => setIntroBackgroundColor(e.target.value)} placeholder="ou hex (ex. #fafaf9)" style={{ ...inputStyle, width: 120 }} />
                  {introBackgroundColor ? <button type="button" className="btn-ghost" style={{ fontSize: 12 }} onClick={() => setIntroBackgroundColor("")}>Effacer</button> : null}
                </div>
              </div>
            </>
          )}

          {blockKey === "home_services" && (
            <>
              <div style={{ marginBottom: 12 }}>
                <label style={{ display: "block", fontSize: 13, color: "var(--muted)", marginBottom: 4 }}>Titre du bloc</label>
                <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
                  <input type="text" value={servicesBlockTitle} onChange={(e) => setServicesBlockTitle(e.target.value)} style={{ ...inputStyle, flex: 1, minWidth: 120 }} placeholder="Services" />
                  <select value={servicesBlockTitleStyle} onChange={(e) => setServicesBlockTitleStyle(e.target.value as TitleStyleKey)} style={{ ...inputStyle, width: 120 }}>
                    {TITLE_STYLE_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
                  </select>
                  <input type="number" min={TITLE_FONT_SIZE_MIN} max={TITLE_FONT_SIZE_MAX} value={servicesBlockTitleFontSize === "" ? "" : servicesBlockTitleFontSize} onChange={(e) => setServicesBlockTitleFontSize(parseFontSize(e.target.value))} placeholder="px" style={{ ...inputStyle, width: 64 }} title="Taille (8–72 px)" />
                </div>
              </div>
              <div style={{ marginBottom: 12 }}>
                <label style={{ display: "block", fontSize: 13, color: "var(--muted)", marginBottom: 4 }}>Sous-texte du bloc</label>
                <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
                  <input type="text" value={servicesBlockSubtitle} onChange={(e) => setServicesBlockSubtitle(e.target.value)} style={{ ...inputStyle, flex: 1, minWidth: 120 }} placeholder="Réalisation, événementiel et corporate — des prestations sur mesure." />
                  <select value={servicesBlockSubtitleStyle} onChange={(e) => setServicesBlockSubtitleStyle(e.target.value as TitleStyleKey)} style={{ ...inputStyle, width: 120 }}>
                    {TITLE_STYLE_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
                  </select>
                  <input type="number" min={TITLE_FONT_SIZE_MIN} max={TITLE_FONT_SIZE_MAX} value={servicesBlockSubtitleFontSize === "" ? "" : servicesBlockSubtitleFontSize} onChange={(e) => setServicesBlockSubtitleFontSize(parseFontSize(e.target.value))} placeholder="px" style={{ ...inputStyle, width: 64 }} title="Taille (8–72 px)" />
                </div>
              </div>
              {serviceItems.map((item, i) => {
                const itemTitleStyle = item.titleStyle ?? "h3";
                const itemTitleFontSize = item.titleFontSize ?? "";
                const itemDescriptionStyle = item.descriptionStyle ?? "p";
                return (
                <div key={i} style={{ marginBottom: 16, padding: 12, border: "1px solid #eee", borderRadius: 8 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
                    <span style={{ fontSize: 12, color: "var(--muted)", fontWeight: 600 }}>Service {i + 1}</span>
                    <button
                      type="button"
                      className="btn-ghost"
                      onClick={() => removeService(i)}
                      disabled={deletingServiceIndex === i}
                      style={{ fontSize: 12, color: "#dc2626" }}
                      aria-label="Supprimer ce service"
                    >
                      {deletingServiceIndex === i ? "Suppression…" : "Supprimer ce service"}
                    </button>
                  </div>
                  <div style={{ marginBottom: 8 }}>
                    <label style={{ fontSize: 12, color: "var(--muted)" }}>Photo (optionnel)</label>
                    <div style={{ display: "flex", gap: 8, alignItems: "center", marginTop: 4 }}>
                      {item.image?.url ? <img src={item.image.url} alt="" style={{ width: 80, height: 60, objectFit: "cover", borderRadius: 6 }} /> : null}
                      <input type="file" accept="image/*" onChange={(e) => { const f = e.target.files?.[0]; if (f) uploadServiceImage(f, i); }} disabled={uploadingIndex === i} />
                      {uploadingIndex === i ? <span style={{ fontSize: 12, color: "var(--muted)" }}>Upload…</span> : null}
                    </div>
                  </div>
                  <div style={{ marginBottom: 8 }}>
                    <label style={{ fontSize: 12, color: "var(--muted)" }}>Titre</label>
                    <div style={{ display: "flex", gap: 8, alignItems: "center", marginTop: 4, flexWrap: "wrap" }}>
                      <input type="text" placeholder="Titre" value={item.title} onChange={(e) => setServiceItems((prev) => prev.map((p, j) => (j === i ? { ...p, title: e.target.value } : p)))} style={{ ...inputStyle, flex: 1, minWidth: 100 }} />
                      <select value={itemTitleStyle} onChange={(e) => setServiceItems((prev) => prev.map((p, j) => (j === i ? { ...p, titleStyle: e.target.value as TitleStyleKey } : p)))} style={{ ...inputStyle, width: 120 }}>
                        {TITLE_STYLE_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
                      </select>
                      <input type="number" min={TITLE_FONT_SIZE_MIN} max={TITLE_FONT_SIZE_MAX} value={itemTitleFontSize} onChange={(e) => setServiceItems((prev) => prev.map((p, j) => (j === i ? { ...p, titleFontSize: parseFontSize(e.target.value) || undefined } : p)))} placeholder="px" style={{ ...inputStyle, width: 64 }} title="Taille (8–72 px)" />
                    </div>
                  </div>
                  <div style={{ marginBottom: 8 }}>
                    <label style={{ fontSize: 12, color: "var(--muted)" }}>Description</label>
                    <div style={{ display: "flex", gap: 8, alignItems: "center", marginTop: 4 }}>
                      <input type="text" placeholder="Description courte" value={item.description} onChange={(e) => setServiceItems((prev) => prev.map((p, j) => (j === i ? { ...p, description: e.target.value } : p)))} style={{ ...inputStyle, flex: 1 }} />
                      <select value={itemDescriptionStyle} onChange={(e) => setServiceItems((prev) => prev.map((p, j) => (j === i ? { ...p, descriptionStyle: e.target.value as TitleStyleKey } : p)))} style={{ ...inputStyle, width: 120 }}>
                        {TITLE_STYLE_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
                      </select>
                    </div>
                  </div>
                  <div>
                    <input type="text" placeholder="Lien (ex. /realisation)" value={item.href} onChange={(e) => setServiceItems((prev) => prev.map((p, j) => (j === i ? { ...p, href: e.target.value } : p)))} style={inputStyle} />
                  </div>
                </div>
                );
              })}
              <div style={{ marginBottom: 12 }}>
                <label style={{ display: "block", fontSize: 13, color: "var(--muted)", marginBottom: 4 }}>Couleur de fond (optionnel)</label>
                <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                  <input type="color" value={servicesBgValue} onChange={(e) => setServicesBackgroundColor(e.target.value)} style={{ width: 48, height: 32, padding: 0, border: "1px solid #e6e6e6", borderRadius: 6 }} />
                  <input type="text" value={servicesBackgroundColor} onChange={(e) => setServicesBackgroundColor(e.target.value)} placeholder="ou hex" style={{ ...inputStyle, width: 120 }} />
                  {servicesBackgroundColor ? <button type="button" className="btn-ghost" style={{ fontSize: 12 }} onClick={() => setServicesBackgroundColor("")}>Effacer</button> : null}
                </div>
              </div>
              <button type="button" className="btn-ghost" onClick={() => setServiceItems((prev) => [...prev, { title: "", description: "", href: "", image: null, titleStyle: "h3", descriptionStyle: "p", titleFontSize: undefined }])}>+ Ajouter un service</button>
            </>
          )}

          {blockKey === "home_stats" && (
            <>
              {statItems.map((item, i) => {
                const statValue = item.value;
                const statLabel = item.label;
                return (
                <div key={i} style={{ marginBottom: 12, display: "flex", gap: 8 }}>
                  <input type="text" placeholder="Valeur (ex. 10+)" value={statValue} onChange={(e) => setStatItems((prev) => prev.map((p, j) => (j === i ? { ...p, value: e.target.value } : p)))} style={{ ...inputStyle, width: 100 }} />
                  <input type="text" placeholder="Label (ex. ans d'expérience)" value={statLabel} onChange={(e) => setStatItems((prev) => prev.map((p, j) => (j === i ? { ...p, label: e.target.value } : p)))} style={{ ...inputStyle, flex: 1 }} />
                </div>
                );
              })}
              <div style={{ marginBottom: 12 }}>
                <label style={{ display: "block", fontSize: 13, color: "var(--muted)", marginBottom: 4 }}>Couleur de fond (optionnel)</label>
                <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                  <input type="color" value={statsBgValue} onChange={(e) => setStatBackgroundColor(e.target.value)} style={{ width: 48, height: 32, padding: 0, border: "1px solid #e6e6e6", borderRadius: 6 }} />
                  <input type="text" value={statBackgroundColor} onChange={(e) => setStatBackgroundColor(e.target.value)} placeholder="ou hex" style={{ ...inputStyle, width: 120 }} />
                  {statBackgroundColor ? <button type="button" className="btn-ghost" style={{ fontSize: 12 }} onClick={() => setStatBackgroundColor("")}>Effacer</button> : null}
                </div>
              </div>
              <button type="button" className="btn-ghost" onClick={() => setStatItems((prev) => [...prev, { value: "", label: "" }])}>+ Ajouter un chiffre</button>
            </>
          )}

          {blockKey === "home_portrait" && (
            <>
              <div style={{ marginBottom: 12 }}>
                <label style={{ display: "block", fontSize: 13, color: "var(--muted)", marginBottom: 4 }}>Vitesse de défilement</label>
                <input
                  type="number"
                  min={2}
                  max={30}
                  step={1}
                  value={Math.round(portraitCarouselSpeed / 1000)}
                  onChange={(e) => setPortraitCarouselSpeed(Math.max(2, Math.min(30, Number(e.target.value) || 5)) * 1000)}
                  style={{ ...inputStyle, width: 80 }}
                />
                <span style={{ fontSize: 12, color: "var(--muted)", marginLeft: 8 }}>secondes entre chaque slide</span>
              </div>
              <div style={{ marginBottom: 12 }}>
                <label style={{ display: "block", fontSize: 13, color: "var(--muted)", marginBottom: 4 }}>Titre du bloc</label>
                <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
                  <input type="text" value={portraitBlockTitle} onChange={(e) => setPortraitBlockTitle(e.target.value)} style={{ ...inputStyle, flex: 1, minWidth: 120 }} placeholder="Portrait" />
                  <select value={portraitBlockTitleStyle} onChange={(e) => setPortraitBlockTitleStyle(e.target.value as TitleStyleKey)} style={{ ...inputStyle, width: 120 }}>
                    {TITLE_STYLE_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
                  </select>
                  <input type="number" min={TITLE_FONT_SIZE_MIN} max={TITLE_FONT_SIZE_MAX} value={portraitBlockTitleFontSize === "" ? "" : portraitBlockTitleFontSize} onChange={(e) => setPortraitBlockTitleFontSize(parseFontSize(e.target.value))} placeholder="px" style={{ ...inputStyle, width: 64 }} title="Taille (8–72 px)" />
                </div>
              </div>
              <div style={{ marginBottom: 12 }}>
                <label style={{ display: "block", fontSize: 13, color: "var(--muted)", marginBottom: 4 }}>Texte du bouton</label>
                <input type="text" value={portraitCtaLabel} onChange={(e) => setPortraitCtaLabel(e.target.value)} style={inputStyle} placeholder="Découvrir le portrait" />
              </div>
              <div style={{ marginBottom: 12 }}>
                <label style={{ display: "block", fontSize: 13, color: "var(--muted)", marginBottom: 4 }}>Lien du bouton</label>
                <input type="text" value={portraitCtaHref} onChange={(e) => setPortraitCtaHref(e.target.value)} style={inputStyle} placeholder="/portrait" />
              </div>
              <div style={{ marginBottom: 12 }}>
                <label style={{ display: "block", fontSize: 13, color: "var(--muted)", marginBottom: 4 }}>Style du bouton</label>
                <select value={portraitCtaButtonStyle} onChange={(e) => setPortraitCtaButtonStyle(e.target.value as "1" | "2")} style={inputStyle}>
                  <option value="1">Style 1</option>
                  <option value="2">Style 2</option>
                </select>
              </div>
              <div style={{ marginBottom: 12 }}>
                <label style={{ display: "block", fontSize: 13, color: "var(--muted)", marginBottom: 4 }}>Couleur de fond (optionnel)</label>
                <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                  <input type="color" value={portraitBgValue} onChange={(e) => setPortraitBackgroundColor(e.target.value)} style={{ width: 48, height: 32, padding: 0, border: "1px solid #e6e6e6", borderRadius: 6 }} />
                  <input type="text" value={portraitBackgroundColor} onChange={(e) => setPortraitBackgroundColor(e.target.value)} placeholder="ou hex" style={{ ...inputStyle, width: 120 }} />
                  {portraitBackgroundColor ? <button type="button" className="btn-ghost" style={{ fontSize: 12 }} onClick={() => setPortraitBackgroundColor("")}>Effacer</button> : null}
                </div>
              </div>
              <div style={{ marginTop: 20, marginBottom: 8, fontWeight: 600, fontSize: 14 }}>4 slides (Lifestyle, Studio, Entreprise, Couple)</div>
              {portraitSlides.map((slide, i) => {
                const slideTitleStyle = slide.titleStyle ?? "h3";
                const slideTitleFontSize = slide.titleFontSize ?? "";
                const slideHtmlContent = slide.text || "<p style='color:#999'>Aucun</p>";
                return (
                <div key={i} style={{ marginBottom: 20, padding: 12, border: "1px solid #eee", borderRadius: 8 }}>
                  <div style={{ marginBottom: 8 }}>
                    <label style={{ fontSize: 12, color: "var(--muted)" }}>Slide {i + 1} — Titre</label>
                    <div style={{ display: "flex", gap: 8, alignItems: "center", marginTop: 4, flexWrap: "wrap" }}>
                      <input type="text" value={slide.title} onChange={(e) => setPortraitSlides((prev) => prev.map((s, j) => (j === i ? { ...s, title: e.target.value } : s)))} style={{ ...inputStyle, flex: 1, minWidth: 100 }} placeholder={DEFAULT_PORTRAIT_TITLES[i]} />
                      <select value={slideTitleStyle} onChange={(e) => setPortraitSlides((prev) => prev.map((s, j) => (j === i ? { ...s, titleStyle: e.target.value as TitleStyleKey } : s)))} style={{ ...inputStyle, width: 120 }}>
                        {TITLE_STYLE_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
                      </select>
                      <input type="number" min={TITLE_FONT_SIZE_MIN} max={TITLE_FONT_SIZE_MAX} value={slideTitleFontSize} onChange={(e) => setPortraitSlides((prev) => prev.map((s, j) => (j === i ? { ...s, titleFontSize: parseFontSize(e.target.value) || undefined } : s)))} placeholder="px" style={{ ...inputStyle, width: 64 }} title="Taille (8–72 px)" />
                    </div>
                  </div>
                  <div style={{ marginBottom: 8 }}>
                    <label style={{ fontSize: 12, color: "var(--muted)" }}>Texte</label>
                    <div style={{ minHeight: 44, border: "1px solid #e6e6e6", borderRadius: 6, padding: 10, background: "#fff" }} dangerouslySetInnerHTML={{ __html: slideHtmlContent }} />
                    <button type="button" className="btn-ghost" style={{ marginTop: 4 }} onClick={() => setEditingSlideIndex(i)}>Éditer le texte</button>
                  </div>
                  <div style={{ marginBottom: 8 }}>
                    <label style={{ fontSize: 12, color: "var(--muted)" }}>Photo principale</label>
                    <div style={{ display: "flex", gap: 8, alignItems: "center", marginTop: 4, flexWrap: "wrap" }}>
                      {slide.image?.url ? <img src={slide.image.url} alt="" style={{ width: 80, height: 60, objectFit: "cover", borderRadius: 6 }} /> : null}
                      <input type="file" accept="image/*" onChange={(e) => { const f = e.target.files?.[0]; if (f) uploadPortraitSlideImage(f, i); }} disabled={uploadingPortraitIndex === i} />
                      {uploadingPortraitIndex === i ? <span style={{ fontSize: 12, color: "var(--muted)" }}>Upload…</span> : null}
                    </div>
                    {slide.image?.url ? (
                      <div style={{ marginTop: 6 }}>
                        <span style={{ fontSize: 11, color: "var(--muted)" }}>Point de focus : cliquer sur l’aperçu</span>
                        <div style={{ position: "relative", display: "inline-block", marginTop: 4 }}>
                          <img
                            src={slide.image.url}
                            alt=""
                            style={{ width: 160, height: 120, objectFit: "cover", objectPosition: slide.image.focus ? `${slide.image.focus.x}% ${slide.image.focus.y}%` : "50% 50%", borderRadius: 6, cursor: "crosshair" }}
                            onClick={(e) => {
                              const rect = e.currentTarget.getBoundingClientRect();
                              const x = Math.min(100, Math.max(0, Math.round(((e.clientX - rect.left) / rect.width) * 100)));
                              const y = Math.min(100, Math.max(0, Math.round(((e.clientY - rect.top) / rect.height) * 100)));
                              setPortraitSlides((prev) => prev.map((s, j) => (j === i && s.image ? { ...s, image: { ...s.image, focus: { x, y } } } : s)));
                            }}
                          />
                          {slide.image.focus ? (
                            <div style={{ position: "absolute", left: `calc(${slide.image.focus.x}% - 6px)`, top: `calc(${slide.image.focus.y}% - 6px)`, width: 12, height: 12, background: "#fff", border: "2px solid #111", borderRadius: 999, pointerEvents: "none" }} />
                          ) : null}
                        </div>
                        {slide.image.focus ? <span style={{ fontSize: 11, color: "var(--muted)", marginLeft: 8 }}>x: {slide.image.focus.x} / y: {slide.image.focus.y}</span> : null}
                      </div>
                    ) : null}
                  </div>
                  <div>
                    <label style={{ fontSize: 12, color: "var(--muted)" }}>Photo 2 (secondaire, superposée)</label>
                    <div style={{ display: "flex", gap: 8, alignItems: "center", marginTop: 4, flexWrap: "wrap" }}>
                      {slide.image2?.url ? <img src={slide.image2.url} alt="" style={{ width: 80, height: 60, objectFit: "cover", borderRadius: 6 }} /> : null}
                      <input type="file" accept="image/*" onChange={(e) => { const f = e.target.files?.[0]; if (f) uploadPortraitSlideImage2(f, i); }} disabled={uploadingPortrait2Index === i} />
                      {uploadingPortrait2Index === i ? <span style={{ fontSize: 12, color: "var(--muted)" }}>Upload…</span> : null}
                      {slide.image2?.url ? (
                        <button type="button" onClick={() => setPortraitSlides((prev) => prev.map((s, j) => (j === i ? { ...s, image2: null } : s)))} style={{ fontSize: 12, padding: "4px 8px" }}>
                          Suppr.
                        </button>
                      ) : null}
                    </div>
                    {slide.image2?.url ? (
                      <div style={{ marginTop: 6 }}>
                        <span style={{ fontSize: 11, color: "var(--muted)" }}>Point de focus : cliquer sur l’aperçu</span>
                        <div style={{ position: "relative", display: "inline-block", marginTop: 4 }}>
                          <img
                            src={slide.image2.url}
                            alt=""
                            style={{ width: 160, height: 120, objectFit: "cover", objectPosition: slide.image2.focus ? `${slide.image2.focus.x}% ${slide.image2.focus.y}%` : "50% 50%", borderRadius: 6, cursor: "crosshair" }}
                            onClick={(e) => {
                              const rect = e.currentTarget.getBoundingClientRect();
                              const x = Math.min(100, Math.max(0, Math.round(((e.clientX - rect.left) / rect.width) * 100)));
                              const y = Math.min(100, Math.max(0, Math.round(((e.clientY - rect.top) / rect.height) * 100)));
                              setPortraitSlides((prev) => prev.map((s, j) => (j === i && s.image2 ? { ...s, image2: { ...s.image2, focus: { x, y } } } : s)));
                            }}
                          />
                          {slide.image2.focus ? (
                            <div style={{ position: "absolute", left: `calc(${slide.image2.focus.x}% - 6px)`, top: `calc(${slide.image2.focus.y}% - 6px)`, width: 12, height: 12, background: "#fff", border: "2px solid #111", borderRadius: 999, pointerEvents: "none" }} />
                          ) : null}
                        </div>
                        {slide.image2.focus ? <span style={{ fontSize: 11, color: "var(--muted)", marginLeft: 8 }}>x: {slide.image2.focus.x} / y: {slide.image2.focus.y}</span> : null}
                      </div>
                    ) : null}
                  </div>
                </div>
                );
              })}
            </>
          )}

          {blockKey === "home_cadreur" && (
            <>
              <div style={{ marginBottom: 12 }}>
                <label style={{ display: "block", fontSize: 13, color: "var(--muted)", marginBottom: 4 }}>Titre</label>
                <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
                  <input type="text" value={cadreurTitle} onChange={(e) => setCadreurTitle(e.target.value)} style={{ ...inputStyle, flex: 1, minWidth: 120 }} />
                  <select value={cadreurTitleStyle} onChange={(e) => setCadreurTitleStyle(e.target.value as TitleStyleKey)} style={{ ...inputStyle, width: 120 }}>
                    {TITLE_STYLE_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
                  </select>
                  <input type="number" min={TITLE_FONT_SIZE_MIN} max={TITLE_FONT_SIZE_MAX} value={cadreurTitleFontSize === "" ? "" : cadreurTitleFontSize} onChange={(e) => setCadreurTitleFontSize(parseFontSize(e.target.value))} placeholder="px" style={{ ...inputStyle, width: 64 }} title="Taille (8–72 px)" />
                </div>
              </div>
              <div style={{ marginBottom: 12 }}>
                <label style={{ display: "block", fontSize: 13, color: "var(--muted)", marginBottom: 4 }}>Texte</label>
                <div style={{ minHeight: 44, border: "1px solid #e6e6e6", borderRadius: 6, padding: 10, background: "#fff" }} dangerouslySetInnerHTML={{ __html: cadreurHtmlContent }} />
                <button type="button" className="btn-ghost" style={{ marginTop: 8 }} onClick={() => setEditingCadreurHtml(true)}>Éditer le texte</button>
              </div>
              <div style={{ marginBottom: 12 }}>
                <label style={{ display: "block", fontSize: 13, color: "var(--muted)", marginBottom: 4 }}>Image (optionnel)</label>
                <div style={{ display: "flex", gap: 8, alignItems: "center", marginTop: 4, flexWrap: "wrap" }}>
                  {cadreurImage?.url ? <img src={cadreurImage.url} alt="" style={{ width: 120, height: 90, objectFit: "cover", borderRadius: 6 }} /> : null}
                  <input type="file" accept="image/*" onChange={(e) => { const f = e.target.files?.[0]; if (f) uploadBlockImage(f, "cadreur"); }} />
                </div>
                {cadreurImage?.url ? (
                  <div style={{ marginTop: 8 }}>
                    <span style={{ fontSize: 11, color: "var(--muted)" }}>Point de focus : cliquer sur l’aperçu</span>
                    <div style={{ position: "relative", display: "inline-block", marginTop: 4 }}>
                      <img
                        src={cadreurImage.url}
                        alt=""
                        style={{ width: 200, height: 150, objectFit: "cover", objectPosition: cadreurImage.focus ? `${cadreurImage.focus.x}% ${cadreurImage.focus.y}%` : "50% 50%", borderRadius: 6, cursor: "crosshair" }}
                        onClick={(e) => {
                          const rect = e.currentTarget.getBoundingClientRect();
                          const x = Math.min(100, Math.max(0, Math.round(((e.clientX - rect.left) / rect.width) * 100)));
                          const y = Math.min(100, Math.max(0, Math.round(((e.clientY - rect.top) / rect.height) * 100)));
                          setCadreurImage((prev) => (prev ? { ...prev, focus: { x, y } } : null));
                        }}
                      />
                      {cadreurImage.focus ? (
                        <div style={{ position: "absolute", left: `calc(${cadreurImage.focus.x}% - 6px)`, top: `calc(${cadreurImage.focus.y}% - 6px)`, width: 12, height: 12, background: "#fff", border: "2px solid #111", borderRadius: 999, pointerEvents: "none" }} />
                      ) : null}
                    </div>
                    {cadreurImage.focus ? <span style={{ fontSize: 11, color: "var(--muted)", marginLeft: 8 }}>x: {cadreurImage.focus.x} / y: {cadreurImage.focus.y}</span> : null}
                  </div>
                ) : null}
              </div>
              <div style={{ marginBottom: 12 }}>
                <label style={{ display: "block", fontSize: 13, color: "var(--muted)", marginBottom: 4 }}>Couleur de fond (optionnel)</label>
                <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                  <input type="color" value={cadreurBgValue} onChange={(e) => setCadreurBackgroundColor(e.target.value)} style={{ width: 48, height: 32, padding: 0, border: "1px solid #e6e6e6", borderRadius: 6 }} />
                  <input type="text" value={cadreurBackgroundColor} onChange={(e) => setCadreurBackgroundColor(e.target.value)} placeholder="ou hex" style={{ ...inputStyle, width: 120 }} />
                  {cadreurBackgroundColor ? <button type="button" className="btn-ghost" style={{ fontSize: 12 }} onClick={() => setCadreurBackgroundColor("")}>Effacer</button> : null}
                </div>
              </div>
            </>
          )}

          {blockKey === "home_animation" && (
            <>
              <div style={{ marginBottom: 12 }}>
                <label style={{ display: "block", fontSize: 13, color: "var(--muted)", marginBottom: 4 }}>Bannière / image d'accroche (optionnel)</label>
                <div style={{ display: "flex", gap: 8, alignItems: "center", marginTop: 4, flexWrap: "wrap" }}>
                  {animationImage?.url ? <img src={animationImage.url} alt="" style={{ width: 200, height: 120, objectFit: "cover", borderRadius: 8 }} /> : null}
                  <input type="file" accept="image/*" onChange={(e) => { const f = e.target.files?.[0]; if (f) uploadAnimationBanner(f); }} disabled={uploadingAnimationImage} />
                  {uploadingAnimationImage ? <span style={{ fontSize: 12, color: "var(--muted)" }}>Upload…</span> : null}
                  {animationImage?.url ? <button type="button" className="btn-ghost" style={{ fontSize: 12, color: "#c00" }} onClick={() => setAnimationImage(null)}>Supprimer l'image</button> : null}
                </div>
              </div>
              <div style={{ marginBottom: 12 }}>
                <label style={{ display: "block", fontSize: 13, color: "var(--muted)", marginBottom: 4 }}>Titre du bloc</label>
                <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
                  <input type="text" value={animationBlockTitle} onChange={(e) => setAnimationBlockTitle(e.target.value)} style={{ ...inputStyle, flex: 1, minWidth: 120 }} placeholder="Animation" />
                  <select value={animationBlockTitleStyle} onChange={(e) => setAnimationBlockTitleStyle(e.target.value as TitleStyleKey)} style={{ ...inputStyle, width: 120 }}>
                    {TITLE_STYLE_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
                  </select>
                  <input type="number" min={TITLE_FONT_SIZE_MIN} max={TITLE_FONT_SIZE_MAX} value={animationBlockTitleFontSize === "" ? "" : animationBlockTitleFontSize} onChange={(e) => setAnimationBlockTitleFontSize(parseFontSize(e.target.value))} placeholder="px" style={{ ...inputStyle, width: 64 }} title="Taille (8–72 px)" />
                </div>
              </div>
              <div style={{ marginBottom: 12 }}>
                <label style={{ display: "block", fontSize: 13, color: "var(--muted)", marginBottom: 4 }}>Sous-texte du bloc</label>
                <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
                  <input type="text" value={animationBlockSubtitle} onChange={(e) => setAnimationBlockSubtitle(e.target.value)} style={{ ...inputStyle, flex: 1, minWidth: 120 }} placeholder="De l'idée au rendu final…" />
                  <select value={animationBlockSubtitleStyle} onChange={(e) => setAnimationBlockSubtitleStyle(e.target.value as TitleStyleKey)} style={{ ...inputStyle, width: 120 }}>
                    {TITLE_STYLE_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
                  </select>
                  <input type="number" min={TITLE_FONT_SIZE_MIN} max={TITLE_FONT_SIZE_MAX} value={animationBlockSubtitleFontSize === "" ? "" : animationBlockSubtitleFontSize} onChange={(e) => setAnimationBlockSubtitleFontSize(parseFontSize(e.target.value))} placeholder="px" style={{ ...inputStyle, width: 64 }} title="Taille (8–72 px)" />
                </div>
              </div>
              <div style={{ marginBottom: 12 }}>
                <label style={{ display: "block", fontSize: 13, color: "var(--muted)", marginBottom: 4 }}>Couleur de fond (optionnel)</label>
                <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
                  <input
                    type="color"
                    value={animationBgComputed}
                    onChange={(e) => setAnimationBackgroundColor(e.target.value)}
                    style={{ width: 48, height: 32, padding: 0, border: "1px solid #e6e6e6", borderRadius: 6 }}
                  />
                  <input type="text" value={animationBackgroundColor} onChange={(e) => setAnimationBackgroundColor(e.target.value)} placeholder="hex 6 caractères (ex. #0f0f12)" style={{ ...inputStyle, width: 140 }} />
                  {animationBackgroundColor ? <button type="button" className="btn-ghost" style={{ fontSize: 12 }} onClick={() => setAnimationBackgroundColor("")}>Effacer</button> : null}
                </div>
              </div>
            </>
          )}

          {blockKey === "home_quote" && (
            <>
              <div style={{ marginBottom: 12 }}>
                <label style={{ display: "block", fontSize: 13, color: "var(--muted)", marginBottom: 4 }}>Vitesse de défilement</label>
                <input
                  type="number"
                  min={1}
                  max={60}
                  step={1}
                  value={Math.round(quoteCarouselSpeed / 1000)}
                  onChange={(e) => setQuoteCarouselSpeed(Math.max(1, Math.min(60, Number(e.target.value) || 5)) * 1000)}
                  style={{ ...inputStyle, width: 80 }}
                />
                <span style={{ fontSize: 12, color: "var(--muted)", marginLeft: 8 }}>s (plus petit = défilement plus rapide, durée d’un cycle)</span>
              </div>
              <div style={{ marginBottom: 8, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <label style={{ fontSize: 13, color: "var(--muted)" }}>Citations (min. 3)</label>
                <button type="button" className="btn-ghost" onClick={() => setQuoteItems((prev) => [...prev, { text: "", author: "", role: "", authorStyle: "p", roleStyle: "p" }])}>+ Ajouter une citation</button>
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
                {quoteItems.map((q, i) => {
                  const qAuthorStyle = q.authorStyle ?? "p";
                  const qRoleStyle = q.roleStyle ?? "p";
                  const qText = q.text;
                  const qAuthor = q.author;
                  const qRole = q.role ?? "";
                  return (
                  <div key={i} style={{ border: "1px solid #e6e6e6", borderRadius: 8, padding: 12, background: "#fafafa" }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
                      <span style={{ fontWeight: 600, fontSize: 13 }}>Citation {i + 1}</span>
                      {quoteItems.length > 3 && (
                        <button type="button" className="btn-ghost" style={{ fontSize: 12, color: "#c00" }} onClick={() => setQuoteItems((prev) => prev.filter((_, j) => j !== i))}>Supprimer</button>
                      )}
                    </div>
                    <div style={{ marginBottom: 8 }}>
                      <label style={{ display: "block", fontSize: 12, color: "var(--muted)", marginBottom: 4 }}>Texte</label>
                      <textarea value={qText} onChange={(e) => setQuoteItems((prev) => prev.map((item, j) => (j === i ? { ...item, text: e.target.value } : item)))} style={{ ...inputStyle, minHeight: 60, width: "100%" }} rows={2} />
                    </div>
                    <div style={{ marginBottom: 8 }}>
                      <label style={{ display: "block", fontSize: 12, color: "var(--muted)", marginBottom: 4 }}>Auteur</label>
                      <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                        <input type="text" value={qAuthor} onChange={(e) => setQuoteItems((prev) => prev.map((item, j) => (j === i ? { ...item, author: e.target.value } : item)))} style={{ ...inputStyle, flex: 1 }} />
                        <select value={qAuthorStyle} onChange={(e) => setQuoteItems((prev) => prev.map((item, j) => (j === i ? { ...item, authorStyle: e.target.value as TitleStyleKey } : item)))} style={{ ...inputStyle, width: 100 }}>
                          {TITLE_STYLE_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
                        </select>
                      </div>
                    </div>
                    <div>
                      <label style={{ display: "block", fontSize: 12, color: "var(--muted)", marginBottom: 4 }}>Rôle (optionnel)</label>
                      <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                        <input type="text" value={qRole} onChange={(e) => setQuoteItems((prev) => prev.map((item, j) => (j === i ? { ...item, role: e.target.value } : item)))} style={{ ...inputStyle, flex: 1 }} />
                        <select value={qRoleStyle} onChange={(e) => setQuoteItems((prev) => prev.map((item, j) => (j === i ? { ...item, roleStyle: e.target.value as TitleStyleKey } : item)))} style={{ ...inputStyle, width: 100 }}>
                          {TITLE_STYLE_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
                        </select>
                      </div>
                    </div>
                  </div>
                  );
                })}
              </div>
              <div style={{ marginBottom: 12 }}>
                <label style={{ display: "block", fontSize: 13, color: "var(--muted)", marginBottom: 4 }}>Couleur de fond (optionnel)</label>
                <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                  <input type="color" value={quoteBgValue} onChange={(e) => setQuoteBackgroundColor(e.target.value)} style={{ width: 48, height: 32, padding: 0, border: "1px solid #e6e6e6", borderRadius: 6 }} />
                  <input type="text" value={quoteBackgroundColor} onChange={(e) => setQuoteBackgroundColor(e.target.value)} placeholder="ou hex" style={{ ...inputStyle, width: 120 }} />
                  {quoteBackgroundColor ? <button type="button" className="btn-ghost" style={{ fontSize: 12 }} onClick={() => setQuoteBackgroundColor("")}>Effacer</button> : null}
                </div>
              </div>
            </>
          )}

          {blockKey === "home_cta" && (
            <>
              <div style={{ marginBottom: 12 }}>
                <label style={{ display: "block", fontSize: 13, color: "var(--muted)", marginBottom: 4 }}>Titre</label>
                <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
                  <input type="text" value={ctaTitle} onChange={(e) => setCtaTitle(e.target.value)} style={{ ...inputStyle, flex: 1, minWidth: 120 }} />
                  <select value={ctaTitleStyle} onChange={(e) => setCtaTitleStyle(e.target.value as TitleStyleKey)} style={{ ...inputStyle, width: 120 }}>
                    {TITLE_STYLE_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
                  </select>
                  <input type="number" min={TITLE_FONT_SIZE_MIN} max={TITLE_FONT_SIZE_MAX} value={ctaTitleFontSize === "" ? "" : ctaTitleFontSize} onChange={(e) => setCtaTitleFontSize(parseFontSize(e.target.value))} placeholder="px" style={{ ...inputStyle, width: 64 }} title="Taille (8–72 px)" />
                </div>
              </div>
              <div style={{ marginBottom: 12 }}>
                <label style={{ display: "block", fontSize: 13, color: "var(--muted)", marginBottom: 4 }}>Texte du bouton</label>
                <input type="text" value={ctaButtonLabel} onChange={(e) => setCtaButtonLabel(e.target.value)} style={inputStyle} />
              </div>
              <div style={{ marginBottom: 12 }}>
                <label style={{ display: "block", fontSize: 13, color: "var(--muted)", marginBottom: 4 }}>Lien du bouton</label>
                <input type="text" value={ctaButtonHref} onChange={(e) => setCtaButtonHref(e.target.value)} style={inputStyle} placeholder="/contact" />
              </div>
              <div style={{ marginBottom: 12 }}>
                <label style={{ display: "block", fontSize: 13, color: "var(--muted)", marginBottom: 4 }}>Style du bouton</label>
                <select value={ctaButtonStyle} onChange={(e) => setCtaButtonStyle(e.target.value as "1" | "2")} style={inputStyle}>
                  <option value="1">Style 1</option>
                  <option value="2">Style 2</option>
                </select>
              </div>
              <div style={{ marginBottom: 12 }}>
                <label style={{ display: "block", fontSize: 13, color: "var(--muted)", marginBottom: 4 }}>Couleur de fond (optionnel)</label>
                <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                  <input type="color" value={ctaBgValue} onChange={(e) => setCtaBackgroundColor(e.target.value)} style={{ width: 48, height: 32, padding: 0, border: "1px solid #e6e6e6", borderRadius: 6 }} />
                  <input type="text" value={ctaBackgroundColor} onChange={(e) => setCtaBackgroundColor(e.target.value)} placeholder="ou hex" style={{ ...inputStyle, width: 120 }} />
                  {ctaBackgroundColor ? <button type="button" className="btn-ghost" style={{ fontSize: 12 }} onClick={() => setCtaBackgroundColor("")}>Effacer</button> : null}
                </div>
              </div>
            </>
          )}

          {error && <div style={{ color: "crimson", marginBottom: 8 }}>{error}</div>}
          <div style={{ display: "flex", justifyContent: "flex-end", gap: 8, marginTop: 20 }}>
            <button type="button" className="btn-secondary" onClick={onClose} disabled={saving}>Annuler</button>
            <button type="button" className="btn-primary" onClick={save} disabled={saving}>{saving ? "Enregistrement…" : "Enregistrer"}</button>
          </div>
        </div>
      </div>

      {editingHtml && blockKey === "home_intro" && (
        <RichTextModal title="Texte intro" initial={introHtml} onClose={() => setEditingHtml(false)} onSave={(h) => { setIntroHtml(h); setEditingHtml(false); }} />
      )}
      {editingSlideIndex !== null && blockKey === "home_portrait" && portraitSlides[editingSlideIndex] && (
        <RichTextModal
          title={`Texte — ${portraitSlides[editingSlideIndex].title || "Slide"}`}
          initial={portraitSlides[editingSlideIndex].text}
          onClose={() => setEditingSlideIndex(null)}
          onSave={(h) => {
            setPortraitSlides((prev) => prev.map((s, j) => (j === editingSlideIndex ? { ...s, text: h } : s)));
            setEditingSlideIndex(null);
          }}
        />
      )}
      {editingCadreurHtml && blockKey === "home_cadreur" && (
        <RichTextModal title="Texte Cadreur" initial={cadreurHtml} onClose={() => setEditingCadreurHtml(false)} onSave={(h) => { setCadreurHtml(h); setEditingCadreurHtml(false); }} />
      )}
    </>
  );
}
