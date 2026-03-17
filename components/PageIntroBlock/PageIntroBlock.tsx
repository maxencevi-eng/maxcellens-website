"use client";

import React, { useEffect, useState, useMemo } from 'react';
import dynamic from 'next/dynamic';
import { supabase } from '../../lib/supabase';
import {
  Camera, Video, Film, Play, Aperture, Image, Images,
  Users, User, UserPlus, UserCheck, UserCog,
  Heart, Star, Sparkles, Wand2, Paintbrush, Palette,
  Building2, Home, Landmark, MapPin, Globe,
  Share2, Megaphone, MessageSquare, Mail, Phone,
  LayoutGrid, Layers, Monitor, Smartphone, MonitorPlay,
  Sun, Moon, Sunset, Lightbulb, Zap,
  Award, Trophy, Medal, CheckCircle2, Target, Shield,
  Pencil, Edit3, Scissors, Sliders, Settings,
  ArrowRight, TrendingUp, ChevronRight,
  Clock, Calendar, Timer,
  Eye, Focus, Scan, Lock,
} from 'lucide-react';
import type { PageIntroBlockData, PageIntroFeature } from './pageIntroDefaults';
import { PAGE_INTRO_DEFAULTS } from './pageIntroDefaults';
import { responsiveFontSize } from '@/lib/responsiveFontSize';

const PageIntroBlockModal = dynamic(() => import('./PageIntroBlockModal'), { ssr: false });

// Map icon name → Lucide component
const ICON_MAP: Record<string, React.ComponentType<{ size?: number; color?: string; strokeWidth?: number }>> = {
  Camera, Video, Film, Play, Aperture, Image, Images,
  Users, User, UserPlus, UserCheck, UserCog,
  Heart, Star, Sparkles, Wand2, Paintbrush, Palette,
  Building2, Home, Landmark, MapPin, Globe,
  Share2, Megaphone, MessageSquare, Mail, Phone,
  LayoutGrid, Layers, Monitor, Smartphone, MonitorPlay,
  Sun, Moon, Sunset, Lightbulb, Zap,
  Award, Trophy, Medal, CheckCircle2, Target, Shield,
  Pencil, Edit3, Scissors, Sliders, Settings,
  ArrowRight, TrendingUp, ChevronRight,
  Clock, Calendar, Timer,
  Eye, Focus, Scan, Lock,
};

function LucideIcon({ name, size = 22, color, strokeWidth = 1.5 }: { name?: string; size?: number; color?: string; strokeWidth?: number }) {
  if (!name) return null;
  const Comp = ICON_MAP[name];
  if (!Comp) return null;
  return <Comp size={size} color={color || 'currentColor'} strokeWidth={strokeWidth} />;
}

function titleTag(style: string | undefined, children: React.ReactNode, props: React.HTMLAttributes<HTMLElement>): React.ReactNode {
  switch (style) {
    case 'h1': return <h1 {...(props as any)}>{children}</h1>;
    case 'h3': return <h3 {...(props as any)}>{children}</h3>;
    case 'h4': return <h4 {...(props as any)}>{children}</h4>;
    case 'h5': return <h5 {...(props as any)}>{children}</h5>;
    case 'p':  return <p {...(props as any)}>{children}</p>;
    default:   return <h2 {...(props as any)}>{children}</h2>;
  }
}

