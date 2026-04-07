'use client';

import { useEffect, useState, useCallback } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from 'recharts';

// ─── Types ────────────────────────────────────────────────────────────────────
interface CriteriaLevel {
  criteria: string;
  competences: string;
}
interface SprintCriteria {
  objectives: string;
  levels: Record<string, CriteriaLevel>; // key: "1" | "2" | "3" | "4"
}

const MASTERY_LEVELS = [
  { value: 1, label: 'Débutant',     color: '#ef4444', badge: 'badge-red'    },
  { value: 2, label: 'Opérationnel', color: '#f97316', badge: 'badge-orange' },
  { value: 3, label: 'Autonome',     color: '#22c55e', badge: 'badge-green'  },
  { value: 4, label: 'Moteur',       color: '#3b82f6', badge: 'badge-blue'   },
];
const PIE_COLORS: Record<string, string> = {
  'Débutant': '#ef4444', 'Opérationnel': '#f97316', 'Autonome': '#22c55e', 'Moteur': '#3b82f6',
};

const DEFAULT_CRITERIA: SprintCriteria = {
  objectives: '',
  levels: {
    '1': { criteria: '', competences: '' },
    '2': { criteria: '', competences: '' },
    '3': { criteria: '', competences: '' },
    '4': { criteria: '', competences: '' },
  },
};

