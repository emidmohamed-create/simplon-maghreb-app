'use client';

import { useEffect, useState } from 'react';

interface Program { id: string; name: string; description?: string; isActive: boolean; project?: { name: string; code: string }; _count: { cohorts: number } }

export default function ProgramsPage() {
  const [programs, setPrograms] = useState<Program[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Modal states
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ name: '', description: '', isActive: true });

  const load = () => {
    setLoading(true);
    fetch('/api/programs').then(r => r.json()).then(setPrograms).finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, []);

  const openCreate = () => {
    setEditingId(null);
    setForm({ name: '', description: '', isActive: true });
    setShowModal(true);
  };

  const openEdit = (p: Program) => {
    setEditingId(p.id);
    setForm({ name: p.name, description: p.description || '', isActive: p.isActive });
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
          <h1 className="page-title">Catalogues de Programmes</h1>
          <p className="page-subtitle">Référentiel global des contenus de formation</p>
        </div>
        <button className="btn btn-primary" onClick={openCreate}>+ Nouveau programme</button>
      </div>
      <div className="page-body">
        {loading ? (
          <div className="loading-overlay"><span className="loading-spinner" /> Chargement...</div>
        ) : (
          <div className="card">
            <table className="data-table">
              <thead><tr><th>Programme (Contenu)</th><th>Description</th><th>Projet Associé</th><th>Cohortes Actives</th><th>Statut</th><th>Actions</th></tr></thead>
              <tbody>
                {programs.map(p => (
                  <tr key={p.id}>
                    <td style={{ fontWeight: 600 }}>{p.name}</td>
                    <td>{p.description || '-'}</td>
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
              <h2 className="modal-title">{editingId ? 'Modifier contenu' : 'Nouveau contenu de formation'}</h2>
              <button className="btn btn-ghost btn-icon" onClick={() => setShowModal(false)}>✕</button>
            </div>
            <form onSubmit={handleSubmit}>
              <div className="modal-body">
                <div className="form-group">
                  <label className="form-label">Nom du Programme</label>
                  <input className="form-input" value={form.name} onChange={e => setForm({...form, name: e.target.value})} required placeholder="Ex: Développeur Web, Data Analyst..." />
                </div>
                <div className="form-group">
                  <label className="form-label">Description / Objectifs</label>
                  <textarea className="form-textarea" value={form.description} onChange={e => setForm({...form, description: e.target.value})} rows={4} />
                </div>
                {editingId && (
                  <label style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 12, cursor: 'pointer' }}>
                    <input type="checkbox" checked={form.isActive} onChange={e => setForm({...form, isActive: e.target.checked})} />
                    Disponible dans le catalogue
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
