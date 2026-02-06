'use client';

import React from 'react';

interface VisitorRow {
  ip: string | null;
  ip_hash: string | null;
  country: string;
  city: string;
  sessionCount: number;
}

interface VisitorsTabProps {
  visitors: VisitorRow[];
  pageVisitors: number;
  setPageVisitors: (page: number) => void;
  selectedVisitorHashes: Set<string>;
  setSelectedVisitorHashes: (hashes: Set<string>) => void;
  addIpToExclude: (ip: string) => void;
  addHashToExclude: (hash: string) => void;
  hashAddedFeedback: string | null;
  formatCity: (city: string) => string;
  addHashesToExclude: (hashes: string[]) => void;
}

const PAGE_SIZE = 20;

export default function VisitorsTab({
  visitors,
  pageVisitors,
  setPageVisitors,
  selectedVisitorHashes,
  setSelectedVisitorHashes,
  addIpToExclude,
  addHashToExclude,
  hashAddedFeedback,
  formatCity,
  addHashesToExclude,
}: VisitorsTabProps) {
  const visitorsData = Array.isArray(visitors) ? visitors : [];
  const showPagination = visitorsData.length > PAGE_SIZE;

  const handleSelectSameLocation = () => {
    const selectedCountriesCities = new Set<string>();
    selectedVisitorHashes.forEach((hash) => {
      const row = visitorsData.find((r) => r.ip_hash === hash);
      if (row) selectedCountriesCities.add(`${formatCity(row.country)}\t${formatCity(row.city)}`);
    });
    if (selectedCountriesCities.size === 0) return;
    const toAdd = visitorsData
      .filter((r) => r.ip_hash && selectedCountriesCities.has(`${formatCity(r.country)}\t${formatCity(r.city)}`))
      .map((r) => r.ip_hash!);
    setSelectedVisitorHashes(new Set([...Array.from(selectedVisitorHashes), ...toAdd]));
  };

  const createVisitorRow = (visitor: VisitorRow, index: number) => {
    const hasHash = !!visitor.ip_hash;
    const isSelected = hasHash && selectedVisitorHashes.has(visitor.ip_hash!);
    const visitorIp = visitor.ip;
    const visitorIpHash = visitor.ip_hash;
    const visitorCountry = visitor.country;
    const visitorCity = visitor.city;
    
    return {
      key: `${visitorIpHash ?? visitorIp ?? ''}-${visitorCountry}-${visitorCity}-${index}`,
      hasHash,
      isSelected,
      visitorIp,
      visitorIpHash,
      visitorCountry,
      visitorCity,
      sessionCount: visitor.sessionCount,
      onToggle: () => {
        if (visitorIpHash) {
          setSelectedVisitorHashes((prev) => {
            const next = new Set(prev);
            if (next.has(visitorIpHash)) next.delete(visitorIpHash);
            else next.add(visitorIpHash);
            return next;
          });
        }
      },
      onExcludeIp: () => {
        if (visitorIp) addIpToExclude(visitorIp);
      },
      onExcludeHash: () => {
        if (visitorIpHash) addHashToExclude(visitorIpHash);
      }
    };
  };

  const visitorRows = visitorsData
    .slice((pageVisitors - 1) * PAGE_SIZE, pageVisitors * PAGE_SIZE)
    .map(createVisitorRow);

  return (
    <>
      <h3 style={{ margin: '0 0 12px', fontSize: 16, fontWeight: 600, color: '#1e293b' }}>Visiteurs</h3>
      <p style={{ fontSize: 13, color: '#475569', marginBottom: 12, lineHeight: 1.5 }}>
        Liste des visiteurs (IP, pays, ville) sur la période. Utilisez &quot;Exclure cette IP&quot; ou &quot;Exclure ce visiteur&quot; (si l&apos;IP n&apos;est pas affichée) pour retirer crawlers, trackers ou votre IP des stats, puis enregistrez le filtre ci-dessous. L&apos;IP peut rester vide si la migration Supabase (colonne ip) n&apos;a pas été exécutée.
      </p>
      {visitorsData.length > 0 && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10, flexWrap: 'wrap' }}>
          <button
            type="button"
            onClick={handleSelectSameLocation}
            disabled={selectedVisitorHashes.size === 0}
            style={{ padding: '6px 12px', fontSize: 12, background: selectedVisitorHashes.size ? '#e0e7ff' : '#f1f5f9', color: selectedVisitorHashes.size ? '#3730a3' : '#94a3b8', border: `1px solid ${selectedVisitorHashes.size ? '#a5b4fc' : '#e2e8f0'}`, borderRadius: 6, cursor: selectedVisitorHashes.size ? 'pointer' : 'not-allowed', fontWeight: 500 }}
          >
            Sélectionner même pays+ville que la sélection
          </button>
          <button
            type="button"
            disabled={selectedVisitorHashes.size === 0}
            onClick={() => addHashesToExclude(Array.from(selectedVisitorHashes))}
            style={{ padding: '6px 12px', fontSize: 12, background: selectedVisitorHashes.size ? '#fef3c7' : '#f1f5f9', color: selectedVisitorHashes.size ? '#92400e' : '#94a3b8', border: `1px solid ${selectedVisitorHashes.size ? '#fcd34d' : '#e2e8f0'}`, borderRadius: 6, cursor: selectedVisitorHashes.size ? 'pointer' : 'not-allowed', fontWeight: 500 }}
          >
            Exclure les visiteurs sélectionnés ({selectedVisitorHashes.size})
          </button>
          {selectedVisitorHashes.size > 0 && (
            <button type="button" onClick={() => setSelectedVisitorHashes(new Set())} style={{ padding: '6px 12px', fontSize: 12, background: '#f1f5f9', color: '#475569', border: '1px solid #cbd5e1', borderRadius: 6, cursor: 'pointer' }}>
              Désélectionner tout
            </button>
          )}
          {hashAddedFeedback && (
            <span style={{ fontSize: 12, color: '#059669', fontWeight: 500 }}>{hashAddedFeedback}</span>
          )}
        </div>
      )}
      <div style={{ overflowX: 'auto', border: '1px solid #e2e8f0', borderRadius: 10 }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 14 }}>
          <thead>
            <tr style={{ background: '#f1f5f9', borderBottom: '2px solid #e2e8f0', textAlign: 'left' }}>
              <th style={{ padding: '10px 14px', color: '#374151', fontWeight: 600, width: 40 }}>Sel.</th>
              <th style={{ padding: '10px 14px', color: '#374151', fontWeight: 600 }}>IP</th>
              <th style={{ padding: '10px 14px', color: '#374151', fontWeight: 600 }}>Pays</th>
              <th style={{ padding: '10px 14px', color: '#374151', fontWeight: 600 }}>Ville</th>
              <th style={{ padding: '10px 14px', color: '#374151', fontWeight: 600 }}>Visites</th>
              <th style={{ padding: '10px 14px', color: '#374151', fontWeight: 600 }}>Action</th>
            </tr>
          </thead>
          <tbody>
            {visitorRows.map((row) => (
              <tr key={row.key} style={{ borderBottom: '1px solid #e2e8f0' }}>
                <td style={{ padding: '10px 14px', color: '#1e293b' }}>
                  {row.hasHash ? (
                    <input
                      type="checkbox"
                      checked={row.isSelected}
                      onChange={row.onToggle}
                      aria-label={`Sélectionner ${formatCity(row.visitorCountry)} ${formatCity(row.visitorCity)}`}
                    />
                  ) : (
                    <span style={{ color: '#cbd5e1' }}>—</span>
                  )}
                </td>
                <td style={{ padding: '10px 14px', color: '#1e293b', fontFamily: 'monospace', fontSize: 13 }}>{row.visitorIp ?? '—'}</td>
                <td style={{ padding: '10px 14px', color: '#1e293b' }}>{formatCity(row.visitorCountry)}</td>
                <td style={{ padding: '10px 14px', color: '#1e293b' }}>{formatCity(row.visitorCity)}</td>
                <td style={{ padding: '10px 14px', color: '#1e293b', fontWeight: 500 }}>{row.sessionCount}</td>
                <td style={{ padding: '10px 14px', color: '#1e293b' }}>
                  {row.visitorIp ? (
                    <button
                      type="button"
                      onClick={row.onExcludeIp}
                      style={{ padding: '4px 10px', fontSize: 12, background: '#f1f5f9', color: '#475569', border: '1px solid #cbd5e1', borderRadius: 6, cursor: 'pointer', fontWeight: 500 }}
                    >
                      Exclure cette IP
                    </button>
                  ) : row.visitorIpHash ? (
                    <button
                      type="button"
                      onClick={row.onExcludeHash}
                      style={{ padding: '4px 10px', fontSize: 12, background: '#fef3c7', color: '#92400e', border: '1px solid #fcd34d', borderRadius: 6, cursor: 'pointer', fontWeight: 500 }}
                      title="Exclure ce visiteur (IP non enregistrée, exclusion par identifiant)"
                    >
                      Exclure ce visiteur
                    </button>
                  ) : (
                    <span style={{ fontSize: 12, color: '#94a3b8' }}>—</span>
                  )}
                </td>
              </tr>
            ))}
            {visitorsData.length === 0 && (
              <tr>
                <td colSpan={6} style={{ padding: '16px 14px', color: '#64748b', textAlign: 'center' }}>Aucun visiteur sur la période (ou colonne IP non migrée)</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
      {showPagination && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginTop: 10, fontSize: 14 }}>
          <button type="button" onClick={() => setPageVisitors(Math.max(1, pageVisitors - 1))} disabled={pageVisitors <= 1} style={{ padding: '6px 12px', border: '1px solid #cbd5e1', borderRadius: 6, background: '#fff', cursor: pageVisitors <= 1 ? 'not-allowed' : 'pointer', opacity: pageVisitors <= 1 ? 0.6 : 1 }}>Précédent</button>
          <span style={{ color: '#475569' }}>Page {pageVisitors} / {Math.ceil(visitorsData.length / PAGE_SIZE)}</span>
          <button type="button" onClick={() => setPageVisitors(Math.min(Math.ceil(visitorsData.length / PAGE_SIZE), pageVisitors + 1))} disabled={pageVisitors >= Math.ceil(visitorsData.length / PAGE_SIZE)} style={{ padding: '6px 12px', border: '1px solid #cbd5e1', borderRadius: 6, background: '#fff', cursor: pageVisitors >= Math.ceil(visitorsData.length / PAGE_SIZE) ? 'not-allowed' : 'pointer', opacity: pageVisitors >= Math.ceil(visitorsData.length / PAGE_SIZE) ? 0.6 : 1 }}>Suivant</button>
        </div>
      )}
    </>
  );
}
