'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useEffect } from 'react';

type NavItem = { href: string; label: string; icon: string } | { separator: true };

const navItems: NavItem[] = [
  { href: '/animation/admin/dashboard', label: 'Tableau de bord', icon: '📊' },
  { href: '/animation/admin/dashboard/profils', label: 'Profils d\'accès', icon: '👥' },
  { href: '/animation/admin/dashboard/roles', label: 'Rôles & Variants', icon: '🎭' },
  { separator: true },
  { href: '/animation/admin/dashboard/themes', label: 'Révélations', icon: '🌅' },
  { href: '/animation/admin/dashboard/revelations', label: 'Dénouements', icon: '🎞️' },
  { href: '/animation/admin/dashboard/scenes', label: 'Scènes', icon: '🎬' },
  { href: '/animation/admin/dashboard/histoires', label: 'Histoires', icon: '📖' },
  { separator: true },
  { href: '/animation/admin/dashboard/sessions', label: 'Sessions', icon: '📋' },
  { href: '/animation/technique', label: 'Script global', icon: '📜' },
];

export default function BacAdminSidebar() {
  const pathname = usePathname();
  const router = useRouter();

  // enforce auth client‑side as well (defense in depth/cache bounce)
  useEffect(() => {
    let cancelled = false;
    async function checkAuth() {
      try {
        const res = await fetch('/bac/api/auth');
        if (!res.ok) throw new Error('bad');
        const data = await res.json();
        if (!data.authenticated || data.profil_type !== 'admin') {
          router.replace('/animation/admin');
        }
      } catch {
        if (!cancelled) router.replace('/animation/admin');
      }
    }
    checkAuth();
    return () => { cancelled = true; };
  }, [router]);

  const handleLogout = async () => {
    await fetch('/bac/api/auth', { method: 'DELETE' });
    router.push('/animation/admin');
  };

  return (
    <aside className="bac-admin-sidebar">
      <div className="bac-admin-sidebar-logo">
        <h2>🎬 Bureau à la Carte</h2>
        <span>Back-office admin</span>
      </div>
      <nav className="bac-admin-nav">
        {navItems.map((item, idx) => {
          if ('separator' in item) {
            return <div key={`sep-${idx}`} style={{ height: 1, background: 'rgba(255,255,255,0.12)', margin: '6px 0' }} />;
          }
          return (
            <Link
              key={item.href}
              href={item.href}
              className={pathname === item.href || (item.href !== '/animation/admin/dashboard' && pathname.startsWith(item.href)) ? 'active' : ''}
            >
              <span className="bac-admin-nav-icon">{item.icon}</span>
              {item.label}
            </Link>
          );
        })}
      </nav>
      <div style={{ padding: '16px 12px', borderTop: '1px solid rgba(255,255,255,0.1)', marginTop: 'auto' }}>
        <button
          onClick={handleLogout}
          className="bac-btn bac-btn-ghost"
          style={{ width: '100%', color: 'rgba(255,255,255,0.6)', justifyContent: 'flex-start' }}
        >
          🚪 Déconnexion
        </button>
      </div>
    </aside>
  );
}
