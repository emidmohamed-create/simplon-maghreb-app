'use client';

import { useEffect, useState, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  ACADEMIC_LEVEL_OPTIONS,
  SOURCE_CHANNEL_OPTIONS,
  SOURCING_CRITERIA_GROUPS,
  SOURCING_RECOMMENDATION_OPTIONS,
  SOURCING_SCORE_OPTIONS,
  createDefaultSourcingCriteria,
  computeSourcingScore,
  getSourcingRecommendationMeta,
  normalizeSourcingCriteria,
  parseSourcingCriteria,
  resolveSourcingRecommendation,
  suggestSourcingRecommendation,
} from '@/lib/candidate-sourcing';

// Profil candidat et sourcing
const PIPELINE_STAGES = [
  { key: 'NEW', label: 'Nouveau', icon: 'N', color: '#94a3b8' },
  { key: 'CONTACTED', label: 'Contacté', icon: 'C', color: '#3b82f6' },
  { key: 'QUALIFIED', label: 'Qualifié', icon: 'Q', color: '#06b6d4' },
  { key: 'EVALUATED', label: 'Évalué', icon: 'E', color: '#f59e0b' },
  { key: 'SELECTED', label: 'Sélectionné', icon: 'S', color: '#8b5cf6' },
  { key: 'REJECTED', label: 'Rejeté', icon: 'R', color: '#ef4444' },
  { key: 'CONVERTED', label: 'Converti', icon: 'A', color: '#22c55e' },
];

const CONTACT_CHANNELS = ['Téléphone', 'Email', 'WhatsApp', 'SMS', 'Présentiel', 'Réseaux sociaux'];

const parseContactHistory = (raw: any) => {
  try {
    return JSON.parse(raw || '[]');
  } catch {
    return [];
  }
};

