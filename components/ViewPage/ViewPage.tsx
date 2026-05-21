"use client";
import React, { useState, useCallback, useMemo } from 'react';
import dynamic from 'next/dynamic';
import type { ViewBlock, ViewBlockType, ViewProfile } from './types';
import ViewProfileSection from './ViewProfileSection';
import ViewBlockGrid from './ViewBlockGrid';
import ViewAddBlockMenu from './ViewAddBlockMenu';
import { useBlockVisibility } from '../BlockVisibility/BlockVisibilityContext';
import { parseVideoUrl } from './utils/parseVideoUrl';
import styles from './ViewPage.module.css';

const ViewStatsModal = dynamic(() => import('./ViewStatsModal'), { ssr: false });
const VideoLightbox = dynamic(() => import('../VideoGallery/VideoLightbox'), { ssr: false });

let idCounter = 0;
function genId(): string {
  return `vb_${Date.now()}_${++idCounter}_${Math.random().toString(36).slice(2, 7)}`;
}

async function saveProfile(profile: ViewProfile) {
  await fetch('/api/admin/site-settings', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ key: 'view_profile', value: JSON.stringify(profile) }),
  });
  window.dispatchEvent(new CustomEvent('site-settings-updated'));
}

async function saveBlocks(blocks: ViewBlock[]) {
  await fetch('/api/admin/site-settings', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ key: 'view_blocks', value: JSON.stringify(blocks) }),
  });
}

interface Props {
  initialProfile: ViewProfile;
  initialBlocks: ViewBlock[];
}

export default function ViewPage({ initialProfile, initialBlocks }: Props) {
  const { isAdmin } = useBlockVisibility();
  const [profile, setProfile] = useState<ViewProfile>(initialProfile);
  const [blocks, setBlocks] = useState<ViewBlock[]>(initialBlocks);
  const [showStats, setShowStats] = useState(false);
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);

  // Liste des blocs vidéo avec un embedUrl valide (pour la lightbox)
  const videoItems = useMemo(() => {
    return blocks
      .filter((b) => b.type === 'video' && b.videoUrl && parseVideoUrl(b.videoUrl))
      .map((b) => ({
        blockId: b.id,
        url: b.videoUrl!,
        embedUrl: parseVideoUrl(b.videoUrl!)!,
        isShort: b.videoUrl!.includes('/shorts/') || b.size === 'tall',
      }));
  }, [blocks]);

  const handleOpenLightbox = useCallback((blockId: string) => {
    const idx = videoItems.findIndex((v) => v.blockId === blockId);
    if (idx >= 0) setLightboxIndex(idx);
  }, [videoItems]);

  const handleProfileUpdate = useCallback(async (updated: ViewProfile) => {
    setProfile(updated);
    await saveProfile(updated);
  }, []);

  const handleBlocksReorder = useCallback(async (reordered: ViewBlock[]) => {
    setBlocks(reordered);
    await saveBlocks(reordered);
  }, []);

  const handleBlockUpdate = useCallback(async (updated: ViewBlock) => {
    const next = blocks.map((b) => b.id === updated.id ? updated : b);
    setBlocks(next);
    await saveBlocks(next);
  }, [blocks]);

  const handleBlockDelete = useCallback(async (id: string) => {
    const next = blocks.filter((b) => b.id !== id);
    setBlocks(next);
    await saveBlocks(next);
  }, [blocks]);

  const handleAddBlock = useCallback(async (type: ViewBlockType) => {
    const newBlock: ViewBlock = {
      id: genId(),
      type,
      size: 'square',
    };
    const next = [...blocks, newBlock];
    setBlocks(next);
    await saveBlocks(next);
  }, [blocks]);

  const bgStyle: React.CSSProperties = profile.backgroundImageUrl
    ? {
        backgroundImage: `url(${profile.backgroundImageUrl})`,
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        backgroundAttachment: 'local',
      }
    : {};

  return (
    <div className={styles.page} style={bgStyle}>
      <div className={styles.inner}>{isAdmin && (
          <div className={styles.adminTopBar}>
            <button className={styles.statsBtn} onClick={() => setShowStats(true)}>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} width={14} height={14}>
                <polyline points="22,12 18,12 15,21 9,3 6,12 2,12" />
              </svg>
              Stats
            </button>
          </div>
        )}
        <ViewProfileSection
          profile={profile}
          isAdmin={isAdmin}
          onUpdate={handleProfileUpdate}
        />

        <ViewBlockGrid
          blocks={blocks}
          isAdmin={isAdmin}
          onReorder={handleBlocksReorder}
          onUpdate={handleBlockUpdate}
          onDelete={handleBlockDelete}
          onOpenLightbox={handleOpenLightbox}
        />

        {isAdmin && (
          <ViewAddBlockMenu onAdd={handleAddBlock} />
        )}
      </div>

      {showStats && <ViewStatsModal onClose={() => setShowStats(false)} />}

      {lightboxIndex !== null && videoItems.length > 0 && (
        <VideoLightbox
          videos={videoItems}
          index={lightboxIndex}
          initialIndex={lightboxIndex}
          onClose={() => setLightboxIndex(null)}
          onPrev={() => setLightboxIndex((i) => (i !== null && i > 0 ? i - 1 : videoItems.length - 1))}
          onNext={() => setLightboxIndex((i) => (i !== null && i < videoItems.length - 1 ? i + 1 : 0))}
        />
      )}
    </div>
  );
}