// ─── Component ────────────────────────────────────────────────────────────────
export default function CohortEvaluationsPage() {
  const params = useParams();
  const [cohort, setCohort] = useState<any>(null);
  const [data, setData]     = useState<any>(null);
  const [loading, setLoading]         = useState(true);
  const [saving, setSaving]           = useState<string | null>(null);
  const [selectedSprint, setSelectedSprint] = useState<string>('all');

  // Criteria editing
  const [editingCriteria, setEditingCriteria] = useState<any>(null); // sprint being edited
  const [criteriaForm, setCriteriaForm]       = useState<SprintCriteria>(DEFAULT_CRITERIA);
  const [savingCriteria, setSavingCriteria]   = useState(false);

  // Detail panel
  const [detailSprint, setDetailSprint] = useState<any>(null);

  const load = useCallback(() => {
    setLoading(true);
    Promise.all([
      fetch(`/api/cohorts/${params.id}`).then(r => r.json()).catch(() => null),
      fetch(`/api/cohorts/${params.id}/evaluations`).then(r => r.json()).catch(() => null),
    ]).then(([c, d]) => { setCohort(c); setData(d); }).finally(() => setLoading(false));
  }, [params.id]);

  useEffect(() => { load(); }, [load]);

  // ─── Evaluate a learner on a sprint ────────────────────────────────────────
  const handleEvaluate = async (learnerProfileId: string, sprintPhaseId: string, masteryLevel: number) => {
    const key = `${learnerProfileId}_${sprintPhaseId}`;
    setSaving(key);
    try {
      await fetch(`/api/cohorts/${params.id}/evaluations`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ learnerProfileId, sprintPhaseId, masteryLevel }),
      });
      load();
    } finally { setSaving(null); }
  };

  // ─── Open criteria modal ───────────────────────────────────────────────────
  const openCriteriaModal = (sprint: any) => {
    setEditingCriteria(sprint);
    let parsed: SprintCriteria = { ...DEFAULT_CRITERIA, levels: { ...DEFAULT_CRITERIA.levels } };
    if (sprint.criteriaJson) {
      try { parsed = JSON.parse(sprint.criteriaJson); } catch {}
    }
    setCriteriaForm(parsed);
  };

  // ─── Save criteria ─────────────────────────────────────────────────────────
  const handleSaveCriteria = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingCriteria) return;
    setSavingCriteria(true);
    try {
      // We need projectId — fetch from cohort's project
      const res = await fetch(`/api/projects/${cohort?.project?.id}/phases/${editingCriteria.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ criteriaJson: criteriaForm }),
      });
      if (res.ok) { setEditingCriteria(null); load(); }
      else { const err = await res.json(); alert('Erreur: ' + (err.error || 'Inconnue')); }
    } finally { setSavingCriteria(false); }
  };

  // ─── Compute pie data ──────────────────────────────────────────────────────
  const computeStats = (sprintFilter: string, evalMap: Record<string, any>, learners: any[], sprints: any[]) => {
    const counts: Record<string, number> = { 'Débutant': 0, 'Opérationnel': 0, 'Autonome': 0, 'Moteur': 0 };
    for (const learner of learners) {
      let level = 0;
      if (sprintFilter === 'all') {
        for (let i = sprints.length - 1; i >= 0; i--) {
          const ev = evalMap[`${learner.id}_${sprints[i].id}`];
          if (ev) { level = ev.masteryLevel; break; }
        }
      } else {
        level = evalMap[`${learner.id}_${sprintFilter}`]?.masteryLevel || 0;
      }
      if (level > 0) counts[MASTERY_LEVELS[level - 1].label]++;
    }
    return Object.entries(counts).map(([name, value]) => ({ name, value })).filter(d => d.value > 0);
  };

  // ─── Render ────────────────────────────────────────────────────────────────
  if (loading) return <div className="page-body"><div className="loading-overlay"><span className="loading-spinner" /> Chargement...</div></div>;
  if (!data || !cohort) return <div className="page-body"><div className="empty-state"><p>Données introuvables</p></div></div>;

  const { learners, sprints, evaluations } = data;

  const evalMap: Record<string, any> = {};
  for (const e of evaluations) evalMap[`${e.learnerProfileId}_${e.sprintPhaseId}`] = e;

  const pieData = computeStats(selectedSprint, evalMap, learners, sprints);
  const totalEvaluated = pieData.reduce((s, d) => s + d.value, 0);

  // Compute completion % per sprint
  const getSprintCompletion = (sprintId: string) => {
    if (!learners.length) return 0;
    const count = learners.filter((l: any) => evalMap[`${l.id}_${sprintId}`]).length;
    return Math.round((count / learners.length) * 100);
  };

  return (
    <>
      {/* ═══════════════ PAGE HEADER ═══════════════ */}
      <div className="page-header">
        <div>
          <div className="breadcrumbs">
            <Link href="/admin/cohorts">Cohortes</Link> /{' '}
            <Link href={`/admin/cohorts/${params.id}`}>{cohort.name}</Link> /{' '}
            <span>Évaluations Sprints</span>
          </div>
          <h1 className="page-title">📝 Évaluations par Sprint</h1>
          <p className="page-subtitle">
            {cohort.name} — {cohort.program?.campus?.name} — {sprints.length} sprints · {learners.length} apprenants
          </p>
        </div>
      </div>

      <div className="page-body">
        {sprints.length === 0 ? (
          <div className="empty-state">
            <p style={{ fontSize: 18, marginBottom: 8 }}>Aucun sprint disponible</p>
            <p className="text-muted text-sm">Générez d&apos;abord le planning depuis la fiche cohorte.</p>
            <Link href={`/admin/cohorts/${params.id}`} className="btn btn-primary" style={{ marginTop: 16 }}>
              ← Retour à la cohorte
            </Link>
          </div>
        ) : (
          <>
            {/* ═══ SPRINT CARDS ═══ */}
            <div style={{ overflowX: 'auto', paddingBottom: 4 }}>
              <div style={{ display: 'flex', gap: 12, minWidth: 'max-content', marginBottom: 20 }}>
                {sprints.map((sprint: any) => {
                  const completion = getSprintCompletion(sprint.id);
                  let criteria: SprintCriteria | null = null;
                  try { if (sprint.criteriaJson) criteria = JSON.parse(sprint.criteriaJson); } catch {}
                  const isSelected = detailSprint?.id === sprint.id;
                  return (
                    <div
                      key={sprint.id}
                      className="card"
                      style={{
                        minWidth: 200, cursor: 'pointer',
                        borderColor: isSelected ? 'var(--primary)' : 'var(--border)',
                        borderWidth: isSelected ? 2 : 1,
                        background: isSelected ? 'var(--primary-light, #eff6ff)' : undefined,
                      }}
                      onClick={() => setDetailSprint(isSelected ? null : sprint)}
                    >
                      <div className="card-body" style={{ padding: '12px 14px' }}>
                        <div style={{ fontWeight: 700, fontSize: 13, marginBottom: 4 }}>{sprint.title}</div>
                        <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 8 }}>
                          {criteria ? '✅ Critères définis' : '⚠️ Critères manquants'}
                        </div>
                        {/* Completion bar */}
                        <div style={{ height: 4, background: 'var(--border)', borderRadius: 2, overflow: 'hidden', marginBottom: 6 }}>
                          <div style={{ height: '100%', width: `${completion}%`, background: completion === 100 ? '#22c55e' : '#3b82f6', borderRadius: 2, transition: 'width 0.3s' }} />
                        </div>
                        <div style={{ fontSize: 11, color: 'var(--text-muted)', display: 'flex', justifyContent: 'space-between' }}>
                          <span>{completion}% évalués</span>
                          <button
                            className="btn btn-ghost"
                            style={{ fontSize: 11, padding: '1px 6px', marginTop: -2 }}
                            onClick={e => { e.stopPropagation(); openCriteriaModal(sprint); }}
                          >
                            ✏️ Critères
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* ═══ SPRINT DETAIL PANEL (criteria) ═══ */}
            {detailSprint && (() => {
              let criteria: SprintCriteria | null = null;
              try { if (detailSprint.criteriaJson) criteria = JSON.parse(detailSprint.criteriaJson); } catch {}
              return (
                <div className="card" style={{ marginBottom: 20, borderLeft: '4px solid var(--primary)' }}>
                  <div className="card-header">
                    <h3 className="card-title">📋 {detailSprint.title} — Grille d&apos;évaluation</h3>
                    <button className="btn btn-secondary" style={{ fontSize: 12 }} onClick={() => openCriteriaModal(detailSprint)}>
                      ✏️ Modifier les critères
                    </button>
                  </div>
                  {criteria ? (
                    <div className="card-body">
                      {criteria.objectives && (
                        <div style={{ marginBottom: 12, padding: '10px 14px', background: 'var(--bg-secondary)', borderRadius: 8, fontSize: 13 }}>
                          <strong>🎯 Objectifs du sprint :</strong> {criteria.objectives}
                        </div>
                      )}
                      <table className="data-table">
                        <thead>
                          <tr>
                            <th style={{ width: 120 }}>Niveau</th>
                            <th>Critères observables</th>
                            <th>Compétences techniques</th>
                          </tr>
                        </thead>
                        <tbody>
                          {MASTERY_LEVELS.map(lvl => {
                            const lvlData = criteria?.levels?.[String(lvl.value)];
                            return (
                              <tr key={lvl.value}>
                                <td>
                                  <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                    <span style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: 24, height: 24, borderRadius: '50%', background: lvl.color, color: '#fff', fontWeight: 700, fontSize: 12 }}>{lvl.value}</span>
                                    <span style={{ fontWeight: 700, color: lvl.color }}>{lvl.label}</span>
                                  </span>
                                </td>
                                <td style={{ fontSize: 12 }}>{lvlData?.criteria || <span className="text-muted">—</span>}</td>
                                <td style={{ fontSize: 12 }}>{lvlData?.competences || <span className="text-muted">—</span>}</td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  ) : (
                    <div className="card-body">
                      <p className="text-muted text-sm">Aucun critère défini pour ce sprint.</p>
                      <button className="btn btn-primary" style={{ marginTop: 8 }} onClick={() => openCriteriaModal(detailSprint)}>
                        + Définir les critères
                      </button>
                    </div>
                  )}
                </div>
              );
            })()}

            {/* ═══ STATS ROW ═══ */}
            <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 20, marginBottom: 20 }}>
              <div className="kpi-grid" style={{ gridTemplateColumns: 'repeat(4, 1fr)' }}>
                {MASTERY_LEVELS.map(lvl => {
                  const count = pieData.find(d => d.name === lvl.label)?.value || 0;
                  const pct = totalEvaluated > 0 ? ((count / totalEvaluated) * 100).toFixed(0) : '0';
                  return (
                    <div key={lvl.value} className="kpi-card" style={{ borderLeft: `4px solid ${lvl.color}` }}>
                      <div className="kpi-label" style={{ color: lvl.color, fontWeight: 600, fontSize: 11 }}>{lvl.label}</div>
                      <div className="kpi-value" style={{ color: lvl.color, fontSize: 28 }}>{count}</div>
                      <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{pct}%</div>
                    </div>
                  );
                })}
              </div>
              <div className="card">
                <div className="card-header" style={{ padding: '8px 16px', alignItems: 'center' }}>
                  <h3 className="card-title" style={{ fontSize: 13, margin: 0 }}>Répartition niveaux</h3>
                  <select className="form-select" style={{ maxWidth: 170, fontSize: 12 }} value={selectedSprint} onChange={e => setSelectedSprint(e.target.value)}>
                    <option value="all">Dernier sprint évalué</option>
                    {sprints.map((s: any) => <option key={s.id} value={s.id}>{s.title}</option>)}
                  </select>
                </div>
                <div style={{ height: 170 }}>
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie data={pieData} cx="50%" cy="50%" innerRadius={38} outerRadius={65} dataKey="value"
                        label={({ name, percent }) => percent > 0.06 ? `${(percent * 100).toFixed(0)}%` : ''}>
                        {pieData.map((d, i) => <Cell key={i} fill={PIE_COLORS[d.name] || '#94a3b8'} />)}
                      </Pie>
                      <Tooltip formatter={(v, name) => [`${v} apprenants`, name]} />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </div>

            {/* ═══ EVALUATION GRID ═══ */}
            <div className="card">
              <div className="card-header">
                <h3 className="card-title">Grille d&apos;évaluation — {learners.length} apprenants × {sprints.length} sprints</h3>
              </div>
              <div style={{ overflowX: 'auto' }}>
                <table className="data-table" style={{ minWidth: 300 + sprints.length * 150 }}>
                  <thead>
                    <tr>
                      <th style={{ position: 'sticky', left: 0, background: 'var(--bg-primary)', zIndex: 2, minWidth: 190 }}>Apprenant</th>
                      <th style={{ position: 'sticky', left: 190, background: 'var(--bg-primary)', zIndex: 2, minWidth: 80 }}>Statut</th>
                      {sprints.map((s: any) => (
                        <th key={s.id} style={{ textAlign: 'center', minWidth: 150, fontSize: 11, cursor: 'pointer' }}
                          onClick={() => setDetailSprint(detailSprint?.id === s.id ? null : s)}>
                          {s.title}
                          <span style={{ display: 'block', fontSize: 10, color: 'var(--text-muted)', fontWeight: 400 }}>
                            {getSprintCompletion(s.id)}% évalués
                          </span>
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {learners.map((learner: any) => (
                      <tr key={learner.id}>
                        <td style={{ position: 'sticky', left: 0, background: 'var(--bg-primary)', zIndex: 1, fontWeight: 600, fontSize: 13 }}>
                          {learner.lastName} {learner.firstName}
                        </td>
                        <td style={{ position: 'sticky', left: 190, background: 'var(--bg-primary)', zIndex: 1 }}>
                          <span className={`badge ${learner.statusCurrent === 'IN_TRAINING' ? 'badge-blue' : learner.statusCurrent === 'DROPPED' ? 'badge-red' : learner.statusCurrent === 'INSERTED' ? 'badge-green' : 'badge-gray'}`} style={{ fontSize: 10 }}>
                            {learner.statusCurrent === 'IN_TRAINING' ? 'Actif' : learner.statusCurrent === 'DROPPED' ? 'Abandon' : learner.statusCurrent === 'INSERTED' ? 'Inséré' : 'Exclu'}
                          </span>
                        </td>
                        {sprints.map((sprint: any) => {
                          const key = `${learner.id}_${sprint.id}`;
                          const ev = evalMap[key];
                          const currentLevel = ev?.masteryLevel || 0;
                          const lvlInfo = currentLevel > 0 ? MASTERY_LEVELS[currentLevel - 1] : null;
                          const isSaving = saving === key;
                          return (
                            <td key={sprint.id} style={{ textAlign: 'center', padding: '4px 6px',
                              background: lvlInfo ? `${lvlInfo.color}18` : 'transparent' }}>
                              <select
                                className="form-select"
                                style={{
                                  fontSize: 12, padding: '4px 8px', minWidth: 130,
                                  fontWeight: currentLevel > 0 ? 700 : 400,
                                  color: lvlInfo ? lvlInfo.color : 'var(--text-muted)',
                                  borderColor: lvlInfo ? lvlInfo.color : 'var(--border)',
                                  opacity: isSaving ? 0.5 : 1,
                                }}
                                value={currentLevel}
                                onChange={e => { const v = parseInt(e.target.value); if (v > 0) handleEvaluate(learner.id, sprint.id, v); }}
                                disabled={isSaving}
                              >
                                <option value={0}>— Évaluer —</option>
                                {MASTERY_LEVELS.map(lvl => <option key={lvl.value} value={lvl.value}>{lvl.value}. {lvl.label}</option>)}
                              </select>
                            </td>
                          );
                        })}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Legend */}
            <div style={{ marginTop: 12, display: 'flex', gap: 20, fontSize: 12, flexWrap: 'wrap' }}>
              {MASTERY_LEVELS.map(lvl => (
                <span key={lvl.value} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <span style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: 18, height: 18, borderRadius: '50%', background: lvl.color, color: '#fff', fontSize: 10, fontWeight: 700 }}>{lvl.value}</span>
                  <span style={{ fontWeight: 600, color: lvl.color }}>{lvl.label}</span>
                </span>
              ))}
            </div>
          </>
        )}
      </div>

      {/* ═══ CRITERIA MODAL ═══ */}
      {editingCriteria && (
        <div className="modal-overlay" onClick={() => setEditingCriteria(null)}>
          <div className="modal" style={{ maxWidth: 760 }} onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h2 className="modal-title">📋 Critères — {editingCriteria.title}</h2>
              <button className="btn btn-ghost btn-icon" onClick={() => setEditingCriteria(null)}>✕</button>
            </div>
            <form onSubmit={handleSaveCriteria}>
              <div className="modal-body" style={{ maxHeight: '70vh', overflowY: 'auto' }}>
                <div className="form-group">
                  <label className="form-label">🎯 Objectifs du sprint</label>
                  <textarea className="form-input" rows={2} style={{ resize: 'vertical' }}
                    placeholder="Ex: Maîtriser les fondamentaux Python, pandas, visualisation de données..."
                    value={criteriaForm.objectives}
                    onChange={e => setCriteriaForm({ ...criteriaForm, objectives: e.target.value })} />
                </div>
                <div style={{ height: 1, background: 'var(--border)', margin: '16px 0' }} />
                <p style={{ fontSize: 13, fontWeight: 600, marginBottom: 12 }}>Critères par niveau de maîtrise :</p>
                {MASTERY_LEVELS.map(lvl => (
                  <div key={lvl.value} style={{ marginBottom: 20, padding: '14px 16px', borderRadius: 10, border: `2px solid ${lvl.color}20`, background: `${lvl.color}08` }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
                      <span style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: 28, height: 28, borderRadius: '50%', background: lvl.color, color: '#fff', fontWeight: 700, fontSize: 14 }}>{lvl.value}</span>
                      <span style={{ fontWeight: 700, color: lvl.color, fontSize: 15 }}>{lvl.label}</span>
                    </div>
                    <div className="form-group" style={{ marginBottom: 10 }}>
                      <label className="form-label" style={{ fontSize: 12 }}>Critères observables</label>
                      <textarea className="form-input" rows={2} style={{ resize: 'vertical', fontSize: 12 }}
                        placeholder="Ex: L'apprenant peut importer un fichier CSV et réaliser des statistiques descriptives de base..."
                        value={criteriaForm.levels?.[String(lvl.value)]?.criteria || ''}
                        onChange={e => setCriteriaForm({
                          ...criteriaForm,
                          levels: { ...criteriaForm.levels, [String(lvl.value)]: { ...criteriaForm.levels?.[String(lvl.value)], criteria: e.target.value } }
                        })} />
                    </div>
                    <div className="form-group" style={{ marginBottom: 0 }}>
                      <label className="form-label" style={{ fontSize: 12 }}>Compétences techniques associées</label>
                      <textarea className="form-input" rows={2} style={{ resize: 'vertical', fontSize: 12 }}
                        placeholder="Ex: pandas read_csv(), df.describe(), matplotlib de base..."
                        value={criteriaForm.levels?.[String(lvl.value)]?.competences || ''}
                        onChange={e => setCriteriaForm({
                          ...criteriaForm,
                          levels: { ...criteriaForm.levels, [String(lvl.value)]: { ...criteriaForm.levels?.[String(lvl.value)], competences: e.target.value } }
                        })} />
                    </div>
                  </div>
                ))}
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={() => setEditingCriteria(null)}>Annuler</button>
                <button type="submit" className="btn btn-primary" disabled={savingCriteria}>
                  {savingCriteria ? '⏳ Enregistrement...' : '💾 Enregistrer les critères'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
