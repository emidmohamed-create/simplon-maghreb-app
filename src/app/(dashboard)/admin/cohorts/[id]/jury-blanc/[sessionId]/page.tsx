'use client';

import { useEffect, useState, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';

const LEVELS = ['', 'EXCELLENT', 'BON', 'OK', 'INSUFFISANT', 'ABSENT'];
const LEVEL_CONFIG: Record<string, { label: string; color: string; bg: string }> = {
  '':            { label: '—',            color: '#94a3b8', bg: '#f8fafc' },
  EXCELLENT:     { label: 'Excellent',    color: '#fff',    bg: '#7c3aed' },
  BON:           { label: 'Bon',          color: '#fff',    bg: '#0d9488' },
  OK:            { label: 'OK',           color: '#fff',    bg: '#0284c7' },
  INSUFFISANT:   { label: 'Insuffisant',  color: '#fff',    bg: '#dc2626' },
  ABSENT:        { label: 'Absent',       color: '#fff',    bg: '#6b7280' },
};

const STATUS_CONFIG: Record<string, { label: string; color: string; bg: string; border: string }> = {
  PENDING:       { label: '—',                color: '#94a3b8', bg: '#f8fafc',  border: '#e2e8f0' },
  VALIDATED:     { label: 'Validée',          color: '#fff',    bg: '#16a34a',  border: '#15803d' },
  NOT_VALIDATED: { label: 'Non Validée',      color: '#fff',    bg: '#dc2626',  border: '#b91c1c' },
  IN_PROGRESS:   { label: 'En cours',         color: '#fff',    bg: '#d97706',  border: '#b45309' },
  ABSENT:        { label: 'Absent',           color: '#fff',    bg: '#6b7280',  border: '#4b5563' },
  EXCUSED:       { label: 'Dispensé',         color: '#1e40af', bg: '#dbeafe',  border: '#93c5fd' },
};
const STATUS_KEYS = Object.keys(STATUS_CONFIG);

export default function JuryBlancGridPage() {
  const params = useParams();
  const [cohort,         setCohort]         = useState<any>(null);
  const [session,        setSession]        = useState<any>(null);
  const [learners,       setLearners]       = useState<any[]>([]);
  const [evaluations,    setEvaluations]    = useState<any[]>([]);
  const [learnerRecords, setLearnerRecords] = useState<any[]>([]);
  const [loading,        setLoading]        = useState(true);
  const [view,           setView]           = useState<'grid'|'config'>('grid');
  const [updatingKey,    setUpdatingKey]    = useState<string|null>(null);
  const [savingRecord,   setSavingRecord]   = useState<string|null>(null);

  // Config
  const [showAddComp, setShowAddComp] = useState(false);
  const [editComp,    setEditComp]    = useState<any>(null);
  const [compForm,    setCompForm]    = useState({ category: 'TECHNIQUE', code: '', name: '', description: '' });
  const [savingComp,  setSavingComp]  = useState(false);

  // Comment modal
  const [commentModal, setCommentModal] = useState<{ learnerId: string; compId: string; current: string }|null>(null);
  const [commentText, setCommentText] = useState('');

  // General comment editing (per learner, inline)
  const [editingComment, setEditingComment] = useState<string|null>(null);

  const load = useCallback(() => {
    setLoading(true);
    Promise.all([
      fetch(`/api/cohorts/${params.id}`).then(r => r.json()).catch(() => null),
      fetch(`/api/cohorts/${params.id}/jury-blanc/${params.sessionId}`).then(r => r.json()).catch(() => null),
    ]).then(([c, d]) => {
      setCohort(c);
      if (d?.session) {
        setSession(d.session);
        setLearners(d.learners || []);
        setEvaluations(d.evaluations || []);
        setLearnerRecords(d.learnerRecords || []);
      }
    }).finally(() => setLoading(false));
  }, [params.id, params.sessionId]);

  useEffect(() => { load(); }, [load]);

  // ─── Helpers ──────────────────────────────────────────────────────────────
  const getEval   = (lid: string, cid: string) => evaluations.find(e => e.learnerProfileId === lid && e.competencyId === cid) || null;
  const getRecord = (lid: string) => learnerRecords.find(r => r.learnerProfileId === lid) || null;

  // ─── Update eval cell ──────────────────────────────────────────────────────
  const handleCellUpdate = async (learnerId: string, compId: string, status: string, comment?: string) => {
    const key = `${learnerId}_${compId}`;
    setUpdatingKey(key);
    try {
      await fetch(`/api/cohorts/${params.id}/jury-blanc/${params.sessionId}/evaluations`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ learnerProfileId: learnerId, competencyId: compId, status, comment }),
      });
      setEvaluations(prev => {
        const filtered = prev.filter(e => !(e.learnerProfileId === learnerId && e.competencyId === compId));
        return [...filtered, { learnerProfileId: learnerId, competencyId: compId, status, comment: comment ?? (getEval(learnerId, compId)?.comment || null) }];
      });
    } finally { setUpdatingKey(null); }
  };

  // ─── Update learner record field ───────────────────────────────────────────
  const updateRecord = async (learnerId: string, patch: Record<string, string|null>) => {
    setSavingRecord(learnerId);
    try {
      await fetch(`/api/cohorts/${params.id}/jury-blanc/${params.sessionId}/records`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ learnerProfileId: learnerId, ...patch }),
      });
      setLearnerRecords(prev => {
        const existing = prev.find(r => r.learnerProfileId === learnerId);
        if (existing) return prev.map(r => r.learnerProfileId === learnerId ? { ...r, ...patch } : r);
        return [...prev, { learnerProfileId: learnerId, ...patch }];
      });
    } finally { setSavingRecord(null); }
  };

  // ─── Competency management ─────────────────────────────────────────────────
  const handleAddComp = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingComp(true);
    try {
      await fetch(`/api/cohorts/${params.id}/jury-blanc/${params.sessionId}/competencies`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...compForm }),
      });
      setShowAddComp(false);
      setCompForm({ category: 'TECHNIQUE', code: '', name: '', description: '' });
      load();
    } finally { setSavingComp(false); }
  };
  const handleSaveComp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editComp) return;
    setSavingComp(true);
    try {
      await fetch(`/api/cohorts/${params.id}/jury-blanc/${params.sessionId}/competencies/${editComp.id}`, {
        method: 'PUT', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(editComp),
      });
      setEditComp(null);
      load();
    } finally { setSavingComp(false); }
  };
  const handleDeleteComp = async (compId: string) => {
    if (!confirm('Supprimer cette compétence ? Les évaluations associées seront effacées.')) return;
    await fetch(`/api/cohorts/${params.id}/jury-blanc/${params.sessionId}/competencies/${compId}`, { method: 'DELETE' });
    load();
  };

  if (loading) return <div className="page-body"><div className="loading-overlay"><span className="loading-spinner" /> Chargement...</div></div>;
  if (!session) return <div className="page-body"><div className="empty-state"><p>Session introuvable</p></div></div>;

  const techComps  = (session.competencies || []).filter((c: any) => c.category === 'TECHNIQUE');
  const transComps = (session.competencies || []).filter((c: any) => c.category === 'TRANSVERSAL');
  const allComps   = [...techComps, ...transComps];
  const totalCells = learners.length * allComps.length;
  const validated  = evaluations.filter(e => e.status === 'VALIDATED').length;
  const notVal     = evaluations.filter(e => e.status === 'NOT_VALIDATED').length;

  // Project sub-columns
  const PROJECT_COLS = [
    { key: 'projectClarity', label: 'Clarté & structure du code' },
    { key: 'projectImpl',    label: 'Implémentation des fonctionnalités' },
    { key: 'projectExplain', label: 'Explication du code' },
  ];

  return (
    <>
      <div className="page-header">
        <div>
          <div className="breadcrumbs">
            <Link href="/admin/cohorts">Cohortes</Link> /
            <Link href={`/admin/cohorts/${params.id}`}>{cohort?.name}</Link> /
            <Link href={`/admin/cohorts/${params.id}/jury-blanc`}>Jury Blanc</Link> /
            <span>{session.name}</span>
          </div>
          <h1 className="page-title">⚖️ {session.name}</h1>
          <p className="page-subtitle">
            {session.date && `📅 ${new Date(session.date).toLocaleDateString('fr-FR', { day: '2-digit', month: 'long', year: 'numeric' })} · `}
            {learners.length} apprenants · {allComps.length} compétences
          </p>
        </div>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          <button className={`btn ${view === 'grid' ? 'btn-primary' : 'btn-secondary'}`} onClick={() => setView('grid')}>📊 Grille</button>
          <button className={`btn ${view === 'config' ? 'btn-primary' : 'btn-secondary'}`} onClick={() => setView('config')}>⚙️ Compétences</button>
          {session.isLocked
            ? <button className="btn btn-secondary" onClick={async () => { await fetch(`/api/cohorts/${params.id}/jury-blanc/${params.sessionId}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ isLocked: false }) }); load(); }}>🔓 Déverrouiller</button>
            : <button className="btn btn-warning" onClick={async () => { if (!confirm('Clôturer la session ? Les évaluations ne seront plus modifiables.')) return; await fetch(`/api/cohorts/${params.id}/jury-blanc/${params.sessionId}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ isLocked: true }) }); load(); }}>🔒 Clôturer</button>
          }
        </div>
      </div>

      <div className="page-body">
        {/* KPIs */}
        <div className="kpi-grid" style={{ gridTemplateColumns: 'repeat(5, 1fr)', marginBottom: 20 }}>
          <div className="kpi-card" style={{ borderLeft: '4px solid #16a34a' }}>
            <div className="kpi-label">Validées</div><div className="kpi-value" style={{ color: '#16a34a' }}>{validated}</div>
            <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{totalCells > 0 ? Math.round((validated/totalCells)*100) : 0}%</div>
          </div>
          <div className="kpi-card" style={{ borderLeft: '4px solid #dc2626' }}>
            <div className="kpi-label">Non Validées</div><div className="kpi-value" style={{ color: '#dc2626' }}>{notVal}</div>
          </div>
          <div className="kpi-card" style={{ borderLeft: '4px solid #94a3b8' }}>
            <div className="kpi-label">Non renseignées</div><div className="kpi-value">{totalCells - evaluations.filter(e => e.status !== 'PENDING').length}</div>
          </div>
          <div className="kpi-card"><div className="kpi-label">Compétences tech</div><div className="kpi-value">{techComps.length}</div></div>
          <div className="kpi-card"><div className="kpi-label">Compétences transv.</div><div className="kpi-value">{transComps.length}</div></div>
        </div>

        {session.isLocked && (
          <div style={{ padding: '10px 16px', background: '#fef9c3', border: '1px solid #fde047', borderRadius: 8, marginBottom: 16, fontSize: 13, color: '#713f12' }}>
            🔒 Session <strong>clôturée</strong> — mode lecture seule.
          </div>
        )}

        {/* ═══ GRID VIEW ═══ */}
        {view === 'grid' && (
          <div className="card">
            <div style={{ overflowX: 'auto' }}>
              <table style={{ borderCollapse: 'collapse', fontSize: 11, width: '100%' }}>
                <thead>
                  {/* Row 1: category labels */}
                  <tr>
                    <th rowSpan={2} style={{ ...stickyTh(0), minWidth: 170, borderBottom: '2px solid var(--border)' }}>Apprenant</th>
                    <th rowSpan={2} style={{ ...stickyTh(170), minWidth: 180, borderRight: '2px solid var(--border)', borderBottom: '2px solid var(--border)' }}>
                      <div style={{ color: '#374151', fontWeight: 700 }}>Commentaires</div>
                      <div style={{ fontWeight: 400, fontSize: 10, color: 'var(--text-muted)' }}>générales</div>
                    </th>
                    {/* Niveau Jury & Formateur */}
                    <th colSpan={2} style={{ textAlign: 'center', padding: '6px', background: '#f0fdf4', color: '#15803d', fontWeight: 700, borderBottom: '1px solid #bbf7d0', borderRight: '2px solid var(--border)' }}>
                      📋 Niveaux
                    </th>
                    {/* Projet présenté */}
                    <th colSpan={3} style={{ textAlign: 'center', padding: '6px', background: '#e0f2fe', color: '#0369a1', fontWeight: 700, borderBottom: '1px solid #bae6fd', borderRight: '2px solid var(--border)' }}>
                      💡 Projet présenté
                    </th>
                    {/* Tech comps */}
                    {techComps.length > 0 && <th colSpan={techComps.length} style={{ textAlign: 'center', padding: '6px', background: '#dbeafe', color: '#1d4ed8', fontWeight: 700, borderRight: '2px solid var(--border)' }}>🔧 Compétences Techniques</th>}
                    {/* Transversal comps */}
                    {transComps.length > 0 && <th colSpan={transComps.length} style={{ textAlign: 'center', padding: '6px', background: '#ede9fe', color: '#6d28d9', fontWeight: 700 }}>🤝 Compétences Transversales</th>}
                  </tr>
                  {/* Row 2: column names */}
                  <tr>
                    {/* Niveau Jury */}
                    <th style={{ ...colTh('#f0fdf4'), minWidth: 110 }}>Niveau Jury</th>
                    <th style={{ ...colTh('#f0fdf4'), minWidth: 110, borderRight: '2px solid var(--border)' }}>Niveau Formateur</th>
                    {/* Project cols */}
                    {PROJECT_COLS.map((col, i) => (
                      <th key={col.key} style={{ ...colTh('#e0f2fe'), minWidth: 120, ...(i === PROJECT_COLS.length - 1 ? { borderRight: '2px solid var(--border)' } : {}) }}>{col.label}</th>
                    ))}
                    {/* Tech */}
                    {techComps.map((c: any, i: number) => (
                      <th key={c.id} style={{ ...colTh('#eff6ff'), minWidth: 100, ...(i === techComps.length - 1 ? { borderRight: '2px solid var(--border)' } : {}) }}>
                        <div style={{ fontWeight: 700, color: '#1d4ed8' }}>{c.code}</div>
                        <div style={{ fontSize: 9, color: '#1e40af', maxWidth: 90, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={c.name}>{c.name}</div>
                      </th>
                    ))}
                    {/* Transversal */}
                    {transComps.map((c: any) => (
                      <th key={c.id} style={{ ...colTh('#f5f3ff'), minWidth: 100 }}>
                        <div style={{ fontWeight: 700, color: '#6d28d9' }}>{c.code}</div>
                        <div style={{ fontSize: 9, color: '#5b21b6', maxWidth: 90, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={c.name}>{c.name}</div>
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {learners.map((learner: any) => {
                    const rec = getRecord(learner.id);
                    const learnerValidated = evaluations.filter(e => e.learnerProfileId === learner.id && e.status === 'VALIDATED').length;
                    const pct = allComps.length > 0 ? Math.round((learnerValidated / allComps.length) * 100) : 0;
                    const isEditing = editingComment === learner.id;
                    const isSaving = savingRecord === learner.id;
                    return (
                      <tr key={learner.id} style={{ borderBottom: '1px solid var(--border)' }}>
                        {/* Learner name */}
                        <td style={{ ...stickyTd(0), borderRight: '1px solid var(--border)' }}>
                          <div style={{ fontWeight: 700, fontSize: 12 }}>{learner.lastName} {learner.firstName}</div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 4, marginTop: 2 }}>
                            <div style={{ height: 3, width: 50, background: 'var(--border)', borderRadius: 2, overflow: 'hidden' }}>
                              <div style={{ height: '100%', width: `${pct}%`, background: pct === 100 ? '#16a34a' : pct >= 60 ? '#d97706' : '#3b82f6', borderRadius: 2 }} />
                            </div>
                            <span style={{ fontSize: 9, color: 'var(--text-muted)' }}>{pct}%</span>
                          </div>
                        </td>
                        {/* General comment */}
                        <td style={{ ...stickyTd(170), borderRight: '2px solid var(--border)', maxWidth: 200 }}>
                          {isEditing ? (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                              <textarea
                                autoFocus
                                className="form-input"
                                rows={3}
                                style={{ fontSize: 11, padding: '4px 8px', resize: 'vertical', minWidth: 160 }}
                                defaultValue={rec?.generalComment || ''}
                                id={`comment-${learner.id}`}
                              />
                              <div style={{ display: 'flex', gap: 4 }}>
                                <button className="btn btn-sm btn-primary" style={{ fontSize: 10 }} disabled={isSaving} onClick={async () => {
                                  const val = (document.getElementById(`comment-${learner.id}`) as HTMLTextAreaElement)?.value;
                                  await updateRecord(learner.id, { generalComment: val });
                                  setEditingComment(null);
                                }}>💾</button>
                                <button className="btn btn-sm btn-secondary" style={{ fontSize: 10 }} onClick={() => setEditingComment(null)}>✕</button>
                              </div>
                            </div>
                          ) : (
                            <div style={{ display: 'flex', gap: 4, alignItems: 'flex-start' }}>
                              <div style={{ flex: 1, fontSize: 11, color: rec?.generalComment ? 'var(--text-secondary)' : 'var(--text-muted)', lineHeight: 1.4, fontStyle: rec?.generalComment ? 'normal' : 'italic' }}>
                                {rec?.generalComment || 'Cliquer pour ajouter...'}
                              </div>
                              {!session.isLocked && (
                                <button style={{ flexShrink: 0, background: 'none', border: 'none', cursor: 'pointer', fontSize: 12, color: 'var(--text-muted)', padding: '0 2px' }} onClick={() => setEditingComment(learner.id)}>✏️</button>
                              )}
                            </div>
                          )}
                        </td>
                        {/* Niveau Jury */}
                        <td style={{ textAlign: 'center', padding: '3px 4px', ...(rec?.juryLevel ? { background: LEVEL_CONFIG[rec.juryLevel]?.bg } : {}) }}>
                          <LevelSelect value={rec?.juryLevel || ''} disabled={session.isLocked || isSaving} onChange={v => updateRecord(learner.id, { juryLevel: v || null })} />
                        </td>
                        {/* Niveau Formateur */}
                        <td style={{ textAlign: 'center', padding: '3px 4px', borderRight: '2px solid var(--border)', ...(rec?.trainerLevel ? { background: LEVEL_CONFIG[rec.trainerLevel]?.bg + '30' } : {}) }}>
                          <LevelSelect value={rec?.trainerLevel || ''} disabled={session.isLocked || isSaving} onChange={v => updateRecord(learner.id, { trainerLevel: v || null })} />
                        </td>
                        {/* Project cols */}
                        {PROJECT_COLS.map((col, i) => (
                          <td key={col.key} style={{ textAlign: 'center', padding: '3px 4px', ...(i === PROJECT_COLS.length - 1 ? { borderRight: '2px solid var(--border)' } : {}), ...(rec?.[col.key] ? { background: LEVEL_CONFIG[rec[col.key]]?.bg + '30' } : {}) }}>
                            <LevelSelect value={rec?.[col.key] || ''} disabled={session.isLocked || isSaving} onChange={v => updateRecord(learner.id, { [col.key]: v || null })} />
                          </td>
                        ))}
                        {/* Competency cells */}
                        {allComps.map((comp: any, ci: number) => {
                          const ev     = getEval(learner.id, comp.id);
                          const status = ev?.status || 'PENDING';
                          const cfg    = STATUS_CONFIG[status];
                          const key    = `${learner.id}_${comp.id}`;
                          const isSav  = updatingKey === key;
                          const isLastTech = comp.category === 'TECHNIQUE' && ci === techComps.length - 1;
                          return (
                            <td key={comp.id} style={{ textAlign: 'center', padding: '3px 4px', background: cfg.bg, ...(isLastTech ? { borderRight: '2px solid var(--border)' } : { borderRight: '1px solid var(--border)' }), position: 'relative' }}>
                              <select
                                style={{ fontSize: 10, fontWeight: 700, padding: '3px 4px', background: cfg.bg, color: cfg.color, border: `1px solid ${cfg.border}`, borderRadius: 4, width: '100%', minWidth: 90, cursor: session.isLocked ? 'not-allowed' : 'pointer', opacity: isSav ? 0.4 : 1 }}
                                value={status}
                                disabled={session.isLocked || isSav}
                                onChange={e => handleCellUpdate(learner.id, comp.id, e.target.value)}
                              >
                                {STATUS_KEYS.map(s => <option key={s} value={s}>{STATUS_CONFIG[s].label}</option>)}
                              </select>
                              {!session.isLocked && (
                                <button style={{ position: 'absolute', top: 1, right: 1, background: 'none', border: 'none', cursor: 'pointer', fontSize: 9, color: ev?.comment ? '#3b82f6' : 'var(--border)', padding: 0 }}
                                  title={ev?.comment || 'Commentaire'}
                                  onClick={() => { setCommentModal({ learnerId: learner.id, compId: comp.id, current: ev?.comment || '' }); setCommentText(ev?.comment || ''); }}>
                                  {ev?.comment ? '💬' : '+'}
                                </button>
                              )}
                            </td>
                          );
                        })}
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            {/* Legend */}
            <div style={{ padding: '10px 16px', borderTop: '1px solid var(--border)', display: 'flex', gap: 16, flexWrap: 'wrap', fontSize: 11 }}>
              <strong style={{ color: 'var(--text-muted)' }}>Niveaux :</strong>
              {Object.entries(LEVEL_CONFIG).filter(([k]) => k !== '').map(([k, v]) => (
                <span key={k} style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                  <span style={{ display: 'inline-block', padding: '1px 8px', borderRadius: 3, background: v.bg, color: v.color, fontWeight: 700, fontSize: 10 }}>{v.label}</span>
                </span>
              ))}
              <strong style={{ color: 'var(--text-muted)', marginLeft: 8 }}>Compétences :</strong>
              {Object.entries(STATUS_CONFIG).filter(([k]) => k !== 'PENDING').map(([k, v]) => (
                <span key={k} style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                  <span style={{ display: 'inline-block', padding: '1px 8px', borderRadius: 3, background: v.bg, color: v.color, fontWeight: 700, fontSize: 10, border: `1px solid ${v.border}` }}>{v.label}</span>
                </span>
              ))}
            </div>
          </div>
        )}

        {/* ═══ CONFIG VIEW ═══ */}
        {view === 'config' && (
          <>
            {(['TECHNIQUE', 'TRANSVERSAL'] as const).map(cat => {
              const compsForCat = cat === 'TECHNIQUE' ? techComps : transComps;
              return (
                <div key={cat} className="card" style={{ marginBottom: 20 }}>
                  <div className="card-header">
                    <h3 className="card-title">{cat === 'TECHNIQUE' ? '🔧 Compétences Techniques' : '🤝 Compétences Transversales'} ({compsForCat.length})</h3>
                    <button className="btn btn-primary" onClick={() => { setCompForm({ category: cat, code: `${cat === 'TECHNIQUE' ? 'C' : 'T'}${compsForCat.length + 1}`, name: '', description: '' }); setShowAddComp(true); }}>+ Ajouter</button>
                  </div>
                  <table className="data-table">
                    <thead><tr><th style={{ width: 60 }}>Code</th><th>Nom</th><th>Description</th><th style={{ width: 100 }}>Actions</th></tr></thead>
                    <tbody>
                      {compsForCat.map((c: any) => (
                        <tr key={c.id}>
                          <td><span style={{ fontWeight: 700, color: cat === 'TECHNIQUE' ? '#1d4ed8' : '#6d28d9' }}>{c.code}</span></td>
                          <td style={{ fontWeight: 600 }}>{c.name}</td>
                          <td style={{ fontSize: 12, color: 'var(--text-muted)' }}>{c.description || '—'}</td>
                          <td><div style={{ display: 'flex', gap: 6 }}>
                            <button className="btn btn-sm btn-secondary" onClick={() => setEditComp({...c})}>✏️</button>
                            <button className="btn btn-sm btn-danger" onClick={() => handleDeleteComp(c.id)}>🗑️</button>
                          </div></td>
                        </tr>
                      ))}
                      {compsForCat.length === 0 && <tr><td colSpan={4} style={{ textAlign: 'center', color: 'var(--text-muted)' }}>Aucune compétence</td></tr>}
                    </tbody>
                  </table>
                </div>
              );
            })}
          </>
        )}
      </div>

      {/* ═══ MODALS ═══ */}
      {(showAddComp || editComp) && (
        <div className="modal-overlay" onClick={() => { setShowAddComp(false); setEditComp(null); }}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h2 className="modal-title">{editComp ? '✏️ Modifier' : '+ Ajouter'} une compétence</h2>
              <button className="btn btn-ghost btn-icon" onClick={() => { setShowAddComp(false); setEditComp(null); }}>✕</button>
            </div>
            <form onSubmit={editComp ? handleSaveComp : handleAddComp}>
              <div className="modal-body">
                <div className="form-group"><label className="form-label">Catégorie</label>
                  <select className="form-select" value={editComp ? editComp.category : compForm.category}
                    onChange={e => editComp ? setEditComp({...editComp, category: e.target.value}) : setCompForm({...compForm, category: e.target.value})}>
                    <option value="TECHNIQUE">🔧 Technique</option>
                    <option value="TRANSVERSAL">🤝 Transversale</option>
                  </select>
                </div>
                <div className="form-row">
                  <div className="form-group"><label className="form-label">Code *</label>
                    <input className="form-input" value={editComp ? editComp.code : compForm.code}
                      onChange={e => editComp ? setEditComp({...editComp, code: e.target.value}) : setCompForm({...compForm, code: e.target.value})} required placeholder="C1, T2..." />
                  </div>
                  <div className="form-group"><label className="form-label">Nom *</label>
                    <input className="form-input" value={editComp ? editComp.name : compForm.name}
                      onChange={e => editComp ? setEditComp({...editComp, name: e.target.value}) : setCompForm({...compForm, name: e.target.value})} required />
                  </div>
                </div>
                <div className="form-group"><label className="form-label">Description complète</label>
                  <textarea className="form-input" rows={3} style={{ resize: 'vertical' }}
                    value={editComp ? editComp.description || '' : compForm.description}
                    onChange={e => editComp ? setEditComp({...editComp, description: e.target.value}) : setCompForm({...compForm, description: e.target.value})} />
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={() => { setShowAddComp(false); setEditComp(null); }}>Annuler</button>
                <button type="submit" className="btn btn-primary" disabled={savingComp}>{savingComp ? '⏳...' : editComp ? '💾 Enregistrer' : '+ Ajouter'}</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {commentModal && (
        <div className="modal-overlay" onClick={() => setCommentModal(null)}>
          <div className="modal" style={{ maxWidth: 460 }} onClick={e => e.stopPropagation()}>
            <div className="modal-header"><h2 className="modal-title">💬 Commentaire</h2><button className="btn btn-ghost btn-icon" onClick={() => setCommentModal(null)}>✕</button></div>
            <div className="modal-body"><textarea className="form-input" rows={4} style={{ resize: 'vertical' }} placeholder="Commentaire du jury..." value={commentText} onChange={e => setCommentText(e.target.value)} /></div>
            <div className="modal-footer">
              <button className="btn btn-secondary" onClick={() => setCommentModal(null)}>Annuler</button>
              <button className="btn btn-primary" onClick={async () => {
                if (!commentModal) return;
                const ev = getEval(commentModal.learnerId, commentModal.compId);
                await handleCellUpdate(commentModal.learnerId, commentModal.compId, ev?.status || 'PENDING', commentText);
                setCommentModal(null);
              }}>💾 Enregistrer</button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

// ─── Helper components & styles ───────────────────────────────────────────────
function LevelSelect({ value, disabled, onChange }: { value: string; disabled: boolean; onChange: (v: string) => void }) {
  const cfg = LEVEL_CONFIG[value] || LEVEL_CONFIG[''];
  return (
    <select style={{ fontSize: 10, fontWeight: 700, padding: '3px 4px', background: value ? cfg.bg : '#f8fafc', color: value ? cfg.color : '#94a3b8', border: `1px solid ${value ? cfg.bg : '#e2e8f0'}`, borderRadius: 4, width: '100%', minWidth: 95, cursor: disabled ? 'not-allowed' : 'pointer' }}
      value={value} disabled={disabled} onChange={e => onChange(e.target.value)}>
      {LEVELS.map(l => <option key={l} value={l}>{LEVEL_CONFIG[l]?.label || '—'}</option>)}
    </select>
  );
}
function stickyTh(left: number): React.CSSProperties {
  return { position: 'sticky', left, background: 'var(--bg-primary)', zIndex: 3, padding: '8px 10px', textAlign: 'left', borderBottom: '2px solid var(--border)', borderRight: '1px solid var(--border)', whiteSpace: 'nowrap' };
}
function stickyTd(left: number): React.CSSProperties {
  return { position: 'sticky', left, background: 'var(--bg-primary)', zIndex: 1, padding: '6px 10px' };
}
function colTh(bg: string): React.CSSProperties {
  return { padding: '5px 4px', textAlign: 'center', background: bg, borderBottom: '2px solid var(--border)', borderRight: '1px solid var(--border)', verticalAlign: 'top' };
}
