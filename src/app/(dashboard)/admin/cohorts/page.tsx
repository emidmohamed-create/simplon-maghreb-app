'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { formatDate, STATUS_LABELS } from '@/lib/utils';

export default function CohortsPage() {
  const router = useRouter();
  const [cohorts, setCohorts] = useState<any[]>([]);
  const [programs, setPrograms] = useState<any[]>([]);
  const [projects, setProjects] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState({ name: '', programId: '', projectId: '', startDate: '', endDate: '', capacity: '' });

  const load = () => {
    Promise.all([
      fetch('/api/cohorts').then(r => r.json()),
      fetch('/api/programs').then(r => r.json()),
      fetch('/api/projects').then(r => r.json()),
    ]).then(([c, p, pr]) => { setCohorts(c); setPrograms(p); setProjects(pr); }).finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, []);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    await fetch('/api/cohorts', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(form) });
    setShowModal(false);
    setForm({ name: '', programId: '', projectId: '', startDate: '', endDate: '', capacity: '' });
    load();
  };

  return (
    <>
      <div className="page-header">
        <div>
          <h1 className="page-title">Cohortes / Classes</h1>
          <p className="page-subtitle">Gestion des classes de formation</p>
        </div>
        <button className="btn btn-primary" onClick={() => setShowModal(true)}>+ Nouvelle cohorte</button>
      </div>
      <div className="page-body">
        {loading ? (
          <div className="loading-overlay"><span className="loading-spinner" /> Chargement...</div>
        ) : (
          <div className="card">
            <table className="data-table">
              <thead><tr><th>Cohorte</th><th>Programme</th><th>Projet Associé</th><th>Campus</th><th>Formateur</th><th>Début</th><th>Fin</th><th>Apprenants</th><th>Statut</th></tr></thead>
              <tbody>
                {cohorts.map(c => {
                  const now = new Date();
                  const status = c.startDate && now >= new Date(c.startDate) ? (c.endDate && now > new Date(c.endDate) ? 'Terminée' : 'En cours') : 'À venir';
                  return (
                    <tr key={c.id} className="clickable" onClick={() => router.push(`/admin/cohorts/${c.id}`)}>
                      <td style={{ fontWeight: 600 }}>{c.name}</td>
                      <td>{c.program.name}</td>
                      <td>{c.project ? <span className="badge badge-purple">{c.project.name}</span> : <span className="text-muted text-xs">Aucun</span>}</td>
                      <td>{c.program.campus?.name}</td>
                      <td>{c.trainer ? `${c.trainer.firstName} ${c.trainer.lastName}` : '-'}</td>
                      <td>{c.startDate ? formatDate(c.startDate) : '-'}</td>
                      <td>{c.endDate ? formatDate(c.endDate) : '-'}</td>
                      <td>{c._count.learnerProfiles}</td>
                      <td><span className={`badge ${status === 'En cours' ? 'badge-blue' : status === 'Terminée' ? 'badge-green' : 'badge-gray'}`}>{status}</span></td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {showModal && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h2 className="modal-title">Nouvelle cohorte</h2>
              <button className="btn btn-ghost btn-icon" onClick={() => setShowModal(false)}>✕</button>
            </div>
            <form onSubmit={handleCreate}>
              <div className="modal-body">
                <div className="form-group">
                  <label className="form-label">Nom</label>
                  <input className="form-input" value={form.name} onChange={e => setForm({...form, name: e.target.value})} required />
                </div>
                <div className="form-group">
                  <label className="form-label">Programme</label>
                  <select className="form-select" value={form.programId} onChange={e => setForm({...form, programId: e.target.value})} required>
                    <option value="">Sélectionner</option>
                    {programs.map((p: any) => <option key={p.id} value={p.id}>{p.name} - {p.campus.name}</option>)}
                  </select>
                </div>
                <div className="form-group">
                  <label className="form-label">Projet rattaché <span className="text-muted">(optionnel)</span></label>
                  <select className="form-select" value={form.projectId} onChange={e => setForm({...form, projectId: e.target.value})}>
                    <option value="">-- Créer un projet dédié automatiquement --</option>
                    {projects.map((p: any) => <option key={p.id} value={p.id}>{p.name} ({p.code})</option>)}
                  </select>
                </div>
                <div className="form-row">
                  <div className="form-group">
                    <label className="form-label">Date de début</label>
                    <input type="date" className="form-input" value={form.startDate} onChange={e => setForm({...form, startDate: e.target.value})} />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Date de fin</label>
                    <input type="date" className="form-input" value={form.endDate} onChange={e => setForm({...form, endDate: e.target.value})} />
                  </div>
                </div>
                <div className="form-group">
                  <label className="form-label">Capacité</label>
                  <input type="number" className="form-input" value={form.capacity} onChange={e => setForm({...form, capacity: e.target.value})} />
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={() => setShowModal(false)}>Annuler</button>
                <button type="submit" className="btn btn-primary">Créer</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
