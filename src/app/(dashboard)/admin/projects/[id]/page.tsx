'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { formatDate, PHASE_TYPE_LABELS, ITEM_TYPE_LABELS, STATUS_LABELS, PROJECT_TYPE_LABELS } from '@/lib/utils';

const PHASE_COLORS: Record<string, string> = {
  COMMUNICATION: '#3b82f6', SOURCING: '#8b5cf6', SELECTION: '#f59e0b', WARMUP: '#06b6d4',
  TRAINING: '#22c55e', WORKSHOP: '#ec4899', FIL_ROUGE: '#f97316', EVALUATION: '#eab308',
  CERTIFICATION: '#14b8a6', RATTRAPAGE: '#ef4444', INSERTION: '#6366f1', OTHER: '#94a3b8',
};

const STATUS_BADGE: Record<string, string> = {
  PLANNED: 'badge-gray', IN_PROGRESS: 'badge-blue', DONE: 'badge-green', CANCELLED: 'badge-red', POSTPONED: 'badge-orange',
};

export default function ProjectDetailPage() {
  const params = useParams();
  const [project, setProject] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('overview');

  // Modal states
  const [showPhaseModal, setShowPhaseModal] = useState(false);
  const [showItemModal, setShowItemModal] = useState<string | null>(null); // holds phaseId
  const [editProject, setEditProject] = useState<any>(null);
  
  const [phaseForm, setPhaseForm] = useState({ title: '', phaseType: 'TRAINING', startDate: '', endDate: '', color: '' });
  const [itemForm, setItemForm] = useState({ title: '', itemType: 'COURSE', startDatetime: '', endDatetime: '', priority: 'NORMAL', description: '' });

  const handleSaveProject = async (e: React.FormEvent) => {
    e.preventDefault();
    await fetch(`/api/projects/${params.id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(editProject),
    });
    setEditProject(null);
    load();
  };

  const load = () => {
    fetch(`/api/projects/${params.id}`).then(r => r.json()).then(setProject).finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, [params.id]);

  const handleCreatePlan = async () => {
    if (confirm("Créer un planning pour ce projet ?")) {
      await fetch(`/api/projects/${params.id}/plan`, { method: 'POST' });
      load();
    }
  };

  const handleCreatePhase = async (e: React.FormEvent) => {
    e.preventDefault();
    await fetch(`/api/projects/${params.id}/phases`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ planId: project.projectPlans[0].id, ...phaseForm }),
    });
    setShowPhaseModal(false);
    setPhaseForm({ title: '', phaseType: 'TRAINING', startDate: '', endDate: '', color: '' });
    load();
  };

  const handleCreateItem = async (e: React.FormEvent) => {
    e.preventDefault();
    await fetch(`/api/projects/${params.id}/items`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ phaseId: showItemModal, ...itemForm }),
    });
    setShowItemModal(null);
    setItemForm({ title: '', itemType: 'COURSE', startDatetime: '', endDatetime: '', priority: 'NORMAL', description: '' });
    load();
  };

  if (loading) return <div className="page-body"><div className="loading-overlay"><span className="loading-spinner" /> Chargement...</div></div>;
  if (!project) return <div className="page-body"><div className="empty-state"><p>Projet non trouvé</p></div></div>;

  const allPlans = project.projectPlans || [];
  const plan = allPlans[0];
  const phases = allPlans.flatMap((p: any) => p.phases || []);
  
  const candidateStages = project.candidates?.reduce((acc: any, c: any) => {
    acc[c.currentStage] = (acc[c.currentStage] || 0) + 1;
    return acc;
  }, {}) || {};

  // Timeline calculations across all plans
  const startDates = allPlans.map((p: any) => p.startDate ? new Date(p.startDate).getTime() : NaN).filter((t: number) => !isNaN(t));
  const endDates = allPlans.map((p: any) => p.endDate ? new Date(p.endDate).getTime() : NaN).filter((t: number) => !isNaN(t));
  
  const planStart = startDates.length > 0 ? new Date(Math.min(...startDates)) : (project.startDate ? new Date(project.startDate) : null);
  const planEnd = endDates.length > 0 ? new Date(Math.max(...endDates)) : (project.endDate ? new Date(project.endDate) : null);
  const totalDays = planStart && planEnd ? Math.max(1, Math.ceil((planEnd.getTime() - planStart.getTime()) / (1000 * 86400))) : 1;

  const getBarStyle = (start: string | null, end: string | null) => {
    if (!start || !planStart || !planEnd) return { left: '0%', width: '0%' };
    const s = new Date(start);
    const e = end ? new Date(end) : s;
    const left = Math.max(0, Math.ceil((s.getTime() - planStart.getTime()) / (1000 * 86400)));
    const width = Math.max(1, Math.ceil((e.getTime() - s.getTime()) / (1000 * 86400)));
    return {
      left: `${(left / totalDays) * 100}%`,
      width: `${Math.max(1, (width / totalDays) * 100)}%`,
    };
  };

  return (
    <>
      <div className="page-header">
        <div>
          <div className="breadcrumbs"><Link href="/admin/projects">Projets</Link> / <span>{project.name}</span></div>
          <h1 className="page-title">{project.name}</h1>
          <p className="page-subtitle">{PROJECT_TYPE_LABELS[project.projectType] || project.projectType} — {project.code}</p>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button className="btn btn-secondary" onClick={() => setEditProject({
            name: project.name, description: project.description || '', status: project.status,
            startDate: project.startDate ? new Date(project.startDate).toISOString().split('T')[0] : '',
            endDate: project.endDate ? new Date(project.endDate).toISOString().split('T')[0] : '',
            fundingSource: project.fundingSource || '', targetCapacity: project.targetCapacity || '',
          })}>✏️ Modifier le projet</button>
        </div>
      </div>

      <div className="page-body">
        <div className="tabs">
          <button className={`tab ${activeTab === 'overview' ? 'active' : ''}`} onClick={() => setActiveTab('overview')}>Vue d&apos;ensemble</button>
          <button className={`tab ${activeTab === 'timeline' ? 'active' : ''}`} onClick={() => setActiveTab('timeline')}>Timeline</button>
          <button className={`tab ${activeTab === 'phases' ? 'active' : ''}`} onClick={() => setActiveTab('phases')}>Phases & éléments</button>
        </div>

        {activeTab === 'overview' && (
          <>
            <div className="kpi-grid">
              <div className="kpi-card"><div className="kpi-label">Statut</div><span className={`badge ${project.status === 'ACTIVE' ? 'badge-blue' : project.status === 'COMPLETED' ? 'badge-green' : 'badge-gray'}`}>{STATUS_LABELS[project.status] || project.status}</span></div>
              <div className="kpi-card"><div className="kpi-label">Cohortes</div><div className="kpi-value">{project.cohorts?.length || 0}</div></div>
              <div className="kpi-card"><div className="kpi-label">Candidats</div><div className="kpi-value">{project.candidates?.length || 0}</div></div>
              <div className="kpi-card"><div className="kpi-label">Capacité cible</div><div className="kpi-value">{project.targetCapacity || '-'}</div></div>
              <div className="kpi-card"><div className="kpi-label">Phases planning</div><div className="kpi-value">{phases.length}</div></div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
              <div className="card">
                <div className="card-header"><h3 className="card-title">Informations</h3></div>
                <div className="card-body" style={{ display: 'grid', gridTemplateColumns: '120px 1fr', gap: '8px 16px', fontSize: 13 }}>
                  <span className="text-muted">Description</span><span>{project.description || '-'}</span>
                  <span className="text-muted">Partenaire</span><span>{project.partner?.name || '-'}</span>
                  <span className="text-muted">Source</span><span>{project.fundingSource || '-'}</span>
                  <span className="text-muted">Début</span><span>{project.startDate ? formatDate(project.startDate) : '-'}</span>
                  <span className="text-muted">Fin</span><span>{project.endDate ? formatDate(project.endDate) : '-'}</span>
                </div>
              </div>

              <div className="card">
                <div className="card-header"><h3 className="card-title">Pipeline candidats</h3></div>
                <div className="card-body">
                  {Object.keys(candidateStages).length > 0 ? Object.entries(candidateStages).map(([stage, count]) => (
                    <div key={stage} style={{ display: 'flex', justifyContent: 'space-between', padding: '4px 0', fontSize: 13 }}>
                      <span>{STATUS_LABELS[stage] || stage}</span><span className="font-semibold">{count as number}</span>
                    </div>
                  )) : <p className="text-muted text-sm">Aucun candidat</p>}
                </div>
              </div>
            </div>

            {/* Cohorts */}
            <div className="card mt-6">
              <div className="card-header"><h3 className="card-title">Cohortes du projet</h3></div>
              <table className="data-table">
                <thead><tr><th>Cohorte</th><th>Programme</th><th>Campus</th><th>Formateur</th><th>Début</th><th>Fin</th><th>Apprenants</th></tr></thead>
                <tbody>
                  {project.cohorts?.map((c: any) => (
                    <tr key={c.id} className="clickable" onClick={() => window.location.href = `/admin/cohorts/${c.id}`}>
                      <td style={{ fontWeight: 600 }}>{c.name}</td>
                      <td>{c.program?.name}</td>
                      <td>{c.program?.campus?.name}</td>
                      <td>{c.trainer ? `${c.trainer.firstName} ${c.trainer.lastName}` : '-'}</td>
                      <td>{c.startDate ? formatDate(c.startDate) : '-'}</td>
                      <td>{c.endDate ? formatDate(c.endDate) : '-'}</td>
                      <td>{c._count?.learnerProfiles || 0}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}

        {activeTab === 'timeline' && (
          <div className="card">
            <div className="card-header">
              <h3 className="card-title">Timeline du projet</h3>
              {plan && <span className="text-xs text-muted">{plan.startDate ? formatDate(plan.startDate) : '?'} → {plan.endDate ? formatDate(plan.endDate) : '?'}</span>}
            </div>
            <div className="card-body" style={{ overflowX: 'auto' }}>
              {!plan ? (
                <div className="empty-state">
                  <p className="empty-state-text mb-4">Aucun planning créé</p>
                  <button className="btn btn-primary" onClick={handleCreatePlan}>Créer le planning initial</button>
                </div>
              ) : phases.length === 0 ? (
                <div className="empty-state">
                  <p className="empty-state-text mb-4">Aucune phase dans ce planning.</p>
                  <button className="btn btn-secondary" onClick={() => setActiveTab('phases')}>Aller à l&apos;onglet Phases pour en ajouter</button>
                </div>
              ) : (() => {
                // ── Calendar helpers ──────────────────────────────────────────
                const LABEL_W = 180; // px — fixed left label column
                const BAR_AREA_W = 900; // px — scrollable bar area width
                const ROW_H = 28; // px — row height
                const ITEM_ROW_H = 24;

                const pStart = new Date(planStart!);
                const pEnd = new Date(planEnd!);
                pStart.setHours(0, 0, 0, 0);
                pEnd.setHours(23, 59, 59, 999);
                const span = pEnd.getTime() - pStart.getTime();

                const pct = (d: Date) => Math.min(100, Math.max(0, ((d.getTime() - pStart.getTime()) / span) * 100));

                // Build month segments
                const months: { label: string; left: number; width: number }[] = [];
                const cur = new Date(pStart.getFullYear(), pStart.getMonth(), 1);
                while (cur <= pEnd) {
                  const mStart = new Date(Math.max(cur.getTime(), pStart.getTime()));
                  const mEnd = new Date(cur.getFullYear(), cur.getMonth() + 1, 0, 23, 59, 59);
                  const mEndClamped = new Date(Math.min(mEnd.getTime(), pEnd.getTime()));
                  const left = pct(mStart);
                  const right = pct(mEndClamped);
                  months.push({
                    label: mStart.toLocaleDateString('fr-FR', { month: 'short', year: '2-digit' }),
                    left,
                    width: right - left,
                  });
                  cur.setMonth(cur.getMonth() + 1);
                }

                // Build week ticks (every 7 days from pStart)
                const weeks: { label: string; left: number }[] = [];
                const wCur = new Date(pStart);
                while (wCur <= pEnd) {
                  weeks.push({
                    label: wCur.toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit' }),
                    left: pct(wCur),
                  });
                  wCur.setDate(wCur.getDate() + 7);
                }

                const todayLeft = pct(new Date());
                const showToday = todayLeft >= 0 && todayLeft <= 100;

                // Bar style for a date range
                const barStyle = (startRaw: string | null, endRaw: string | null) => {
                  if (!startRaw) return null;
                  const s = new Date(startRaw); s.setHours(0, 0, 0, 0);
                  const e = endRaw ? new Date(endRaw) : new Date(s.getTime() + 86400000);
                  e.setHours(23, 59, 59, 999);
                  const l = pct(s);
                  const r = pct(e);
                  return { left: `${l}%`, width: `${Math.max(0.5, r - l)}%` };
                };

                const topPhases = phases.filter((p: any) => !p.parentPhaseId);

                return (
                  <div style={{ minWidth: LABEL_W + BAR_AREA_W, position: 'relative', fontSize: 12 }}>
                    {/* ── Header: months ── */}
                    <div style={{ display: 'flex', marginLeft: LABEL_W, borderBottom: '1px solid var(--border)', background: 'var(--surface-2, #f8fafc)' }}>
                      {months.map((m, i) => (
                        <div key={i} style={{ width: `${m.width}%`, padding: '3px 4px', fontWeight: 600, color: 'var(--text-secondary)', borderRight: '1px solid var(--border)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', fontSize: 11, boxSizing: 'border-box' }}>
                          {m.label}
                        </div>
                      ))}
                    </div>

                    {/* ── Header: weeks ── */}
                    <div style={{ display: 'flex', marginLeft: LABEL_W, borderBottom: '2px solid var(--border)', background: 'var(--surface-2, #f8fafc)', position: 'relative', height: 20 }}>
                      {weeks.map((w, i) => (
                        <div key={i} style={{ position: 'absolute', left: `${w.left}%`, height: '100%', borderLeft: '1px solid var(--border)', paddingLeft: 3, fontSize: 10, color: 'var(--text-muted)', whiteSpace: 'nowrap', top: 2 }}>
                          {w.label}
                        </div>
                      ))}
                    </div>

                    {/* ── Rows ── */}
                    <div style={{ position: 'relative' }}>
                      {/* Today vertical line */}
                      {showToday && (
                        <div style={{ position: 'absolute', left: `calc(${LABEL_W}px + ${todayLeft}%)`, top: 0, bottom: 0, width: 2, background: '#ef4444', zIndex: 10, pointerEvents: 'none' }} />
                      )}

                      {topPhases.map((phase: any) => {
                        const phaseColor = phase.color || PHASE_COLORS[phase.phaseType] || '#94a3b8';
                        const bs = barStyle(phase.startDate, phase.endDate);
                        const items: any[] = phase.items || [];

                        return (
                          <div key={phase.id}>
                            {/* Phase row */}
                            <div style={{ display: 'flex', alignItems: 'center', borderBottom: '1px solid var(--border)', minHeight: ROW_H, background: 'var(--surface, white)' }}>
                              {/* Label */}
                              <div style={{ width: LABEL_W, flexShrink: 0, padding: '0 8px', display: 'flex', alignItems: 'center', gap: 6, overflow: 'hidden' }}>
                                <div style={{ width: 3, height: 16, borderRadius: 2, background: phaseColor, flexShrink: 0 }} />
                                <span style={{ fontWeight: 600, fontSize: 12, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flex: 1 }} title={phase.title}>{phase.title}</span>
                                <span className={`badge ${STATUS_BADGE[phase.status] || 'badge-gray'}`} style={{ fontSize: 9, flexShrink: 0 }}>{STATUS_LABELS[phase.status] || phase.status}</span>
                              </div>
                              {/* Bar area */}
                              <div style={{ flex: 1, position: 'relative', height: ROW_H }}>
                                {bs && (
                                  <div
                                    style={{ position: 'absolute', top: 4, height: ROW_H - 8, left: bs.left, width: bs.width, background: phaseColor, borderRadius: 4, display: 'flex', alignItems: 'center', overflow: 'hidden', cursor: 'default' }}
                                    title={`${phase.title}\n${phase.startDate ? formatDate(phase.startDate) : '?'} → ${phase.endDate ? formatDate(phase.endDate) : '?'}`}
                                  >
                                    <span style={{ fontSize: 9, color: 'white', padding: '0 5px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{phase.title}</span>
                                  </div>
                                )}
                              </div>
                            </div>

                            {/* Item sub-rows */}
                            {items.map((item: any) => {
                              const itemBs = barStyle(item.startDatetime, item.endDatetime);
                              const hasRange = !!item.endDatetime;
                              return (
                                <div key={item.id} style={{ display: 'flex', alignItems: 'center', borderBottom: '1px solid var(--border)', minHeight: ITEM_ROW_H, background: 'var(--surface-hover, #fafafa)' }}>
                                  {/* Label */}
                                  <div style={{ width: LABEL_W, flexShrink: 0, padding: '0 8px 0 20px', display: 'flex', alignItems: 'center', gap: 5, overflow: 'hidden' }}>
                                    <span style={{ color: phaseColor, fontSize: 10 }}>└</span>
                                    <span style={{ fontSize: 11, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flex: 1 }} title={item.title}>{item.title}</span>
                                    <span className="badge badge-teal" style={{ fontSize: 8, flexShrink: 0 }}>{ITEM_TYPE_LABELS[item.itemType] || item.itemType}</span>
                                  </div>
                                  {/* Bar / marker area */}
                                  <div style={{ flex: 1, position: 'relative', height: ITEM_ROW_H }}>
                                    {itemBs && (
                                      hasRange ? (
                                        <div
                                          style={{ position: 'absolute', top: 5, height: ITEM_ROW_H - 10, left: itemBs.left, width: itemBs.width, background: phaseColor, opacity: 0.55, borderRadius: 3, cursor: 'default' }}
                                          title={`${item.title}\n${formatDate(item.startDatetime)}${item.endDatetime ? ' → ' + formatDate(item.endDatetime) : ''}`}
                                        />
                                      ) : (
                                        /* Diamond marker for single-date items */
                                        <div
                                          style={{ position: 'absolute', top: '50%', left: itemBs.left, transform: 'translate(-50%, -50%) rotate(45deg)', width: 10, height: 10, background: phaseColor, cursor: 'default' }}
                                          title={`${item.title}\n${formatDate(item.startDatetime)}`}
                                        />
                                      )
                                    )}
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        );
                      })}
                    </div>

                    {/* Legend */}
                    {showToday && (
                      <div style={{ marginTop: 8, display: 'flex', alignItems: 'center', gap: 12, fontSize: 11, color: 'var(--text-muted)' }}>
                        <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}><span style={{ display: 'inline-block', width: 2, height: 12, background: '#ef4444' }} /> Aujourd&apos;hui</span>
                        <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}><span style={{ display: 'inline-block', width: 12, height: 8, background: '#94a3b8', borderRadius: 2 }} /> Phase</span>
                        <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}><span style={{ display: 'inline-block', width: 10, height: 10, background: '#94a3b8', transform: 'rotate(45deg)' }} /> Élément ponctuel</span>
                        <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}><span style={{ display: 'inline-block', width: 20, height: 8, background: '#94a3b8', opacity: 0.55, borderRadius: 2 }} /> Élément sur durée</span>
                      </div>
                    )}
                  </div>
                );
              })()}
            </div>
          </div>
        )}

        {activeTab === 'phases' && (
          <div className="card">
            <div className="card-header">
              <h3 className="card-title">Phases et éléments planifiés</h3>
              {plan && (
                <button className="btn btn-primary btn-sm" onClick={() => setShowPhaseModal(true)}>+ Nouvelle phase</button>
              )}
            </div>
            <div className="card-body">
              {!plan ? (
                <div className="empty-state">
                  <p className="empty-state-text mb-4">Aucun planning créé</p>
                  <button className="btn btn-primary" onClick={handleCreatePlan}>Créer le planning initial</button>
                </div>
              ) : phases.length === 0 ? (
                <div className="empty-state">
                  <p className="empty-state-text">Aucune phase créée</p>
                  <button className="btn btn-secondary mt-2" onClick={() => setShowPhaseModal(true)}>+ Ajouter la première phase</button>
                </div>
              ) : (
                phases.filter((p: any) => !p.parentPhaseId).map((phase: any) => (
                  <div key={phase.id} style={{ marginBottom: 20 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
                      <div style={{ width: 4, height: 24, borderRadius: 2, background: phase.color || PHASE_COLORS[phase.phaseType] || '#94a3b8' }} />
                      <h4 style={{ fontSize: 14, fontWeight: 600 }}>{phase.title}</h4>
                      <span className="badge badge-purple" style={{ fontSize: 10 }}>{PHASE_TYPE_LABELS[phase.phaseType] || phase.phaseType}</span>
                      <span className={`badge ${STATUS_BADGE[phase.status] || 'badge-gray'}`} style={{ fontSize: 10 }}>{STATUS_LABELS[phase.status] || phase.status}</span>
                      <span className="text-xs text-muted">{phase.startDate ? formatDate(phase.startDate) : '?'} → {phase.endDate ? formatDate(phase.endDate) : '?'}</span>
                      <button className="btn btn-ghost btn-sm" style={{ marginLeft: 'auto' }} onClick={() => setShowItemModal(phase.id)}>+ Ajouter élément</button>
                    </div>
                    {phase.items?.length > 0 && (
                      <table className="data-table" style={{ marginLeft: 14, marginBottom: 8 }}>
                        <thead><tr><th>Élément</th><th>Type</th><th>Début</th><th>Fin</th><th>Priorité</th><th>Statut</th></tr></thead>
                        <tbody>
                          {phase.items.map((item: any) => (
                            <tr key={item.id}>
                              <td style={{ fontWeight: 500 }}>{item.title}</td>
                              <td><span className="badge badge-teal" style={{ fontSize: 10 }}>{ITEM_TYPE_LABELS[item.itemType] || item.itemType}</span></td>
                              <td>{formatDate(item.startDatetime)}</td>
                              <td>{item.endDatetime ? formatDate(item.endDatetime) : '-'}</td>
                              <td>{item.priority ? <span className={`badge ${item.priority === 'CRITICAL' ? 'badge-red' : item.priority === 'HIGH' ? 'badge-orange' : 'badge-gray'}`} style={{ fontSize: 10 }}>{item.priority}</span> : '-'}</td>
                              <td><span className={`badge ${STATUS_BADGE[item.status] || 'badge-gray'}`} style={{ fontSize: 10 }}>{STATUS_LABELS[item.status] || item.status}</span></td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    )}
                  </div>
                ))
              )}
            </div>
          </div>
        )}
      </div>

      {/* Modals */}
      {showPhaseModal && (
        <div className="modal-overlay" onClick={() => setShowPhaseModal(false)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h2 className="modal-title">Nouvelle Phase</h2>
              <button className="btn btn-ghost btn-icon" onClick={() => setShowPhaseModal(false)}>✕</button>
            </div>
            <form onSubmit={handleCreatePhase}>
              <div className="modal-body">
                <div className="form-group">
                  <label className="form-label">Titre de la phase</label>
                  <input className="form-input" value={phaseForm.title} onChange={e => setPhaseForm({...phaseForm, title: e.target.value})} required />
                </div>
                <div className="form-group">
                  <label className="form-label">Type de phase</label>
                  <select className="form-select" value={phaseForm.phaseType} onChange={e => setPhaseForm({...phaseForm, phaseType: e.target.value})}>
                    {Object.entries(PHASE_TYPE_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                  </select>
                </div>
                <div className="form-row">
                  <div className="form-group"><label className="form-label">Date de début</label><input type="date" className="form-input" value={phaseForm.startDate} onChange={e => setPhaseForm({...phaseForm, startDate: e.target.value})} required /></div>
                  <div className="form-group"><label className="form-label">Date de fin</label><input type="date" className="form-input" value={phaseForm.endDate} onChange={e => setPhaseForm({...phaseForm, endDate: e.target.value})} required /></div>
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={() => setShowPhaseModal(false)}>Annuler</button>
                <button type="submit" className="btn btn-primary">Créer</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {showItemModal && (
        <div className="modal-overlay" onClick={() => setShowItemModal(null)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h2 className="modal-title">Nouvel Élément (Activité, Jalon, Livrable...)</h2>
              <button className="btn btn-ghost btn-icon" onClick={() => setShowItemModal(null)}>✕</button>
            </div>
            <form onSubmit={handleCreateItem}>
              <div className="modal-body">
                <div className="form-group">
                  <label className="form-label">Titre de l&apos;élément</label>
                  <input className="form-input" value={itemForm.title} onChange={e => setItemForm({...itemForm, title: e.target.value})} required />
                </div>
                <div className="form-group">
                  <label className="form-label">Type d&apos;élément</label>
                  <select className="form-select" value={itemForm.itemType} onChange={e => setItemForm({...itemForm, itemType: e.target.value})}>
                    {Object.entries(ITEM_TYPE_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                  </select>
                </div>
                <div className="form-row">
                  <div className="form-group"><label className="form-label">Date de début</label><input type="date" className="form-input" value={itemForm.startDatetime} onChange={e => setItemForm({...itemForm, startDatetime: e.target.value})} required /></div>
                  <div className="form-group"><label className="form-label">Date de fin <span className="text-muted" style={{ fontWeight: 400 }}>(optionnelle)</span></label><input type="date" className="form-input" value={itemForm.endDatetime} onChange={e => setItemForm({...itemForm, endDatetime: e.target.value})} /></div>
                </div>
                <div className="form-row">
                  <div className="form-group"><label className="form-label">Priorité</label>
                    <select className="form-select" value={itemForm.priority} onChange={e => setItemForm({...itemForm, priority: e.target.value})}>
                      <option value="CRITICAL">Critique</option><option value="HIGH">Haute</option><option value="NORMAL">Normale</option><option value="LOW">Basse</option>
                    </select>
                  </div>
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={() => setShowItemModal(null)}>Annuler</button>
                <button type="submit" className="btn btn-primary">Créer</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ═══ EDIT PROJECT MODAL ═══ */}
      {editProject && (
        <div className="modal-overlay" onClick={() => setEditProject(null)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h2 className="modal-title">✏️ Modifier le projet</h2>
              <button className="btn btn-ghost btn-icon" onClick={() => setEditProject(null)}>✕</button>
            </div>
            <form onSubmit={handleSaveProject}>
              <div className="modal-body">
                <div className="form-group">
                  <label className="form-label">Nom du projet</label>
                  <input className="form-input" value={editProject.name} onChange={e => setEditProject({...editProject, name: e.target.value})} required />
                </div>
                <div className="form-group">
                  <label className="form-label">Description</label>
                  <textarea className="form-input" rows={3} value={editProject.description} onChange={e => setEditProject({...editProject, description: e.target.value})} style={{ resize: 'vertical' }} />
                </div>
                <div className="form-row">
                  <div className="form-group">
                    <label className="form-label">Statut</label>
                    <select className="form-select" value={editProject.status} onChange={e => setEditProject({...editProject, status: e.target.value})}>
                      <option value="DRAFT">Brouillon</option>
                      <option value="ACTIVE">Actif</option>
                      <option value="COMPLETED">Terminé</option>
                      <option value="ARCHIVED">Archivé</option>
                    </select>
                  </div>
                  <div className="form-group">
                    <label className="form-label">Source de financement</label>
                    <input className="form-input" value={editProject.fundingSource} onChange={e => setEditProject({...editProject, fundingSource: e.target.value})} placeholder="Ex: MCINET, BM, Propre..." />
                  </div>
                </div>
                <div className="form-row">
                  <div className="form-group"><label className="form-label">Date de début</label><input type="date" className="form-input" value={editProject.startDate} onChange={e => setEditProject({...editProject, startDate: e.target.value})} /></div>
                  <div className="form-group"><label className="form-label">Date de fin</label><input type="date" className="form-input" value={editProject.endDate} onChange={e => setEditProject({...editProject, endDate: e.target.value})} /></div>
                </div>
                <div className="form-group">
                  <label className="form-label">Capacité cible</label>
                  <input type="number" className="form-input" value={editProject.targetCapacity} onChange={e => setEditProject({...editProject, targetCapacity: e.target.value})} min={0} />
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={() => setEditProject(null)}>Annuler</button>
                <button type="submit" className="btn btn-primary">💾 Enregistrer</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
