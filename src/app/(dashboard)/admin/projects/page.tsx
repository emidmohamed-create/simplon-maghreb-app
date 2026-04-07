'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { formatDate, PROJECT_TYPE_LABELS } from '@/lib/utils';

export default function ProjectsPage() {
  const router = useRouter();
  const [projects, setProjects] = useState<any[]>([]);
  const [partners, setPartners] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState({ name: '', code: '', description: '', projectType: 'OWN', partnerId: '', startDate: '', endDate: '', targetCapacity: '', status: 'DRAFT' });

  const load = () => {
    Promise.all([
      fetch('/api/projects').then(r => r.json()),
      fetch('/api/partners').then(r => r.json()).catch(() => []),
    ]).then(([p, pa]) => { setProjects(p); setPartners(pa); }).finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, []);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    await fetch('/api/projects', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(form) });
    setShowModal(false);
    load();
  };

  const statusBadge = (s: string) => {
    const map: Record<string, string> = { DRAFT: 'badge-gray', ACTIVE: 'badge-blue', COMPLETED: 'badge-green', ARCHIVED: 'badge-orange' };
    const labels: Record<string, string> = { DRAFT: 'Brouillon', ACTIVE: 'Actif', COMPLETED: 'Terminé', ARCHIVED: 'Archivé' };
    return <span className={`badge ${map[s] || 'badge-gray'}`}>{labels[s] || s}</span>;
  };

  return (
    <>
      <div className="page-header">
        <div>
          <h1 className="page-title">Projets de formation</h1>
          <p className="page-subtitle">Gestion des projets et financements</p>
        </div>
        <button className="btn btn-primary" onClick={() => setShowModal(true)}>+ Nouveau projet</button>
      </div>
      <div className="page-body">
        {loading ? (
          <div className="loading-overlay"><span className="loading-spinner" /> Chargement...</div>
        ) : (
          <div className="card">
            <table className="data-table">
              <thead><tr><th>Projet</th><th>Code</th><th>Type</th><th>Partenaire</th><th>Début</th><th>Fin</th><th>Capacité</th><th>Cohortes</th><th>Statut</th></tr></thead>
              <tbody>
                {projects.map(p => (
                  <tr key={p.id} className="clickable" onClick={() => router.push(`/admin/projects/${p.id}`)}>
                    <td style={{ fontWeight: 600 }}>{p.name}</td>
                    <td><span className="badge badge-purple">{p.code}</span></td>
                    <td>{PROJECT_TYPE_LABELS[p.projectType] || p.projectType}</td>
                    <td>{p.partner?.name || '-'}</td>
                    <td>{p.startDate ? formatDate(p.startDate) : '-'}</td>
                    <td>{p.endDate ? formatDate(p.endDate) : '-'}</td>
                    <td>{p.targetCapacity || '-'}</td>
                    <td>{p._count.cohorts}</td>
                    <td>{statusBadge(p.status)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {showModal && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal modal-lg" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h2 className="modal-title">Nouveau projet de formation</h2>
              <button className="btn btn-ghost btn-icon" onClick={() => setShowModal(false)}>✕</button>
            </div>
            <form onSubmit={handleCreate}>
              <div className="modal-body">
                <div className="form-row">
                  <div className="form-group"><label className="form-label">Nom du projet</label><input className="form-input" value={form.name} onChange={e => setForm({...form, name: e.target.value})} required /></div>
                  <div className="form-group"><label className="form-label">Code</label><input className="form-input" value={form.code} onChange={e => setForm({...form, code: e.target.value})} required placeholder="Ex: DWFS-2025" /></div>
                </div>
                <div className="form-group"><label className="form-label">Description</label><textarea className="form-textarea" value={form.description} onChange={e => setForm({...form, description: e.target.value})} /></div>
                <div className="form-row">
                  <div className="form-group">
                    <label className="form-label">Type de projet</label>
                    <select className="form-select" value={form.projectType} onChange={e => setForm({...form, projectType: e.target.value})}>
                      <option value="OWN">Projet propre</option><option value="FUNDED">Projet financé</option><option value="PARTNERSHIP">Partenariat</option>
                    </select>
                  </div>
                  <div className="form-group"><label className="form-label">Capacité cible</label><input type="number" className="form-input" value={form.targetCapacity} onChange={e => setForm({...form, targetCapacity: e.target.value})} /></div>
                </div>
                <div className="form-row">
                  <div className="form-group"><label className="form-label">Date de début</label><input type="date" className="form-input" value={form.startDate} onChange={e => setForm({...form, startDate: e.target.value})} /></div>
                  <div className="form-group"><label className="form-label">Date de fin</label><input type="date" className="form-input" value={form.endDate} onChange={e => setForm({...form, endDate: e.target.value})} /></div>
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
