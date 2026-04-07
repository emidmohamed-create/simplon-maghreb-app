'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { STATUS_LABELS, INSERTION_LABELS } from '@/lib/utils';

const STATUS_COLORS: Record<string, string> = {
  IN_TRAINING: 'badge-blue', DROPPED: 'badge-red', INSERTED: 'badge-green', EXCLUDED: 'badge-gray',
};

export default function LearnersPage() {
  const router = useRouter();
  const [learners, setLearners] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');

  useEffect(() => {
    const params = new URLSearchParams();
    if (search) params.set('search', search);
    if (statusFilter) params.set('status', statusFilter);
    fetch(`/api/learners?${params}`).then(r => r.json()).then(setLearners).finally(() => setLoading(false));
  }, [search, statusFilter]);

  return (
    <>
      <div className="page-header">
        <div>
          <h1 className="page-title">Apprenants</h1>
          <p className="page-subtitle">Suivi de tous les apprenants</p>
        </div>
      </div>
      <div className="page-body">
        <div style={{ display: 'flex', gap: 12, marginBottom: 16 }}>
          <input type="text" className="form-input" placeholder="Rechercher..." value={search} onChange={e => { setSearch(e.target.value); setLoading(true); }} style={{ maxWidth: 300 }} />
          <select className="form-select" value={statusFilter} onChange={e => { setStatusFilter(e.target.value); setLoading(true); }} style={{ maxWidth: 200 }}>
            <option value="">Tous les statuts</option>
            <option value="IN_TRAINING">En formation</option>
            <option value="DROPPED">Abandonné</option>
            <option value="INSERTED">Inséré</option>
            <option value="EXCLUDED">Exclu</option>
          </select>
        </div>

        {loading ? (
          <div className="loading-overlay"><span className="loading-spinner" /> Chargement...</div>
        ) : (
          <div className="card">
            <table className="data-table">
              <thead><tr><th>Nom</th><th>Email</th><th>Cohorte</th><th>Programme</th><th>Campus</th><th>Statut</th><th>Insertion</th></tr></thead>
              <tbody>
                {learners.map(l => (
                  <tr key={l.id} className="clickable" onClick={() => router.push(`/admin/learners/${l.id}`)}>
                    <td style={{ fontWeight: 600 }}>{l.firstName} {l.lastName}</td>
                    <td>{l.email}</td>
                    <td>{l.cohort?.name}</td>
                    <td>{l.cohort?.program?.name}</td>
                    <td>{l.cohort?.program?.campus?.name}</td>
                    <td><span className={`badge ${STATUS_COLORS[l.statusCurrent] || 'badge-gray'}`}>{STATUS_LABELS[l.statusCurrent]}</span></td>
                    <td>{l.insertionType ? INSERTION_LABELS[l.insertionType] || l.insertionType : '-'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </>
  );
}
