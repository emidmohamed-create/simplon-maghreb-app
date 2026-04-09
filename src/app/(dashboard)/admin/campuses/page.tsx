'use client';

import { useEffect, useState } from 'react';

interface Campus { id: string; name: string; city: string; isActive: boolean; _count: { programs: number; users: number } }

export default function CampusesPage() {
  const [campuses, setCampuses] = useState<Campus[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Modal states
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ name: '', city: '', isActive: true });

  const load = () => {
    setLoading(true);
    fetch('/api/campuses').then(r => r.json()).then(setCampuses).finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, []);

  const openCreate = () => {
    setEditingId(null);
    setForm({ name: '', city: '', isActive: true });
    setShowModal(true);
  };

  const openEdit = (c: Campus) => {
    setEditingId(c.id);
    setForm({ name: c.name, city: c.city, isActive: c.isActive });
    setShowModal(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const url = editingId ? `/api/campuses/${editingId}` : '/api/campuses';
      const method = editingId ? 'PUT' : 'POST';
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
    if (!confirm('Supprimer ce campus ? Les données liées peuvent empêcher la suppression.')) return;
    try {
      const res = await fetch(`/api/campuses/${id}`, { method: 'DELETE' });
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
          <h1 className="page-title">Campus</h1>
          <p className="page-subtitle">Gestion des centres de formation</p>
        </div>
        <button className="btn btn-primary" onClick={openCreate}>+ Nouveau campus</button>
      </div>
      <div className="page-body">
        {loading ? (
          <div className="loading-overlay"><span className="loading-spinner" /> Chargement...</div>
        ) : (
          <div className="card">
            <table className="data-table">
              <thead><tr><th>Nom</th><th>Ville</th><th>Programmes</th><th>Utilisateurs</th><th>Statut</th><th>Actions</th></tr></thead>
              <tbody>
                {campuses.map(c => (
                  <tr key={c.id}>
                    <td style={{ fontWeight: 600 }}>{c.name}</td>
                    <td>{c.city}</td>
                    <td>{c._count.programs}</td>
                    <td>{c._count.users}</td>
                    <td><span className={`badge ${c.isActive ? 'badge-green' : 'badge-gray'}`}>{c.isActive ? 'Actif' : 'Inactif'}</span></td>
                    <td>
                      <div style={{ display: 'flex', gap: 8 }}>
                        <button className="btn btn-ghost btn-icon" onClick={() => openEdit(c)} title="Modifier">✏️</button>
                        <button className="btn btn-ghost btn-icon" style={{ color: 'var(--red-600)' }} onClick={() => handleDelete(c.id)} title="Supprimer">🗑️</button>
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
              <h2 className="modal-title">{editingId ? 'Modifier Campus' : 'Nouveau Campus'}</h2>
              <button className="btn btn-ghost btn-icon" onClick={() => setShowModal(false)}>✕</button>
            </div>
            <form onSubmit={handleSubmit}>
              <div className="modal-body">
                <div className="form-group">
                  <label className="form-label">Nom du campus</label>
                  <input className="form-input" value={form.name} onChange={e => setForm({...form, name: e.target.value})} required />
                </div>
                <div className="form-group">
                  <label className="form-label">Ville</label>
                  <input className="form-input" value={form.city} onChange={e => setForm({...form, city: e.target.value})} required />
                </div>
                {editingId && (
                  <div className="form-group" style={{ marginTop: 12 }}>
                    <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer' }}>
                      <input type="checkbox" checked={form.isActive} onChange={e => setForm({...form, isActive: e.target.checked})} />
                      Campus actif
                    </label>
                  </div>
                )}
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={() => setShowModal(false)}>Annuler</button>
                <button type="submit" className="btn btn-primary" disabled={saving}>
                  {saving ? "⏳ Enregistrement..." : "💾 Enregistrer"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