function FeatureColumn({ feature, index }: { feature: PageIntroFeature; index: number }) {
  const hasIcon = feature.iconType === 'lucide' ? !!feature.iconName : !!feature.iconImage?.url;
  const titleFs = feature.titleFontSize ? responsiveFontSize(feature.titleFontSize) : undefined;
  const descFs = feature.descriptionFontSize ? responsiveFontSize(feature.descriptionFontSize) : undefined;

  return (
    <div
      style={{
        flex: 1,
        minWidth: 0,
        padding: '2rem 1.5rem',
        display: 'flex',
        flexDirection: 'column',
        gap: 12,
        borderLeft: index > 0 ? '1px solid rgba(255,255,255,0.08)' : 'none',
      }}
      className="page-intro-feature-col"
    >
      {hasIcon && (
        <div style={{ marginBottom: 4, opacity: 0.75, color: feature.iconColor || 'var(--color-text, #fff)' }}>
          {feature.iconType === 'image' && feature.iconImage?.url ? (
            <img src={feature.iconImage.url} alt="" style={{ width: 26, height: 26, objectFit: 'contain', filter: 'brightness(0) invert(1)', opacity: 0.8 }} />
          ) : (
            <LucideIcon name={feature.iconName} size={22} color={feature.iconColor || undefined} strokeWidth={1.5} />
          )}
        </div>
      )}

      {feature.title && titleTag(
        feature.titleStyle,
        feature.title,
        {
          style: {
            margin: 0,
            fontSize: titleFs || '0.95rem',
            fontWeight: 700,
            color: feature.titleColor || 'var(--color-text, #fff)',
            textAlign: (feature.titleAlign as any) || 'left',
            lineHeight: 1.3,
          },
        }
      )}

      {feature.description && (
        <p style={{
          margin: 0,
          fontSize: descFs || '0.875rem',
          color: feature.descriptionColor || 'var(--color-text-muted, rgba(255,255,255,0.65))',
          lineHeight: 1.65,
          textAlign: (feature.titleAlign as any) || 'left',
        }}>
          {feature.description}
        </p>
      )}
    </div>
  );
}

interface PageIntroBlockProps {
  pageKey: string;
  settingsKey: string;
  blockId?: string;
  externalEditOpen?: boolean;
  onExternalEditClose?: () => void;
}

