'use client';

import { useSession } from 'next-auth/react';
import { useEffect, useState } from 'react';
import Link from 'next/link';

export default function TrainerDashboard() {
  const { data: session } = useSession();
  const [cohorts, setCohorts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/cohorts').then(r => r.json()).then(setCohorts).finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="page-body"><div className="loading-overlay"><span className="loading-spinner" /> Chargement...</div></div>;

  return (
    <>
      <div className="page-header">
        <div>
          <h1 className="page-title">Tableau de bord formateur</h1>
          <p className="page-subtitle">Bienvenue, {session?.user?.name}</p>
        </div>
      </div>
      <div className="page-body">
        <h2 style={{ fontSize: 16, fontWeight: 600, marginBottom: 16 }}>Mes cohortes</h2>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: 16 }}>
          {cohorts.map(c => (
            <div key={c.id} className="card" style={{ cursor: 'pointer' }} onClick={() => window.location.href = `/admin/cohorts/${c.id}`}>
              <div className="card-body">
                <h3 style={{ fontSize: 15, fontWeight: 600, marginBottom: 4 }}>{c.name}</h3>
                <p className="text-sm text-muted">{c.program?.name} — {c.program?.campus?.name}</p>
                <p className="text-sm mt-2">{c._count?.learnerProfiles || 0} apprenants</p>
                <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
                  <Link href={`/trainer/cohorts/${c.id}/attendance`} className="btn btn-sm btn-primary" onClick={(e) => e.stopPropagation()}>Saisir présence</Link>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </>
  );
}
