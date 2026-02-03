'use client';

import React, { useState } from 'react';
import { supabase } from '../../lib/supabase';
import styles from './StatisticsModal.module.css';

export default function MaintenanceModal({ onClose }: { onClose: () => void }) {
  const [purging, setPurging] = useState(false);
  const [purgingAll, setPurgingAll] = useState(false);
  const [purgeResult, setPurgeResult] = useState<string | null>(null);
  const [ipToPurge, setIpToPurge] = useState('');
  const [purgingByIp, setPurgingByIp] = useState(false);
  const [myIpLoading, setMyIpLoading] = useState(false);
  const [purgeByIpResult, setPurgeByIpResult] = useState<string | null>(null);

  const fillMyIp = async () => {
    setMyIpLoading(true);
    setPurgeByIpResult(null);
    try {
      const { data: sessionData } = await supabase.auth.getSession();
      const token = sessionData?.session?.access_token;
      if (!token) {
        setPurgeByIpResult('Non connecté');
        return;
      }
      const res = await fetch('/api/admin/analytics/my-ip', { headers: { Authorization: `Bearer ${token}` } });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) {
        setPurgeByIpResult(json?.error || `Erreur ${res.status}`);
        return;
      }
      const ip = json?.ip;
      if (ip != null && typeof ip === 'string') setIpToPurge(ip.trim());
      else setPurgeByIpResult('IP non disponible');
    } catch (e: unknown) {
      setPurgeByIpResult(e instanceof Error ? e.message : String(e));
    } finally {
      setMyIpLoading(false);
    }
  };

  const runPurgeByIp = async () => {
    const ip = ipToPurge.trim();
    if (!ip) {
      setPurgeByIpResult('Saisissez une IP ou utilisez "Utiliser mon IP".');
      return;
    }
    if (!confirm(`Supprimer définitivement toutes les sessions et événements associés à l'IP ${ip} ?`)) return;
    setPurgingByIp(true);
    setPurgeByIpResult(null);
    try {
      const { data: sessionData } = await supabase.auth.getSession();
      const token = sessionData?.session?.access_token;
      if (!token) {
        setPurgeByIpResult('Non connecté');
        return;
      }
      const res = await fetch(`/api/admin/analytics/purge?ip=${encodeURIComponent(ip)}`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) {
        setPurgeByIpResult(json?.error || `Erreur ${res.status}`);
        return;
      }
      const count = json?.deleted ?? 0;
      setPurgeByIpResult(`${count} session(s) supprimée(s) pour cette IP.`);
    } catch (e: unknown) {
      setPurgeByIpResult(e instanceof Error ? e.message : String(e));
    } finally {
      setPurgingByIp(false);
    }
  };

  const runPurge = async (all: boolean) => {
    const msg = all
      ? 'Supprimer définitivement TOUTES les sessions et tous les événements analytics ?'
      : 'Supprimer définitivement les sessions et événements de plus de 3 mois ?';
    if (!confirm(msg)) return;
    if (all) setPurgingAll(true);
    else setPurging(true);
    setPurgeResult(null);
    try {
      const { data: sessionData } = await supabase.auth.getSession();
      const token = sessionData?.session?.access_token;
      if (!token) {
        setPurgeResult('Non connecté');
        return;
      }
      const url = all ? '/api/admin/analytics/purge?all=1' : '/api/admin/analytics/purge';
      const res = await fetch(url, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) {
        setPurgeResult(json?.error || `Erreur ${res.status}`);
        return;
      }
      const count = json?.deleted ?? 0;
      setPurgeResult(all ? `${count} session(s) supprimée(s) (purge totale).` : `${count} session(s) supprimée(s).`);
    } catch (e: unknown) {
      setPurgeResult(e instanceof Error ? e.message : String(e));
    } finally {
      setPurging(false);
      setPurgingAll(false);
    }
  };

  return (
    <div
      className={styles.overlay}
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(0,0,0,0.5)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 10000,
      }}
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div
        className={styles.modalBox}
        style={{
          background: '#fff',
          borderRadius: 12,
          maxWidth: 520,
          width: '100%',
          boxShadow: '0 20px 50px rgba(0,0,0,0.2)',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '1rem 1.25rem', borderBottom: '1px solid #e5e7eb' }}>
          <h2 style={{ margin: 0, fontSize: '1.35rem', fontWeight: 700, color: '#111827' }}>Maintenance</h2>
          <button
            type="button"
            onClick={onClose}
            style={{ background: 'transparent', border: 'none', fontSize: 20, cursor: 'pointer', color: '#475569' }}
            aria-label="Fermer"
          >
            ✕
          </button>
        </div>
        <div className={styles.contentPadding} style={{ padding: '1.25rem 1.25rem' }}>
          <p style={{ fontSize: 14, color: '#475569', marginBottom: 16, lineHeight: 1.5 }}>
            Supprimer les sessions et événements analytics pour libérer de l&apos;espace. Les événements sont supprimés en CASCADE avec les sessions.
          </p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
              <button
                type="button"
                onClick={() => runPurge(false)}
                disabled={purging || purgingAll}
                style={{
                  padding: '8px 16px',
                  background: purging || purgingAll ? '#94a3b8' : '#dc2626',
                  color: '#fff',
                  border: 'none',
                  borderRadius: 8,
                  cursor: purging || purgingAll ? 'not-allowed' : 'pointer',
                  fontWeight: 600,
                }}
              >
                {purging ? 'Purge en cours…' : 'Purger les données de + 3 mois'}
              </button>
              <button
                type="button"
                onClick={() => runPurge(true)}
                disabled={purging || purgingAll}
                style={{
                  padding: '8px 16px',
                  background: purging || purgingAll ? '#94a3b8' : '#b91c1c',
                  color: '#fff',
                  border: 'none',
                  borderRadius: 8,
                  cursor: purging || purgingAll ? 'not-allowed' : 'pointer',
                  fontWeight: 600,
                }}
              >
                {purgingAll ? 'Purge en cours…' : 'Purger toutes les stats'}
              </button>
              {purgeResult && (
                <span style={{ fontSize: 13, color: purgeResult.startsWith('Erreur') || purgeResult === 'Non connecté' ? '#dc2626' : '#059669', fontWeight: 500 }}>
                  {purgeResult}
                </span>
              )}
            </div>

            <div style={{ borderTop: '1px solid #e5e7eb', paddingTop: 16, marginTop: 8 }}>
              <p style={{ fontSize: 14, color: '#475569', marginBottom: 12, lineHeight: 1.5 }}>
                Purger les tracks d&apos;une IP précise (sessions + événements associés). Utile pour retirer vos propres visites de test.
              </p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                  <input
                    type="text"
                    value={ipToPurge}
                    onChange={(e) => { setIpToPurge(e.target.value); setPurgeByIpResult(null); }}
                    placeholder="Ex. 82.65.123.45"
                    style={{
                      padding: '8px 12px',
                      border: '1px solid #d1d5db',
                      borderRadius: 8,
                      fontSize: 14,
                      minWidth: 160,
                    }}
                    aria-label="Adresse IP à purger"
                  />
                  <button
                    type="button"
                    onClick={fillMyIp}
                    disabled={myIpLoading || purgingByIp}
                    style={{
                      padding: '8px 14px',
                      background: myIpLoading || purgingByIp ? '#94a3b8' : '#64748b',
                      color: '#fff',
                      border: 'none',
                      borderRadius: 8,
                      cursor: myIpLoading || purgingByIp ? 'not-allowed' : 'pointer',
                      fontWeight: 500,
                      fontSize: 13,
                    }}
                  >
                    {myIpLoading ? 'Chargement…' : 'Utiliser mon IP'}
                  </button>
                  <button
                    type="button"
                    onClick={runPurgeByIp}
                    disabled={purgingByIp || purging || purgingAll || !ipToPurge.trim()}
                    style={{
                      padding: '8px 14px',
                      background: purgingByIp || purging || purgingAll || !ipToPurge.trim() ? '#94a3b8' : '#b91c1c',
                      color: '#fff',
                      border: 'none',
                      borderRadius: 8,
                      cursor: purgingByIp || purging || purgingAll || !ipToPurge.trim() ? 'not-allowed' : 'pointer',
                      fontWeight: 600,
                      fontSize: 13,
                    }}
                  >
                    {purgingByIp ? 'Purge en cours…' : 'Purger les tracks de cette IP'}
                  </button>
                </div>
                {purgeByIpResult && (
                  <span style={{ fontSize: 13, color: purgeByIpResult.startsWith('Erreur') || purgeByIpResult === 'Non connecté' || purgeByIpResult.includes('Saisissez') ? '#dc2626' : '#059669', fontWeight: 500 }}>
                    {purgeByIpResult}
                  </span>
                )}
              </div>
            </div>

            <details style={{ fontSize: 12, color: '#64748b' }}>
              <summary style={{ cursor: 'pointer' }}>SQL manuel (purge totale)</summary>
              <pre style={{ marginTop: 8, padding: 12, background: '#f1f5f9', borderRadius: 8, overflow: 'auto', whiteSpace: 'pre-wrap', wordBreak: 'break-all' }}>
{`-- Supprime toutes les sessions (les événements sont supprimés en CASCADE)
DELETE FROM public.analytics_sessions;`}
              </pre>
            </details>
          </div>
        </div>
      </div>
    </div>
  );
}
