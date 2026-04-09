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

  // States for Assignment Modal
  const [showAssign, setShowAssign] = useState(false);
  const [users, setUsers] = useState<any[]>([]);
  const [cohorts, setCohorts] = useState<any[]>([]);
  const [form, setForm] = useState({ userId: '', cohortId: '' });
  const [saving, setSaving] = useState(false);

  const loadOptions = () => {
    fetch('/api/users').then(r => r.json()).then(setUsers).catch(() => setUsers([]));
    fetch('/api/cohorts').then(r => r.json()).then(setCohorts).catch(() => setCohorts([]));
  };

  useEffect(() => {
    loadOptions();
  }, []);

  const loadLearners = () => {
    setLoading(true);
    const params = new URLSearchParams();
    if (search) params.set('search', search);
    if (statusFilter) params.set('status', statusFilter);
    fetch(`/api/learners?${params}`).then(r => r.json()).then(setLearners).finally(() => setLoading(false));
  };

  useEffect(() => {
    loadLearners();
  }, [search, statusFilter]);

  const handleAssign = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.userId || !form.cohortId) return;
    setSaving(true);
    try {
      const res = await fetch('/api/learners', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form)
      });
      const data = await res.json();
      if (!res.ok) {
        alert(data.error || "Erreur lors de l'assignation");
      } else {
        setShowAssign(false);
        setForm({ userId: '', cohortId: '' });
        loadLearners();
      }
    } catch (err) {
      alert("Erreur réseau");
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      <div className="page-header">
        <div>
          <h1 className="page-title">Apprenants</h1>
          <p className="page-subtitle">Suivi de tous les apprenants</p>
        </div>
        <div>
          <button className="btn btn-primary" onClick={() => setShowAssign(true)}>+ Assigner à une formation</button>
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
                {learners.map((l: any) => (
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

      {showAssign && (
        <div className="modal-overlay" onClick={() => setShowAssign(false)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h2 className="modal-title">Assigner à une formation</h2>
              <button className="btn btn-ghost btn-icon" onClick={() => setShowAssign(false)}>✕</button>
            </div>
            <form onSubmit={handleAssign}>
              <div className="modal-body">
                <div className="form-group">
                  <label className="form-label">Sélectionner un utilisateur existant</label>
                  <select className="form-select" required value={form.userId} onChange={e => setForm({...form, userId: e.target.value})}>
                    <option value="">Rechercher un utilisateur...</option>
                    {users.map(u => (
                      <option key={u.id} value={u.id}>{u.firstName} {u.lastName} ({u.email}) - {u.role}</option>
                    ))}
                  </select>
                  <p className="text-muted" style={{ fontSize: 11, marginTop: 4 }}>
                    Le profil utilisateur doit avoir été créé dans l&apos;onglet Utilisateurs.
                  </p>
                </div>

                <div className="form-group">
                  <label className="form-label">Sélectionner la cohorte d&apos;affectation</label>
                  <select className="form-select" required value={form.cohortId} onChange={e => setForm({...form, cohortId: e.target.value})}>
                    <option value="">Sélectionner...</option>
                    {cohorts.map(c => (
                      <option key={c.id} value={c.id}>{c.name}</option>
                    ))}
                  </select>
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={() => setShowAssign(false)}>Annuler</button>
                <button type="submit" className="btn btn-primary" disabled={saving}>
                  {saving ? "⏳ Création..." : "🎓 Inscrire et générer le profil"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
