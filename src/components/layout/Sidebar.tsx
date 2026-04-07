'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useSession, signOut } from 'next-auth/react';
import { useState } from 'react';
import { ROLE_LABELS } from '@/lib/utils';

const adminNav = [
  { section: 'Pilotage', items: [
    { href: '/admin/dashboard-pilotage', label: 'Dashboard Global', icon: '📊' },
  ]},
  { section: 'Formation', items: [
    { href: '/admin/projects', label: 'Projets', icon: '📋' },
    { href: '/admin/campuses', label: 'Campus', icon: '🏢' },
    { href: '/admin/programs', label: 'Programmes', icon: '📚' },
    { href: '/admin/cohorts', label: 'Cohortes', icon: '👥' },
  ]},
  { section: 'Personnes', items: [
    { href: '/admin/candidates', label: 'Candidats', icon: '🎯' },
    { href: '/admin/learners', label: 'Apprenants', icon: '🎓' },
    { href: '/admin/users', label: 'Utilisateurs', icon: '👤' },
  ]},
  { section: 'Suivi', items: [
    { href: '/admin/partners', label: 'Partenaires', icon: '🤝' },
  ]},
];

const trainerNav = [
  { section: 'Mon espace', items: [
    { href: '/trainer/dashboard', label: 'Tableau de bord', icon: '📊' },
    { href: '/trainer/cohorts', label: 'Mes cohortes', icon: '👥' },
  ]},
];

const learnerNav = [
  { section: 'Mon espace', items: [
    { href: '/me/dashboard', label: 'Mon dashboard', icon: '📊' },
    { href: '/me/activities', label: 'Mes activités', icon: '📝' },
    { href: '/me/justifications', label: 'Mes justificatifs', icon: '📄' },
  ]},
];

export default function Sidebar() {
  const pathname = usePathname();
  const { data: session } = useSession();
  const [mobileOpen, setMobileOpen] = useState(false);

  if (!session?.user) return null;

  const role = session.user.role;
  const nav = role === 'TRAINER' ? trainerNav :
    role === 'LEARNER' ? learnerNav : adminNav;

  const initials = session.user.name
    ? session.user.name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)
    : 'SM';

  return (
    <>
      {/* Mobile toggle */}
      <button
        className="btn btn-ghost btn-icon"
        onClick={() => setMobileOpen(!mobileOpen)}
        style={{
          position: 'fixed',
          top: 12,
          left: 12,
          zIndex: 60,
          display: 'none',
        }}
        id="sidebar-toggle"
      >
        ☰
      </button>

      <aside className={`sidebar ${mobileOpen ? 'open' : ''}`}>
        <div className="sidebar-logo">
          <div className="sidebar-logo-icon">SM</div>
          <div>
            <div className="sidebar-logo-text">Simplon Maghreb</div>
            <div className="sidebar-logo-sub">Gestion des formations</div>
          </div>
        </div>

        <nav className="sidebar-nav">
          {nav.map((group) => (
            <div key={group.section} className="sidebar-section">
              <div className="sidebar-section-title">{group.section}</div>
              {group.items.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`sidebar-link ${pathname === item.href || pathname.startsWith(item.href + '/') ? 'active' : ''}`}
                  onClick={() => setMobileOpen(false)}
                >
                  <span style={{ fontSize: '16px' }}>{item.icon}</span>
                  {item.label}
                </Link>
              ))}
            </div>
          ))}
        </nav>

        <div className="sidebar-footer">
          <div className="sidebar-user">
            <div className="sidebar-avatar">{initials}</div>
            <div className="sidebar-user-info">
              <div className="sidebar-user-name">{session.user.name}</div>
              <div className="sidebar-user-role">{ROLE_LABELS[role] || role}</div>
            </div>
          </div>
          <button
            onClick={() => signOut({ callbackUrl: '/login' })}
            className="sidebar-link"
            style={{ marginTop: 8, width: '100%', color: 'var(--gray-400)' }}
          >
            <span style={{ fontSize: '16px' }}>🚪</span>
            Déconnexion
          </button>
        </div>
      </aside>

      <style jsx global>{`
        @media (max-width: 1024px) {
          #sidebar-toggle { display: flex !important; }
        }
      `}</style>
    </>
  );
}
