'use client';

import { useEffect, useState } from 'react';

interface Program { id: string; name: string; description?: string; isActive: boolean; campus: { name: string }; campusId: string; project?: { name: string; code: string }; _count: { cohorts: number } }

export default function ProgramsPage() {
  const [programs, setPrograms] = useState<Program[]>([]);
  const [campuses, setCampuses] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Modal states
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ name: '', campusId: '', description: '', isActive: true });

  const load = () => {
    setLoading(true);
    Promise.all([
      fetch('/api/programs').then(r => r.json()),
      fetch('/api/campuses').then(r => r.json()),
    ]).then(([p, c]) => { setPrograms(p); setCampuses(c); }).finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, []);

  const openCreate = () => {
    setEditingId(null);
    setForm({ name: '', campusId: '', description: '', isActive: true });
    setShowModal(true);
  };

  const openEdit = (p: Program) => {
    setEditingId(p.id);
    setForm({ name: p.name, campusId: p.campusId, description: p.description || '', isActive: p.isActive });
    setShowModal(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const url = editingId ? `/api/programs/${editingId}` : '/api/programs';
      const method = editingId ? 'PATCH' : 'POST';
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form)
      });
      if (res.ok) {
        setShowModal(false);
        load();
      } else {
        const data = await res.json();
        alert(data.error || "Erreur");
      }
    } catch (err) {
      alert("Erreur réseau");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Supprimer ce programme ?')) return;
    try {
      const res = await fetch(`/api/programs/${id}`, { method: 'DELETE' });
      if (res.ok) load();
      else {
        const data = await res.json();
        alert(data.error || "Erreur lors de la suppression");
      }
    } catch (err) {
      alert("Erreur réseau");
    }
  };

  return (
    <>
      <div className="page-header">
        <div>
          <h1 className="page-title">Programmes</h1>
          <p className="page-subtitle">Programmes de formation par campus</p>
        </div>
        <button className="btn btn-primary" onClick={openCreate}>+ Nouveau programme</button>
      </div>
      <div className="page-body">
        {loading ? (
          <div className="loading-overlay"><span className="loading-spinner" /> Chargement...</div>
        ) : (
          <div className="card">
            <table className="data-table">
              <thead><tr><th>Programme</th><th>Campus</th><th>Projet</th><th>Cohortes</th><th>Statut</th><th>Actions</th></tr></thead>
              <tbody>
                {programs.map(p => (
                  <tr key={p.id}>
                    <td style={{ fontWeight: 600 }}>{p.name}</td>
                    <td>{p.campus.name}</td>
                    <td>{p.project ? <span className="badge badge-purple">{p.project.code}</span> : '-'}</td>
                    <td>{p._count.cohorts}</td>
                    <td><span className={`badge ${p.isActive ? 'badge-green' : 'badge-gray'}`}>{p.isActive ? 'Actif' : 'Inactif'}</span></td>
                    <td>
                      <div style={{ display: 'flex', gap: 8 }}>
                        <button className="btn btn-ghost btn-icon" onClick={() => openEdit(p)} title="Modifier">✏️</button>
                        <button className="btn btn-ghost btn-icon" style={{ color: 'var(--red-600)' }} onClick={() => handleDelete(p.id)} title="Supprimer">🗑️</button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {showModal && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h2 className="modal-title">{editingId ? 'Modifier programme' : 'Nouveau programme'}</h2>
              <button className="btn btn-ghost btn-icon" onClick={() => setShowModal(false)}>✕</button>
            </div>
            <form onSubmit={handleSubmit}>
              <div className="modal-body">
                <div className="form-group">
                  <label className="form-label">Nom</label>
                  <input className="form-input" value={form.name} onChange={e => setForm({...form, name: e.target.value})} required />
                </div>
                <div className="form-group">
                  <label className="form-label">Campus</label>
                  <select className="form-select" value={form.campusId} onChange={e => setForm({...form, campusId: e.target.value})} required>
                    <option value="">Sélectionner un campus</option>
                    {campuses.map((c: any) => <option key={c.id} value={c.id}>{c.name}</option>)}
                  </select>
                </div>
                <div className="form-group">
                  <label className="form-label">Description</label>
                  <textarea className="form-textarea" value={form.description} onChange={e => setForm({...form, description: e.target.value})} />
                </div>
                {editingId && (
                  <label style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 12, cursor: 'pointer' }}>
                    <input type="checkbox" checked={form.isActive} onChange={e => setForm({...form, isActive: e.target.checked})} />
                    Programme actif
                  </label>
                )}
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={() => setShowModal(false)}>Annuler</button>
                <button type="submit" className="btn btn-primary" disabled={saving}>{saving ? "⏳..." : "💾 Enregistrer"}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
