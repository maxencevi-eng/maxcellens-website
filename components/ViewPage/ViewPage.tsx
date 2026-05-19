"use client";
import React, { useState, useCallback } from 'react';
import type { ViewBlock, ViewBlockType, ViewProfile } from './types';
import ViewProfileSection from './ViewProfileSection';
import ViewBlockGrid from './ViewBlockGrid';
import ViewAddBlockMenu from './ViewAddBlockMenu';
import { useBlockVisibility } from '../BlockVisibility/BlockVisibilityContext';
import styles from './ViewPage.module.css';

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
      <div className={styles.inner}>
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
        />

        {isAdmin && (
          <ViewAddBlockMenu onAdd={handleAddBlock} />
        )}
      </div>
    </div>
  );
}