export default function CandidateDetailPage() {
  const params  = useParams();
  const router  = useRouter();
  const [candidate, setCandidate] = useState<any>(null);
  const [cohorts,   setCohorts]   = useState<any[]>([]);
  const [loading,   setLoading]   = useState(true);
  const [activeTab, setActiveTab] = useState('profile');

  // Editing state
  const [editForm, setEditForm] = useState<any>(null);
  const [saving,   setSaving]   = useState(false);

  // Contact log
  const [showContactModal, setShowContactModal] = useState(false);
  const [contactForm, setContactForm] = useState({ date: new Date().toISOString().split('T')[0], channel: 'Téléphone', note: '' });

  // Evaluation modal
  const [showEvalModal, setShowEvalModal] = useState(false);
  const [evalForm, setEvalForm] = useState({
    recommendation: 'AUTO',
    comment: '',
    evaluationDate: new Date().toISOString().split('T')[0],
    criteria: createDefaultSourcingCriteria(),
  });
  const [savingEval, setSavingEval] = useState(false);

  // Convert modal
  const [showConvert, setShowConvert] = useState(false);
  const [convertCohort, setConvertCohort] = useState('');

  const load = useCallback(() => {
    setLoading(true);
    Promise.all([
      fetch(`/api/candidates/${params.id}`).then(r => r.json()).catch(() => null),
      fetch('/api/cohorts').then(r => r.json()).catch(() => []),
    ]).then(([c, co]) => {
      setCandidate(c);
      setCohorts(Array.isArray(co) ? co : []);
      if (c) setEditForm({ ...c, birthdate: c.birthdate ? new Date(c.birthdate).toISOString().split('T')[0] : '' });
    }).finally(() => setLoading(false));
  }, [params.id]);

  useEffect(() => { load(); }, [load]);

  // Sauvegarder les informations du profil candidat
  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      await fetch(`/api/candidates/${params.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(editForm),
      });
      load();
    } finally { setSaving(false); }
  };

  // Ajouter un échange au journal de contact
  const handleAddContact = async (e: React.FormEvent) => {
    e.preventDefault();
    const currentHistory = parseContactHistory(candidate.contactHistory);
    const newEntry = { ...contactForm, id: Date.now() };
    const updated = [newEntry, ...currentHistory];

    // Update stage to CONTACTED if still NEW
    const newStage = candidate.currentStage === 'NEW' ? 'CONTACTED' : candidate.currentStage;

    await fetch(`/api/candidates/${params.id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...candidate, contactHistory: updated, currentStage: newStage }),
    });
    setShowContactModal(false);
    setContactForm({ date: new Date().toISOString().split('T')[0], channel: 'Téléphone', note: '' });
    load();
  };

  // Enregistrer l'Évaluation sourcing du candidat
  const handleSubmitEval = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingEval(true);
    try {
      const totalScore = computeSourcingScore(evalForm.criteria);
      const recommendation = resolveSourcingRecommendation(evalForm.recommendation, totalScore);

      await fetch(`/api/candidates/${params.id}/evaluate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          recommendation,
          score: totalScore.toFixed(1),
          comment: evalForm.comment,
          evaluationDate: evalForm.evaluationDate,
          criteriaJson: evalForm.criteria,
        }),
      });
      setShowEvalModal(false);
      load();
    } finally {
      setSavingEval(false);
    }
  };
  const handleConvert = async () => {
    if (!convertCohort) return;
    await fetch(`/api/candidates/${params.id}/convert`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ cohortId: convertCohort }),
    });
    setShowConvert(false);
    load();
  };

  const handleStageChange = async (stage: string) => {
    await fetch(`/api/candidates/${params.id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...candidate, currentStage: stage }),
    });
    load();
  };

  if (loading) return <div className="page-body"><div className="loading-overlay"><span className="loading-spinner" /> Chargement...</div></div>;
  if (!candidate) return <div className="page-body"><div className="empty-state"><p>Candidat introuvable</p></div></div>;

  const stage     = PIPELINE_STAGES.find(s => s.key === candidate.currentStage) || PIPELINE_STAGES[0];
  const stageIdx  = PIPELINE_STAGES.findIndex(s => s.key === candidate.currentStage);
  const contactHistory: any[] = parseContactHistory(candidate.contactHistory);
  const latestEval = candidate.evaluations?.[0];
  const latestEvalScore = latestEval?.score ?? null;
  const latestEvalMeta = latestEval ? getSourcingRecommendationMeta(latestEval.recommendation) : null;

  return (
    <>
      <div className="page-header">
        <div>
          <div className="breadcrumbs">
            <Link href="/admin/candidates">Candidats</Link> / <span>{candidate.firstName} {candidate.lastName}</span>
          </div>
          <h1 className="page-title">{candidate.firstName} {candidate.lastName}</h1>
          <p className="page-subtitle">{candidate.email} - {candidate.phone || 'Pas de téléphone'}</p>
        </div>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          <button className="btn btn-secondary" onClick={() => setShowContactModal(true)}>Ajouter contact</button>
          {candidate.currentStage !== 'CONVERTED' && candidate.currentStage !== 'REJECTED' && (
            <button className="btn btn-warning" onClick={() => setShowEvalModal(true)}>Évaluer</button>
          )}
          {(candidate.currentStage === 'EVALUATED' || candidate.currentStage === 'QUALIFIED' || candidate.currentStage === 'SELECTED') && (!candidate.learnerProfiles || candidate.learnerProfiles.length === 0) && (
            <button className="btn btn-primary" onClick={() => setShowConvert(true)}>Convertir en apprenant</button>
          )}
          {candidate.learnerProfiles && candidate.learnerProfiles.length > 0 && (
            <Link href={`/admin/learners/${candidate.learnerProfiles[0].id}`} className="btn btn-primary">Voir apprenant</Link>
          )}
        </div>
      </div>

      <div className="page-body">
        <div className="card" style={{ marginBottom: 20 }}>
          <div className="card-body" style={{ padding: '16px 20px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 0, overflowX: 'auto' }}>
              {PIPELINE_STAGES.filter(s => s.key !== 'REJECTED').map((s, i, arr) => {
                const isActive  = s.key === candidate.currentStage;
                const isPast    = PIPELINE_STAGES.slice(0, stageIdx).some(p => p.key === s.key);
                const isRejected = candidate.currentStage === 'REJECTED';
                return (
                  <div key={s.key} style={{ display: 'flex', alignItems: 'center', flex: i < arr.length - 1 ? '1 1 0' : 'none' }}>
                    <div
                      style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4, cursor: 'pointer', minWidth: 80 }}
                      onClick={() => !isRejected && handleStageChange(s.key)}
                    >
                      <div style={{
                        width: 40, height: 40, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center',
                        background: isActive ? s.color : isPast ? `${s.color}40` : 'var(--bg-secondary)',
                        border: `2px solid ${isActive ? s.color : isPast ? s.color : 'var(--border)'}`,
                        fontSize: 16, transition: 'all 0.2s',
                      }}>
                        {s.icon}
                      </div>
                      <span style={{ fontSize: 10, fontWeight: isActive ? 700 : 400, color: isActive ? s.color : 'var(--text-muted)', whiteSpace: 'nowrap' }}>
                        {s.label}
                      </span>
                    </div>
                    {i < arr.length - 1 && (
                      <div style={{ flex: 1, height: 2, background: isPast || isActive ? s.color : 'var(--border)', margin: '0 0 16px 0', transition: 'background 0.2s' }} />
                    )}
                  </div>
                );
              })}
              {candidate.currentStage === 'REJECTED' && (
                <span className="badge badge-red" style={{ marginLeft: 12 }}>Rejeté</span>
              )}
            </div>
          </div>
        </div>

        <div className="tabs" style={{ marginBottom: 16 }}>
          <button className={`tab ${activeTab === 'profile' ? 'active' : ''}`} onClick={() => setActiveTab('profile')}>Profil</button>
          <button className={`tab ${activeTab === 'contacts' ? 'active' : ''}`} onClick={() => setActiveTab('contacts')}>
            Contacts {contactHistory.length > 0 && <span className="badge badge-blue" style={{ marginLeft: 6, fontSize: 10 }}>{contactHistory.length}</span>}
          </button>
          <button className={`tab ${activeTab === 'evaluation' ? 'active' : ''}`} onClick={() => setActiveTab('evaluation')}>
            Évaluations {candidate.evaluations?.length > 0 && <span className="badge badge-orange" style={{ marginLeft: 6, fontSize: 10 }}>{candidate.evaluations.length}</span>}
          </button>
        </div>

        {activeTab === 'profile' && editForm && (
          <form onSubmit={handleSaveProfile}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
              <div className="card">
                <div className="card-header"><h3 className="card-title">Informations personnelles</h3></div>
                <div className="card-body">
                  <div className="form-row">
                    <div className="form-group"><label className="form-label">Prénom</label><input className="form-input" value={editForm.firstName} onChange={e => setEditForm({...editForm, firstName: e.target.value})} required /></div>
                    <div className="form-group"><label className="form-label">Nom</label><input className="form-input" value={editForm.lastName} onChange={e => setEditForm({...editForm, lastName: e.target.value})} required /></div>
                  </div>
                  <div className="form-group"><label className="form-label">Email</label><input type="email" className="form-input" value={editForm.email} onChange={e => setEditForm({...editForm, email: e.target.value})} required /></div>
                  <div className="form-row">
                    <div className="form-group"><label className="form-label">Téléphone</label><input className="form-input" value={editForm.phone || ''} onChange={e => setEditForm({...editForm, phone: e.target.value})} /></div>
                    <div className="form-group"><label className="form-label">CIN</label><input className="form-input" value={editForm.cin || ''} onChange={e => setEditForm({...editForm, cin: e.target.value})} /></div>
                  </div>
                  <div className="form-row">
                    <div className="form-group"><label className="form-label">Date de naissance</label><input type="date" className="form-input" value={editForm.birthdate || ''} onChange={e => setEditForm({...editForm, birthdate: e.target.value})} /></div>
                    <div className="form-group">
                      <label className="form-label">Genre</label>
                      <select className="form-select" value={editForm.gender || ''} onChange={e => setEditForm({...editForm, gender: e.target.value})}>
                        <option value="">Non précisé</option>
                        <option value="MALE">Homme</option>
                        <option value="FEMALE">Femme</option>
                      </select>
                    </div>
                  </div>
                </div>
              </div>

              <div className="card">
                <div className="card-header"><h3 className="card-title">Qualification & Sourcing</h3></div>
                <div className="card-body">
                  <div className="form-row">
                    <div className="form-group">
                      <label className="form-label">Niveau académique</label>
                      <select className="form-select" value={editForm.academicLevel || ''} onChange={e => setEditForm({...editForm, academicLevel: e.target.value})}>
                        <option value="">Non précisé</option>
                        {ACADEMIC_LEVEL_OPTIONS.map(l => <option key={l} value={l}>{l}</option>)}
                      </select>
                    </div>
                    <div className="form-group"><label className="form-label">Filière</label><input className="form-input" placeholder="Informatique, Gestion..." value={editForm.academicField || ''} onChange={e => setEditForm({...editForm, academicField: e.target.value})} /></div>
                  </div>
                  <div className="form-group">
                    <label className="form-label">Canal de sourcing</label>
                    <select className="form-select" value={editForm.sourceChannel || ''} onChange={e => setEditForm({...editForm, sourceChannel: e.target.value})}>
                      <option value="">Non précisé</option>
                      {SOURCE_CHANNEL_OPTIONS.map(c => <option key={c} value={c}>{c}</option>)}
                    </select>
                  </div>
                  <div className="form-group">
                    <label className="form-label">Statut dans le pipeline</label>
                    <select className="form-select" value={editForm.currentStage} onChange={e => setEditForm({...editForm, currentStage: e.target.value})}>
                      {PIPELINE_STAGES.map(s => <option key={s.key} value={s.key}>{s.icon} {s.label}</option>)}
                    </select>
                  </div>
                  <div className="form-group"><label className="form-label">Notes internes</label><textarea className="form-input" rows={2} style={{ resize: 'vertical' }} value={editForm.notes || ''} onChange={e => setEditForm({...editForm, notes: e.target.value})} /></div>
                </div>
              </div>
            </div>

            <div className="card" style={{ marginTop: 16 }}>
              <div className="card-header"><h3 className="card-title">Motivation</h3></div>
              <div className="card-body">
                <textarea className="form-input" rows={4} style={{ resize: 'vertical' }} placeholder="Décrivez la motivation du candidat, son projet professionnel, ses attentes..."
                  value={editForm.motivation || ''} onChange={e => setEditForm({...editForm, motivation: e.target.value})} />
              </div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 16 }}>
              <button type="submit" className="btn btn-primary" disabled={saving}>
                {saving ? 'Enregistrement...' : 'Enregistrer le profil'}
              </button>
            </div>
          </form>
        )}

        {activeTab === 'contacts' && (
          <>
            <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 12 }}>
              <button className="btn btn-primary" onClick={() => setShowContactModal(true)}>+ Ajouter un contact</button>
            </div>
            {contactHistory.length === 0 ? (
              <div className="empty-state"><p>Aucun contact enregistré pour l'instant. Ajoutez le premier échange.</p></div>
            ) : (
              <div className="card">
                <div style={{ padding: '0' }}>
                  {contactHistory.map((c: any, i: number) => (
                    <div key={c.id || i} style={{ padding: '14px 20px', borderBottom: i < contactHistory.length - 1 ? '1px solid var(--border)' : 'none', display: 'flex', gap: 16, alignItems: 'flex-start' }}>
                      <div style={{ flexShrink: 0, width: 40, height: 40, borderRadius: '50%', background: 'var(--primary)', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16 }}>
                        {c.channel === 'Téléphone' ? 'Tel' : c.channel === 'Email' ? 'Mail' : c.channel === 'WhatsApp' ? 'WA' : c.channel === 'SMS' ? 'SMS' : 'Note'}
                      </div>
                      <div style={{ flex: 1 }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                          <span style={{ fontWeight: 700, fontSize: 13 }}>{c.channel}</span>
                          <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>{new Date(c.date).toLocaleDateString('fr-FR')}</span>
                        </div>
                        <p style={{ fontSize: 13, color: 'var(--text-secondary)', margin: 0 }}>{c.note || 'Aucune note'}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
      </>
        )}

        {activeTab === 'evaluation' && (
          <>
            <div className="card" style={{ marginBottom: 16 }}>
              <div className="card-header">
                <h3 className="card-title">Synthèse sourcing</h3>
              </div>
              <div className="card-body">
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 12 }}>
                  <div style={{ padding: 12, border: '1px solid var(--border)', borderRadius: 12, background: 'var(--bg-secondary)' }}>
                    <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 4 }}>Niveau académique</div>
                    <div style={{ fontWeight: 700 }}>{candidate.academicLevel || 'Non précisé'}</div>
                  </div>
                  <div style={{ padding: 12, border: '1px solid var(--border)', borderRadius: 12, background: 'var(--bg-secondary)' }}>
                    <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 4 }}>Filière</div>
                    <div style={{ fontWeight: 700 }}>{candidate.academicField || 'Non précisée'}</div>
                  </div>
                  <div style={{ padding: 12, border: '1px solid var(--border)', borderRadius: 12, background: 'var(--bg-secondary)' }}>
                    <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 4 }}>Canal de sourcing</div>
                    <div style={{ fontWeight: 700 }}>{candidate.sourceChannel || 'Non précisé'}</div>
                  </div>
                  <div style={{ padding: 12, border: '1px solid var(--border)', borderRadius: 12, background: 'var(--bg-secondary)' }}>
                    <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 4 }}>Dernier score</div>
                    <div style={{ fontWeight: 700, color: latestEvalScore && latestEvalScore >= 75 ? '#22c55e' : latestEvalScore && latestEvalScore >= 55 ? '#f59e0b' : '#ef4444' }}>
                      {latestEvalScore ? `${Math.round(Number(latestEvalScore))}/100` : '?'}
                    </div>
                  </div>
                  <div style={{ padding: 12, border: '1px solid var(--border)', borderRadius: 12, background: 'var(--bg-secondary)' }}>
                    <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 4 }}>Dernière décision</div>
                    {latestEvalMeta ? (
                      <span className={`badge ${latestEvalMeta.badgeClass}`}>{latestEvalMeta.label}</span>
                    ) : (
                      <span className="badge badge-gray">Aucune</span>
                    )}
                  </div>
                  <div style={{ padding: 12, border: '1px solid var(--border)', borderRadius: 12, background: 'var(--bg-secondary)' }}>
                    <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 4 }}>Statut pipeline</div>
                    <span className={`badge ${stage.color === '#ef4444' ? 'badge-red' : stage.color === '#22c55e' ? 'badge-green' : 'badge-blue'}`}>
                      {stage.icon} {stage.label}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 12 }}>
              {candidate.currentStage !== 'CONVERTED' && candidate.currentStage !== 'REJECTED' && (
                <button className="btn btn-warning" onClick={() => setShowEvalModal(true)}>+ Nouvelle Évaluation</button>
              )}
            </div>
            {candidate.evaluations?.length === 0 ? (
              <div className="empty-state"><p>Aucune Évaluation enregistrée</p></div>
            ) : (
              candidate.evaluations?.map((ev: any) => {
                const criteria = parseSourcingCriteria(ev.criteriaJson);
                const score = typeof ev.score === 'number' ? ev.score : Number(ev.score) || computeSourcingScore(criteria);
                const recommendationMeta = getSourcingRecommendationMeta(ev.recommendation);

                return (
                  <div key={ev.id} className="card" style={{ marginBottom: 16 }}>
                    <div className="card-header">
                      <div>
                        <h3 className="card-title">Évaluation du {new Date(ev.evaluationDate).toLocaleDateString('fr-FR')}</h3>
                        <p className="text-muted text-sm">par {ev.evaluator?.firstName} {ev.evaluator?.lastName}</p>
                      </div>
                      <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
                        <div style={{ textAlign: 'center' }}>
                          <div style={{ fontSize: 24, fontWeight: 700, color: score >= 75 ? '#22c55e' : score >= 55 ? '#f59e0b' : '#ef4444' }}>{Math.round(score)}/100</div>
                          <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>Score</div>
                        </div>
                        <span className={`badge ${recommendationMeta.badgeClass}`}>{recommendationMeta.label}</span>
                      </div>
                    </div>
                    <div className="card-body">
                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 12, marginBottom: 12 }}>
                        {SOURCING_CRITERIA_GROUPS.map(group => (
                          <div key={group.key} style={{ padding: 12, border: '1px solid var(--border)', borderRadius: 12, background: 'var(--bg-secondary)' }}>
                            <div style={{ fontWeight: 700, fontSize: 13, marginBottom: 4 }}>{group.label}</div>
                            <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 10 }}>{group.description}</div>
                            <div style={{ display: 'grid', gap: 8 }}>
                              {group.criteria.map(criterion => {
                                const value = criteria[criterion.key] || 0;
                                const pct = (value / 5) * 100;
                                return (
                                  <div key={criterion.key}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8, fontSize: 12, marginBottom: 4 }}>
                                      <span>{criterion.label}</span>
                                      <strong>{value}/5</strong>
                                    </div>
                                    <div style={{ height: 6, background: 'var(--border)', borderRadius: 999, overflow: 'hidden' }}>
                                      <div style={{ width: `${pct}%`, height: '100%', background: value >= 4 ? '#22c55e' : value >= 3 ? '#f59e0b' : '#ef4444' }} />
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                        ))}
                      </div>
                      {ev.comment && <p style={{ fontSize: 13, color: 'var(--text-secondary)', margin: 0, borderTop: '1px solid var(--border)', paddingTop: 12 }}>{ev.comment}</p>}
                    </div>
                  </div>
                );
              })
            )}
      </>
        )}
      {showContactModal && (
        <div className="modal-overlay" onClick={() => setShowContactModal(false)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <div className="modal-header"><h2 className="modal-title">Enregistrer un contact</h2><button className="btn btn-ghost btn-icon" onClick={() => setShowContactModal(false)}>x</button></div>
            <form onSubmit={handleAddContact}>
              <div className="modal-body">
                <div className="form-row">
                  <div className="form-group">
                    <label className="form-label">Date</label>
                    <input type="date" className="form-input" value={contactForm.date} onChange={e => setContactForm({...contactForm, date: e.target.value})} required />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Canal</label>
                    <select className="form-select" value={contactForm.channel} onChange={e => setContactForm({...contactForm, channel: e.target.value})}>
                      {CONTACT_CHANNELS.map(c => <option key={c} value={c}>{c}</option>)}
                    </select>
                  </div>
                </div>
                <div className="form-group">
                  <label className="form-label">Note / Résumé de l'échange</label>
                  <textarea className="form-input" rows={4} style={{ resize: 'vertical' }} placeholder="Ex: Candidat disponible à partir de juin, projet de reconversion..."
                    value={contactForm.note} onChange={e => setContactForm({...contactForm, note: e.target.value})} required />
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={() => setShowContactModal(false)}>Annuler</button>
                <button type="submit" className="btn btn-primary">Enregistrer</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {showEvalModal && (
        <div className="modal-overlay" onClick={() => setShowEvalModal(false)}>
          <div className="modal" style={{ maxWidth: 860 }} onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h2 className="modal-title">Grille de sourcing candidat</h2>
              <button className="btn btn-ghost btn-icon" onClick={() => setShowEvalModal(false)}>x</button>
            </div>
            <form onSubmit={handleSubmitEval}>
              <div className="modal-body" style={{ maxHeight: '76vh', overflowY: 'auto' }}>
                {(() => {
                  const score = computeSourcingScore(evalForm.criteria);
                  const suggestedRecommendation = suggestSourcingRecommendation(score);
                  const effectiveRecommendation = evalForm.recommendation === 'AUTO' ? suggestedRecommendation : evalForm.recommendation;
                  const recommendationMeta = getSourcingRecommendationMeta(effectiveRecommendation);
                  const badgeClass = score >= 75 ? 'badge-green' : score >= 55 ? 'badge-orange' : 'badge-red';

                  return (
                    <>
                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 12, marginBottom: 16 }}>
                        <div style={{ padding: 12, border: '1px solid var(--border)', borderRadius: 12, background: 'var(--bg-secondary)' }}>
                          <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 4 }}>Profil</div>
                          <div style={{ fontWeight: 700 }}>{candidate.firstName} {candidate.lastName}</div>
                          <div style={{ fontSize: 12, color: 'var(--text-secondary)' }}>{candidate.email}</div>
                        </div>
                        <div style={{ padding: 12, border: '1px solid var(--border)', borderRadius: 12, background: 'var(--bg-secondary)' }}>
                          <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 4 }}>Score calculé</div>
                          <div style={{ fontSize: 28, fontWeight: 700, color: score >= 75 ? '#22c55e' : score >= 55 ? '#f59e0b' : '#ef4444' }}>{score.toFixed(1)}/100</div>
                        </div>
                        <div style={{ padding: 12, border: '1px solid var(--border)', borderRadius: 12, background: 'var(--bg-secondary)' }}>
                          <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 4 }}>Recommandation suggérée</div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                            <span className={`badge ${getSourcingRecommendationMeta(suggestedRecommendation).badgeClass}`}>
                              {getSourcingRecommendationMeta(suggestedRecommendation).label}
                            </span>
                            <span style={{ fontSize: 12, color: 'var(--text-secondary)' }}>Décision courante : {recommendationMeta.label}</span>
                          </div>
                        </div>
                      </div>

                      <div className="form-row">
                        <div className="form-group">
                    <label className="form-label">Date d'évaluation</label>
                          <input type="date" className="form-input" value={evalForm.evaluationDate} onChange={e => setEvalForm({...evalForm, evaluationDate: e.target.value})} />
                        </div>
                        <div className="form-group">
                          <label className="form-label">Recommandation</label>
                          <select className="form-select" value={evalForm.recommendation} onChange={e => setEvalForm({...evalForm, recommendation: e.target.value})}>
                            {SOURCING_RECOMMENDATION_OPTIONS.map(option => (
                              <option key={option.value} value={option.value}>{option.label}</option>
                            ))}
                          </select>
                          <p style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 6 }}>
                             Si tu gardes "Automatique", la décision finale suit la note calculée.
                          </p>
                        </div>
                      </div>

                      <div style={{ marginBottom: 16, padding: 12, border: '1px solid var(--border)', borderRadius: 12, background: 'var(--bg-secondary)' }}>
                        <div style={{ fontWeight: 700, marginBottom: 8 }}>Rappel sourcing</div>
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 8, fontSize: 13 }}>
                          <div><strong>Niveau :</strong> {candidate.academicLevel || 'Non précisé'}</div>
                          <div><strong>Filière :</strong> {candidate.academicField || 'Non précisée'}</div>
                          <div><strong>Canal :</strong> {candidate.sourceChannel || 'Non précisé'}</div>
                          <div><strong>Téléphone :</strong> {candidate.phone || 'Non renseigné'}</div>
                        </div>
                      </div>

                      <div style={{ display: 'grid', gap: 12 }}>
                        {SOURCING_CRITERIA_GROUPS.map(group => (
                          <div key={group.key} style={{ padding: 14, borderRadius: 12, border: '1px solid var(--border)', background: 'var(--bg-secondary)' }}>
                            <div style={{ fontWeight: 700, fontSize: 14, marginBottom: 4 }}>{group.label}</div>
                            <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 12 }}>{group.description}</div>
                            <div style={{ display: 'grid', gap: 12 }}>
                              {group.criteria.map(criterion => {
                                const value = evalForm.criteria[criterion.key] || 3;
                                const pct = (value / 5) * 100;
                                return (
                                  <div key={criterion.key} style={{ padding: 12, borderRadius: 10, background: '#fff', border: '1px solid var(--border)' }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12, marginBottom: 8 }}>
                                      <div>
                                        <div style={{ fontWeight: 600, fontSize: 13 }}>{criterion.label}</div>
                                        <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 4 }}>{criterion.helpText}</div>
                                      </div>
                                      <span className={`badge ${badgeClass}`}>{value}/5</span>
                                    </div>
                                    <select className="form-select" value={value} onChange={e => setEvalForm({...evalForm, criteria: { ...evalForm.criteria, [criterion.key]: parseInt(e.target.value, 10) }})}>
                                      {SOURCING_SCORE_OPTIONS.map(option => (
                                        <option key={option.value} value={option.value}>{option.label}</option>
                                      ))}
                                    </select>
                                    <div style={{ height: 6, background: 'var(--border)', borderRadius: 999, overflow: 'hidden', marginTop: 10 }}>
                                      <div style={{ width: `${pct}%`, height: '100%', background: value >= 4 ? '#22c55e' : value >= 3 ? '#f59e0b' : '#ef4444' }} />
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                        ))}
                      </div>

                      <div className="form-group" style={{ marginTop: 16 }}>
                        <label className="form-label">Commentaire général</label>
                        <textarea className="form-input" rows={3} style={{ resize: 'vertical' }} placeholder="Observations générales sur le candidat..."
                          value={evalForm.comment} onChange={e => setEvalForm({...evalForm, comment: e.target.value})} />
                      </div>

                      <div style={{ textAlign: 'center', padding: '12px', background: 'var(--bg-secondary)', borderRadius: 12, marginTop: 12 }}>
                        <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 4 }}>Score calculé automatiquement</div>
                        <div style={{ fontSize: 32, fontWeight: 700, color: score >= 75 ? '#22c55e' : score >= 55 ? '#f59e0b' : '#ef4444' }}>{score.toFixed(1)}/100</div>
                        <div style={{ marginTop: 8 }}>
                          <span className={`badge ${recommendationMeta.badgeClass}`}>{recommendationMeta.label}</span>
                        </div>
                      </div>
                    </>
                  );
                })()}
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={() => setShowEvalModal(false)}>Annuler</button>
                <button type="submit" className="btn btn-primary" disabled={savingEval}>{savingEval ? 'Enregistrement...' : "Enregistrer l'évaluation"}</button>
              </div>
            </form>
          </div>
        </div>
      )}
      {showConvert && (
        <div className="modal-overlay" onClick={() => setShowConvert(false)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <div className="modal-header"><h2 className="modal-title">Convertir en apprenant</h2><button className="btn btn-ghost btn-icon" onClick={() => setShowConvert(false)}>x</button></div>
            <div className="modal-body">
              <div className="form-group">
                <label className="form-label">Cohorte d&apos;affectation</label>
                <select className="form-select" value={convertCohort} onChange={e => setConvertCohort(e.target.value)}>
                  <option value="">Sélectionner une cohorte</option>
                  {cohorts.map((c: any) => <option key={c.id} value={c.id}>{c.name} ({c.program?.name})</option>)}
                </select>
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn btn-secondary" onClick={() => setShowConvert(false)}>Annuler</button>
              <button className="btn btn-primary" onClick={handleConvert} disabled={!convertCohort}>Convertir</button>
            </div>
          </div>
        </div>
      )}
      </div>
    </>
  );
}
