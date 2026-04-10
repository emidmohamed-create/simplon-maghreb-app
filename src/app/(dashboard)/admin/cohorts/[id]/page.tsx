'use client';

import { useEffect, useState, useCallback } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { formatDate, STATUS_LABELS } from '@/lib/utils';
import {
  PieChart, Pie, Cell, Tooltip, ResponsiveContainer,
} from 'recharts';

const STATUS_COLORS: Record<string, string> = {
  IN_TRAINING: '#3b82f6', DROPPED: '#ef4444', INSERTED: '#22c55e', EXCLUDED: '#6b7280',
};

const PHASE_COLORS: Record<string, string> = {
  SOURCING: '#8b5cf6', SELECTION: '#f59e0b', WARMUP: '#06b6d4',
  TRAINING: '#22c55e', WORKSHOP: '#ec4899', FIL_ROUGE: '#f97316',
  EVALUATION: '#eab308', CERTIFICATION: '#14b8a6', INSERTION: '#6366f1',
  OTHER: '#94a3b8',
};

const PHASE_TYPE_LABELS: Record<string, string> = {
  SOURCING: 'Sourcing', SELECTION: 'Selection', WARMUP: 'Warmup',
  TRAINING: 'Formation', WORKSHOP: 'Atelier', FIL_ROUGE: 'Fil Rouge',
  EVALUATION: 'Evaluation', CERTIFICATION: 'Certification',
  INSERTION: 'Insertion', OTHER: 'Autre',
};