export default function PageIntroBlock({ pageKey, settingsKey, blockId, externalEditOpen, onExternalEditClose }: PageIntroBlockProps) {
  const defaultData = PAGE_INTRO_DEFAULTS[pageKey] ?? {};
  const [data, setData] = useState<PageIntroBlockData>(defaultData);
  const [isAdmin, setIsAdmin] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);

  useEffect(() => {
    if (externalEditOpen) setModalOpen(true);
  }, [externalEditOpen]);

  // Auth
  useEffect(() => {
    let mounted = true;
    supabase.auth.getUser().then(({ data: d }) => { if (mounted) setIsAdmin(Boolean((d as any).user)); });
    const { data: listener } = supabase.auth.onAuthStateChange((_e, s) => setIsAdmin(Boolean(s?.user)));
    return () => { mounted = false; try { (listener as any)?.subscription?.unsubscribe?.(); } catch (_) {} };
  }, []);

  // Load from Supabase
  useEffect(() => {
    async function load() {
      try {
        const res = await fetch(`/api/admin/site-settings?keys=${encodeURIComponent(settingsKey)}`);
        const json = await res.json();
        if (json?.settings?.[settingsKey]) {
          const parsed = JSON.parse(json.settings[settingsKey]);
          setData({ ...defaultData, ...parsed });
        }
      } catch (_) {}
    }
    load();

    function onUpdate(e: CustomEvent) {
      if (e.detail?.key === settingsKey && e.detail?.value) {
        try {
          const parsed = JSON.parse(e.detail.value);
          setData({ ...defaultData, ...parsed });
        } catch (_) {}
      }
    }
    window.addEventListener('site-settings-updated', onUpdate as EventListener);
    return () => window.removeEventListener('site-settings-updated', onUpdate as EventListener);
  }, [settingsKey]);

  const features: PageIntroFeature[] = useMemo(() => {
    const f = data.features ?? defaultData.features ?? [];
    return f.length > 0 ? f : [];
  }, [data.features, defaultData.features]);

  const keywords: string[] = data.keywords ?? defaultData.keywords ?? [];

  const bgStyle: React.CSSProperties = {
    background: data.backgroundColor || 'transparent',
    borderRadius: `${data.borderRadiusTop ?? 0}px ${data.borderRadiusTop ?? 0}px ${data.borderRadiusBottom ?? 0}px ${data.borderRadiusBottom ?? 0}px`,
    paddingTop: data.paddingTop != null ? data.paddingTop : undefined,
    paddingBottom: data.paddingBottom != null ? data.paddingBottom : undefined,
  };

  const titleAlign = (data.titleAlign as any) || 'center';
  const titleFs = data.titleFontSize ? responsiveFontSize(data.titleFontSize) : undefined;

  return (
    <div style={{ width: '100%', ...bgStyle }}>

      <div style={{ maxWidth: 900, margin: '0 auto', padding: '3rem 1.5rem 1.5rem', textAlign: 'center' }}>
        {/* Eyebrow */}
        {data.eyebrow && (
          <div style={{
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            gap: 12, marginBottom: '1.25rem',
          }}>
            <span style={{ flex: 1, maxWidth: 60, height: 1, background: data.eyebrowColor || 'rgba(255,255,255,0.25)' }} />
            <span style={{
              fontSize: data.eyebrowFontSize ? `${data.eyebrowFontSize}px` : '0.7rem',
              letterSpacing: '0.18em', fontWeight: 500,
              color: data.eyebrowColor || 'rgba(255,255,255,0.55)', textTransform: 'uppercase',
            }}>
              {data.eyebrow}
            </span>
            <span style={{ flex: 1, maxWidth: 60, height: 1, background: data.eyebrowColor || 'rgba(255,255,255,0.25)' }} />
          </div>
        )}

        {/* Title */}
        {data.title && titleTag(
          data.titleStyle,
          data.title,
          {
            style: {
              margin: '0 0 1.25rem',
              fontSize: titleFs || 'clamp(1.6rem, 3.5vw, 2.5rem)',
              fontWeight: 700,
              color: data.titleColor || 'var(--color-text, #fff)',
              textAlign: titleAlign,
              lineHeight: 1.2,
            },
          }
        )}

        {/* HTML description */}
        {data.html && (
          <div
            className="richtext-content"
            style={{ fontSize: '1rem', lineHeight: 1.7, color: 'var(--color-text-muted, rgba(255,255,255,0.75))', maxWidth: 760, margin: '0 auto' }}
            dangerouslySetInnerHTML={{ __html: data.html }}
          />
        )}
      </div>

      {/* Feature columns */}
      {features.length > 0 && (
        <div style={{ maxWidth: 1100, margin: '0 auto', padding: '0 1rem 1rem' }}>
          <div style={{ borderTop: '1px solid rgba(255,255,255,0.08)', marginBottom: 0 }} />
          <div style={{ display: 'flex', flexWrap: 'wrap' }} className="page-intro-features">
            {features.map((f, i) => (
              <FeatureColumn key={i} feature={f} index={i} />
            ))}
          </div>
        </div>
      )}

      {/* Keywords */}
      {keywords.length > 0 && (
        <div style={{
          maxWidth: 1100, margin: '0 auto',
          padding: '0.75rem 1.5rem 2rem',
          display: 'flex', flexWrap: 'wrap', gap: '0.5rem', justifyContent: 'center',
        }}>
          {keywords.map((kw, i) => (
            <span key={i} style={{
              padding: '5px 14px',
              borderRadius: 999,
              border: `1px solid ${data.keywordsBorderColor || 'rgba(255,255,255,0.2)'}`,
              fontSize: '0.8rem',
              color: data.keywordsColor || 'rgba(255,255,255,0.65)',
              letterSpacing: '0.02em',
              background: data.keywordsBackground || 'transparent',
            }}>
              {kw}
            </span>
          ))}
        </div>
      )}

      {/* Modal */}
      {modalOpen && (
        <PageIntroBlockModal
          pageKey={pageKey}
          settingsKey={settingsKey}
          initialData={data}
          onClose={() => { setModalOpen(false); onExternalEditClose?.(); }}
        />
      )}

      <style>{`
        @media (max-width: 640px) {
          .page-intro-features {
            flex-direction: column !important;
          }
          .page-intro-feature-col {
            border-left: none !important;
            border-top: 1px solid rgba(255,255,255,0.08) !important;
            padding: 1.5rem 1rem !important;
          }
          .page-intro-feature-col:first-child {
            border-top: none !important;
          }
        }
      `}</style>
    </div>
  );
}
