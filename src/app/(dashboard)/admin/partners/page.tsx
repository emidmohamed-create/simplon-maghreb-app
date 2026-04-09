'use client';

import { useEffect, useState } from 'react';

export default function PartnersPage() {
  const [partners, setPartners] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Modal states
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ name: '', type: 'OTHER', contactName: '', contactEmail: '', notes: '' });

  const load = () => { 
    setLoading(true);
    fetch('/api/partners').then(r => r.json()).then(setPartners).finally(() => setLoading(false)); 
  };
  
  useEffect(() => { load(); }, []);

  const openCreate = () => {
    setEditingId(null);
    setForm({ name: '', type: 'OTHER', contactName: '', contactEmail: '', notes: '' });
    setShowModal(true);
  };

  const openEdit = (p: any) => {
    setEditingId(p.id);
    setForm({
      name: p.name,
      type: p.type,
      contactName: p.contactName || '',
      contactEmail: p.contactEmail || '',
      notes: p.notes || ''
    });
    setShowModal(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const url = editingId ? `/api/partners/${editingId}` : '/api/partners';
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
    if (!confirm('Supprimer ce partenaire ?')) return;
    try {
      const res = await fetch(`/api/partners/${id}`, { method: 'DELETE' });
      if (res.ok) load();
      else {
        const data = await res.json();
        alert(data.error || "Erreur de suppression");
      }
    } catch (err) {
      alert("Erreur réseau");
    }
  };

  const typeLabels: Record<string, string> = { FUNDER: 'Bailleur', PARTNER: 'Partenaire', INSTITUTION: 'Institution', OTHER: 'Autre' };

  return (
    <>
      <div className="page-header">
        <div><h1 className="page-title">Partenaires</h1><p className="page-subtitle">Organisations partenaires et bailleurs de fonds</p></div>
        <button className="btn btn-primary" onClick={openCreate}>+ Nouveau partenaire</button>
      </div>
      <div className="page-body">
        {loading ? <div className="loading-overlay"><span className="loading-spinner" /> Chargement...</div> : (
          <div className="card">
            <table className="data-table">
              <thead><tr><th>Nom</th><th>Type</th><th>Contact</th><th>Email</th><th>Projets</th><th>Actions</th></tr></thead>
              <tbody>
                {partners.map(p => (
                  <tr key={p.id}>
                    <td style={{ fontWeight: 600 }}>{p.name}</td>
                    <td><span className="badge badge-purple">{typeLabels[p.type] || p.type}</span></td>
                    <td>{p.contactName || '-'}</td>
                    <td>{p.contactEmail || '-'}</td>
                    <td>{p._count.projects}</td>
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
              <h2 className="modal-title">{editingId ? 'Modifier partenaire' : 'Nouveau partenaire'}</h2>
              <button className="btn btn-ghost btn-icon" onClick={() => setShowModal(false)}>✕</button>
            </div>
            <form onSubmit={handleSubmit}>
              <div className="modal-body">
                <div className="form-group"><label className="form-label">Nom</label><input className="form-input" value={form.name} onChange={e => setForm({...form, name: e.target.value})} required /></div>
                <div className="form-group"><label className="form-label">Type</label>
                  <select className="form-select" value={form.type} onChange={e => setForm({...form, type: e.target.value})}>
                    <option value="FUNDER">Bailleur</option><option value="PARTNER">Partenaire</option><option value="INSTITUTION">Institution</option><option value="OTHER">Autre</option>
                  </select>
                </div>
                <div className="form-row">
                  <div className="form-group"><label className="form-label">Contact</label><input className="form-input" value={form.contactName} onChange={e => setForm({...form, contactName: e.target.value})} /></div>
                  <div className="form-group"><label className="form-label">Email</label><input type="email" className="form-input" value={form.contactEmail} onChange={e => setForm({...form, contactEmail: e.target.value})} /></div>
                </div>
                <div className="form-group"><label className="form-label">Notes</label><textarea className="form-textarea" value={form.notes} onChange={e => setForm({...form, notes: e.target.value})} /></div>
              </div>
              <div className="modal-footer"><button type="button" className="btn btn-secondary" onClick={() => setShowModal(false)}>Annuler</button><button type="submit" className="btn btn-primary" disabled={saving}>{saving ? "⏳..." : "💾 Enregistrer"}</button></div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
