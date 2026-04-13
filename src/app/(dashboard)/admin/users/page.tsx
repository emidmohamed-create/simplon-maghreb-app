'use client';

import { useEffect, useRef, useState } from 'react';
import { ROLE_LABELS } from '@/lib/utils';

type UserForm = {
  firstName: string;
  lastName: string;
  email: string;
  password: string;
  role: string;
  campusId: string;
  isActive: boolean;
  projectAccessIds: string[];
  cohortAccessIds: string[];
};

const EMPTY_FORM: UserForm = {
  firstName: '',
  lastName: '',
  email: '',
  password: '',
  role: 'LEARNER',
  campusId: '',
  isActive: true,
  projectAccessIds: [],
  cohortAccessIds: [],
};

export default function UsersPage() {
  const [users, setUsers] = useState<any[]>([]);
  const [campuses, setCampuses] = useState<any[]>([]);
  const [projects, setProjects] = useState<any[]>([]);
  const [cohorts, setCohorts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [importing, setImporting] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState<UserForm>(EMPTY_FORM);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const loadUsers = () => {
    setLoading(true);
    fetch('/api/users')
      .then((r) => r.json())
      .then((data) => setUsers(Array.isArray(data) ? data : []))
      .catch(() => setUsers([]))
      .finally(() => setLoading(false));
  };

  const loadCampuses = () => {
    fetch('/api/campuses')
      .then((r) => r.json())
      .then((data) => setCampuses(Array.isArray(data) ? data : []))
      .catch(() => setCampuses([]));
  };

  const loadScopes = () => {
    Promise.all([
      fetch('/api/projects').then((r) => r.json()).catch(() => []),
      fetch('/api/cohorts').then((r) => r.json()).catch(() => []),
    ]).then(([p, c]) => {
      setProjects(Array.isArray(p) ? p : []);
      setCohorts(Array.isArray(c) ? c : []);
    });
  };

  useEffect(() => {
    loadUsers();
    loadCampuses();
    loadScopes();
  }, []);

  const downloadTemplate = () => {
    const csvContent = 'Prenom,Nom,Email,Role,Mot de passe\nJean,Dupont,jean.dupont@email.com,LEARNER,Simplon123!\nMarie,Curie,marie.c@email.com,PROJECT_MANAGER,Simplon123!';
    const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.setAttribute('download', 'modele_import_utilisateurs.csv');
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  const handleImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setImporting(true);
    try {
      const formData = new FormData();
      formData.append('file', file);
      const res = await fetch('/api/users/import', { method: 'POST', body: formData });
      const data = await res.json();
      if (!res.ok) {
        alert(data.error || "Erreur lors de l'importation");
      } else {
        alert(`${data.createdCount} utilisateur(s) importe(s).`);
        loadUsers();
      }
    } catch {
      alert('Erreur reseau');
    } finally {
      if (fileInputRef.current) fileInputRef.current.value = '';
      setImporting(false);
    }
  };

  const openCreate = () => {
    setEditingId(null);
    setForm(EMPTY_FORM);
    setShowModal(true);
  };

  const openEdit = (user: any) => {
    setEditingId(user.id);
    setForm({
      firstName: user.firstName || '',
      lastName: user.lastName || '',
      email: user.email || '',
      password: '',
      role: user.role || 'LEARNER',
      campusId: user.campusId || '',
      isActive: !!user.isActive,
      projectAccessIds: (user.projectAccesses || []).map((p: any) => p.projectId),
      cohortAccessIds: (user.cohortAccesses || []).map((c: any) => c.cohortId),
    });
    setShowModal(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const url = editingId ? `/api/users/${editingId}` : '/api/users';
      const method = editingId ? 'PATCH' : 'POST';

      const payload = form.role === 'PROJECT_MANAGER'
        ? form
        : { ...form, projectAccessIds: [], cohortAccessIds: [] };

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const data = await res.json();
        alert(data.error || 'Erreur');
        return;
      }

      setShowModal(false);
      loadUsers();
    } catch {
      alert('Erreur reseau');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Supprimer cet utilisateur ?')) return;
    try {
      const res = await fetch(`/api/users/${id}`, { method: 'DELETE' });
      if (res.ok) loadUsers();
      else {
        const data = await res.json();
        alert(data.error || 'Erreur de suppression');
      }
    } catch {
      alert('Erreur reseau');
    }
  };

  return (
    <>
      <div className="page-header">
        <div>
          <h1 className="page-title">Utilisateurs</h1>
          <p className="page-subtitle">Gestion des comptes utilisateurs</p>
        </div>
        <div style={{ display: 'flex', gap: 10 }}>
          <button className="btn btn-primary" onClick={openCreate}>+ Nouvel utilisateur</button>
          <button className="btn btn-secondary" onClick={downloadTemplate}>Modele CSV</button>
          <input type="file" accept=".csv" style={{ display: 'none' }} ref={fileInputRef} onChange={handleImport} />
          <button className="btn btn-primary" onClick={() => fileInputRef.current?.click()} disabled={importing}>
            {importing ? 'Importation...' : 'Importer via CSV'}
          </button>
        </div>
      </div>

      <div className="page-body">
        {loading ? (
          <div className="loading-overlay"><span className="loading-spinner" /> Chargement...</div>
        ) : (
          <div className="card">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Nom</th>
                  <th>Email</th>
                  <th>Role</th>
                  <th>Campus</th>
                  <th>Portee</th>
                  <th>Statut</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {users.map((u) => (
                  <tr key={u.id}>
                    <td style={{ fontWeight: 600 }}>{u.firstName} {u.lastName}</td>
                    <td>{u.email}</td>
                    <td><span className="badge badge-purple">{ROLE_LABELS[u.role] || u.role}</span></td>
                    <td>{u.campus?.name || '-'}</td>
                    <td style={{ fontSize: 12 }}>
                      {u.role === 'PROJECT_MANAGER'
                        ? `${u.projectAccesses?.length || 0} projet(s) / ${u.cohortAccesses?.length || 0} cohorte(s)`
                        : '-'}
                    </td>
                    <td>
                      <span className={`badge ${u.isActive ? 'badge-green' : 'badge-red'}`}>
                        {u.isActive ? 'Actif' : 'Inactif'}
                      </span>
                    </td>
                    <td>
                      <div style={{ display: 'flex', gap: 8 }}>
                        <button className="btn btn-ghost btn-icon" onClick={() => openEdit(u)} title="Modifier">Editer</button>
                        <button className="btn btn-ghost btn-icon" style={{ color: 'var(--red-600)' }} onClick={() => handleDelete(u.id)} title="Supprimer">Supprimer</button>
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
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2 className="modal-title">{editingId ? 'Modifier utilisateur' : 'Nouvel utilisateur'}</h2>
              <button className="btn btn-ghost btn-icon" onClick={() => setShowModal(false)}>x</button>
            </div>

            <form onSubmit={handleSubmit}>
              <div className="modal-body">
                <div className="form-row">
                  <div className="form-group">
                    <label className="form-label">Prenom</label>
                    <input className="form-input" required value={form.firstName} onChange={(e) => setForm({ ...form, firstName: e.target.value })} />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Nom</label>
                    <input className="form-input" required value={form.lastName} onChange={(e) => setForm({ ...form, lastName: e.target.value })} />
                  </div>
                </div>

                <div className="form-group">
                  <label className="form-label">Email</label>
                  <input type="email" className="form-input" required value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
                </div>

                <div className="form-group">
                  <label className="form-label">Mot de passe {editingId && '(laisser vide pour ne pas changer)'}</label>
                  <input type="password" minLength={editingId ? 0 : 8} className="form-input" required={!editingId} value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} />
                </div>

                <div className="form-row">
                  <div className="form-group">
                    <label className="form-label">Role</label>
                    <select
                      className="form-select"
                      required
                      value={form.role}
                      onChange={(e) => {
                        const role = e.target.value;
                        setForm({
                          ...form,
                          role,
                          projectAccessIds: role === 'PROJECT_MANAGER' ? form.projectAccessIds : [],
                          cohortAccessIds: role === 'PROJECT_MANAGER' ? form.cohortAccessIds : [],
                        });
                      }}
                    >
                      {Object.entries(ROLE_LABELS).map(([k, v]) => <option key={k} value={k}>{v as string}</option>)}
                    </select>
                  </div>
                  <div className="form-group">
                    <label className="form-label">Campus</label>
                    <select className="form-select" value={form.campusId} onChange={(e) => setForm({ ...form, campusId: e.target.value })}>
                      <option value="">Global / Aucun</option>
                      {campuses.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                    </select>
                  </div>
                </div>

                {form.role === 'PROJECT_MANAGER' && (
                  <div className="form-row">
                    <div className="form-group">
                      <label className="form-label">Projets autorises</label>
                      <select
                        className="form-select"
                        multiple
                        value={form.projectAccessIds}
                        onChange={(e) => setForm({ ...form, projectAccessIds: Array.from(e.target.selectedOptions).map((o) => o.value) })}
                        style={{ minHeight: 120 }}
                      >
                        {projects.map((p) => <option key={p.id} value={p.id}>{p.name} ({p.code})</option>)}
                      </select>
                    </div>
                    <div className="form-group">
                      <label className="form-label">Cohortes autorisees</label>
                      <select
                        className="form-select"
                        multiple
                        value={form.cohortAccessIds}
                        onChange={(e) => setForm({ ...form, cohortAccessIds: Array.from(e.target.selectedOptions).map((o) => o.value) })}
                        style={{ minHeight: 120 }}
                      >
                        {cohorts.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                      </select>
                    </div>
                  </div>
                )}

                {editingId && (
                  <div className="form-group" style={{ marginTop: 12 }}>
                    <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer' }}>
                      <input type="checkbox" checked={form.isActive} onChange={(e) => setForm({ ...form, isActive: e.target.checked })} />
                      Compte actif
                    </label>
                  </div>
                )}
              </div>

              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={() => setShowModal(false)}>Annuler</button>
                <button type="submit" className="btn btn-primary" disabled={saving}>
                  {saving ? 'Enregistrement...' : 'Enregistrer'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
