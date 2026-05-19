"use client";
import React, { useState, useEffect } from 'react';
import type { ViewProfile } from './types';
import { compressImageClient } from '../../lib/compressImageClient';
import ViewProfileModal from './ViewProfileModal';
import styles from './ViewProfileSection.module.css';

interface SocialLinks {
  instagram?: string;
  facebook?: string;
  youtube?: string;
  tiktok?: string;
  linkedin?: string;
}

interface Props {
  profile: ViewProfile;
  isAdmin: boolean;
  onUpdate: (updated: ViewProfile) => void;
}

export default function ViewProfileSection({ profile, isAdmin, onUpdate }: Props) {
  const [showModal, setShowModal] = useState(false);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [socialLinks, setSocialLinks] = useState<SocialLinks>({});
  const [customIcons, setCustomIcons] = useState<Record<string, string>>({});
  const [iconStyle, setIconStyle] = useState('style-outline');

  // Load social links (same as Header/Footer)
  useEffect(() => {
    let mounted = true;
    fetch('/api/admin/site-settings?keys=socialInstagram,socialFacebook,socialYouTube,socialTikTok,socialLinkedIn,socialIconStyle,socialIcon_instagram,socialIcon_facebook,socialIcon_youtube,socialIcon_tiktok,socialIcon_linkedin')
      .then((r) => r.ok ? r.json() : null)
      .then((j) => {
        if (!mounted || !j) return;
        const s = j.settings || {};
        setSocialLinks({
          instagram: s.socialInstagram || '',
          facebook: s.socialFacebook || '',
          youtube: s.socialYouTube || '',
          tiktok: s.socialTikTok || '',
          linkedin: s.socialLinkedIn || '',
        });
        if (s.socialIconStyle) setIconStyle(String(s.socialIconStyle));
        const icons: Record<string, string> = {};
        if (s.socialIcon_instagram) icons.instagram = s.socialIcon_instagram;
        if (s.socialIcon_facebook) icons.facebook = s.socialIcon_facebook;
        if (s.socialIcon_youtube) icons.youtube = s.socialIcon_youtube;
        if (s.socialIcon_tiktok) icons.tiktok = s.socialIcon_tiktok;
        if (s.socialIcon_linkedin) icons.linkedin = s.socialIcon_linkedin;
        setCustomIcons(icons);
      })
      .catch(() => {});

    function onUpdate() { }
    window.addEventListener('site-settings-updated', onUpdate);
    return () => { mounted = false; window.removeEventListener('site-settings-updated', onUpdate); };
  }, []);

  async function uploadAvatar(file: File) {
    setUploadingAvatar(true);
    try {
      const compressed = await compressImageClient(file);
      const fd = new FormData();
      fd.append('file', compressed);
      fd.append('page', 'view');
      fd.append('kind', 'image');
      fd.append('folder', 'view/profile');
      if (profile.imagePath) fd.append('old_path', profile.imagePath);
      const r = await fetch('/api/admin/upload-hero-media', { method: 'POST', body: fd });
      if (r.ok) {
        const d = await r.json();
        onUpdate({ ...profile, imageUrl: d.url, imagePath: d.path });
      }
    } finally {
      setUploadingAvatar(false);
    }
  }

  function deleteAvatar() {
    onUpdate({ ...profile, imageUrl: undefined, imagePath: undefined });
  }

  const titleStyle = profile.titleStyle || 'h2';
  const TitleTag = (['h1','h2','h3','h4','h5','p'].includes(titleStyle) ? titleStyle : 'h2') as React.ElementType;

  const socialEntries: { key: keyof SocialLinks; label: string; svg: React.ReactNode }[] = [
    {
      key: 'instagram', label: 'Instagram',
      svg: <svg viewBox="0 0 24 24" aria-hidden="true"><rect x="4" y="4" width="16" height="16" rx="4" ry="4" /><circle cx="12" cy="12" r="4" /></svg>,
    },
    {
      key: 'facebook', label: 'Facebook',
      svg: <svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="8" /></svg>,
    },
    {
      key: 'youtube', label: 'YouTube',
      svg: <svg viewBox="0 0 24 24" aria-hidden="true"><polygon points="9,7 16,12 9,17" /></svg>,
    },
    {
      key: 'tiktok', label: 'TikTok',
      svg: <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M16 7c-1 0-2 0-2 0v6c0 3-3 3-3 3-2 0-3-1-3-3s1-3 3-3h1V7h4z" /></svg>,
    },
    {
      key: 'linkedin', label: 'LinkedIn',
      svg: <svg viewBox="0 0 24 24" aria-hidden="true"><rect x="4" y="4" width="16" height="16" rx="2" /></svg>,
    },
  ];

  return (
    <>
      <div className={styles.profileSection}>
        {/* Avatar */}
        <div className={styles.avatarWrap}>
          {profile.imageUrl ? (
            <img src={profile.imageUrl} alt="Profil" className={styles.avatar} />
          ) : (
            <div className={styles.avatarPlaceholder}>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} width={40} height={40}>
                <circle cx="12" cy="8" r="4" /><path d="M4 20c0-4 3.6-7 8-7s8 3 8 7" />
              </svg>
            </div>
          )}
          {isAdmin && (
            <div className={styles.avatarActions}>
              <label className={styles.avatarBtn} title="Importer">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} width={14} height={14}><polyline points="16,16 12,12 8,16" /><line x1="12" y1="12" x2="12" y2="21" /><path d="M20.39 18.39A5 5 0 0 0 18 9h-1.26A8 8 0 1 0 3 16.3" /></svg>
                <input type="file" accept="image/*" style={{ display: 'none' }} disabled={uploadingAvatar}
                  onChange={(e) => { const f = e.target.files?.[0]; if (f) uploadAvatar(f); }} />
              </label>
              {profile.imageUrl && (
                <button className={styles.avatarBtn} onClick={deleteAvatar} title="Supprimer" aria-label="Supprimer l'avatar">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} width={14} height={14}><polyline points="3,6 5,6 21,6" /><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2" /></svg>
                </button>
              )}
            </div>
          )}
        </div>

        {/* Title & Subtitle */}
        <div className={styles.textArea}>
          {isAdmin ? (
            <button className={styles.editTextBtn} onClick={() => setShowModal(true)}>
              {profile.title ? (
                <TitleTag
                  className={`style-${titleStyle}`}
                  style={{
                    ...(profile.titleFontSize ? { fontSize: profile.titleFontSize } : {}),
                    ...(profile.titleColor ? { color: profile.titleColor } : {}),
                    ...(profile.titleAlign ? { textAlign: profile.titleAlign } : { textAlign: 'center' }),
                    margin: 0,
                  }}
                >
                  {profile.title}
                </TitleTag>
              ) : (
                <span className={styles.emptyTitle}>Cliquez pour ajouter un titre</span>
              )}
              {profile.subtitle && (
                <p
                  className={styles.subtitle}
                  style={{
                    ...(profile.subtitleFontSize ? { fontSize: profile.subtitleFontSize } : {}),
                    ...(profile.subtitleColor ? { color: profile.subtitleColor } : {}),
                    ...(profile.subtitleAlign ? { textAlign: profile.subtitleAlign } : { textAlign: 'center' }),
                  }}
                >
                  {profile.subtitle}
                </p>
              )}
            </button>
          ) : (
            <>
              {profile.title && (
                <TitleTag
                  className={`style-${titleStyle}`}
                  style={{
                    ...(profile.titleFontSize ? { fontSize: profile.titleFontSize } : {}),
                    ...(profile.titleColor ? { color: profile.titleColor } : {}),
                    ...(profile.titleAlign ? { textAlign: profile.titleAlign } : { textAlign: 'center' }),
                    margin: 0,
                  }}
                >
                  {profile.title}
                </TitleTag>
              )}
              {profile.subtitle && (
                <p
                  className={styles.subtitle}
                  style={{
                    ...(profile.subtitleFontSize ? { fontSize: profile.subtitleFontSize } : {}),
                    ...(profile.subtitleColor ? { color: profile.subtitleColor } : {}),
                    ...(profile.subtitleAlign ? { textAlign: profile.subtitleAlign } : { textAlign: 'center' }),
                  }}
                >
                  {profile.subtitle}
                </p>
              )}
            </>
          )}

          {isAdmin && (
            <button className={styles.editProfileBtn} onClick={() => setShowModal(true)} title="Modifier profil">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} width={14} height={14}><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" /><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" /></svg>
            </button>
          )}
        </div>

        {/* Social Icons */}
        <div className={`${styles.social} ${styles[iconStyle] || ''}`}>
          {socialEntries.map(({ key, label, svg }) => {
            const href = socialLinks[key];
            if (!href) return null;
            return (
              <a key={key} href={href} target="_blank" rel="noopener noreferrer" aria-label={label} className={styles.socialLink}>
                {customIcons[key] ? (
                  <img src={customIcons[key]} alt={label} width={22} height={22} />
                ) : (
                  <span className={styles.socialIcon}>{svg}</span>
                )}
              </a>
            );
          })}
        </div>
      </div>

      {showModal && (
        <ViewProfileModal
          profile={profile}
          onClose={() => setShowModal(false)}
          onSave={(updated) => { onUpdate(updated); setShowModal(false); }}
        />
      )}
    </>
  );
}
