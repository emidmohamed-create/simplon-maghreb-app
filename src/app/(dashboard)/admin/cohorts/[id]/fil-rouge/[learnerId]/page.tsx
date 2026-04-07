'use client';

import { useEffect, useState, useCallback } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';

const STATUS_CONFIG: Record<string, { label: string; color: string; bg: string; icon: string }> = {
  PENDING:     { label: 'En attente',   color: '#94a3b8', bg: '#f8fafc',  icon: '⏳' },
  IN_PROGRESS: { label: 'En cours',     color: '#3b82f6', bg: '#eff6ff',  icon: '🔵' },
  SUBMITTED:   { label: 'Soumis',       color: '#f59e0b', bg: '#fffbeb',  icon: '📤' },
  TO_VALIDATE: { label: 'À Valider',    color: '#f97316', bg: '#fff7ed',  icon: '🔍' },
  VALIDATED:   { label: 'Terminé',      color: '#22c55e', bg: '#f0fdf4',  icon: '✅' },
  REJECTED:    { label: 'Rejeté',       color: '#ef4444', bg: '#fef2f2',  icon: '❌' },
};
const STATUS_ORDER = ['PENDING', 'IN_PROGRESS', 'SUBMITTED', 'TO_VALIDATE', 'VALIDATED', 'REJECTED'];

