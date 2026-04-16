'use client';

import { useEffect, useMemo, useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import {
  SOURCING_CHECKIN_OPTIONS,
  SOURCING_RECOMMENDATION_OPTIONS,
  SOURCING_SCORE_OPTIONS,
  SOURCING_SECTIONS,
  DEFAULT_SOURCING_COMMITTEE,
  createDefaultSectionCriteria,
  computeFinalSourcingScore,
  computeSectionScore,
  getCheckInMeta,
  getInterviewStatusMeta,
  getSourcingDecisionMeta,
  getSourcingSection,
  normalizeCommitteeKey,
  parseSectionCriteria,
  suggestSectionRecommendation,
} from '@/lib/sourcing-session';

const STATUS_META: Record<string, { label: string; badgeClass: string }> = {
  DRAFT: { label: 'Brouillon', badgeClass: 'badge-gray' },
  OPEN: { label: 'Ouverte', badgeClass: 'badge-blue' },
  IN_PROGRESS: { label: 'En cours', badgeClass: 'badge-orange' },
  CLOSED: { label: 'Clôturée', badgeClass: 'badge-gray' },
  DECIDED: { label: 'Décisions prises', badgeClass: 'badge-green' },
  ARCHIVED: { label: 'Archivée', badgeClass: 'badge-gray' },
};

const JURY_SECTIONS = [
  ...SOURCING_SECTIONS.map((section) => ({ value: section.key, label: section.label })),
  { value: 'FINAL_COMMITTEE', label: 'Comité décision finale' },
];

export default function SourcingSessionDetailPage() {
  const params = useParams();
  const sessionId = String(params.id);
  const [session, setSession] = useState<any>(null);
  const [candidates, setCandidates] = useState<any[]>([]);
  const [staff, setStaff] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'overview' | 'jury' | 'decision'>('overview');
  const [selectedCandidateIds, setSelectedCandidateIds] = useState<string[]>([]);
  const [showAddCandidates, setShowAddCandidates] = useState(false);
  const [showAddJury, setShowAddJury] = useState(false);
  const [activeCommitteeKey, setActiveCommitteeKey] = useState(DEFAULT_SOURCING_COMMITTEE);
  const [juryForm, setJuryForm] = useState({ userId: '', section: 'ADMIN_MOTIVATION', committeeKey: DEFAULT_SOURCING_COMMITTEE, canFinalize: false });
  const [evaluationTarget, setEvaluationTarget] = useState<any>(null);
  const [decisionTarget, setDecisionTarget] = useState<any>(null);
  const [saving, setSaving] = useState(false);
  const [evalForm, setEvalForm] = useState({
    section: 'ADMIN_MOTIVATION',
    criteria: createDefaultSectionCriteria('ADMIN_MOTIVATION'),
    recommendation: 'PENDING',
    comment: '',
    strengths: '',
    risks: '',
    needsFollowUp: '',
  });
  const [decisionForm, setDecisionForm] = useState({ finalDecision: 'PENDING', finalComment: '' });

  const load = () => {
    setLoading(true);
    Promise.all([
      fetch(`/api/sourcing/sessions/${sessionId}`).then((r) => r.json()).catch(() => null),
      fetch('/api/candidates').then((r) => r.json()).catch(() => []),
      fetch('/api/sourcing/staff').then((r) => r.json()).catch(() => []),
    ]).then(([sessionData, candidateData, staffData]) => {
      setSession(sessionData);
      setCandidates(Array.isArray(candidateData) ? candidateData : []);
      setStaff(Array.isArray(staffData) ? staffData : []);
    }).finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, [sessionId]);

  const assignedCandidateIds = useMemo(
    () => new Set((session?.candidates || []).map((row: any) => row.candidateId)),
    [session],
  );
  const availableCandidates = candidates.filter((candidate) => !assignedCandidateIds.has(candidate.id));

  const committeeKeys = useMemo<string[]>(() => {
    if (session?.isCommitteeScoped && session?.currentUserCommitteeKeys?.length) {
      return session.currentUserCommitteeKeys as string[];
    }

    const keys = Array.from(new Set(
      [
        ...(session?.juryMembers || []).map((member: any) => member.committeeKey),
        ...(session?.candidates || []).map((row: any) => row.interviewCommitteeKey),
      ].filter(Boolean),
    )) as string[];
    return keys.length ? keys : [DEFAULT_SOURCING_COMMITTEE];
  }, [session]);

  useEffect(() => {
    if (!committeeKeys.includes(activeCommitteeKey)) {
      setActiveCommitteeKey(committeeKeys[0] || DEFAULT_SOURCING_COMMITTEE);
    }
  }, [committeeKeys, activeCommitteeKey]);

  const displayedCandidates = useMemo(() => {
    const rows = session?.candidates || [];
    return rows.filter((row: any) => {
      if (!row.interviewCommitteeKey || row.interviewCommitteeKey === activeCommitteeKey) return true;
      return row.interviewStatus === 'WAITING';
    });
  }, [session, activeCommitteeKey]);

  const stats = useMemo(() => {
    const rows = session?.candidates || [];
    const decided = rows.filter((row: any) => row.finalDecision && row.finalDecision !== 'PENDING').length;
    const present = rows.filter((row: any) => row.checkInStatus === 'PRESENT').length;
    const incomplete = rows.filter((row: any) => SOURCING_SECTIONS.some((section) => !row.evaluations?.some((ev: any) => ev.section === section.key && ev.status === 'SUBMITTED'))).length;
    const inProgress = rows.filter((row: any) => row.interviewStatus === 'IN_PROGRESS').length;
    return { total: rows.length, decided, present, incomplete, inProgress };
  }, [session]);

  const openEvaluation = (row: any, sectionKey: string) => {
    const existing = row.evaluations?.find((ev: any) => ev.section === sectionKey);
    const criteria = existing ? parseSectionCriteria(sectionKey, existing.criteriaJson) : createDefaultSectionCriteria(sectionKey);
    const score = computeSectionScore(sectionKey, criteria);
    setEvaluationTarget(row);
    setEvalForm({
      section: sectionKey,
      criteria,
      recommendation: existing?.recommendation || suggestSectionRecommendation(score),
      comment: existing?.comment || '',
      strengths: existing?.strengths || '',
      risks: existing?.risks || '',
      needsFollowUp: existing?.needsFollowUp || '',
    });
  };

  const openDecision = (row: any) => {
    const finalScore = computeFinalSourcingScore((row.evaluations || []).filter((ev: any) => ev.status === 'SUBMITTED'));
    setDecisionTarget({ ...row, computedScore: finalScore });
    setDecisionForm({
      finalDecision: row.finalDecision || 'PENDING',
      finalComment: row.finalComment || '',
    });
  };

  const handleAddCandidates = async () => {
    if (!selectedCandidateIds.length) return;
    setSaving(true);
    try {
      await fetch(`/api/sourcing/sessions/${sessionId}/candidates`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ candidateIds: selectedCandidateIds }),
      });
      setSelectedCandidateIds([]);
      setShowAddCandidates(false);
      load();
    } finally {
      setSaving(false);
    }
  };

  const handleAddJury = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      await fetch(`/api/sourcing/sessions/${sessionId}/jury`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(juryForm),
      });
      setJuryForm({ userId: '', section: 'ADMIN_MOTIVATION', committeeKey: activeCommitteeKey, canFinalize: false });
      setShowAddJury(false);
      load();
    } finally {
      setSaving(false);
    }
  };

  const handleCheckIn = async (row: any, checkInStatus: string) => {
    await fetch(`/api/sourcing/sessions/${sessionId}/candidates/${row.id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ checkInStatus }),
    });
    load();
  };

  const handleInterviewAction = async (row: any, interviewAction: 'START' | 'FINISH' | 'RELEASE') => {
    setSaving(true);
    try {
      const res = await fetch(`/api/sourcing/sessions/${sessionId}/candidates/${row.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          interviewAction,
          committeeKey: normalizeCommitteeKey(activeCommitteeKey),
        }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        alert(err.error || 'Action impossible sur cet entretien');
      }
      load();
    } finally {
      setSaving(false);
    }
  };

  const handleEvaluationSubmit = async (status: 'DRAFT' | 'SUBMITTED') => {
    if (!evaluationTarget) return;
    setSaving(true);
    try {
      await fetch(`/api/sourcing/sessions/${sessionId}/evaluations`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sessionCandidateId: evaluationTarget.id,
          section: evalForm.section,
          criteriaJson: evalForm.criteria,
          recommendation: evalForm.recommendation,
          comment: evalForm.comment,
          strengths: evalForm.strengths,
          risks: evalForm.risks,
          needsFollowUp: evalForm.needsFollowUp,
          status,
        }),
      });
      setEvaluationTarget(null);
      load();
    } finally {
      setSaving(false);
    }
  };

  const handleDecisionSubmit = async () => {
    if (!decisionTarget) return;
    setSaving(true);
    try {
      await fetch(`/api/sourcing/sessions/${sessionId}/candidates/${decisionTarget.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(decisionForm),
      });
      setDecisionTarget(null);
      load();
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <div className="page-body"><div className="loading-overlay"><span className="loading-spinner" /> Chargement...</div></div>;
  if (!session || session.error) return <div className="page-body"><div className="empty-state"><p>Session introuvable</p></div></div>;

  const meta = STATUS_META[session.status] || STATUS_META.DRAFT;

  return (
    <>
      <div className="page-header">
        <div>
          <div className="breadcrumbs">
            <Link href="/admin/sourcing/sessions">Sourcing</Link> / <span>{session.name}</span>
          </div>
          <h1 className="page-title">{session.name}</h1>
          <p className="page-subtitle">
            {session.date ? new Date(session.date).toLocaleDateString('fr-FR') : 'Date non définie'}
            {session.project?.name ? ` - ${session.project.name}` : ''}
            {session.campus?.name ? ` - ${session.campus.name}` : ''}
          </p>
        </div>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          <span className={`badge ${meta.badgeClass}`} style={{ alignSelf: 'center' }}>{meta.label}</span>
          <button className="btn btn-secondary" onClick={() => setShowAddJury(true)}>Affecter jury</button>
          <button className="btn btn-primary" onClick={() => setShowAddCandidates(true)}>Ajouter candidats</button>
        </div>
      </div>

      <div className="page-body">
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 12, marginBottom: 16 }}>
          <Metric label="Candidats" value={stats.total} />
          <Metric label="Présents" value={stats.present} tone="green" />
          <Metric label="En entretien" value={stats.inProgress} tone="orange" />
          <Metric label="Incomplets" value={stats.incomplete} tone="orange" />
          <Metric label="Décidés" value={stats.decided} tone="blue" />
        </div>

        <div className="tabs" style={{ marginBottom: 16 }}>
          <button className={`tab ${activeTab === 'overview' ? 'active' : ''}`} onClick={() => setActiveTab('overview')}>Candidats & évaluations</button>
          <button className={`tab ${activeTab === 'jury' ? 'active' : ''}`} onClick={() => setActiveTab('jury')}>Jurys</button>
          <button className={`tab ${activeTab === 'decision' ? 'active' : ''}`} onClick={() => setActiveTab('decision')}>Décisions</button>
        </div>

        {activeTab === 'overview' && (
          <div className="card">
            <div className="card-body" style={{ borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', gap: 12, alignItems: 'center', flexWrap: 'wrap' }}>
              <div>
                <h3 className="card-title" style={{ margin: 0 }}>File d'entretien</h3>
                <p className="text-muted" style={{ margin: '4px 0 0', fontSize: 13 }}>
                  Un candidat demarre par un comite est masque pour les autres comites actifs.
                </p>
              </div>
              <div style={{ minWidth: 240 }}>
                <label className="form-label">Comite actif</label>
                <select className="form-select" value={activeCommitteeKey} onChange={(e) => setActiveCommitteeKey(e.target.value)}>
                  {committeeKeys.map((key) => <option key={key} value={key}>{key}</option>)}
                </select>
              </div>
            </div>
            <table className="data-table">
              <thead>
                <tr>
                  <th>Candidat</th>
                  <th>Check-in</th>
                  <th>Entretien</th>
                  {SOURCING_SECTIONS.map((section) => <th key={section.key}>{section.shortLabel}</th>)}
                  <th>Final</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {displayedCandidates.length === 0 && (
                  <tr><td colSpan={8} style={{ textAlign: 'center', padding: 24, color: 'var(--text-muted)' }}>Aucun candidat disponible pour ce comite.</td></tr>
                )}
                {displayedCandidates.map((row: any) => {
                  const checkMeta = getCheckInMeta(row.checkInStatus);
                  const interviewMeta = getInterviewStatusMeta(row.interviewStatus);
                  const isCurrentCommittee = row.interviewCommitteeKey === activeCommitteeKey;
                  const finalMeta = getSourcingDecisionMeta(row.finalDecision);
                  const submittedEvaluations = (row.evaluations || []).filter((ev: any) => ev.status === 'SUBMITTED');
                  const finalScore = row.finalScore ?? computeFinalSourcingScore(submittedEvaluations);
                  return (
                    <tr key={row.id}>
                      <td>
                        <div style={{ fontWeight: 700 }}>{row.candidate.firstName} {row.candidate.lastName}</div>
                        <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>{row.candidate.email}</div>
                      </td>
                      <td>
                        <select className="form-select" value={row.checkInStatus} onChange={(e) => handleCheckIn(row, e.target.value)} style={{ minWidth: 120 }}>
                          {SOURCING_CHECKIN_OPTIONS.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
                        </select>
                        <span className={`badge ${checkMeta.badgeClass}`} style={{ marginTop: 6 }}>{checkMeta.label}</span>
                      </td>
                      <td>
                        <div style={{ display: 'grid', gap: 6, minWidth: 160 }}>
                          <span className={`badge ${interviewMeta.badgeClass}`}>{interviewMeta.label}</span>
                          <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                            {row.interviewCommitteeKey || 'Non attribue'}
                            {row.interviewCommitteeKey && isCurrentCommittee ? ' (ce comite)' : ''}
                          </span>
                          {row.interviewStartedBy && (
                            <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>
                              Par {row.interviewStartedBy.firstName} {row.interviewStartedBy.lastName}
                            </span>
                          )}
                        </div>
                      </td>
                      {SOURCING_SECTIONS.map((section) => {
                        const evaluation = row.evaluations?.find((ev: any) => ev.section === section.key);
                        const recommendationMeta = getSourcingDecisionMeta(evaluation?.recommendation);
                        return (
                          <td key={section.key}>
                            {evaluation ? (
                              <div style={{ display: 'grid', gap: 4 }}>
                                <span style={{ fontWeight: 700 }}>{Math.round(evaluation.score || 0)}/100</span>
                                <span className={`badge ${recommendationMeta.badgeClass}`}>{recommendationMeta.label}</span>
                                <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>
                                  {evaluation.evaluator?.firstName} {evaluation.evaluator?.lastName}
                                </span>
                              </div>
                            ) : (
                              <span className="badge badge-gray">À saisir</span>
                            )}
                          </td>
                        );
                      })}
                      <td>
                        <div style={{ display: 'grid', gap: 4 }}>
                          <span style={{ fontWeight: 800 }}>{typeof finalScore === 'number' ? `${Math.round(finalScore)}/100` : '-'}</span>
                          <span className={`badge ${finalMeta.badgeClass}`}>{finalMeta.label}</span>
                        </div>
                      </td>
                      <td>
                        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                          {row.interviewStatus === 'IN_PROGRESS' && isCurrentCommittee ? (
                            <>
                              <button className="btn btn-sm btn-primary" disabled={saving} onClick={() => handleInterviewAction(row, 'FINISH')}>Terminer</button>
                              <button className="btn btn-sm btn-secondary" disabled={saving} onClick={() => handleInterviewAction(row, 'RELEASE')}>Liberer</button>
                            </>
                          ) : (
                            <button className="btn btn-sm btn-primary" disabled={saving} onClick={() => handleInterviewAction(row, 'START')}>
                              {row.interviewStatus === 'DONE' ? 'Reprendre' : 'Demarrer'}
                            </button>
                          )}
                          {SOURCING_SECTIONS.map((section) => (
                            <button key={section.key} className="btn btn-sm btn-secondary" onClick={() => openEvaluation(row, section.key)}>{section.shortLabel}</button>
                          ))}
                          <button className="btn btn-sm btn-primary" onClick={() => openDecision(row)}>Décider</button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {activeTab === 'jury' && (
          <div className="card">
            <div className="card-header"><h3 className="card-title">Jurys affectés</h3></div>
            <div className="card-body">
              {session.juryMembers.length === 0 ? (
                <p className="text-muted">Aucun jury affecté pour le moment.</p>
              ) : (
                <div style={{ display: 'grid', gap: 10 }}>
                  {session.juryMembers.map((member: any) => {
                    const section = member.section === 'FINAL_COMMITTEE'
                      ? { label: 'Comité décision finale' }
                      : getSourcingSection(member.section);
                    return (
                      <div key={member.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: 12, border: '1px solid var(--border)', borderRadius: 8 }}>
                        <div>
                          <div style={{ fontWeight: 700 }}>{member.user.firstName} {member.user.lastName}</div>
                          <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>{member.user.email}</div>
                        </div>
                        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                          {member.committeeKey && <span className="badge badge-gray">{member.committeeKey}</span>}
                          <span className="badge badge-blue">{section.label}</span>
                          {member.canFinalize && <span className="badge badge-green">Décision finale</span>}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        )}

        {activeTab === 'decision' && (
          <div style={{ display: 'grid', gap: 12 }}>
            {session.candidates.map((row: any) => {
              const submitted = (row.evaluations || []).filter((ev: any) => ev.status === 'SUBMITTED');
              const score = row.finalScore ?? computeFinalSourcingScore(submitted);
              const finalMeta = getSourcingDecisionMeta(row.finalDecision);
              const missing = SOURCING_SECTIONS.filter((section) => !submitted.some((ev: any) => ev.section === section.key));
              return (
                <div key={row.id} className="card">
                  <div className="card-body">
                    <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, alignItems: 'flex-start', marginBottom: 12 }}>
                      <div>
                        <h3 style={{ margin: 0 }}>{row.candidate.firstName} {row.candidate.lastName}</h3>
                        <p className="text-muted" style={{ margin: '4px 0 0' }}>{row.candidate.email}</p>
                      </div>
                      <div style={{ textAlign: 'right' }}>
                        <div style={{ fontSize: 24, fontWeight: 800 }}>{typeof score === 'number' ? `${Math.round(score)}/100` : '-'}</div>
                        <span className={`badge ${finalMeta.badgeClass}`}>{finalMeta.label}</span>
                      </div>
                    </div>
                    {missing.length > 0 && (
                      <div className="badge badge-orange" style={{ marginBottom: 12 }}>
                        Évaluations manquantes : {missing.map((section) => section.shortLabel).join(', ')}
                      </div>
                    )}
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 10, marginBottom: 12 }}>
                      {submitted.map((ev: any) => {
                        const section = getSourcingSection(ev.section);
                        const rec = getSourcingDecisionMeta(ev.recommendation);
                        return (
                          <div key={ev.id} style={{ border: '1px solid var(--border)', borderRadius: 8, padding: 12 }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                              <strong>{section.shortLabel}</strong>
                              <span className={`badge ${rec.badgeClass}`}>{rec.label}</span>
                            </div>
                            <div style={{ fontWeight: 800, marginBottom: 6 }}>{Math.round(ev.score || 0)}/100</div>
                            {ev.comment && <p style={{ margin: 0, fontSize: 12, color: 'var(--text-secondary)' }}>{ev.comment}</p>}
                          </div>
                        );
                      })}
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                      <button className="btn btn-primary" onClick={() => openDecision(row)}>Prendre la décision</button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {showAddCandidates && (
        <div className="modal-overlay" onClick={() => setShowAddCandidates(false)}>
          <div className="modal" style={{ maxWidth: 720 }} onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2 className="modal-title">Ajouter des candidats</h2>
              <button className="btn btn-ghost btn-icon" onClick={() => setShowAddCandidates(false)}>x</button>
            </div>
            <div className="modal-body">
              <p className="text-muted">Sélectionne les candidats à inviter à cette session.</p>
              <select
                multiple
                className="form-select"
                style={{ minHeight: 260 }}
                value={selectedCandidateIds}
                onChange={(e) => setSelectedCandidateIds(Array.from(e.target.selectedOptions).map((option) => option.value))}
              >
                {availableCandidates.map((candidate) => (
                  <option key={candidate.id} value={candidate.id}>
                    {candidate.firstName} {candidate.lastName} - {candidate.email}
                  </option>
                ))}
              </select>
            </div>
            <div className="modal-footer">
              <button className="btn btn-secondary" onClick={() => setShowAddCandidates(false)}>Annuler</button>
              <button className="btn btn-primary" onClick={handleAddCandidates} disabled={saving || selectedCandidateIds.length === 0}>Ajouter</button>
            </div>
          </div>
        </div>
      )}

      {showAddJury && (
        <div className="modal-overlay" onClick={() => setShowAddJury(false)}>
          <div className="modal" style={{ maxWidth: 620 }} onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2 className="modal-title">Affecter un jury</h2>
              <button className="btn btn-ghost btn-icon" onClick={() => setShowAddJury(false)}>x</button>
            </div>
            <form onSubmit={handleAddJury}>
              <div className="modal-body">
                <div className="form-group">
                  <label className="form-label">Intervenant</label>
                  <select className="form-select" value={juryForm.userId} onChange={(e) => setJuryForm({ ...juryForm, userId: e.target.value })} required>
                    <option value="">Sélectionner</option>
                    {staff.map((user) => <option key={user.id} value={user.id}>{user.firstName} {user.lastName} - {user.role}</option>)}
                  </select>
                </div>
                <div className="form-group">
                  <label className="form-label">Section</label>
                  <select className="form-select" value={juryForm.section} onChange={(e) => setJuryForm({
                    ...juryForm,
                    section: e.target.value,
                    committeeKey: e.target.value === 'FINAL_COMMITTEE' ? '' : (juryForm.committeeKey || activeCommitteeKey),
                    canFinalize: e.target.value === 'FINAL_COMMITTEE',
                  })}>
                    {JURY_SECTIONS.map((section) => <option key={section.value} value={section.value}>{section.label}</option>)}
                  </select>
                </div>
                {juryForm.section !== 'FINAL_COMMITTEE' && (
                  <div className="form-group">
                    <label className="form-label">Comite / salle</label>
                    <input
                      className="form-input"
                      value={juryForm.committeeKey}
                      onChange={(e) => setJuryForm({ ...juryForm, committeeKey: e.target.value })}
                      placeholder="Ex: COMITE-1, Salle A"
                    />
                    <p className="text-muted" style={{ margin: '6px 0 0', fontSize: 12 }}>
                      Mets le meme comite pour le jury admin/motivation et le jury technique qui travaillent ensemble.
                    </p>
                  </div>
                )}
                <label style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <input type="checkbox" checked={juryForm.canFinalize} onChange={(e) => setJuryForm({ ...juryForm, canFinalize: e.target.checked })} />
                  Peut valider les décisions finales
                </label>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={() => setShowAddJury(false)}>Annuler</button>
                <button type="submit" className="btn btn-primary" disabled={saving}>Affecter</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {evaluationTarget && (
        <div className="modal-overlay" onClick={() => setEvaluationTarget(null)}>
          <div className="modal" style={{ maxWidth: 860 }} onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2 className="modal-title">{getSourcingSection(evalForm.section).label} - {evaluationTarget.candidate.firstName} {evaluationTarget.candidate.lastName}</h2>
              <button className="btn btn-ghost btn-icon" onClick={() => setEvaluationTarget(null)}>x</button>
            </div>
            <div className="modal-body" style={{ maxHeight: '76vh', overflowY: 'auto' }}>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 10, marginBottom: 16 }}>
                <Metric label="Score section" value={`${Math.round(computeSectionScore(evalForm.section, evalForm.criteria))}/100`} tone="blue" />
                <div className="form-group">
                  <label className="form-label">Avis du jury</label>
                  <select className="form-select" value={evalForm.recommendation} onChange={(e) => setEvalForm({ ...evalForm, recommendation: e.target.value })}>
                    {SOURCING_RECOMMENDATION_OPTIONS.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
                  </select>
                </div>
              </div>
              <div style={{ display: 'grid', gap: 12 }}>
                {getSourcingSection(evalForm.section).criteria.map((criterion) => (
                  <div key={criterion.key} style={{ border: '1px solid var(--border)', borderRadius: 8, padding: 12 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, marginBottom: 8 }}>
                      <div>
                        <div style={{ fontWeight: 700 }}>{criterion.label}</div>
                        <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>{criterion.helpText}</div>
                      </div>
                      <strong>{evalForm.criteria[criterion.key] || 3}/5</strong>
                    </div>
                    <select
                      className="form-select"
                      value={evalForm.criteria[criterion.key] || 3}
                      onChange={(e) => setEvalForm({
                        ...evalForm,
                        criteria: { ...evalForm.criteria, [criterion.key]: Number(e.target.value) },
                      })}
                    >
                      {SOURCING_SCORE_OPTIONS.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
                    </select>
                  </div>
                ))}
              </div>
              <div className="form-row" style={{ marginTop: 16 }}>
                <div className="form-group">
                  <label className="form-label">Points forts</label>
                  <textarea className="form-input" rows={3} value={evalForm.strengths} onChange={(e) => setEvalForm({ ...evalForm, strengths: e.target.value })} />
                </div>
                <div className="form-group">
                  <label className="form-label">Risques / vigilance</label>
                  <textarea className="form-input" rows={3} value={evalForm.risks} onChange={(e) => setEvalForm({ ...evalForm, risks: e.target.value })} />
                </div>
              </div>
              <div className="form-group">
                <label className="form-label">Commentaire du jury</label>
                <textarea className="form-input" rows={4} value={evalForm.comment} onChange={(e) => setEvalForm({ ...evalForm, comment: e.target.value })} placeholder="Observation propre à ce jury et cette section..." />
              </div>
              <div className="form-group">
                <label className="form-label">Besoin de suivi / adaptation</label>
                <textarea className="form-input" rows={2} value={evalForm.needsFollowUp} onChange={(e) => setEvalForm({ ...evalForm, needsFollowUp: e.target.value })} />
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn btn-secondary" onClick={() => setEvaluationTarget(null)}>Annuler</button>
              <button className="btn btn-secondary" disabled={saving} onClick={() => handleEvaluationSubmit('DRAFT')}>Enregistrer brouillon</button>
              <button className="btn btn-primary" disabled={saving} onClick={() => handleEvaluationSubmit('SUBMITTED')}>Soumettre l'évaluation</button>
            </div>
          </div>
        </div>
      )}

      {decisionTarget && (
        <div className="modal-overlay" onClick={() => setDecisionTarget(null)}>
          <div className="modal" style={{ maxWidth: 760 }} onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2 className="modal-title">Décision finale - {decisionTarget.candidate.firstName} {decisionTarget.candidate.lastName}</h2>
              <button className="btn btn-ghost btn-icon" onClick={() => setDecisionTarget(null)}>x</button>
            </div>
            <div className="modal-body">
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 10, marginBottom: 16 }}>
                <Metric label="Score consolidé" value={typeof decisionTarget.computedScore === 'number' ? `${Math.round(decisionTarget.computedScore)}/100` : '-'} tone="blue" />
                <div className="form-group">
                  <label className="form-label">Décision finale</label>
                  <select className="form-select" value={decisionForm.finalDecision} onChange={(e) => setDecisionForm({ ...decisionForm, finalDecision: e.target.value })}>
                    <option value="PENDING">À discuter</option>
                    <option value="QUALIFIED">Validé</option>
                    <option value="WAITLIST">Liste d'attente</option>
                    <option value="REJECTED">Rejeté</option>
                    <option value="ABSENT">Absent</option>
                  </select>
                </div>
              </div>
              <div className="form-group">
                <label className="form-label">Commentaire décision finale</label>
                <textarea className="form-input" rows={5} value={decisionForm.finalComment} onChange={(e) => setDecisionForm({ ...decisionForm, finalComment: e.target.value })} placeholder="Explique le choix final en s'appuyant sur les avis des jurys..." />
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn btn-secondary" onClick={() => setDecisionTarget(null)}>Annuler</button>
              <button className="btn btn-primary" disabled={saving} onClick={handleDecisionSubmit}>Valider la décision</button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

function Metric({ label, value, tone = 'default' }: { label: string; value: React.ReactNode; tone?: 'default' | 'green' | 'orange' | 'blue' }) {
  const color = tone === 'green' ? '#16a34a' : tone === 'orange' ? '#f59e0b' : tone === 'blue' ? '#2563eb' : 'var(--text-primary)';
  return (
    <div className="card">
      <div className="card-body" style={{ padding: 14 }}>
        <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 6, textTransform: 'uppercase', letterSpacing: 0.4 }}>{label}</div>
        <div style={{ fontSize: 24, fontWeight: 800, color }}>{value}</div>
      </div>
    </div>
  );
}
