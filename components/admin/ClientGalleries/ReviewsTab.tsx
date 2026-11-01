"use client";

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Film, MessageSquare } from 'lucide-react';
import ReviewRoom, { type ReviewTransport } from '../../ClientGallery/ReviewRoom';
import { formatDuration, type AdminGallery } from '../../../lib/clientGalleries/types';
import { adminApi } from './api';
import { fmtDate } from './shared';
import s from './cg.module.css';

type VideoStat = {
  id: string;
  filename: string;
  duration: number | null;
  comments: number;
  unresolved: number;
  last_comment_at: string | null;
  submissions: number;
  unseen: number;
};

/** Onglet « Reviews » de l'éditeur : vidéos commentées + salle de review côté admin. */
export default function ReviewsTab({ g, initialVideo, toast }: { g: AdminGallery; initialVideo?: string | null; toast: (m: string) => void }) {
  const [videos, setVideos] = useState<VideoStat[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [selected, setSelected] = useState<string | null>(initialVideo || null);
  const [media, setMedia] = useState<{ src: string; poster: string | null } | null>(null);

  const loadList = useCallback(async () => {
    try {
      const j = await adminApi<{ videos: VideoStat[] }>(`/${g.id}/reviews`);
      setVideos(j.videos);
      setError(null);
      setSelected((cur) => cur || j.videos.find((v) => v.unseen || v.unresolved)?.id || j.videos[0]?.id || null);
    } catch (e: any) {
      setError(e.message);
    }
  }, [g.id]);

  useEffect(() => {
    loadList();
  }, [loadList]);

  // URL signée de la vidéo choisie + validations marquées comme consultées
  useEffect(() => {
    if (!selected) return;
    setMedia(null);
    adminApi<{ urls: Record<string, Record<string, string>> }>(`/${g.id}/photos`, {
      method: 'POST',
      json: { action: 'sign', ids: [selected], kinds: ['original', 'screen'], method: 'GET' },
    })
      .then((j) => setMedia({ src: j.urls[selected]?.original, poster: j.urls[selected]?.screen || null }))
      .catch((e) => toast(e.message));
    adminApi(`/${g.id}/reviews`, { method: 'POST', json: { action: 'seen', photoId: selected } })
      .then(() => setVideos((vs) => vs?.map((v) => (v.id === selected ? { ...v, unseen: 0 } : v)) || vs))
      .catch(() => {});
  }, [selected, g.id, toast]);

  const transport = useMemo<ReviewTransport | null>(() => {
    if (!selected) return null;
    return {
      load: () => adminApi(`/${g.id}/reviews?video=${selected}`),
      act: async (body) => {
        const j = await adminApi<{ comments: any[] }>(`/${g.id}/reviews`, { method: 'POST', json: { photoId: selected, ...body } });
        loadList();
        return j;
      },
    };
  }, [selected, g.id, loadList]);

  const current = videos?.find((v) => v.id === selected);

  if (error) return <div className={`${s.notice} ${s.noticeErr}`}>{error}</div>;
  if (!videos) return <div className={s.empty}>Chargement…</div>;
  if (!videos.length) {
    return (
      <div className={s.empty}>
        <h3>Aucune vidéo dans cette galerie</h3>
        <p>Ajoutez des vidéos dans l’onglet Fichiers{g.review.enabled ? '' : ', puis activez le mode review dans Réglages'}.</p>
      </div>
    );
  }

  return (
    <div>
      {!g.review.enabled ? (
        <div className={s.notice}>
          Le mode review est <b>désactivé</b> pour cette galerie : le client ne voit pas la page de commentaires. Activez-le dans Réglages → Filigrane, favoris et review.
        </div>
      ) : null}
      <div className={s.reviewCols}>
        <div className={s.card2} style={{ padding: 8 }}>
          {videos.map((v) => (
            <button key={v.id} className={s.nav} aria-current={v.id === selected} onClick={() => setSelected(v.id)} style={{ alignItems: 'flex-start' }}>
              <span className={s.navIcon} style={{ marginTop: 2 }}>
                <Film size={15} />
              </span>
              <span style={{ minWidth: 0, flex: 1 }}>
                <span className={s.label} style={{ display: 'block' }}>
                  {v.filename}
                </span>
                <small className={s.muted} style={{ fontSize: 12 }}>
                  {v.duration ? `${formatDuration(v.duration)} · ` : ''}
                  {v.comments} commentaire{v.comments > 1 ? 's' : ''}
                  {v.last_comment_at ? ` · ${fmtDate(v.last_comment_at, true)}` : ''}
                </small>
              </span>
              {v.unseen ? <span className={s.reviewNew}>Nouvelle review</span> : v.unresolved ? <span className={s.n}>{v.unresolved}</span> : null}
            </button>
          ))}
        </div>
        <div style={{ minWidth: 0 }}>
          {current && media && transport ? (
            <ReviewRoom key={current.id} mode="admin" galleryTitle={g.title} videoName={current.filename} src={media.src} poster={media.poster} transport={transport} />
          ) : (
            <div className={s.empty}>
              <MessageSquare size={22} />
              <p>Chargement de la vidéo…</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
