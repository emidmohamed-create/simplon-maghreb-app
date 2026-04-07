'use client';

import { useEffect, useState, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';

// ─── Pipeline stages ────────────────────────────────────────────────────────
const PIPELINE_STAGES = [
  { key: 'NEW',       label: 'Nouveau',    icon: '🆕', color: '#94a3b8' },
  { key: 'CONTACTED', label: 'Contacté',   icon: '📞', color: '#3b82f6' },
  { key: 'QUALIFIED', label: 'Qualifié',   icon: '✅', color: '#06b6d4' },
  { key: 'EVALUATED', label: 'Évalué',     icon: '📋', color: '#f59e0b' },
  { key: 'SELECTED',  label: 'Sélectionné',icon: '🌟', color: '#8b5cf6' },
  { key: 'REJECTED',  label: 'Rejeté',     icon: '❌', color: '#ef4444' },
  { key: 'CONVERTED', label: 'Converti',   icon: '🎓', color: '#22c55e' },
];

const CONTACT_CHANNELS = ['Téléphone', 'Email', 'WhatsApp', 'SMS', 'Présentiel', 'Réseaux sociaux'];

// Evaluation criteria for sourcing
const EVAL_CRITERIA = [
  { key: 'motivation',     label: 'Motivation & projet professionnel' },
  { key: 'technique',      label: 'Aptitudes techniques de base' },
  { key: 'communication',  label: 'Communication & expression' },
  { key: 'disponibilite',  label: 'Disponibilité & engagement' },
  { key: 'adaptabilite',   label: 'Adaptabilité & curiosité' },
];

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
    score: '', recommendation: 'QUALIFIED', comment: '',
    evaluationDate: new Date().toISOString().split('T')[0],
    criteria: Object.fromEntries(EVAL_CRITERIA.map(c => [c.key, 3])),
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

  // ─── Save profile ──────────────────────────────────────────────────────────
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

  // ─── Add contact log ───────────────────────────────────────────────────────
  const handleAddContact = async (e: React.FormEvent) => {
    e.preventDefault();
    const currentHistory = (() => {
      try { return JSON.parse(candidate.contactHistory || '[]'); } catch { return []; }
    })();
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

  // ─── Submit evaluation ─────────────────────────────────────────────────────
  const handleSubmitEval = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingEval(true);
    try {
      const totalScore = Object.values(evalForm.criteria as Record<string, number>).reduce((a, b) => a + b, 0);
      const avgScore = (totalScore / EVAL_CRITERIA.length) * 20; // scale to 100
      await fetch(`/api/candidates/${params.id}/evaluate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...evalForm,
          score: evalForm.score || avgScore.toFixed(1),
          criteriaJson: evalForm.criteria,
        }),
      });
      setShowEvalModal(false);
      load();
    } finally { setSavingEval(false); }
  };

  // ─── Convert to learner ────────────────────────────────────────────────────
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
  const contactHistory: any[] = (() => { try { return JSON.parse(candidate.contactHistory || '[]'); } catch { return []; } })();
  const latestEval = candidate.evaluations?.[0];

  return (
    <>
      {/* ═══════════════ PAGE HEADER ═══════════════ */}
      <div className="page-header">
        <div>
          <div className="breadcrumbs">
            <Link href="/admin/candidates">Candidats</Link> / <span>{candidate.firstName} {candidate.lastName}</span>
          </div>
          <h1 className="page-title">{candidate.firstName} {candidate.lastName}</h1>
          <p className="page-subtitle">{candidate.email} · {candidate.phone || 'Pas de téléphone'}</p>
        </div>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          <button className="btn btn-secondary" onClick={() => setShowContactModal(true)}>📞 Ajouter contact</button>
          {candidate.currentStage !== 'CONVERTED' && candidate.currentStage !== 'REJECTED' && (
            <button className="btn btn-warning" onClick={() => setShowEvalModal(true)}>📋 Évaluer</button>
          )}
          {(candidate.currentStage === 'EVALUATED' || candidate.currentStage === 'SELECTED') && !candidate.learnerProfile && (
            <button className="btn btn-primary" onClick={() => setShowConvert(true)}>🎓 Convertir en apprenant</button>
          )}
          {candidate.learnerProfile && (
            <Link href={`/admin/learners/${candidate.learnerProfile.id}`} className="btn btn-primary">👤 Voir apprenant</Link>
          )}
        </div>
      </div>

      <div className="page-body">
        {/* ═══ PIPELINE STAGES ═══ */}
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
                <span className="badge badge-red" style={{ marginLeft: 12 }}>❌ Rejeté</span>
              )}
            </div>
          </div>
        </div>

        {/* ═══ TABS ═══ */}
        <div className="tabs" style={{ marginBottom: 16 }}>
          <button className={`tab ${activeTab === 'profile' ? 'active' : ''}`} onClick={() => setActiveTab('profile')}>👤 Profil</button>
          <button className={`tab ${activeTab === 'contacts' ? 'active' : ''}`} onClick={() => setActiveTab('contacts')}>
            📞 Contacts {contactHistory.length > 0 && <span className="badge badge-blue" style={{ marginLeft: 6, fontSize: 10 }}>{contactHistory.length}</span>}
          </button>
          <button className={`tab ${activeTab === 'evaluation' ? 'active' : ''}`} onClick={() => setActiveTab('evaluation')}>
            📋 Évaluations {candidate.evaluations?.length > 0 && <span className="badge badge-orange" style={{ marginLeft: 6, fontSize: 10 }}>{candidate.evaluations.length}</span>}
          </button>
        </div>

        {/* ═══ TAB: PROFILE ═══ */}
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
                        {['Bac', 'Bac+2', 'Bac+3', 'Bac+4', 'Bac+5', 'Doctorat'].map(l => <option key={l} value={l}>{l}</option>)}
                      </select>
                    </div>
                    <div className="form-group"><label className="form-label">Filière</label><input className="form-input" placeholder="Informatique, Gestion..." value={editForm.academicField || ''} onChange={e => setEditForm({...editForm, academicField: e.target.value})} /></div>
                  </div>
                  <div className="form-group">
                    <label className="form-label">Canal de sourcing</label>
                    <select className="form-select" value={editForm.sourceChannel || ''} onChange={e => setEditForm({...editForm, sourceChannel: e.target.value})}>
                      <option value="">Non précisé</option>
                      {['Site web', 'Facebook', 'LinkedIn', 'Instagram', 'Partenaire', 'Bouche-à-oreille', 'Campus', 'Autre'].map(c => <option key={c} value={c}>{c}</option>)}
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
                {saving ? '⏳ Enregistrement...' : '💾 Enregistrer le profil'}
              </button>
            </div>
          </form>
        )}

        {/* ═══ TAB: CONTACTS ═══ */}
        {activeTab === 'contacts' && (
          <>
            <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 12 }}>
              <button className="btn btn-primary" onClick={() => setShowContactModal(true)}>+ Ajouter un contact</button>
            </div>
            {contactHistory.length === 0 ? (
              <div className="empty-state"><p>Aucun contact enregistré</p><p className="text-muted text-sm mt-2">Utilisez le bouton &quot;📞 Ajouter contact&quot; pour enregistrer un échange.</p></div>
            ) : (
              <div className="card">
                <div style={{ padding: '0' }}>
                  {contactHistory.map((c: any, i: number) => (
                    <div key={c.id || i} style={{ padding: '14px 20px', borderBottom: i < contactHistory.length - 1 ? '1px solid var(--border)' : 'none', display: 'flex', gap: 16, alignItems: 'flex-start' }}>
                      <div style={{ flexShrink: 0, width: 40, height: 40, borderRadius: '50%', background: 'var(--primary)', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16 }}>
                        {c.channel === 'Téléphone' ? '📞' : c.channel === 'Email' ? '📧' : c.channel === 'WhatsApp' ? '💬' : c.channel === 'Présentiel' ? '🤝' : '📱'}
                      </div>
                      <div style={{ flex: 1 }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                          <span style={{ fontWeight: 700, fontSize: 13 }}>{c.channel}</span>
                          <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>{new Date(c.date).toLocaleDateString('fr-FR')}</span>
                        </div>
                        <p style={{ fontSize: 13, color: 'var(--text-secondary)', margin: 0 }}>{c.note || '—'}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </>
        )}

        {/* ═══ TAB: EVALUATION ═══ */}
        {activeTab === 'evaluation' && (
          <>
            <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 12 }}>
              {candidate.currentStage !== 'CONVERTED' && candidate.currentStage !== 'REJECTED' && (
                <button className="btn btn-warning" onClick={() => setShowEvalModal(true)}>+ Nouvelle évaluation</button>
              )}
            </div>
            {candidate.evaluations?.length === 0 ? (
              <div className="empty-state"><p>Aucune évaluation enregistrée</p></div>
            ) : (
              candidate.evaluations?.map((ev: any) => {
                let criteria: any = null;
                try { if (ev.criteriaJson) criteria = JSON.parse(ev.criteriaJson); } catch {}
                return (
                  <div key={ev.id} className="card" style={{ marginBottom: 16 }}>
                    <div className="card-header">
                      <div>
                        <h3 className="card-title">Évaluation du {new Date(ev.evaluationDate).toLocaleDateString('fr-FR')}</h3>
                        <p className="text-muted text-sm">par {ev.evaluator?.firstName} {ev.evaluator?.lastName}</p>
                      </div>
                      <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
                        {ev.score && <div style={{ textAlign: 'center' }}><div style={{ fontSize: 24, fontWeight: 700, color: ev.score >= 70 ? '#22c55e' : ev.score >= 50 ? '#f59e0b' : '#ef4444' }}>{Math.round(ev.score)}/100</div><div style={{ fontSize: 11, color: 'var(--text-muted)' }}>Score</div></div>}
                        {ev.recommendation && <span className={`badge ${ev.recommendation === 'QUALIFIED' ? 'badge-green' : ev.recommendation === 'REJECTED' ? 'badge-red' : 'badge-orange'}`}>
                          {ev.recommendation === 'QUALIFIED' ? '✅ Qualifié' : ev.recommendation === 'REJECTED' ? '❌ Rejeté' : '⏳ En attente'}
                        </span>}
                      </div>
                    </div>
                    {criteria && (
                      <div className="card-body">
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 12, marginBottom: 12 }}>
                          {EVAL_CRITERIA.map(c => {
                            const score = criteria[c.key] || 0;
                            const pct = (score / 5) * 100;
                            return (
                              <div key={c.key}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, marginBottom: 4 }}>
                                  <span>{c.label}</span>
                                  <span style={{ fontWeight: 700 }}>{score}/5</span>
                                </div>
                                <div style={{ height: 6, background: 'var(--border)', borderRadius: 3, overflow: 'hidden' }}>
                                  <div style={{ height: '100%', width: `${pct}%`, background: score >= 4 ? '#22c55e' : score >= 3 ? '#f59e0b' : '#ef4444', borderRadius: 3 }} />
                                </div>
                              </div>
                            );
                          })}
                        </div>
                        {ev.comment && <p style={{ fontSize: 13, color: 'var(--text-secondary)', margin: 0, borderTop: '1px solid var(--border)', paddingTop: 12 }}>{ev.comment}</p>}
                      </div>
                    )}
                    {!criteria && ev.comment && <div className="card-body"><p style={{ fontSize: 13 }}>{ev.comment}</p></div>}
                  </div>
                );
              })
            )}
          </>
        )}
      </div>

      {/* ═══ CONTACT MODAL ═══ */}
      {showContactModal && (
        <div className="modal-overlay" onClick={() => setShowContactModal(false)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <div className="modal-header"><h2 className="modal-title">📞 Enregistrer un contact</h2><button className="btn btn-ghost btn-icon" onClick={() => setShowContactModal(false)}>✕</button></div>
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
                  <label className="form-label">Note / Résumé de l&apos;échange</label>
                  <textarea className="form-input" rows={4} style={{ resize: 'vertical' }} placeholder="Ex: Candidat disponible à partir de janvier, très motivé, projet de reconversion..."
                    value={contactForm.note} onChange={e => setContactForm({...contactForm, note: e.target.value})} required />
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={() => setShowContactModal(false)}>Annuler</button>
                <button type="submit" className="btn btn-primary">💾 Enregistrer</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ═══ EVALUATION MODAL ═══ */}
      {showEvalModal && (
        <div className="modal-overlay" onClick={() => setShowEvalModal(false)}>
          <div className="modal" style={{ maxWidth: 680 }} onClick={e => e.stopPropagation()}>
            <div className="modal-header"><h2 className="modal-title">📋 Grille d&apos;évaluation candidat</h2><button className="btn btn-ghost btn-icon" onClick={() => setShowEvalModal(false)}>✕</button></div>
            <form onSubmit={handleSubmitEval}>
              <div className="modal-body" style={{ maxHeight: '72vh', overflowY: 'auto' }}>
                <div className="form-row">
                  <div className="form-group">
                    <label className="form-label">Date d&apos;évaluation</label>
                    <input type="date" className="form-input" value={evalForm.evaluationDate} onChange={e => setEvalForm({...evalForm, evaluationDate: e.target.value})} />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Recommandation</label>
                    <select className="form-select" value={evalForm.recommendation} onChange={e => setEvalForm({...evalForm, recommendation: e.target.value})}>
                      <option value="QUALIFIED">✅ Qualifié / Sélectionné</option>
                      <option value="PENDING">⏳ En attente</option>
                      <option value="REJECTED">❌ Rejeté</option>
                    </select>
                  </div>
                </div>

                <p style={{ fontWeight: 600, fontSize: 13, marginBottom: 12 }}>Critères d&apos;évaluation (note / 5) :</p>
                {EVAL_CRITERIA.map(c => {
                  const score = (evalForm.criteria as any)[c.key] || 3;
                  return (
                    <div key={c.key} style={{ marginBottom: 16, padding: '12px 14px', background: 'var(--bg-secondary)', borderRadius: 8 }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                        <span style={{ fontWeight: 600, fontSize: 13 }}>{c.label}</span>
                        <span style={{ fontWeight: 700, fontSize: 16, color: score >= 4 ? '#22c55e' : score >= 3 ? '#f59e0b' : '#ef4444', minWidth: 28, textAlign: 'right' }}>{score}/5</span>
                      </div>
                      <input type="range" min={1} max={5} step={1} value={score}
                        onChange={e => setEvalForm({...evalForm, criteria: {...evalForm.criteria, [c.key]: parseInt(e.target.value)}})}
                        style={{ width: '100%', accentColor: score >= 4 ? '#22c55e' : score >= 3 ? '#f59e0b' : '#ef4444' }} />
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 10, color: 'var(--text-muted)' }}>
                        <span>Insuffisant</span><span>Moyen</span><span>Excellent</span>
                      </div>
                    </div>
                  );
                })}

                <div className="form-group">
                  <label className="form-label">Commentaire général</label>
                  <textarea className="form-input" rows={3} style={{ resize: 'vertical' }} placeholder="Observations générales sur le candidat..."
                    value={evalForm.comment} onChange={e => setEvalForm({...evalForm, comment: e.target.value})} />
                </div>

                {/* Score preview */}
                {(() => {
                  const total = Object.values(evalForm.criteria as Record<string, number>).reduce((a, b) => a + b, 0);
                  const avg = (total / EVAL_CRITERIA.length) * 20;
                  return (
                    <div style={{ textAlign: 'center', padding: '12px', background: 'var(--bg-secondary)', borderRadius: 10, marginTop: 8 }}>
                      <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 4 }}>Score calculé automatiquement</div>
                      <div style={{ fontSize: 28, fontWeight: 700, color: avg >= 70 ? '#22c55e' : avg >= 50 ? '#f59e0b' : '#ef4444' }}>{avg.toFixed(1)}/100</div>
                    </div>
                  );
                })()}
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={() => setShowEvalModal(false)}>Annuler</button>
                <button type="submit" className="btn btn-primary" disabled={savingEval}>{savingEval ? '⏳...' : '💾 Enregistrer l\'évaluation'}</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ═══ CONVERT MODAL ═══ */}
      {showConvert && (
        <div className="modal-overlay" onClick={() => setShowConvert(false)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <div className="modal-header"><h2 className="modal-title">🎓 Convertir en apprenant</h2><button className="btn btn-ghost btn-icon" onClick={() => setShowConvert(false)}>✕</button></div>
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
              <button className="btn btn-primary" onClick={handleConvert} disabled={!convertCohort}>🎓 Convertir</button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
