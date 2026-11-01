"use client";

import React, { useEffect, useMemo } from 'react';
import ReviewRoom, { type ReviewTransport } from './ReviewRoom';

/** Page client de review : branche la salle sur les routes /api/client/<slug>/review. */
export default function ClientReview({
  slug,
  photoId,
  galleryTitle,
  videoName,
  src,
  poster,
  previewToken,
}: {
  slug: string;
  photoId: string;
  galleryTitle: string;
  videoName: string;
  src: string;
  poster: string | null;
  previewToken: string | null;
}) {
  useEffect(() => {
    // La page du site (vide) ne doit pas défiler sous la salle plein écran
    const html = document.documentElement;
    const prev = html.style.overflow;
    html.style.overflow = 'hidden';
    return () => {
      html.style.overflow = prev;
    };
  }, []);

  const transport = useMemo<ReviewTransport>(() => {
    const headers: Record<string, string> = { 'Content-Type': 'application/json', ...(previewToken ? { 'x-cg-preview': previewToken } : {}) };
    const call = async (method: 'GET' | 'POST', body?: any) => {
      const res = await fetch(`/api/client/${slug}/review/${photoId}`, { method, headers, body: body ? JSON.stringify(body) : undefined });
      const j = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(j.error || 'Erreur');
      return j;
    };
    return {
      load: () => call('GET'),
      act: (body) => call('POST', body),
      identify: async (name, email) => {
        const res = await fetch(`/api/client/${slug}/visitor`, { method: 'POST', headers, body: JSON.stringify({ name, email }) });
        const j = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error(j.error || 'Erreur');
      },
    };
  }, [slug, photoId, previewToken]);

  return (
    <ReviewRoom
      mode="client"
      galleryTitle={galleryTitle}
      videoName={videoName}
      src={src}
      poster={poster}
      transport={transport}
      onBack={() => {
        window.location.href = `/client/${slug}${previewToken ? `?preview=${previewToken}` : ''}`;
      }}
    />
  );
}