export default function FilRougeLearnerPage() {
  const params = useParams();
  // params.id = cohortId, params.learnerId = learnerProfileId
  const [cohort,   setCohort]   = useState<any>(null);
  const [learner,  setLearner]  = useState<any>(null);
  const [filRouge, setFilRouge] = useState<any>(null);
  const [submissions, setSubmissions] = useState<any[]>([]);
  const [loading, setLoading]   = useState(true);

  // Editing a submission
  const [editing,  setEditing]  = useState<{ phaseId: string } | null>(null);
  const [editForm, setEditForm] = useState<any>({});
  const [saving,   setSaving]   = useState(false);

  const load = useCallback(() => {
    setLoading(true);
    Promise.all([
      fetch(`/api/cohorts/${params.id}`).then(r => r.json()).catch(() => null),
      fetch(`/api/cohorts/${params.id}/fil-rouge`).then(r => r.json()).catch(() => null),
    ]).then(([c, d]) => {
      setCohort(c);
      if (d?.filRouge) {
        setFilRouge(d.filRouge);
        const learnerInfo = d.learners?.find((l: any) => l.id === params.learnerId);
        setLearner(learnerInfo || null);
        const mySubs = (d.submissions || []).filter((s: any) => s.learnerProfileId === params.learnerId);
        setSubmissions(mySubs);
      }
    }).finally(() => setLoading(false));
  }, [params.id, params.learnerId]);

  useEffect(() => { load(); }, [load]);

  const getSubmission = (phaseId: string) => submissions.find(s => s.phaseId === phaseId) || null;

  const openEdit = (phase: any) => {
    const sub = getSubmission(phase.id);
    setEditForm({
      phaseId: phase.id,
      status: sub?.status || 'PENDING',
      startDate: sub?.startDate ? new Date(sub.startDate).toISOString().split('T')[0] : '',
      endDate: sub?.endDate ? new Date(sub.endDate).toISOString().split('T')[0] : '',
      deliverableUrl: sub?.deliverableUrl || '',
      learnerNote: sub?.learnerNote || '',
      trainerValidated: sub?.trainerValidated || false,
      trainerComment: sub?.trainerComment || '',
    });
    setEditing({ phaseId: phase.id });
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      await fetch(`/api/cohorts/${params.id}/fil-rouge/submissions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ learnerProfileId: params.learnerId, ...editForm }),
      });
      setEditing(null);
      load();
    } finally { setSaving(false); }
  };

  const handleQuickValidate = async (phaseId: string, validated: boolean) => {
    await fetch(`/api/cohorts/${params.id}/fil-rouge/submissions`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        learnerProfileId: params.learnerId, phaseId,
        trainerValidated: validated, status: validated ? 'VALIDATED' : 'TO_VALIDATE',
      }),
    });
    load();
  };

  if (loading) return <div className="page-body"><div className="loading-overlay"><span className="loading-spinner" /> Chargement...</div></div>;
  if (!filRouge) return <div className="page-body"><div className="empty-state"><p>Fil Rouge non configuré pour cette cohorte.</p></div></div>;

  const phases = filRouge?.phases || [];
  const doneCount = submissions.filter(s => s.status === 'VALIDATED').length;
  const pct = phases.length > 0 ? Math.round((doneCount / phases.length) * 100) : 0;

  return (
    <>
      <div className="page-header">
        <div>
          <div className="breadcrumbs">
            <Link href="/admin/cohorts">Cohortes</Link> /{' '}
            <Link href={`/admin/cohorts/${params.id}`}>{cohort?.name}</Link> /{' '}
            <Link href={`/admin/cohorts/${params.id}/fil-rouge`}>Fil Rouge</Link> /{' '}
            <span>{learner?.lastName} {learner?.firstName}</span>
          </div>
          <h1 className="page-title">🎯 {learner?.lastName} {learner?.firstName}</h1>
          <p className="page-subtitle">Suivi Fil Rouge — {filRouge?.name}</p>
        </div>
        <div style={{ textAlign: 'right' }}>
          <div style={{ fontSize: 28, fontWeight: 700, color: pct === 100 ? '#22c55e' : pct >= 60 ? '#f59e0b' : 'var(--primary)' }}>{pct}%</div>
          <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>{doneCount}/{phases.length} phases terminées</div>
          <div style={{ height: 6, width: 120, background: 'var(--border)', borderRadius: 3, overflow: 'hidden', marginTop: 4 }}>
            <div style={{ height: '100%', width: `${pct}%`, background: pct === 100 ? '#22c55e' : pct >= 60 ? '#f59e0b' : 'var(--primary)', borderRadius: 3, transition: 'width 0.3s' }} />
          </div>
        </div>
      </div>

      <div className="page-body">
        {/* Timeline of phases */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {phases.map((phase: any, i: number) => {
            const sub    = getSubmission(phase.id);
            const status = sub?.status || 'PENDING';
            const cfg    = STATUS_CONFIG[status];
            const isOverdue = phase.deadline && new Date(phase.deadline) < new Date() && status !== 'VALIDATED';

            return (
              <div key={phase.id} className="card" style={{ borderLeft: `4px solid ${cfg.color}`, position: 'relative' }}>
                <div className="card-body" style={{ padding: '14px 18px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 16 }}>
                    {/* Left: phase info */}
                    <div style={{ flex: 1 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 4 }}>
                        <span style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: 28, height: 28, borderRadius: '50%', background: cfg.color, color: '#fff', fontSize: 12, fontWeight: 700, flexShrink: 0 }}>{i + 1}</span>
                        <span style={{ fontWeight: 700, fontSize: 14 }}>{phase.name}</span>
                        {phase.isOptional && <span className="badge badge-blue" style={{ fontSize: 10 }}>Optionnel</span>}
                        {isOverdue && <span className="badge badge-red" style={{ fontSize: 10 }}>⚠️ Dépassé</span>}
                      </div>
                      {phase.deadline && (
                        <div style={{ fontSize: 12, color: isOverdue ? '#ef4444' : 'var(--text-muted)', marginLeft: 38 }}>
                          📅 Deadline : <strong>{new Date(phase.deadline).toLocaleDateString('fr-FR', { weekday: 'long', day: '2-digit', month: 'long', year: 'numeric' })}</strong>
                        </div>
                      )}
                      {sub?.deliverableUrl && (
                        <div style={{ marginLeft: 38, marginTop: 4 }}>
                          <a href={sub.deliverableUrl} target="_blank" rel="noreferrer" style={{ fontSize: 12, color: '#3b82f6', display: 'flex', alignItems: 'center', gap: 4 }}>
                            🔗 <span style={{ textDecoration: 'underline' }}>{sub.deliverableUrl}</span>
                          </a>
                        </div>
                      )}
                      {sub?.learnerNote && (
                        <div style={{ marginLeft: 38, marginTop: 6, padding: '8px 12px', background: 'var(--bg-secondary)', borderRadius: 6, fontSize: 12, color: 'var(--text-secondary)' }}>
                          <strong>Note apprenant :</strong> {sub.learnerNote}
                        </div>
                      )}
                      {sub?.trainerComment && (
                        <div style={{ marginLeft: 38, marginTop: 6, padding: '8px 12px', background: '#f0fdf4', borderRadius: 6, fontSize: 12, color: '#166534', border: '1px solid #bbf7d0' }}>
                          <strong>💬 Formateur :</strong> {sub.trainerComment}
                        </div>
                      )}
                    </div>

                    {/* Right: status + actions */}
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 8, flexShrink: 0 }}>
                      <span style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '5px 12px', borderRadius: 20, background: cfg.bg, color: cfg.color, fontWeight: 700, fontSize: 13, border: `1px solid ${cfg.color}40` }}>
                        {cfg.icon} {cfg.label}
                      </span>
                      {sub?.trainerValidated && (
                        <span style={{ fontSize: 11, color: '#22c55e', display: 'flex', alignItems: 'center', gap: 4 }}>
                          ✅ Validé par le formateur
                          {sub?.validatedAt && <span style={{ color: 'var(--text-muted)' }}>le {new Date(sub.validatedAt).toLocaleDateString('fr-FR')}</span>}
                        </span>
                      )}
                      <div style={{ display: 'flex', gap: 6 }}>
                        {(status === 'TO_VALIDATE' || status === 'SUBMITTED') && !sub?.trainerValidated && (
                          <button className="btn btn-sm" style={{ background: '#22c55e', color: '#fff' }} onClick={() => handleQuickValidate(phase.id, true)}>✅ Valider</button>
                        )}
                        {status === 'VALIDATED' && sub?.trainerValidated && (
                          <button className="btn btn-sm btn-secondary" style={{ fontSize: 11 }} onClick={() => handleQuickValidate(phase.id, false)}>↩ Annuler validation</button>
                        )}
                        <button className="btn btn-sm btn-secondary" onClick={() => openEdit(phase)}>✏️ Modifier</button>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* ═══ EDIT SUBMISSION MODAL ═══ */}
      {editing && (
        <div className="modal-overlay" onClick={() => setEditing(null)}>
          <div className="modal" style={{ maxWidth: 620 }} onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h2 className="modal-title">✏️ Mise à jour de la phase</h2>
              <button className="btn btn-ghost btn-icon" onClick={() => setEditing(null)}>✕</button>
            </div>
            <form onSubmit={handleSave}>
              <div className="modal-body">
                <div className="form-row">
                  <div className="form-group">
                    <label className="form-label">Statut</label>
                    <select className="form-select" value={editForm.status} onChange={e => setEditForm({...editForm, status: e.target.value})}>
                      {STATUS_ORDER.map(s => <option key={s} value={s}>{STATUS_CONFIG[s].icon} {STATUS_CONFIG[s].label}</option>)}
                    </select>
                  </div>
                </div>
                <div className="form-row">
                  <div className="form-group"><label className="form-label">Date de début</label><input type="date" className="form-input" value={editForm.startDate} onChange={e => setEditForm({...editForm, startDate: e.target.value})} /></div>
                  <div className="form-group"><label className="form-label">Date de fin</label><input type="date" className="form-input" value={editForm.endDate} onChange={e => setEditForm({...editForm, endDate: e.target.value})} /></div>
                </div>
                <div className="form-group">
                  <label className="form-label">Lien du livrable (GitHub, Notion, Drive...)</label>
                  <input className="form-input" type="url" placeholder="https://github.com/..." value={editForm.deliverableUrl} onChange={e => setEditForm({...editForm, deliverableUrl: e.target.value})} />
                </div>
                <div className="form-group">
                  <label className="form-label">Remarque apprenant</label>
                  <textarea className="form-input" rows={2} style={{ resize: 'vertical' }} placeholder="Notes, commentaires de l'apprenant..." value={editForm.learnerNote} onChange={e => setEditForm({...editForm, learnerNote: e.target.value})} />
                </div>
                <div style={{ height: 1, background: 'var(--border)', margin: '12px 0' }} />
                <p style={{ fontWeight: 600, fontSize: 13, color: '#22c55e', marginBottom: 8 }}>✅ Validation formateur</p>
                <div className="form-group" style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <input type="checkbox" id="trainer-val" checked={editForm.trainerValidated}
                    onChange={e => setEditForm({...editForm, trainerValidated: e.target.checked, status: e.target.checked ? 'VALIDATED' : editForm.status})} />
                  <label htmlFor="trainer-val" className="form-label" style={{ margin: 0, cursor: 'pointer' }}>Phase validée par le formateur</label>
                </div>
                <div className="form-group">
                  <label className="form-label">Remarque formateur</label>
                  <textarea className="form-input" rows={2} style={{ resize: 'vertical' }} placeholder="Commentaire, feedback..." value={editForm.trainerComment} onChange={e => setEditForm({...editForm, trainerComment: e.target.value})} />
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={() => setEditing(null)}>Annuler</button>
                <button type="submit" className="btn btn-primary" disabled={saving}>{saving ? '⏳...' : '💾 Enregistrer'}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
