'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { STATUS_LABELS, INSERTION_LABELS } from '@/lib/utils';
import { ACADEMIC_FIELD_OPTIONS, ACADEMIC_LEVEL_OPTIONS } from '@/lib/academic-options';

const STATUS_COLORS: Record<string, string> = {
  IN_TRAINING: 'badge-blue',
  DROPPED: 'badge-red',
  INSERTED: 'badge-green',
  EXCLUDED: 'badge-gray',
};

const EMPTY_ASSIGN_FORM = {
  userId: '',
  cohortId: '',
  firstName: '',
  lastName: '',
  email: '',
  phone: '',
  cin: '',
  birthdate: '',
  gender: '',
  emergencyContact: '',
  academicLevel: '',
  academicField: '',
};

export default function LearnersPage() {
  const router = useRouter();
  const [learners, setLearners] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');

  const [showAssign, setShowAssign] = useState(false);
  const [showEdit, setShowEdit] = useState(false);
  const [editingId, setEditingId] = useState<string>('');
  const [users, setUsers] = useState<any[]>([]);
  const [cohorts, setCohorts] = useState<any[]>([]);
  const [form, setForm] = useState(EMPTY_ASSIGN_FORM);
  const [editForm, setEditForm] = useState<any>(null);
  const [saving, setSaving] = useState(false);

  // Bulk actions
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [showBulkAssign, setShowBulkAssign] = useState(false);
  const [bulkCohortId, setBulkCohortId] = useState('');
  const [isBulkSaving, setIsBulkSaving] = useState(false);

  const loadOptions = () => {
    fetch('/api/users').then((r) => r.json()).then(setUsers).catch(() => setUsers([]));
    fetch('/api/cohorts').then((r) => r.json()).then(setCohorts).catch(() => setCohorts([]));
  };

  useEffect(() => {
    loadOptions();
  }, []);

  const loadLearners = () => {
    setLoading(true);
    const params = new URLSearchParams();
    if (search) params.set('search', search);
    if (statusFilter) params.set('status', statusFilter);
    fetch(`/api/learners?${params}`)
      .then((r) => r.json())
      .then(setLearners)
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    loadLearners();
  }, [search, statusFilter]);

  const handleUserChange = (userId: string) => {
    const selected = users.find((u) => u.id === userId);
    setForm((prev) => ({
      ...prev,
      userId,
      firstName: selected?.firstName || prev.firstName,
      lastName: selected?.lastName || prev.lastName,
      email: selected?.email || prev.email,
    }));
  };

  const handleAssign = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.userId || !form.cohortId) return;

    setSaving(true);
    try {
      const res = await fetch('/api/learners', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });
      const data = await res.json();

      if (!res.ok) {
        alert(data.error || "Error while assigning learner");
      } else {
        setShowAssign(false);
        setForm(EMPTY_ASSIGN_FORM);
        loadLearners();
      }
    } catch {
      alert('Network error');
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteLearner = async (learnerId: string, learnerName: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!confirm(`Supprimer le profil apprenant de ${learnerName} ?`)) return;
    const res = await fetch(`/api/learners/${learnerId}`, { method: 'DELETE' });
    const data = await res.json();
    if (!res.ok) {
      alert(data.error || 'Erreur lors de la suppression');
      return;
    }
    loadLearners();
  };

  const openEditLearner = (learner: any, e: React.MouseEvent) => {
    e.stopPropagation();
    setEditingId(learner.id);
    setEditForm({
      firstName: learner.firstName || '',
      lastName: learner.lastName || '',
      email: learner.email || '',
      phone: learner.phone || '',
      cin: learner.cin || '',
      birthdate: learner.birthdate ? new Date(learner.birthdate).toISOString().split('T')[0] : '',
      gender: learner.gender || '',
      emergencyContact: learner.emergencyContact || '',
      academicLevel: learner.academicLevel || '',
      academicField: learner.academicField || '',
      cohortId: learner.cohortId || '',
    });
    setShowEdit(true);
  };

  const handleUpdateLearner = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingId || !editForm) return;
    setSaving(true);
    try {
      const res = await fetch(`/api/learners/${editingId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(editForm),
      });
      const data = await res.json();
      if (!res.ok) {
        alert(data.error || 'Erreur lors de la modification');
        return;
      }
      setShowEdit(false);
      setEditingId('');
      setEditForm(null);
      loadLearners();
    } finally {
      setSaving(false);
    }
  };

  const handleBulkAssign = async () => {
    if (!bulkCohortId || selectedIds.length === 0) return;
    setIsBulkSaving(true);
    try {
      const res = await fetch('/api/learners/bulk-assign', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ learnerIds: selectedIds, cohortId: bulkCohortId }),
      });
      if (res.ok) {
        setShowBulkAssign(false);
        setSelectedIds([]);
        setBulkCohortId('');
        loadLearners();
      } else {
        const d = await res.json();
        alert(d.error || 'Erreur lors de l’assignation groupée');
      }
    } finally {
      setIsBulkSaving(false);
    }
  };

  const toggleSelect = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setSelectedIds(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
  };

  const toggleSelectAll = () => {
    if (selectedIds.length === learners.length) {
      setSelectedIds([]);
    } else {
      setSelectedIds(learners.map(l => l.id));
    }
  };

  return (
    <>
      <div className="page-header">
        <div>
          <h1 className="page-title">Apprenants</h1>
          <p className="page-subtitle">Suivi de tous les apprenants</p>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          {selectedIds.length > 0 && (
            <button className="btn btn-secondary" onClick={() => setShowBulkAssign(true)}>
              ⚙️ Actions groupées ({selectedIds.length})
            </button>
          )}
          <button className="btn btn-primary" onClick={() => setShowAssign(true)}>
            + Assigner a une formation
          </button>
        </div>
      </div>

      <div className="page-body">
        <div style={{ display: 'flex', gap: 12, marginBottom: 16 }}>
          <input
            type="text"
            className="form-input"
            placeholder="Rechercher..."
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setLoading(true);
            }}
            style={{ maxWidth: 300 }}
          />
          <select
            className="form-select"
            value={statusFilter}
            onChange={(e) => {
              setStatusFilter(e.target.value);
              setLoading(true);
            }}
            style={{ maxWidth: 220 }}
          >
            <option value="">Tous les statuts</option>
            <option value="IN_TRAINING">En formation</option>
            <option value="DROPPED">Abandonne</option>
            <option value="INSERTED">Insere</option>
            <option value="EXCLUDED">Exclu</option>
          </select>
        </div>

        {loading ? (
          <div className="loading-overlay">
            <span className="loading-spinner" /> Chargement...
          </div>
        ) : (
          <div className="card">
            <table className="data-table">
              <thead>
                <tr>
                  <th style={{ width: 40 }}>
                    <input type="checkbox" checked={selectedIds.length > 0 && selectedIds.length === learners.length} onChange={toggleSelectAll} />
                  </th>
                  <th>Nom</th>
                  <th>Email</th>
                  <th>Cohorte</th>
                  <th>Programme</th>
                  <th>Campus</th>
                  <th>Statut</th>
                  <th>Insertion</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {learners.map((l: any) => (
                  <tr key={l.id} className="clickable" onClick={() => router.push(`/admin/learners/${l.id}`)}>
                    <td onClick={(e) => toggleSelect(l.id, e)}>
                      <input type="checkbox" checked={selectedIds.includes(l.id)} readOnly />
                    </td>
                    <td style={{ fontWeight: 600 }}>{l.firstName} {l.lastName}</td>
                    <td>{l.email}</td>
                    <td>{l.cohort?.name}</td>
                    <td>{l.cohort?.program?.name}</td>
                    <td>{l.cohort?.campus?.name || '-'}</td>
                    <td>
                      <span className={`badge ${STATUS_COLORS[l.statusCurrent] || 'badge-gray'}`}>
                        {STATUS_LABELS[l.statusCurrent]}
                      </span>
                    </td>
                    <td>{l.insertionType ? INSERTION_LABELS[l.insertionType] || l.insertionType : '-'}</td>
                    <td>
                      <div style={{ display: 'flex', gap: 8 }}>
                        <button className="btn btn-ghost btn-sm" onClick={(e) => { e.stopPropagation(); router.push(`/admin/learners/${l.id}`); }}>
                          Voir
                        </button>
                        <button className="btn btn-ghost btn-sm" onClick={(e) => openEditLearner(l, e)}>
                          Modifier
                        </button>
                        <button className="btn btn-ghost btn-sm" style={{ color: 'var(--red-600)' }} onClick={(e) => handleDeleteLearner(l.id, `${l.firstName} ${l.lastName}`, e)}>
                          Supprimer
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {showAssign && (
        <div className="modal-overlay" onClick={() => setShowAssign(false)}>
          <div className="modal" style={{ maxWidth: 760 }} onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2 className="modal-title">Assigner un apprenant a une formation</h2>
              <button className="btn btn-ghost btn-icon" onClick={() => setShowAssign(false)}>x</button>
            </div>
            <form onSubmit={handleAssign}>
              <div className="modal-body">
                <div className="form-group">
                  <label className="form-label">Utilisateur existant</label>
                  <select className="form-select" required value={form.userId} onChange={(e) => handleUserChange(e.target.value)}>
                    <option value="">Selectionner un utilisateur...</option>
                    {users.map((u) => (
                      <option key={u.id} value={u.id}>
                        {u.firstName} {u.lastName} ({u.email}) - {u.role}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="form-group">
                  <label className="form-label">Cohorte</label>
                  <select className="form-select" required value={form.cohortId} onChange={(e) => setForm({ ...form, cohortId: e.target.value })}>
                    <option value="">Selectionner...</option>
                    {cohorts.map((c) => (
                      <option key={c.id} value={c.id}>{c.name}</option>
                    ))}
                  </select>
                </div>

                <div className="form-row">
                  <div className="form-group">
                    <label className="form-label">Prenom</label>
                    <input className="form-input" value={form.firstName} onChange={(e) => setForm({ ...form, firstName: e.target.value })} />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Nom</label>
                    <input className="form-input" value={form.lastName} onChange={(e) => setForm({ ...form, lastName: e.target.value })} />
                  </div>
                </div>

                <div className="form-row">
                  <div className="form-group">
                    <label className="form-label">Email</label>
                    <input type="email" className="form-input" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Telephone</label>
                    <input className="form-input" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
                  </div>
                </div>

                <div className="form-row">
                  <div className="form-group">
                    <label className="form-label">CIN</label>
                    <input className="form-input" value={form.cin} onChange={(e) => setForm({ ...form, cin: e.target.value })} />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Date de naissance</label>
                    <input type="date" className="form-input" value={form.birthdate} onChange={(e) => setForm({ ...form, birthdate: e.target.value })} />
                  </div>
                </div>

                <div className="form-row">
                  <div className="form-group">
                    <label className="form-label">Genre</label>
                    <select className="form-select" value={form.gender} onChange={(e) => setForm({ ...form, gender: e.target.value })}>
                      <option value="">Non precise</option>
                      <option value="MALE">Homme</option>
                      <option value="FEMALE">Femme</option>
                    </select>
                  </div>
                  <div className="form-group">
                    <label className="form-label">Contact urgence</label>
                    <input className="form-input" value={form.emergencyContact} onChange={(e) => setForm({ ...form, emergencyContact: e.target.value })} />
                  </div>
                </div>

                <div className="form-row">
                  <div className="form-group">
                    <label className="form-label">Niveau academique</label>
                    <select className="form-select" value={form.academicLevel} onChange={(e) => setForm({ ...form, academicLevel: e.target.value })}>
                      <option value="">Selectionner...</option>
                      {ACADEMIC_LEVEL_OPTIONS.map((option) => (
                        <option key={option} value={option}>{option}</option>
                      ))}
                    </select>
                  </div>
                  <div className="form-group">
                    <label className="form-label">Filiere</label>
                    <select className="form-select" value={form.academicField} onChange={(e) => setForm({ ...form, academicField: e.target.value })}>
                      <option value="">Selectionner...</option>
                      {ACADEMIC_FIELD_OPTIONS.map((option) => (
                        <option key={option} value={option}>{option}</option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>

              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={() => setShowAssign(false)}>
                  Annuler
                </button>
                <button type="submit" className="btn btn-primary" disabled={saving}>
                  {saving ? 'Creation...' : 'Inscrire apprenant'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {showEdit && editForm && (
        <div className="modal-overlay" onClick={() => setShowEdit(false)}>
          <div className="modal" style={{ maxWidth: 760 }} onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2 className="modal-title">Modifier l'apprenant</h2>
              <button className="btn btn-ghost btn-icon" onClick={() => setShowEdit(false)}>x</button>
            </div>
            <form onSubmit={handleUpdateLearner}>
              <div className="modal-body">
                <div className="form-row">
                  <div className="form-group">
                    <label className="form-label">Prenom</label>
                    <input className="form-input" value={editForm.firstName} onChange={(e) => setEditForm({ ...editForm, firstName: e.target.value })} />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Nom</label>
                    <input className="form-input" value={editForm.lastName} onChange={(e) => setEditForm({ ...editForm, lastName: e.target.value })} />
                  </div>
                </div>
                <div className="form-row">
                  <div className="form-group">
                    <label className="form-label">Email</label>
                    <input type="email" className="form-input" value={editForm.email} onChange={(e) => setEditForm({ ...editForm, email: e.target.value })} />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Telephone</label>
                    <input className="form-input" value={editForm.phone} onChange={(e) => setEditForm({ ...editForm, phone: e.target.value })} />
                  </div>
                </div>
                <div className="form-row">
                  <div className="form-group">
                    <label className="form-label">CIN</label>
                    <input className="form-input" value={editForm.cin} onChange={(e) => setEditForm({ ...editForm, cin: e.target.value })} />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Date de naissance</label>
                    <input type="date" className="form-input" value={editForm.birthdate} onChange={(e) => setEditForm({ ...editForm, birthdate: e.target.value })} />
                  </div>
                </div>
                <div className="form-row">
                  <div className="form-group">
                    <label className="form-label">Genre</label>
                    <select className="form-select" value={editForm.gender} onChange={(e) => setEditForm({ ...editForm, gender: e.target.value })}>
                      <option value="">Non precise</option>
                      <option value="MALE">Homme</option>
                      <option value="FEMALE">Femme</option>
                    </select>
                  </div>
                  <div className="form-group">
                    <label className="form-label">Contact urgence</label>
                    <input className="form-input" value={editForm.emergencyContact} onChange={(e) => setEditForm({ ...editForm, emergencyContact: e.target.value })} />
                  </div>
                </div>
                <div className="form-row">
                  <div className="form-group">
                    <label className="form-label">Niveau academique</label>
                    <select className="form-select" value={editForm.academicLevel} onChange={(e) => setEditForm({ ...editForm, academicLevel: e.target.value })}>
                      <option value="">Selectionner...</option>
                      {ACADEMIC_LEVEL_OPTIONS.map((option) => (
                        <option key={option} value={option}>{option}</option>
                      ))}
                    </select>
                  </div>
                  <div className="form-group">
                    <label className="form-label">Filiere</label>
                    <select className="form-select" value={editForm.academicField} onChange={(e) => setEditForm({ ...editForm, academicField: e.target.value })}>
                      <option value="">Selectionner...</option>
                      {ACADEMIC_FIELD_OPTIONS.map((option) => (
                        <option key={option} value={option}>{option}</option>
                      ))}
                    </select>
                  </div>
                </div>
                <div className="form-group">
                  <label className="form-label">Cohorte</label>
                  <select className="form-select" value={editForm.cohortId} onChange={(e) => setEditForm({ ...editForm, cohortId: e.target.value })}>
                    <option value="">Selectionner...</option>
                    {cohorts.map((c) => (
                      <option key={c.id} value={c.id}>{c.name}</option>
                    ))}
                  </select>
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={() => setShowEdit(false)}>Annuler</button>
                <button type="submit" className="btn btn-primary" disabled={saving}>
                  {saving ? 'Enregistrement...' : 'Enregistrer'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
      {showBulkAssign && (
        <div className="modal-overlay" onClick={() => setShowBulkAssign(false)}>
          <div className="modal" style={{ maxWidth: 460 }} onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h2 className="modal-title">Assigner les apprenants sélectionnés</h2>
              <button className="btn btn-ghost btn-icon" onClick={() => setShowBulkAssign(false)}>✕</button>
            </div>
            <div className="modal-body">
              <p style={{ marginBottom: 16, fontSize: 13, color: 'var(--text-secondary)' }}>
                Vous allez assigner <strong>{selectedIds.length} apprenants</strong> à une nouvelle cohorte.
              </p>
              <div className="form-group">
                <label className="form-label">Choisir la cohorte de destination</label>
                <select className="form-select" value={bulkCohortId} onChange={e => setBulkCohortId(e.target.value)}>
                   <option value="">Sélectionner...</option>
                   {cohorts.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn btn-secondary" onClick={() => setShowBulkAssign(false)}>Annuler</button>
              <button className="btn btn-primary" disabled={isBulkSaving || !bulkCohortId} onClick={handleBulkAssign}>
                {isBulkSaving ? 'Assignation...' : `Confirmer l'assignation (${selectedIds.length})`}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
