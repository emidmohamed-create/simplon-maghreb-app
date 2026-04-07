'use client';

import { useEffect, useState, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';

// ─── Status config ─────────────────────────────────────────────────────────
const STATUS_CONFIG: Record<string, { label: string; color: string; bg: string; icon: string }> = {
  PENDING:     { label: 'En attente',   color: '#94a3b8', bg: '#f8fafc',  icon: '⏳' },
  IN_PROGRESS: { label: 'En cours',     color: '#3b82f6', bg: '#eff6ff',  icon: '🔵' },
  SUBMITTED:   { label: 'Soumis',       color: '#f59e0b', bg: '#fffbeb',  icon: '📤' },
  TO_VALIDATE: { label: 'À Valider',    color: '#f97316', bg: '#fff7ed',  icon: '🔍' },
  VALIDATED:   { label: 'Terminé',      color: '#22c55e', bg: '#f0fdf4',  icon: '✅' },
  REJECTED:    { label: 'Rejeté',       color: '#ef4444', bg: '#fef2f2',  icon: '❌' },
};

const STATUS_ORDER = ['PENDING', 'IN_PROGRESS', 'SUBMITTED', 'TO_VALIDATE', 'VALIDATED', 'REJECTED'];

// Default phase templates from the Excel
const PHASE_TEMPLATES = [
  { name: 'Idéation & Choix du Sujet Fil Rouge', isOptional: false },
  { name: 'Validation des Sources & Début Extraction', isOptional: false },
  { name: 'Cadrage Métier & Cahier des Charges', isOptional: false },
  { name: 'Replanification & Début Documentation Projet', isOptional: false },
  { name: 'Extraction + EDA (Projet sans scraping)', isOptional: false },
  { name: 'Pipelines de Collecte Avancée (Optionnel - Scraping)', isOptional: true },
  { name: 'Nettoyage / Préparation (Projet sans scraping)', isOptional: false },
  { name: 'Pipelines de Nettoyage & Préparation (Optionnel)', isOptional: true },
  { name: 'Analyse des Données & KPI / Colonnes calculées', isOptional: false },
  { name: 'Consolidation Base de Données (Optionnel)', isOptional: true },
  { name: 'Pipeline Data Warehousing ETL end-to-end (Optionnel)', isOptional: true },
  { name: 'Analyse Statistique & Validation', isOptional: false },
  { name: 'ML & Prédiction (Optionnel)', isOptional: true },
  { name: 'Visualisation & Dashboards', isOptional: false },
  { name: 'Révision & Stabilisation du Projet', isOptional: false },
  { name: 'Préparation de la Soutenance (Slides & Démo finale)', isOptional: false },
];

export default function FilRougePage() {
  const params = useParams();
  const router = useRouter();
  const [cohort,  setCohort]  = useState<any>(null);
  const [data,    setData]    = useState<{ filRouge: any; learners: any[]; submissions: any[] } | null>(null);
  const [loading, setLoading] = useState(true);
  const [view,    setView]    = useState<'matrix' | 'config'>('matrix');

  // Create project form
  const [showCreate, setShowCreate] = useState(false);
  const [creating,   setCreating]   = useState(false);
  const [createForm, setCreateForm] = useState({
    name: '', description: '', assignedAt: '', defenseDate: '',
    useTemplate: true,
    phases: PHASE_TEMPLATES.map((p, i) => ({ ...p, deadline: '', orderIndex: i })),
  });

  // Phase editing
  const [editPhase, setEditPhase]   = useState<any>(null);
  const [savingPhase, setSavingPhase] = useState(false);
  const [addPhaseForm, setAddPhaseForm] = useState({ name: '', deadline: '', isOptional: false, description: '' });
  const [showAddPhase, setShowAddPhase] = useState(false);

  // Submission quick-update
  const [updatingKey, setUpdatingKey] = useState<string | null>(null);

  const load = useCallback(() => {
    setLoading(true);
    Promise.all([
      fetch(`/api/cohorts/${params.id}`).then(r => r.json()).catch(() => null),
      fetch(`/api/cohorts/${params.id}/fil-rouge`).then(r => r.json()).catch(() => null),
    ]).then(([c, d]) => { setCohort(c); setData(d); }).finally(() => setLoading(false));
  }, [params.id]);

  useEffect(() => { load(); }, [load]);

  // ─── Build submission lookup ───────────────────────────────────────────────
  const getSubmission = (learnerId: string, phaseId: string) => {
    if (!data?.submissions) return null;
    return data.submissions.find(s => s.learnerProfileId === learnerId && s.phaseId === phaseId) || null;
  };

  // ─── Quick update submission status ───────────────────────────────────────
  const handleStatusUpdate = async (learnerId: string, phaseId: string, newStatus: string) => {
    const key = `${learnerId}_${phaseId}`;
    setUpdatingKey(key);
    try {
      await fetch(`/api/cohorts/${params.id}/fil-rouge/submissions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ learnerProfileId: learnerId, phaseId, status: newStatus }),
      });
      load();
    } finally { setUpdatingKey(null); }
  };

  // ─── Trainer validate ──────────────────────────────────────────────────────
  const handleValidate = async (learnerId: string, phaseId: string, validated: boolean) => {
    const key = `${learnerId}_${phaseId}`;
    setUpdatingKey(key);
    try {
      await fetch(`/api/cohorts/${params.id}/fil-rouge/submissions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          learnerProfileId: learnerId, phaseId,
          trainerValidated: validated,
          status: validated ? 'VALIDATED' : 'TO_VALIDATE',
        }),
      });
      load();
    } finally { setUpdatingKey(null); }
  };

  // ─── Create project ────────────────────────────────────────────────────────
  const handleCreateProject = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreating(true);
    try {
      const phases = createForm.useTemplate
        ? createForm.phases.map((p, i) => ({ ...p, orderIndex: i }))
        : [];
      const res = await fetch(`/api/cohorts/${params.id}/fil-rouge`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...createForm, phases }),
      });
      if (res.ok) { setShowCreate(false); load(); }
      else { const err = await res.json(); alert('Erreur: ' + err.error); }
    } finally { setCreating(false); }
  };

  // ─── Update phase ──────────────────────────────────────────────────────────
  const handleSavePhase = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editPhase) return;
    setSavingPhase(true);
    try {
      await fetch(`/api/cohorts/${params.id}/fil-rouge/phases/${editPhase.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(editPhase),
      });
      setEditPhase(null);
      load();
    } finally { setSavingPhase(false); }
  };

  // ─── Add phase ─────────────────────────────────────────────────────────────
  const handleAddPhase = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingPhase(true);
    try {
      await fetch(`/api/cohorts/${params.id}/fil-rouge/phases`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...addPhaseForm, filRougeProjectId: data?.filRouge?.id, orderIndex: (data?.filRouge?.phases?.length || 0) }),
      });
      setShowAddPhase(false);
      setAddPhaseForm({ name: '', deadline: '', isOptional: false, description: '' });
      load();
    } finally { setSavingPhase(false); }
  };

  // ─── Delete phase ──────────────────────────────────────────────────────────
  const handleDeletePhase = async (phaseId: string) => {
    if (!confirm('Supprimer cette phase ? Les soumissions associées seront supprimées.')) return;
    await fetch(`/api/cohorts/${params.id}/fil-rouge/phases/${phaseId}`, { method: 'DELETE' });
    load();
  };

  // ─── Render ────────────────────────────────────────────────────────────────
  if (loading) return <div className="page-body"><div className="loading-overlay"><span className="loading-spinner" /> Chargement...</div></div>;

  const { filRouge, learners = [], submissions = [] } = data || {};
  const phases = filRouge?.phases || [];

  // Compute global stats
  const totalCells   = learners.length * phases.length;
  const validated    = submissions.filter(s => s.status === 'VALIDATED').length;
  const toValidate   = submissions.filter(s => s.status === 'TO_VALIDATE').length;
  const inProgress   = submissions.filter(s => s.status === 'IN_PROGRESS').length;

  return (
    <>
      {/* ═══ HEADER ═══ */}
      <div className="page-header">
        <div>
          <div className="breadcrumbs">
            <Link href="/admin/cohorts">Cohortes</Link> /{' '}
            <Link href={`/admin/cohorts/${params.id}`}>{cohort?.name}</Link> /{' '}
            <span>Suivi Fil Rouge</span>
          </div>
          <h1 className="page-title">🎯 Suivi Fil Rouge</h1>
          <p className="page-subtitle">
            {filRouge?.name || 'Projet non configuré'} — {cohort?.name}
            {filRouge?.defenseDate && ` · Soutenance: ${new Date(filRouge.defenseDate).toLocaleDateString('fr-FR')}`}
          </p>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          {filRouge && (
            <>
              <button className={`btn ${view === 'matrix' ? 'btn-primary' : 'btn-secondary'}`} onClick={() => setView('matrix')}>📊 Matrice</button>
              <button className={`btn ${view === 'config' ? 'btn-primary' : 'btn-secondary'}`} onClick={() => setView('config')}>⚙️ Configurer</button>
            </>
          )}
          {!filRouge && <button className="btn btn-primary" onClick={() => setShowCreate(true)}>+ Créer le Fil Rouge</button>}
        </div>
      </div>

      <div className="page-body">
        {!filRouge ? (
          /* ─── EMPTY STATE ─── */
          <div className="card" style={{ textAlign: 'center', padding: '48px 32px' }}>
            <div style={{ fontSize: 48, marginBottom: 16 }}>🎯</div>
            <h2 style={{ marginBottom: 8 }}>Aucun projet fil rouge pour cette cohorte</h2>
            <p className="text-muted" style={{ maxWidth: 480, margin: '0 auto 24px' }}>
              Créez le projet fil rouge pour commencer à suivre l&apos;avancement de chaque apprenant.
              Vous pourrez paramétrer les phases, les deadlines et les critères selon votre formation.
            </p>
            <button className="btn btn-primary" style={{ fontSize: 15, padding: '10px 24px' }} onClick={() => setShowCreate(true)}>
              + Créer le projet Fil Rouge
            </button>
          </div>
        ) : view === 'matrix' ? (
          /* ─── MATRIX VIEW ─── */
          <>
            {/* KPIs */}
            <div className="kpi-grid" style={{ marginBottom: 20, gridTemplateColumns: 'repeat(4, 1fr)' }}>
              <div className="kpi-card" style={{ borderLeft: '4px solid #22c55e' }}>
                <div className="kpi-label">Terminées</div>
                <div className="kpi-value" style={{ color: '#22c55e' }}>{validated}</div>
                <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>sur {totalCells} cellules</div>
              </div>
              <div className="kpi-card" style={{ borderLeft: '4px solid #f97316' }}>
                <div className="kpi-label">À Valider</div>
                <div className="kpi-value" style={{ color: '#f97316' }}>{toValidate}</div>
                <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>en attente formateur</div>
              </div>
              <div className="kpi-card" style={{ borderLeft: '4px solid #3b82f6' }}>
                <div className="kpi-label">En cours</div>
                <div className="kpi-value" style={{ color: '#3b82f6' }}>{inProgress}</div>
              </div>
              <div className="kpi-card" style={{ borderLeft: '4px solid var(--primary)' }}>
                <div className="kpi-label">Progression globale</div>
                <div className="kpi-value">{totalCells > 0 ? Math.round((validated / totalCells) * 100) : 0}%</div>
              </div>
            </div>

            {/* Matrix table */}
            <div className="card">
              <div className="card-header">
                <h3 className="card-title">Matrice de suivi — {learners.length} apprenants × {phases.length} phases</h3>
                <div style={{ display: 'flex', gap: 12, fontSize: 11, flexWrap: 'wrap' }}>
                  {Object.entries(STATUS_CONFIG).map(([k, v]) => (
                    <span key={k} style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                      <span>{v.icon}</span><span style={{ color: v.color, fontWeight: 600 }}>{v.label}</span>
                    </span>
                  ))}
                </div>
              </div>
              <div style={{ overflowX: 'auto' }}>
                <table className="data-table" style={{ minWidth: 300 + phases.length * 130 }}>
                  <thead>
                    <tr>
                      <th style={{ position: 'sticky', left: 0, background: 'var(--bg-primary)', zIndex: 2, minWidth: 180 }}>Apprenant</th>
                      {phases.map((p: any) => (
                        <th key={p.id} style={{ textAlign: 'center', minWidth: 125, fontSize: 10, maxWidth: 140 }}>
                          <div style={{ fontWeight: 700, marginBottom: 2, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: 130 }} title={p.name}>{p.name}</div>
                          {p.deadline && <div style={{ color: 'var(--text-muted)', fontWeight: 400 }}>{new Date(p.deadline).toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit' })}</div>}
                          {p.isOptional && <div style={{ color: '#3b82f6', fontSize: 9 }}>optionnel</div>}
                        </th>
                      ))}
                      <th style={{ textAlign: 'center', minWidth: 90, fontSize: 11 }}>Avancement</th>
                    </tr>
                  </thead>
                  <tbody>
                    {learners.map((learner: any) => {
                      const learnerSubs = submissions.filter(s => s.learnerProfileId === learner.id);
                      const doneCount  = learnerSubs.filter(s => s.status === 'VALIDATED').length;
                      const pct        = phases.length > 0 ? Math.round((doneCount / phases.length) * 100) : 0;
                      return (
                        <tr key={learner.id}>
                          <td style={{ position: 'sticky', left: 0, background: 'var(--bg-primary)', zIndex: 1 }}>
                            <button
                              className="btn btn-ghost"
                              style={{ fontWeight: 700, fontSize: 13, padding: 0, textAlign: 'left' }}
                              onClick={() => router.push(`/admin/cohorts/${params.id}/fil-rouge/${learner.id}`)}
                            >
                              {learner.lastName} {learner.firstName}
                            </button>
                          </td>
                          {phases.map((phase: any) => {
                            const sub = getSubmission(learner.id, phase.id);
                            const status = sub?.status || 'PENDING';
                            const cfg    = STATUS_CONFIG[status];
                            const key    = `${learner.id}_${phase.id}`;
                            const isSaving = updatingKey === key;
                            return (
                              <td key={phase.id} style={{ textAlign: 'center', padding: '4px 4px', background: cfg.bg }}>
                                <select
                                  className="form-select"
                                  style={{
                                    fontSize: 11, padding: '3px 6px', minWidth: 110,
                                    color: cfg.color, fontWeight: 600, borderColor: cfg.color,
                                    opacity: isSaving ? 0.5 : 1, background: cfg.bg,
                                  }}
                                  value={status}
                                  disabled={isSaving}
                                  onChange={e => handleStatusUpdate(learner.id, phase.id, e.target.value)}
                                >
                                  {STATUS_ORDER.map(s => <option key={s} value={s}>{STATUS_CONFIG[s].icon} {STATUS_CONFIG[s].label}</option>)}
                                </select>
                                {sub?.deliverableUrl && (
                                  <a href={sub.deliverableUrl} target="_blank" rel="noreferrer" style={{ fontSize: 10, display: 'block', color: '#3b82f6', marginTop: 2 }} title={sub.deliverableUrl}>🔗 Livrable</a>
                                )}
                                {(status === 'TO_VALIDATE' || status === 'SUBMITTED') && (
                                  <button
                                    className="btn btn-ghost"
                                    style={{ fontSize: 10, color: '#22c55e', padding: '1px 4px', marginTop: 2 }}
                                    onClick={() => handleValidate(learner.id, phase.id, true)}
                                  >✅ Valider</button>
                                )}
                              </td>
                            );
                          })}
                          <td style={{ textAlign: 'center' }}>
                            <div style={{ fontWeight: 700, fontSize: 14, color: pct === 100 ? '#22c55e' : pct >= 60 ? '#f59e0b' : 'var(--text-primary)' }}>{pct}%</div>
                            <div style={{ height: 4, background: 'var(--border)', borderRadius: 2, marginTop: 3, overflow: 'hidden' }}>
                              <div style={{ height: '100%', width: `${pct}%`, background: pct === 100 ? '#22c55e' : pct >= 60 ? '#f59e0b' : '#3b82f6', borderRadius: 2, transition: 'width 0.3s' }} />
                            </div>
                            <button
                              className="btn btn-ghost"
                              style={{ fontSize: 10, marginTop: 3, color: 'var(--primary)' }}
                              onClick={() => router.push(`/admin/cohorts/${params.id}/fil-rouge/${learner.id}`)}
                            >Détail →</button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          </>
        ) : (
          /* ─── CONFIG VIEW ─── */
          <>
            {/* Project settings */}
            <div className="card" style={{ marginBottom: 20 }}>
              <div className="card-header">
                <h3 className="card-title">⚙️ Paramètres du projet</h3>
              </div>
              <div className="card-body">
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 16 }}>
                  <div className="form-group" style={{ marginBottom: 0 }}><label className="form-label">Nom du projet</label><input className="form-input" defaultValue={filRouge?.name} id="proj-name" /></div>
                  <div className="form-group" style={{ marginBottom: 0 }}><label className="form-label">Date d&apos;assignation</label><input type="date" className="form-input" defaultValue={filRouge?.assignedAt?.split('T')[0] || ''} id="proj-assigned" /></div>
                  <div className="form-group" style={{ marginBottom: 0 }}><label className="form-label">Date de soutenance</label><input type="date" className="form-input" defaultValue={filRouge?.defenseDate?.split('T')[0] || ''} id="proj-defense" /></div>
                </div>
                <div style={{ marginTop: 12, display: 'flex', justifyContent: 'flex-end' }}>
                  <button className="btn btn-primary" onClick={async () => {
                    const name     = (document.getElementById('proj-name') as HTMLInputElement)?.value;
                    const assigned = (document.getElementById('proj-assigned') as HTMLInputElement)?.value;
                    const defense  = (document.getElementById('proj-defense') as HTMLInputElement)?.value;
                    await fetch(`/api/cohorts/${params.id}/fil-rouge`, {
                      method: 'PUT',
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify({ name, assignedAt: assigned || null, defenseDate: defense || null }),
                    });
                    load();
                  }}>💾 Enregistrer</button>
                </div>
              </div>
            </div>

            {/* Phases list */}
            <div className="card">
              <div className="card-header">
                <h3 className="card-title">📋 Phases ({phases.length})</h3>
                <button className="btn btn-primary" onClick={() => setShowAddPhase(true)}>+ Ajouter une phase</button>
              </div>
              <table className="data-table">
                <thead>
                  <tr><th style={{ width: 40 }}>#</th><th>Phase</th><th style={{ width: 140 }}>Deadline</th><th style={{ width: 100 }}>Optionnel</th><th style={{ width: 120 }}>Actions</th></tr>
                </thead>
                <tbody>
                  {phases.map((p: any, i: number) => (
                    <tr key={p.id}>
                      <td style={{ color: 'var(--text-muted)', fontWeight: 600 }}>{i + 1}</td>
                      <td>
                        <div style={{ fontWeight: 600, fontSize: 13 }}>{p.name}</div>
                        {p.description && <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{p.description}</div>}
                      </td>
                      <td>{p.deadline ? new Date(p.deadline).toLocaleDateString('fr-FR') : <span className="text-muted">—</span>}</td>
                      <td>{p.isOptional ? <span className="badge badge-blue" style={{ fontSize: 10 }}>Optionnel</span> : '—'}</td>
                      <td>
                        <div style={{ display: 'flex', gap: 6 }}>
                          <button className="btn btn-sm btn-secondary" onClick={() => setEditPhase({ ...p, deadline: p.deadline ? new Date(p.deadline).toISOString().split('T')[0] : '' })}>✏️</button>
                          <button className="btn btn-sm btn-danger" onClick={() => handleDeletePhase(p.id)}>🗑️</button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}
      </div>

      {/* ═══ CREATE PROJECT MODAL ═══ */}
      {showCreate && (
        <div className="modal-overlay" onClick={() => setShowCreate(false)}>
          <div className="modal" style={{ maxWidth: 720 }} onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h2 className="modal-title">🎯 Créer le projet Fil Rouge</h2>
              <button className="btn btn-ghost btn-icon" onClick={() => setShowCreate(false)}>✕</button>
            </div>
            <form onSubmit={handleCreateProject}>
              <div className="modal-body" style={{ maxHeight: '72vh', overflowY: 'auto' }}>
                <div className="form-row">
                  <div className="form-group">
                    <label className="form-label">Nom du projet *</label>
                    <input className="form-input" placeholder="Ex: Projet Data Analyst" required
                      value={createForm.name} onChange={e => setCreateForm({ ...createForm, name: e.target.value })} />
                  </div>
                </div>
                <div className="form-row">
                  <div className="form-group">
                    <label className="form-label">Date d&apos;assignation (mi-formation)</label>
                    <input type="date" className="form-input" value={createForm.assignedAt} onChange={e => setCreateForm({ ...createForm, assignedAt: e.target.value })} />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Date de soutenance</label>
                    <input type="date" className="form-input" value={createForm.defenseDate} onChange={e => setCreateForm({ ...createForm, defenseDate: e.target.value })} />
                  </div>
                </div>
                <div className="form-group">
                  <label className="form-label">Description</label>
                  <textarea className="form-input" rows={2} value={createForm.description} onChange={e => setCreateForm({ ...createForm, description: e.target.value })} />
                </div>

                <div style={{ height: 1, background: 'var(--border)', margin: '16px 0' }} />

                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                  <p style={{ fontWeight: 600, margin: 0 }}>Phases du projet</p>
                  <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, cursor: 'pointer' }}>
                    <input type="checkbox" checked={createForm.useTemplate}
                      onChange={e => setCreateForm({ ...createForm, useTemplate: e.target.checked })} />
                    Utiliser le modèle Data Analyst
                  </label>
                </div>

                {createForm.useTemplate && (
                  <div style={{ maxHeight: 320, overflowY: 'auto', border: '1px solid var(--border)', borderRadius: 8 }}>
                    <table className="data-table">
                      <thead><tr><th>#</th><th>Phase</th><th style={{ width: 140 }}>Deadline</th><th style={{ width: 90 }}>Optionnel</th></tr></thead>
                      <tbody>
                        {createForm.phases.map((p, i) => (
                          <tr key={i}>
                            <td style={{ color: 'var(--text-muted)', fontSize: 12 }}>{i + 1}</td>
                            <td style={{ fontSize: 12 }}>{p.name}{p.isOptional && <span className="badge badge-blue" style={{ fontSize: 9, marginLeft: 6 }}>opt</span>}</td>
                            <td>
                              <input type="date" className="form-input" style={{ padding: '3px 8px', fontSize: 12 }}
                                value={p.deadline}
                                onChange={e => {
                                  const updated = [...createForm.phases];
                                  updated[i] = { ...updated[i], deadline: e.target.value };
                                  setCreateForm({ ...createForm, phases: updated });
                                }} />
                            </td>
                            <td style={{ textAlign: 'center' }}>{p.isOptional ? '✓' : '—'}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={() => setShowCreate(false)}>Annuler</button>
                <button type="submit" className="btn btn-primary" disabled={creating}>{creating ? '⏳ Création...' : '🎯 Créer le Fil Rouge'}</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ═══ EDIT PHASE MODAL ═══ */}
      {editPhase && (
        <div className="modal-overlay" onClick={() => setEditPhase(null)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <div className="modal-header"><h2 className="modal-title">✏️ Modifier la phase</h2><button className="btn btn-ghost btn-icon" onClick={() => setEditPhase(null)}>✕</button></div>
            <form onSubmit={handleSavePhase}>
              <div className="modal-body">
                <div className="form-group"><label className="form-label">Nom *</label><input className="form-input" value={editPhase.name} onChange={e => setEditPhase({...editPhase, name: e.target.value})} required /></div>
                <div className="form-group"><label className="form-label">Description</label><textarea className="form-input" rows={2} value={editPhase.description || ''} onChange={e => setEditPhase({...editPhase, description: e.target.value})} /></div>
                <div className="form-row">
                  <div className="form-group"><label className="form-label">Deadline</label><input type="date" className="form-input" value={editPhase.deadline || ''} onChange={e => setEditPhase({...editPhase, deadline: e.target.value})} /></div>
                  <div className="form-group" style={{ display: 'flex', alignItems: 'center', gap: 8, paddingTop: 24 }}>
                    <input type="checkbox" id="optional" checked={editPhase.isOptional} onChange={e => setEditPhase({...editPhase, isOptional: e.target.checked})} />
                    <label htmlFor="optional" className="form-label" style={{ margin: 0, cursor: 'pointer' }}>Phase optionnelle</label>
                  </div>
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={() => setEditPhase(null)}>Annuler</button>
                <button type="submit" className="btn btn-primary" disabled={savingPhase}>{savingPhase ? '⏳...' : '💾 Enregistrer'}</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ═══ ADD PHASE MODAL ═══ */}
      {showAddPhase && (
        <div className="modal-overlay" onClick={() => setShowAddPhase(false)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <div className="modal-header"><h2 className="modal-title">+ Ajouter une phase</h2><button className="btn btn-ghost btn-icon" onClick={() => setShowAddPhase(false)}>✕</button></div>
            <form onSubmit={handleAddPhase}>
              <div className="modal-body">
                <div className="form-group"><label className="form-label">Nom *</label><input className="form-input" value={addPhaseForm.name} onChange={e => setAddPhaseForm({...addPhaseForm, name: e.target.value})} required /></div>
                <div className="form-group"><label className="form-label">Description</label><textarea className="form-input" rows={2} value={addPhaseForm.description} onChange={e => setAddPhaseForm({...addPhaseForm, description: e.target.value})} /></div>
                <div className="form-row">
                  <div className="form-group"><label className="form-label">Deadline</label><input type="date" className="form-input" value={addPhaseForm.deadline} onChange={e => setAddPhaseForm({...addPhaseForm, deadline: e.target.value})} /></div>
                  <div className="form-group" style={{ display: 'flex', alignItems: 'center', gap: 8, paddingTop: 24 }}>
                    <input type="checkbox" id="add-optional" checked={addPhaseForm.isOptional} onChange={e => setAddPhaseForm({...addPhaseForm, isOptional: e.target.checked})} />
                    <label htmlFor="add-optional" className="form-label" style={{ margin: 0, cursor: 'pointer' }}>Phase optionnelle</label>
                  </div>
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={() => setShowAddPhase(false)}>Annuler</button>
                <button type="submit" className="btn btn-primary" disabled={savingPhase}>{savingPhase ? '⏳...' : '+ Ajouter'}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
