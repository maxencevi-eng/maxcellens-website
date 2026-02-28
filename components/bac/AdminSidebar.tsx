'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';

const navItems = [
  { href: '/bac/admin/dashboard', label: 'Tableau de bord', icon: '📊' },
  { href: '/bac/admin/dashboard/profils', label: 'Profils d\'accès', icon: '👥' },
  { href: '/bac/admin/dashboard/roles', label: 'Rôles & Variants', icon: '🎭' },
  { href: '/bac/admin/dashboard/scenes', label: 'Scènes', icon: '🎬' },
  { href: '/bac/admin/dashboard/themes', label: 'Thèmes', icon: '🎨' },
  { href: '/bac/admin/dashboard/revelations', label: 'Révélations', icon: '🤫' },
  { href: '/bac/admin/dashboard/sessions', label: 'Sessions', icon: '📋' },
];

export default function BacAdminSidebar() {
  const pathname = usePathname();
  const router = useRouter();

  const handleLogout = async () => {
    await fetch('/bac/api/auth', { method: 'DELETE' });
    router.push('/bac/admin');
  };

  return (
    <aside className="bac-admin-sidebar">
      <div className="bac-admin-sidebar-logo">
        <h2>🎬 Bureau à la Carte</h2>
        <span>Back-office admin</span>
      </div>
      <nav className="bac-admin-nav">
        {navItems.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className={pathname === item.href || (item.href !== '/bac/admin/dashboard' && pathname.startsWith(item.href)) ? 'active' : ''}
          >
            <span className="bac-admin-nav-icon">{item.icon}</span>
            {item.label}
          </Link>
        ))}
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
