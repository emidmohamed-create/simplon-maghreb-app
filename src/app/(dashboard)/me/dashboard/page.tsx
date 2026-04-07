'use client';

import { useSession } from 'next-auth/react';

export default function MyDashboard() {
  const { data: session } = useSession();

  return (
    <>
      <div className="page-header">
        <div>
          <h1 className="page-title">Mon dashboard</h1>
          <p className="page-subtitle">Bienvenue, {session?.user?.name}</p>
        </div>
      </div>
      <div className="page-body">
        <div className="card">
          <div className="card-body">
            <p className="text-sm text-muted">Le dashboard apprenant affichera vos informations de suivi, présence et activités.</p>
            <div style={{ display: 'grid', gridTemplateColumns: '120px 1fr', gap: '8px 16px', fontSize: 13, marginTop: 16 }}>
              <span className="text-muted">Nom</span><span className="font-semibold">{session?.user?.name}</span>
              <span className="text-muted">Email</span><span>{session?.user?.email}</span>
              <span className="text-muted">Rôle</span><span>{session?.user?.role}</span>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