export default function CohortDetailPage() {
  const params = useParams();
  const [cohort, setCohort] = useState<any>(null);
  const [projects, setProjects] = useState<any[]>([]);
  const [learners, setLearners] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('overview');
  const [editingPhase, setEditingPhase] = useState<any>(null);
  const [editCohort, setEditCohort] = useState<any>(null);
  const [generating, setGenerating] = useState(false);

  const handleSaveCohort = async (e: React.FormEvent) => {
    e.preventDefault();
    await fetch(`/api/cohorts/${params.id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(editCohort),
    });
    setEditCohort(null);
    load();
  };

  const handleUpdatePhase = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingPhase || !cohort.project?.id) return;
    await fetch(`/api/projects/${cohort.project.id}/phases/${editingPhase.id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(editingPhase),
    });
    setEditingPhase(null);
    load();
  };

  const handleGeneratePlanning = async () => {
    if (!cohort.startDate || !cohort.endDate) {
      alert('La cohorte doit avoir des dates de debut et de fin pour generer le planning.');
      return;
    }
    setGenerating(true);
    try {
      const res = await fetch(`/api/cohorts/${params.id}/generate-planning`, { method: 'POST' });
      if (res.ok) { load(); setActiveTab('planning'); }
      else { const err = await res.json(); alert('Erreur: ' + (err.error || 'Inconnue')); }
    } finally { setGenerating(false); }
  };

  const handleUnassignLearner = async (learnerId: string, learnerName: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!confirm(`Desassigner ${learnerName} de cette cohorte ?`)) return;
    const res = await fetch(`/api/learners/${learnerId}`, { method: 'DELETE' });
    const data = await res.json();
    if (!res.ok) {
      alert(data.error || 'Erreur lors de la desassignation');
      return;
    }
    load();
  };

  const load = useCallback(() => {
    setLoading(true);
    Promise.all([
      fetch(`/api/cohorts/${params.id}`).then(r => r.json()).catch(() => null),
      fetch(`/api/learners?cohortId=${params.id}`).then(r => r.json()).catch(() => []),
      fetch('/api/projects').then(r => r.json()).catch(() => []),
    ]).then(([c, l, p]) => {
      setCohort(c);
      setLearners(Array.isArray(l) ? l : []);
      setProjects(Array.isArray(p) ? p : []);
    }).finally(() => setLoading(false));
  }, [params.id]);

  useEffect(() => { load(); }, [load]);

  if (loading) return <div className="page-body"><div className="loading-overlay"><span className="loading-spinner" /> Chargement...</div></div>;
  if (!cohort) return <div className="page-body"><div className="empty-state"><p>Cohorte non trouvee</p></div></div>;

  const phases = cohort.phases || [];

  const active = learners.filter(l => l.statusCurrent === 'IN_TRAINING').length;
  const dropped = learners.filter(l => l.statusCurrent === 'DROPPED').length;
  const inserted = learners.filter(l => l.statusCurrent === 'INSERTED').length;
  const excluded = learners.filter(l => l.statusCurrent === 'EXCLUDED').length;

  const statusData = [
    { name: 'En formation', value: active, color: STATUS_COLORS.IN_TRAINING },
    { name: 'Abandonnes', value: dropped, color: STATUS_COLORS.DROPPED },
    { name: 'Inseres', value: inserted, color: STATUS_COLORS.INSERTED },
    { name: 'Exclus', value: excluded, color: STATUS_COLORS.EXCLUDED },
  ].filter(d => d.value > 0);

  const now = new Date();
  const cohortStatus = cohort.startDate && now >= new Date(cohort.startDate)
    ? (cohort.endDate && now > new Date(cohort.endDate) ? 'Terminee' : 'En cours')
    : 'A venir';

  // Timeline helpers
  const renderTimeline = () => {
    if (phases.length === 0) {
      return (
        <div className="empty-state">
          <p className="empty-state-text mb-4">Aucune phase dans le planning de cette formation.</p>
          <p className="text-sm text-muted">Creez une nouvelle cohorte avec des dates de debut et de fin pour generer automatiquement un planning.</p>
        </div>
      );
    }

    const planStart = cohort.startDate ? new Date(cohort.startDate) : new Date(phases[0].startDate);
    const planEnd = cohort.endDate ? new Date(cohort.endDate) : new Date(phases[phases.length - 1].endDate);
    planStart.setHours(0, 0, 0, 0);
    planEnd.setHours(23, 59, 59, 999);
    const span = planEnd.getTime() - planStart.getTime();
    if (span <= 0) return <p className="text-muted">Dates invalides</p>;

    const pct = (d: Date) => Math.min(100, Math.max(0, ((d.getTime() - planStart.getTime()) / span) * 100));

    // Month headers
    const months: { label: string; left: number; width: number }[] = [];
    const mCur = new Date(planStart.getFullYear(), planStart.getMonth(), 1);
    while (mCur <= planEnd) {
      const mStart = new Date(Math.max(mCur.getTime(), planStart.getTime()));
      const mEnd = new Date(mCur.getFullYear(), mCur.getMonth() + 1, 0, 23, 59, 59);
      const mEndC = new Date(Math.min(mEnd.getTime(), planEnd.getTime()));
      const left = pct(mStart);
      const width = pct(mEndC) - left;
      months.push({ label: mStart.toLocaleDateString('fr-FR', { month: 'short', year: '2-digit' }), left, width });
      mCur.setMonth(mCur.getMonth() + 1);
    }

    // Week ticks
    const weeks: { label: string; left: number }[] = [];
    const wCur = new Date(planStart);
    while (wCur <= planEnd) {
      weeks.push({ label: wCur.toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit' }), left: pct(wCur) });
      wCur.setDate(wCur.getDate() + 7);
    }

    const todayPct = pct(new Date());
    const showToday = todayPct >= 0 && todayPct <= 100;

    const barStyle = (s: string | null, e: string | null) => {
      if (!s) return null;
      const start = new Date(s); start.setHours(0, 0, 0, 0);
      const end = e ? new Date(e) : new Date(start.getTime() + 86400000); end.setHours(23, 59, 59, 999);
      const l = pct(start);
      const r = pct(end);
      return { left: `${l}%`, width: `${Math.max(0.5, r - l)}%` };
    };

    const LABEL_W = 200;
    const ROW_H = 32;

    return (
      <div style={{ minWidth: LABEL_W + 800, position: 'relative', fontSize: 12 }}>
        {/* Month header */}
        <div style={{ display: 'flex', marginLeft: LABEL_W, borderBottom: '1px solid var(--border)', background: 'var(--surface-2, #f8fafc)' }}>
          {months.map((m, i) => (
            <div key={i} style={{ width: `${m.width}%`, padding: '4px 6px', fontWeight: 600, color: 'var(--text-secondary)', borderRight: '1px solid var(--border)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', fontSize: 11, boxSizing: 'border-box' }}>{m.label}</div>
          ))}
        </div>
        {/* Week header */}
        <div style={{ marginLeft: LABEL_W, borderBottom: '2px solid var(--border)', background: 'var(--surface-2, #f8fafc)', position: 'relative', height: 20 }}>
          {weeks.map((w, i) => (
            <div key={i} style={{ position: 'absolute', left: `${w.left}%`, height: '100%', borderLeft: '1px solid var(--border)', paddingLeft: 3, fontSize: 10, color: 'var(--text-muted)', whiteSpace: 'nowrap', top: 2 }}>{w.label}</div>
          ))}
        </div>
        {/* Rows */}
        <div style={{ position: 'relative' }}>
          {showToday && <div style={{ position: 'absolute', left: `calc(${LABEL_W}px + ${todayPct}%)`, top: 0, bottom: 0, width: 2, background: '#ef4444', zIndex: 10, pointerEvents: 'none' }} />}

          {phases.map((phase: any, idx: number) => {
            const color = phase.color || PHASE_COLORS[phase.phaseType] || '#94a3b8';
            const bs = barStyle(phase.startDate, phase.endDate);
            return (
              <div key={phase.id} style={{ display: 'flex', alignItems: 'center', borderBottom: '1px solid var(--border)', minHeight: ROW_H, background: idx % 2 === 0 ? 'var(--surface, white)' : 'var(--surface-hover, #fafafa)' }}>
                {/* Label */}
                <div style={{ width: LABEL_W, flexShrink: 0, padding: '0 10px', display: 'flex', alignItems: 'center', gap: 8, overflow: 'hidden' }}>
                  <div style={{ width: 4, height: 18, borderRadius: 2, background: color, flexShrink: 0 }} />
                  <span style={{ fontWeight: 600, fontSize: 12, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flex: 1 }} title={phase.title}>{phase.title}</span>
                </div>
                {/* Bar */}
                <div style={{ flex: 1, position: 'relative', height: ROW_H }}>
                  {bs && (
                    <div
                      style={{ position: 'absolute', top: 5, height: ROW_H - 10, left: bs.left, width: bs.width, background: color, borderRadius: 4, display: 'flex', alignItems: 'center', overflow: 'hidden', cursor: 'default' }}
                      title={`${phase.title}\n${phase.startDate ? formatDate(phase.startDate) : '?'} -> ${phase.endDate ? formatDate(phase.endDate) : '?'}`}
                    >
                      <span style={{ fontSize: 9, color: 'white', padding: '0 6px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{phase.title}</span>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {/* Legend */}
        <div style={{ marginTop: 12, display: 'flex', alignItems: 'center', gap: 16, fontSize: 11, color: 'var(--text-muted)', flexWrap: 'wrap' }}>
          {showToday && <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}><span style={{ display: 'inline-block', width: 2, height: 12, background: '#ef4444' }} /> Aujourd&apos;hui</span>}
          {Object.entries(PHASE_COLORS).slice(0, 8).map(([key, col]) => (
            <span key={key} style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
              <span style={{ display: 'inline-block', width: 12, height: 8, background: col, borderRadius: 2 }} />
              {PHASE_TYPE_LABELS[key] || key}
            </span>
          ))}
        </div>
      </div>
    );
  };

  return (
    <>
      <div className="page-header">
        <div>
          <div className="breadcrumbs"><Link href="/admin/cohorts">Cohortes</Link> / <span>{cohort.name}</span></div>
          <h1 className="page-title">{cohort.name}</h1>
          <p className="page-subtitle">{cohort.program?.name} - {cohort.campus?.name || '-'}</p>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          {phases.length === 0 && cohort.startDate && cohort.endDate && (
            <button className="btn btn-warning" onClick={handleGeneratePlanning} disabled={generating}>
              {generating ? 'Generation...' : 'Generer le planning'}
            </button>
          )}
          <button className="btn btn-secondary" onClick={() => setEditCohort({
            name: cohort.name,
            startDate: cohort.startDate ? new Date(cohort.startDate).toISOString().split('T')[0] : '',
            endDate: cohort.endDate ? new Date(cohort.endDate).toISOString().split('T')[0] : '',
            capacity: cohort.capacity || '',
            trainerId: cohort.trainer?.id || '',
            projectId: cohort.project?.id || '',
          })}>Modifier la cohorte</button>
          <Link href={`/admin/cohorts/${params.id}/evaluations`} className="btn btn-primary">Evaluations Sprints</Link>
          <Link href={`/admin/cohorts/${params.id}/fil-rouge`} className="btn btn-primary">Fil Rouge</Link>
          <Link href={`/admin/cohorts/${params.id}/jury-blanc`} className="btn btn-primary">Jury Blanc</Link>
          <Link href={`/admin/cohorts/${params.id}/insertion`} className="btn btn-primary">Rapport Insertion</Link>
          <Link href={`/trainer/cohorts/${params.id}/attendance`} className="btn btn-secondary">Saisir presence</Link>
        </div>
      </div>

      <div className="page-body">
        <div className="tabs">
          <button className={`tab ${activeTab === 'overview' ? 'active' : ''}`} onClick={() => setActiveTab('overview')}>Vue d&apos;ensemble</button>
          <button className={`tab ${activeTab === 'planning' ? 'active' : ''}`} onClick={() => setActiveTab('planning')}>
            Planning Formation
            {phases.length > 0 && <span className="badge badge-blue" style={{ marginLeft: 6, fontSize: 10 }}>{phases.length} phases</span>}
          </button>
          <button className={`tab ${activeTab === 'phases' ? 'active' : ''}`} onClick={() => setActiveTab('phases')}>Detail Phases</button>
        </div>

        {/* OVERVIEW TAB */}
        {activeTab === 'overview' && (
          <>
            <div className="kpi-grid">
              <div className="kpi-card"><div className="kpi-label">Statut</div><span className={`badge ${cohortStatus === 'En cours' ? 'badge-blue' : cohortStatus === 'Terminee' ? 'badge-green' : 'badge-gray'}`} style={{ fontSize: 14, padding: '6px 14px' }}>{cohortStatus}</span></div>
              <div className="kpi-card"><div className="kpi-label">Effectif total</div><div className="kpi-value">{learners.length}</div></div>
              <div className="kpi-card"><div className="kpi-label">En formation</div><div className="kpi-value" style={{ color: '#3b82f6' }}>{active}</div></div>
              <div className="kpi-card"><div className="kpi-label">Abandonnes</div><div className="kpi-value" style={{ color: '#ef4444' }}>{dropped}</div></div>
              <div className="kpi-card"><div className="kpi-label">Inseres</div><div className="kpi-value" style={{ color: '#22c55e' }}>{inserted}</div></div>
              <div className="kpi-card"><div className="kpi-label">Phases planning</div><div className="kpi-value">{phases.length}</div></div>
            </div>

            <div className="charts-grid">
              <div className="card">
                <div className="card-header"><h3 className="card-title">Repartition des statuts</h3></div>
                <div className="chart-container">
                  {statusData.length > 0 ? (
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie data={statusData} cx="50%" cy="50%" innerRadius={50} outerRadius={80} dataKey="value" label={({ name, value }) => `${name}: ${value}`}>
                          {statusData.map((d, i) => <Cell key={i} fill={d.color} />)}
                        </Pie>
                        <Tooltip />
                      </PieChart>
                    </ResponsiveContainer>
                  ) : <p className="text-muted text-sm" style={{ padding: 20 }}>Aucun apprenant</p>}
                </div>
              </div>

              <div className="card">
                <div className="card-header"><h3 className="card-title">Informations</h3></div>
                <div className="card-body" style={{ display: 'grid', gridTemplateColumns: '130px 1fr', gap: '8px 16px', fontSize: 13 }}>
                  <span className="text-muted">Programme</span><span>{cohort.program?.name}</span>
                  <span className="text-muted">Campus</span><span>{cohort.campus?.name || '-'}</span>
                  <span className="text-muted">Projet</span><span>{cohort.project?.name || '-'}</span>
                  <span className="text-muted">Formateur</span><span>{cohort.trainer ? `${cohort.trainer.firstName} ${cohort.trainer.lastName}` : '-'}</span>
                  <span className="text-muted">Capacite</span><span>{cohort.capacity || '-'}</span>
                  <span className="text-muted">Debut</span><span>{cohort.startDate ? formatDate(cohort.startDate) : '-'}</span>
                  <span className="text-muted">Fin</span><span>{cohort.endDate ? formatDate(cohort.endDate) : '-'}</span>
                  <span className="text-muted">Duree estimee</span>
                  <span>{cohort.startDate && cohort.endDate
                    ? `${Math.round((new Date(cohort.endDate).getTime() - new Date(cohort.startDate).getTime()) / (1000*60*60*24))} jours (~${Math.round((new Date(cohort.endDate).getTime() - new Date(cohort.startDate).getTime()) / (1000*60*60*24*30))} mois)`
                    : '-'}</span>
                </div>
              </div>
            </div>

            <div className="card">
              <div className="card-header"><h3 className="card-title">Apprenants ({learners.length})</h3></div>
              {learners.length > 0 ? (
                <table className="data-table">
                  <thead><tr><th>Nom</th><th>Email</th><th>Statut</th><th>Insertion</th><th>Actions</th></tr></thead>
                  <tbody>
                    {learners.map(l => (
                      <tr key={l.id} className="clickable" onClick={() => window.location.href = `/admin/learners/${l.id}`}>
                        <td style={{ fontWeight: 600 }}>{l.firstName} {l.lastName}</td>
                        <td>{l.email}</td>
                        <td><span className={`badge ${l.statusCurrent === 'IN_TRAINING' ? 'badge-blue' : l.statusCurrent === 'DROPPED' ? 'badge-red' : l.statusCurrent === 'INSERTED' ? 'badge-green' : 'badge-gray'}`}>{STATUS_LABELS[l.statusCurrent] || l.statusCurrent}</span></td>
                        <td>{l.insertionType || '-'}</td>
                        <td>
                          <div style={{ display: 'flex', gap: 8 }}>
                            <button className="btn btn-ghost btn-sm" onClick={(e) => { e.stopPropagation(); window.location.href = `/admin/learners/${l.id}`; }}>
                              Voir
                            </button>
                            <button className="btn btn-ghost btn-sm" onClick={(e) => { e.stopPropagation(); window.location.href = `/admin/learners/${l.id}`; }}>
                              Modifier
                            </button>
                            <button className="btn btn-ghost btn-sm" style={{ color: 'var(--red-600)' }} onClick={(e) => handleUnassignLearner(l.id, `${l.firstName} ${l.lastName}`, e)}>
                              Desassigner
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              ) : <div className="card-body"><p className="text-muted">Aucun apprenant inscrit</p></div>}
            </div>
          </>
        )}

        {/* PLANNING TAB */}
        {activeTab === 'planning' && (
          <div className="card">
            <div className="card-header">
              <h3 className="card-title">Planning de la Formation</h3>
              {cohort.startDate && cohort.endDate && (
                <span className="text-xs text-muted">{formatDate(cohort.startDate)} {'->'} {formatDate(cohort.endDate)}</span>
              )}
            </div>
            <div className="card-body" style={{ overflowX: 'auto' }}>
              {renderTimeline()}
            </div>
          </div>
        )}

        {/* PHASES DETAIL TAB */}
        {activeTab === 'phases' && (
          <div className="card">
            <div className="card-header">
              <h3 className="card-title">Detail des phases ({phases.length})</h3>
            </div>
            <div className="card-body">
              {phases.length === 0 ? (
                <div className="empty-state">
                  <p className="empty-state-text">Aucune phase dans le planning.</p>
                  <p className="text-sm text-muted mt-2">Le planning est automatiquement genere lors de la creation d&apos;une cohorte avec des dates.</p>
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                  {phases.map((phase: any, idx: number) => {
                    const color = phase.color || PHASE_COLORS[phase.phaseType] || '#94a3b8';
                    return (
                      <div key={phase.id} style={{ border: '1px solid var(--border)', borderRadius: 8, overflow: 'hidden' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 16px', background: idx % 2 === 0 ? 'var(--surface, white)' : 'var(--surface-hover, #fafafa)' }}>
                          <div style={{ width: 5, height: 32, borderRadius: 3, background: color, flexShrink: 0 }} />
                          <div style={{ flex: 1 }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 2 }}>
                              <span style={{ fontWeight: 700, fontSize: 14 }}>{idx + 1}. {phase.title}</span>
                              <span className="badge badge-purple" style={{ fontSize: 10 }}>{PHASE_TYPE_LABELS[phase.phaseType] || phase.phaseType}</span>
                            </div>
                            <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                              {phase.startDate ? formatDate(phase.startDate) : '?'} {'->'} {phase.endDate ? formatDate(phase.endDate) : '?'}
                              {phase.startDate && phase.endDate && (
                                <span style={{ marginLeft: 8, fontWeight: 500 }}>
                                  ({Math.round((new Date(phase.endDate).getTime() - new Date(phase.startDate).getTime()) / (1000*60*60*24))} jours)
                                </span>
                              )}
                            </div>
                          </div>
                          
                          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                            <span className={`badge ${phase.status === 'IN_PROGRESS' ? 'badge-blue' : phase.status === 'DONE' ? 'badge-green' : 'badge-gray'}`} style={{ fontSize: 10 }}>{STATUS_LABELS[phase.status] || phase.status}</span>
                            <button
                              className="btn btn-ghost btn-sm"
                              onClick={() => setEditingPhase({
                                id: phase.id, title: phase.title, phaseType: phase.phaseType,
                                startDate: phase.startDate ? new Date(phase.startDate).toISOString().split('T')[0] : '',
                                endDate: phase.endDate ? new Date(phase.endDate).toISOString().split('T')[0] : '',
                                status: phase.status,
                              })}
                            >
                              Editer
                            </button>
                          </div>
                        </div>
                        {phase.items?.length > 0 && (
                          <table className="data-table" style={{ margin: '0 16px 12px 32px' }}>
                            <thead><tr><th>Element</th><th>Type</th><th>Debut</th><th>Fin</th><th>Statut</th></tr></thead>
                            <tbody>
                              {phase.items.map((item: any) => (
                                <tr key={item.id}>
                                  <td style={{ fontWeight: 500 }}>{item.title}</td>
                                  <td><span className="badge badge-teal" style={{ fontSize: 10 }}>{item.itemType}</span></td>
                                  <td>{formatDate(item.startDatetime)}</td>
                                  <td>{item.endDatetime ? formatDate(item.endDatetime) : '-'}</td>
                                  <td><span className={`badge ${item.status === 'DONE' ? 'badge-green' : 'badge-gray'}`} style={{ fontSize: 10 }}>{STATUS_LABELS[item.status] || item.status}</span></td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {editingPhase && (
        <div className="modal-overlay" onClick={() => setEditingPhase(null)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h2 className="modal-title">Editer la phase</h2>
              <button className="btn btn-ghost btn-icon" onClick={() => setEditingPhase(null)}>x</button>
            </div>
            <form onSubmit={handleUpdatePhase}>
              <div className="modal-body">
                <div className="form-group">
                  <label className="form-label">Titre de la phase</label>
                  <input className="form-input" value={editingPhase.title} onChange={e => setEditingPhase({...editingPhase, title: e.target.value})} required />
                </div>
                <div className="form-group">
                  <label className="form-label">Type de phase</label>
                  <select className="form-select" value={editingPhase.phaseType} onChange={e => setEditingPhase({...editingPhase, phaseType: e.target.value})} required>
                    {Object.entries(PHASE_TYPE_LABELS).map(([key, label]) => (
                      <option key={key} value={key}>{label}</option>
                    ))}
                  </select>
                </div>
                <div className="form-row">
                  <div className="form-group"><label className="form-label">Debut</label><input type="date" className="form-input" value={editingPhase.startDate} onChange={e => setEditingPhase({...editingPhase, startDate: e.target.value})} required /></div>
                  <div className="form-group"><label className="form-label">Fin</label><input type="date" className="form-input" value={editingPhase.endDate} onChange={e => setEditingPhase({...editingPhase, endDate: e.target.value})} required /></div>
                </div>
                <div className="form-group">
                  <label className="form-label">Statut</label>
                  <select className="form-select" value={editingPhase.status} onChange={e => setEditingPhase({...editingPhase, status: e.target.value})}>
                    <option value="PLANNED">Planifie</option>
                    <option value="IN_PROGRESS">En cours</option>
                    <option value="DONE">Termine</option>
                    <option value="CANCELLED">Annule</option>
                  </select>
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={() => setEditingPhase(null)}>Annuler</button>
                <button type="submit" className="btn btn-primary">Enregistrer</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* EDIT COHORT MODAL */}
      {editCohort && (
        <div className="modal-overlay" onClick={() => setEditCohort(null)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h2 className="modal-title">Modifier la cohorte</h2>
              <button className="btn btn-ghost btn-icon" onClick={() => setEditCohort(null)}>x</button>
            </div>
            <form onSubmit={handleSaveCohort}>
              <div className="modal-body">
                <div className="form-group">
                  <label className="form-label">Nom de la cohorte</label>
                  <input className="form-input" value={editCohort.name} onChange={e => setEditCohort({...editCohort, name: e.target.value})} required />
                </div>
                <div className="form-row">
                  <div className="form-group"><label className="form-label">Date de debut</label><input type="date" className="form-input" value={editCohort.startDate} onChange={e => setEditCohort({...editCohort, startDate: e.target.value})} /></div>
                  <div className="form-group"><label className="form-label">Date de fin</label><input type="date" className="form-input" value={editCohort.endDate} onChange={e => setEditCohort({...editCohort, endDate: e.target.value})} /></div>
                </div>
                <div className="form-group">
                  <label className="form-label">Projet assigne</label>
                  <select className="form-select" value={editCohort.projectId || ''} onChange={e => setEditCohort({ ...editCohort, projectId: e.target.value })}>
                    <option value="">Aucun projet</option>
                    {projects.map((p: any) => (
                      <option key={p.id} value={p.id}>{p.name} ({p.code})</option>
                    ))}
                  </select>
                </div>
                <div className="form-group">
                  <label className="form-label">Capacite</label>
                  <input type="number" className="form-input" value={editCohort.capacity} onChange={e => setEditCohort({...editCohort, capacity: e.target.value})} min={0} />
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={() => setEditCohort(null)}>Annuler</button>
                <button type="submit" className="btn btn-primary">Enregistrer</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}


