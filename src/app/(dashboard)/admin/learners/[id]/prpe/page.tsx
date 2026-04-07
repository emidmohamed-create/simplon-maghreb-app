'use client';

import { useEffect, useState, useCallback } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';

// ─── Config ───────────────────────────────────────────────────────────────────
const CASE_TYPES = {
  A: { label: 'CAS A', color: '#d97706', bg: '#fef3c7', desc: 'Absences + niveau faible (7-10 jours)', icon: '🔴' },
  B: { label: 'CAS B', color: '#0284c7', bg: '#e0f2fe', desc: 'Absences + niveau moyen/bon (10-15 jours)', icon: '🟠' },
  C: { label: 'CAS C', color: '#7c3aed', bg: '#ede9fe', desc: 'Posture perturbatrice (7-10 jours)', icon: '⚠️' },
};
const STATUS_CFG = {
  DRAFT:             { label: 'Brouillon',         color: '#6b7280', bg: '#f3f4f6' },
  ACTIVE:            { label: '🔴 PRPE Active',     color: '#dc2626', bg: '#fee2e2' },
  MAINTAINED:        { label: '✅ Maintenu',         color: '#16a34a', bg: '#dcfce7' },
  EXIT_NO_ENGAGEMENT:{ label: '❌ Sortie (non-eng.)',color: '#7c3aed', bg: '#ede9fe' },
  EXIT_POST_PRPE:    { label: '❌ Sortie post-PRPE', color: '#dc2626', bg: '#fee2e2' },
};

const STEPS = [
  { num: 0, label: 'Préparation', icon: '📋', desc: 'Collecte faits, qualification cas, dossier PRPE' },
  { num: 1, label: 'J0 — Mail activation', icon: '📧', desc: 'Envoi mail officiel d\'activation PRPE' },
  { num: 2, label: 'J+1/J+2 — Convocation', icon: '🤝', desc: 'Réunion + Acte d\'engagement signé' },
  { num: 3, label: 'J+3 — Relance (si non-eng.)', icon: '🔔', desc: 'Relance formelle si pas de retour' },
  { num: 4, label: 'Suivi PRPE', icon: '📊', desc: '7-15 jours de suivi selon cas A/B/C' },
  { num: 5, label: 'Décision finale', icon: '⚖️', desc: 'Maintien ou sortie anticipée justifiée' },
];

const REASON_TYPES = [
  { value: 'MEDICAL', label: '🏥 Médical' },
  { value: 'FAMILY',  label: '👨‍👩‍👧 Familial' },
  { value: 'TRANSPORT', label: '🚌 Transport' },
  { value: 'ADMIN', label: '📋 Administratif' },
  { value: 'OTHER', label: '📌 Autre' },
];

// ─── Email templates ──────────────────────────────────────────────────────────
function buildMail(mailNum: number, prpe: any, learner: any) {
  const name = learner?.firstName || '[Prénom]';
  const cohort = learner?.cohort?.name || '[Formation]';
  const start = prpe.startDate ? new Date(prpe.startDate).toLocaleDateString('fr-FR') : '[date]';
  const end = prpe.endDate ? new Date(prpe.endDate).toLocaleDateString('fr-FR') : '[date]';
  const today = new Date().toLocaleDateString('fr-FR');
  const j0 = prpe.step1MailSentAt ? new Date(prpe.step1MailSentAt).toLocaleDateString('fr-FR') : '[date J0]';

  const mails: Record<number, { subject: string; body: string }> = {
    1: {
      subject: `Activation PRPE – action requise concernant votre parcours`,
      body: `Bonjour ${name},\n\nDans le cadre du suivi pédagogique et administratif de la formation ${cohort}, nous vous informons de l'activation d'une PRPE vous concernant.\n\nMotifs factuels :\n${prpe.triggerNotes || '- [À compléter : absences/retards, livrables manquants, incidents...]'}\n\nPériode PRPE : du ${start} au ${end}.\nUne convocation obligatoire est fixée le [date/heure] à [lieu/lien] afin de cadrer la reprise et de préciser les attendus.\n\nMerci de :\n- confirmer la réception de ce mail avant [deadline J+1],\n- vous présenter à la convocation.\n\nSans engagement explicite / sans retour de votre part, une décision administrative pourra être prise concernant la continuité de votre parcours.\n\nCordialement,\n[Nom – Fonction]`,
    },
    2: {
      subject: `Relance – PRPE : action immédiate requise`,
      body: `Bonjour ${name},\n\nSuite à notre mail du ${j0}, nous n'avons pas reçu de confirmation de votre part.\n[Si applicable : Nous constatons également votre absence à la convocation du [date/heure] / l'absence de formalisation de votre engagement.]\n\nMerci de nous confirmer avant le [deadline] votre intention de reprendre dans le cadre PRPE.\nÀ défaut, la PRPE sera considérée comme non engagée et une décision administrative pourra être prise.\n\nCordialement,\n[Nom]`,
    },
    3: {
      subject: `Décision – continuité de parcours (PRPE non engagée)`,
      body: `Bonjour ${name},\n\nMalgré nos communications envoyées les [dates], nous constatons l'absence de retour et/ou l'absence de reprise effective dans le cadre PRPE.\n\nEn conséquence, une sortie anticipée justifiée est décidée, effective à compter du ${today}.\nPour toute question administrative : [contact].\n\nCordialement,\n[Nom]`,
    },
    4: {
      subject: `PRPE validée – poursuite de votre parcours`,
      body: `Bonjour ${name},\n\nÀ l'issue de la PRPE (du ${start} au ${end}), nous confirmons que les critères attendus ont été atteints :\n- [assiduité conforme]\n- [livrables rendus]\n- [progression mesurable]\n- [posture respectueuse]\n\nVotre PRPE est validée. Vous poursuivez votre parcours dans le cadre standard à compter du ${today}.\nMerci de maintenir cette dynamique.\n\nCordialement,\n[Nom]`,
    },
    5: {
      subject: `Décision suite à PRPE – sortie anticipée justifiée`,
      body: `Bonjour ${name},\n\nÀ l'issue de la PRPE (du ${start} au ${end}), nous constatons que les critères attendus n'ont pas été atteints :\n- ${prpe.outcomeNotes || '[assiduité insuffisante / livrables non rendus / absence de progression / incidents...]'}\n\nEn conséquence, une sortie anticipée justifiée est décidée, effective à compter du ${today}.\nPour toute question administrative : [contact].\n\nCordialement,\n[Nom]`,
    },
  };
  return mails[mailNum] || { subject: '', body: '' };
}

// ─── Component ────────────────────────────────────────────────────────────────
export default function PRPEPage() {
  const params = useParams();
  const [learner,  setLearner]  = useState<any>(null);
  const [cases,    setCases]    = useState<any[]>([]);
  const [loading,  setLoading]  = useState(true);
  const [selected, setSelected] = useState<any>(null); // opened PRPE case
  const [saving,   setSaving]   = useState(false);
  const [showCreate, setShowCreate] = useState(false);
  const [createForm, setCreateForm] = useState({ caseType: 'A', startDate: '', endDate: '', triggerAbsenceDays: 0, triggerNotes: '', step0Notes: '' });
  const [copiedMail, setCopiedMail] = useState<number|null>(null);
  const [activeMailTab, setActiveMailTab] = useState(1);

  const load = useCallback(() => {
    setLoading(true);
    Promise.all([
      fetch(`/api/learners/${params.id}`).then(r => r.json()).catch(() => null),
      fetch(`/api/learners/${params.id}/prpe`).then(r => r.json()).catch(() => []),
    ]).then(([l, c]) => {
      setLearner(l);
      setCases(Array.isArray(c) ? c : []);
      if (Array.isArray(c) && c.length > 0 && !selected) setSelected(c[0]);
    }).finally(() => setLoading(false));
  }, [params.id]);

  useEffect(() => { load(); }, [load]);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const res = await fetch(`/api/learners/${params.id}/prpe`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(createForm),
      });
      const created = await res.json();
      setShowCreate(false);
      await load();
      setSelected(created);
    } finally { setSaving(false); }
  };

  const handleUpdate = async (patch: Record<string, any>) => {
    if (!selected) return;
    setSaving(true);
    try {
      const res = await fetch(`/api/learners/${params.id}/prpe/${selected.id}`, {
        method: 'PUT', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(patch),
      });
      const updated = await res.json();
      setSelected(updated);
      setCases(prev => prev.map(c => c.id === updated.id ? updated : c));
    } finally { setSaving(false); }
  };

  const handleDelete = async (caseId: string) => {
    if (!confirm('Supprimer ce dossier PRPE ?')) return;
    await fetch(`/api/learners/${params.id}/prpe/${caseId}`, { method: 'DELETE' });
    setSelected(null);
    load();
  };

  const copyMail = (mailNum: number) => {
    if (!selected) return;
    const { subject, body } = buildMail(mailNum, selected, learner);
    navigator.clipboard.writeText(`Objet : ${subject}\n\n${body}`);
    setCopiedMail(mailNum);
    setTimeout(() => setCopiedMail(null), 2500);
  };

  if (loading) return <div className="page-body"><div className="loading-overlay"><span className="loading-spinner" /> Chargement...</div></div>;

  const unjustifiedDays = (() => {
    const records = learner?.attendanceRecords || [];
    const absent = records.filter((r: any) => r.status === 'ABSENT');
    const uniqueDates = new Set(absent.map((r: any) => r.session?.date?.split('T')[0]));
    return uniqueDates.size;
  })();

  const activeCases = cases.filter(c => c.status === 'ACTIVE');

  return (
    <>
      <div className="page-header">
        <div>
          <div className="breadcrumbs">
            <Link href="/admin/learners">Apprenants</Link> /
            <Link href={`/admin/learners/${params.id}`}>{learner?.firstName} {learner?.lastName}</Link> /
            <span>PRPE</span>
          </div>
          <h1 className="page-title">⚠️ Procédure PRPE</h1>
          <p className="page-subtitle">{learner?.firstName} {learner?.lastName} · {learner?.cohort?.name}</p>
        </div>
        <button className="btn btn-primary" onClick={() => setShowCreate(true)}>+ Ouvrir un dossier PRPE</button>
      </div>

      <div className="page-body">
        {/* Alert banner */}
        {unjustifiedDays >= 3 && activeCases.length === 0 && (
          <div style={{ padding: '14px 20px', background: '#fef2f2', border: '2px solid #fca5a5', borderRadius: 10, marginBottom: 20, display: 'flex', alignItems: 'center', gap: 16 }}>
            <span style={{ fontSize: 28 }}>🚨</span>
            <div style={{ flex: 1 }}>
              <div style={{ fontWeight: 700, color: '#dc2626', fontSize: 15 }}>Alerte PRPE — {unjustifiedDays} jours d&apos;absence non justifiée</div>
              <div style={{ fontSize: 13, color: '#991b1b' }}>Le seuil de 3 jours d&apos;absence non justifiée est dépassé. La procédure PRPE doit être enclenchée.</div>
            </div>
            <button className="btn btn-danger" onClick={() => setShowCreate(true)}>⚠️ Déclencher PRPE</button>
          </div>
        )}

        <div style={{ display: 'grid', gridTemplateColumns: '280px 1fr', gap: 20 }}>
          {/* LEFT: case list */}
          <div>
            {cases.length === 0 ? (
              <div className="card" style={{ textAlign: 'center', padding: 24 }}>
                <div style={{ fontSize: 32, marginBottom: 8 }}>📂</div>
                <p style={{ fontSize: 13, color: 'var(--text-muted)' }}>Aucun dossier PRPE ouvert.</p>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {cases.map((c: any) => {
                  const ct = CASE_TYPES[c.caseType as keyof typeof CASE_TYPES] || CASE_TYPES.A;
                  const st = STATUS_CFG[c.status as keyof typeof STATUS_CFG] || STATUS_CFG.DRAFT;
                  return (
                    <div key={c.id} className="card" onClick={() => setSelected(c)}
                      style={{ cursor: 'pointer', borderLeft: `3px solid ${ct.color}`, outline: selected?.id === c.id ? `2px solid ${ct.color}` : 'none' }}>
                      <div className="card-body" style={{ padding: '10px 14px' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <span style={{ fontWeight: 700, fontSize: 13, color: ct.color }}>{ct.icon} {ct.label}</span>
                          <span style={{ fontSize: 10, padding: '2px 8px', borderRadius: 10, background: st.bg, color: st.color, fontWeight: 700 }}>{st.label}</span>
                        </div>
                        <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 4 }}>
                          Ouvert le {new Date(c.createdAt).toLocaleDateString('fr-FR')}
                        </div>
                        <div style={{ fontSize: 11, marginTop: 4 }}>{c.triggerAbsenceDays}j absence(s)</div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* RIGHT: case detail */}
          <div>
            {!selected ? (
              <div className="card" style={{ textAlign: 'center', padding: '48px 32px' }}>
                <div style={{ fontSize: 48, marginBottom: 12 }}>⚖️</div>
                <p style={{ fontWeight: 600 }}>Sélectionnez un dossier ou ouvrez-en un nouveau</p>
              </div>
            ) : (
              <>
                {/* Case header */}
                <div className="card" style={{ marginBottom: 16 }}>
                  <div className="card-body" style={{ padding: '16px 20px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                      <div>
                        <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
                          {(['A','B','C'] as const).map(t => (
                            <button key={t} onClick={() => handleUpdate({ caseType: t })}
                              style={{ padding: '4px 14px', borderRadius: 12, fontWeight: 700, fontSize: 12, cursor: 'pointer', border: `2px solid ${CASE_TYPES[t].color}`, background: selected.caseType === t ? CASE_TYPES[t].color : 'transparent', color: selected.caseType === t ? '#fff' : CASE_TYPES[t].color }}>
                              {CASE_TYPES[t].icon} {CASE_TYPES[t].label}
                            </button>
                          ))}
                        </div>
                        <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 6 }}>
                          {CASE_TYPES[selected.caseType as keyof typeof CASE_TYPES]?.desc}
                        </div>
                      </div>
                      <div style={{ display: 'flex', gap: 8 }}>
                        <select className="form-select" style={{ fontSize: 12, padding: '4px 8px' }} value={selected.status}
                          onChange={e => handleUpdate({ status: e.target.value })}>
                          {Object.entries(STATUS_CFG).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
                        </select>
                        <button className="btn btn-sm btn-danger" onClick={() => handleDelete(selected.id)}>🗑️</button>
                      </div>
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginTop: 14 }}>
                      <div className="form-group" style={{ margin: 0 }}>
                        <label className="form-label" style={{ fontSize: 11 }}>📅 Début PRPE</label>
                        <input type="date" className="form-input" style={{ fontSize: 12 }} value={selected.startDate ? new Date(selected.startDate).toISOString().split('T')[0] : ''} onChange={e => handleUpdate({ startDate: e.target.value })} />
                      </div>
                      <div className="form-group" style={{ margin: 0 }}>
                        <label className="form-label" style={{ fontSize: 11 }}>📅 Fin PRPE</label>
                        <input type="date" className="form-input" style={{ fontSize: 12 }} value={selected.endDate ? new Date(selected.endDate).toISOString().split('T')[0] : ''} onChange={e => handleUpdate({ endDate: e.target.value })} />
                      </div>
                    </div>
                    <div className="form-group" style={{ margin: '10px 0 0' }}>
                      <label className="form-label" style={{ fontSize: 11 }}>📝 Éléments déclencheurs (faits datés)</label>
                      <textarea className="form-input" rows={3} style={{ fontSize: 12, resize: 'vertical' }} value={selected.triggerNotes || ''} onChange={e => setSelected({...selected, triggerNotes: e.target.value})} onBlur={e => handleUpdate({ triggerNotes: e.target.value })} />
                    </div>
                  </div>
                </div>

                {/* Step tracker */}
                <div className="card" style={{ marginBottom: 16 }}>
                  <div className="card-header"><h3 className="card-title">📍 Suivi des étapes</h3></div>
                  <div className="card-body" style={{ padding: '0 20px 16px' }}>
                    {STEPS.map(step => {
                      const isCompleted = (() => {
                        if (step.num === 0) return !!selected.step0PreparedAt;
                        if (step.num === 1) return !!selected.step1MailSentAt;
                        if (step.num === 2) return !!selected.step2MeetingAt || selected.engagementSigned;
                        if (step.num === 3) return !!selected.step3RelanceSentAt;
                        if (step.num === 4) return !!selected.step4TrackingNotes;
                        if (step.num === 5) return !!selected.outcome;
                        return false;
                      })();
                      return (
                        <div key={step.num} style={{ display: 'flex', gap: 14, padding: '14px 0', borderBottom: step.num < 5 ? '1px solid var(--border)' : 'none' }}>
                          {/* Step circle */}
                          <div style={{ flexShrink: 0, width: 36, height: 36, borderRadius: '50%', background: isCompleted ? '#dcfce7' : 'var(--bg-secondary)', border: `2px solid ${isCompleted ? '#16a34a' : 'var(--border)'}`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14 }}>
                            {isCompleted ? '✅' : step.icon}
                          </div>
                          {/* Step content */}
                          <div style={{ flex: 1 }}>
                            <div style={{ fontWeight: 700, fontSize: 13, marginBottom: 4 }}>Étape {step.num} — {step.label}</div>
                            <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 8 }}>{step.desc}</div>
                            {/* Step-specific fields */}
                            {step.num === 0 && (
                              <div style={{ display: 'flex', gap: 8, alignItems: 'flex-start' }}>
                                <textarea className="form-input" rows={2} style={{ fontSize: 11, flex: 1, resize: 'vertical' }} placeholder="Notes de préparation..." value={selected.step0Notes || ''} onChange={e => setSelected({...selected, step0Notes: e.target.value})} onBlur={e => handleUpdate({ step0Notes: e.target.value })} />
                                {!selected.step0PreparedAt && <button className="btn btn-sm btn-primary" onClick={() => handleUpdate({ step0PreparedAt: new Date().toISOString() })}>✅ Marquer préparé</button>}
                              </div>
                            )}
                            {step.num === 1 && (
                              <div style={{ display: 'flex', gap: 8 }}>
                                <input type="date" className="form-input" style={{ fontSize: 11, maxWidth: 160 }} value={selected.step1MailSentAt ? new Date(selected.step1MailSentAt).toISOString().split('T')[0] : ''} onChange={e => handleUpdate({ step1MailSentAt: e.target.value })} />
                                <span style={{ fontSize: 11, color: 'var(--text-muted)', alignSelf: 'center' }}>Date d&apos;envoi du mail J0</span>
                                {!selected.step1MailSentAt && <button className="btn btn-sm btn-primary" onClick={() => handleUpdate({ step1MailSentAt: new Date().toISOString() })}>✅ Mail envoyé auj.</button>}
                              </div>
                            )}
                            {step.num === 2 && (
                              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                                <div style={{ display: 'flex', gap: 8 }}>
                                  <input type="date" className="form-input" style={{ fontSize: 11, maxWidth: 160 }} value={selected.step2MeetingAt ? new Date(selected.step2MeetingAt).toISOString().split('T')[0] : ''} onChange={e => handleUpdate({ step2MeetingAt: e.target.value })} />
                                  <span style={{ fontSize: 11, color: 'var(--text-muted)', alignSelf: 'center' }}>Date de convocation</span>
                                </div>
                                <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12, cursor: 'pointer' }}>
                                  <input type="checkbox" checked={selected.engagementSigned} onChange={e => handleUpdate({ engagementSigned: e.target.checked })} />
                                  ✍️ Acte d&apos;engagement signé
                                </label>
                                <textarea className="form-input" rows={2} style={{ fontSize: 11, resize: 'vertical' }} placeholder="CR de convocation..." value={selected.step2CRNotes || ''} onChange={e => setSelected({...selected, step2CRNotes: e.target.value})} onBlur={e => handleUpdate({ step2CRNotes: e.target.value })} />
                              </div>
                            )}
                            {step.num === 3 && (
                              <div style={{ display: 'flex', gap: 8 }}>
                                <input type="date" className="form-input" style={{ fontSize: 11, maxWidth: 160 }} value={selected.step3RelanceSentAt ? new Date(selected.step3RelanceSentAt).toISOString().split('T')[0] : ''} onChange={e => handleUpdate({ step3RelanceSentAt: e.target.value })} />
                                {!selected.step3RelanceSentAt && <button className="btn btn-sm btn-secondary" onClick={() => handleUpdate({ step3RelanceSentAt: new Date().toISOString() })}>🔔 Relance envoyée auj.</button>}
                                <span style={{ fontSize: 11, color: 'var(--text-muted)', alignSelf: 'center' }}>Si non-engagement seulement</span>
                              </div>
                            )}
                            {step.num === 4 && (
                              <textarea className="form-input" rows={3} style={{ fontSize: 11, resize: 'vertical' }} placeholder="Notes de suivi PRPE (présences, livrables, posture, progression observée)..." value={selected.step4TrackingNotes || ''} onChange={e => setSelected({...selected, step4TrackingNotes: e.target.value})} onBlur={e => handleUpdate({ step4TrackingNotes: e.target.value })} />
                            )}
                            {step.num === 5 && (
                              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                                <div style={{ display: 'flex', gap: 8 }}>
                                  <select className="form-select" style={{ fontSize: 11, maxWidth: 260 }} value={selected.outcome || ''} onChange={e => handleUpdate({ outcome: e.target.value || null })}>
                                    <option value="">-- Décision --</option>
                                    <option value="MAINTAINED">✅ Maintenu — retour cadre standard</option>
                                    <option value="EXIT_NO_ENGAGEMENT">❌ Sortie — non-engagement</option>
                                    <option value="EXIT_POST_PRPE">❌ Sortie — post PRPE</option>
                                  </select>
                                  {selected.outcome && !selected.decisionAt && <button className="btn btn-sm btn-primary" onClick={() => handleUpdate({ decisionAt: new Date().toISOString() })}>⚖️ Date décision = auj.</button>}
                                </div>
                                <textarea className="form-input" rows={2} style={{ fontSize: 11, resize: 'vertical' }} placeholder="Notes de décision / motifs..." value={selected.outcomeNotes || ''} onChange={e => setSelected({...selected, outcomeNotes: e.target.value})} onBlur={e => handleUpdate({ outcomeNotes: e.target.value })} />
                              </div>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Email templates */}
                <div className="card">
                  <div className="card-header"><h3 className="card-title">📧 Kit emails PRPE</h3><span style={{ fontSize: 12, color: 'var(--text-muted)' }}>Cliquer pour copier</span></div>
                  <div className="card-body">
                    <div style={{ display: 'flex', gap: 8, marginBottom: 16, flexWrap: 'wrap' }}>
                      {[
                        { num: 1, label: 'Mail J0 Activation' },
                        { num: 2, label: 'Mail J+3 Relance' },
                        { num: 3, label: 'Décision non-engagement' },
                        { num: 4, label: 'Fin PRPE — Maintien' },
                        { num: 5, label: 'Fin PRPE — Sortie' },
                      ].map(m => (
                        <button key={m.num} className={`btn btn-sm ${activeMailTab === m.num ? 'btn-primary' : 'btn-secondary'}`} onClick={() => setActiveMailTab(m.num)}>
                          {m.num}. {m.label}
                        </button>
                      ))}
                    </div>
                    {(() => {
                      const mail = buildMail(activeMailTab, selected, learner);
                      return (
                        <div>
                          <div style={{ padding: '8px 12px', background: 'var(--bg-secondary)', borderRadius: '6px 6px 0 0', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <span style={{ fontSize: 12, fontWeight: 700 }}>Objet : {mail.subject}</span>
                            <button className="btn btn-sm btn-primary" onClick={() => copyMail(activeMailTab)}>
                              {copiedMail === activeMailTab ? '✅ Copié !' : '📋 Copier tout'}
                            </button>
                          </div>
                          <pre style={{ padding: 14, background: 'var(--bg-secondary)', fontSize: 12, lineHeight: 1.7, whiteSpace: 'pre-wrap', borderRadius: '0 0 6px 6px', border: '1px solid var(--border)', borderTop: 'none', margin: 0, fontFamily: 'inherit', color: 'var(--text-secondary)', maxHeight: 280, overflow: 'auto' }}>
                            {mail.body}
                          </pre>
                        </div>
                      );
                    })()}
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      </div>

      {/* ═══ CREATE MODAL ═══ */}
      {showCreate && (
        <div className="modal-overlay" onClick={() => setShowCreate(false)}>
          <div className="modal" style={{ maxWidth: 620 }} onClick={e => e.stopPropagation()}>
            <div className="modal-header"><h2 className="modal-title">⚠️ Ouvrir un dossier PRPE</h2><button className="btn btn-ghost btn-icon" onClick={() => setShowCreate(false)}>✕</button></div>
            <form onSubmit={handleCreate}>
              <div className="modal-body">
                {/* Case type selector */}
                <div className="form-group">
                  <label className="form-label">Type de cas *</label>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10 }}>
                    {(['A','B','C'] as const).map(t => (
                      <label key={t} style={{ cursor: 'pointer', padding: 12, border: `2px solid ${createForm.caseType === t ? CASE_TYPES[t].color : 'var(--border)'}`, borderRadius: 8, background: createForm.caseType === t ? CASE_TYPES[t].bg : 'transparent', textAlign: 'center' }}>
                        <input type="radio" name="caseType" value={t} checked={createForm.caseType === t} onChange={e => setCreateForm({...createForm, caseType: e.target.value})} style={{ display: 'none' }} />
                        <div style={{ fontSize: 18, marginBottom: 4 }}>{CASE_TYPES[t].icon}</div>
                        <div style={{ fontWeight: 700, color: CASE_TYPES[t].color, fontSize: 13 }}>{CASE_TYPES[t].label}</div>
                        <div style={{ fontSize: 10, color: 'var(--text-muted)', marginTop: 2 }}>{CASE_TYPES[t].desc}</div>
                      </label>
                    ))}
                  </div>
                </div>
                <div className="form-row">
                  <div className="form-group"><label className="form-label">Date de début *</label><input type="date" className="form-input" required value={createForm.startDate} onChange={e => setCreateForm({...createForm, startDate: e.target.value})} /></div>
                  <div className="form-group"><label className="form-label">Date de fin prévue</label><input type="date" className="form-input" value={createForm.endDate} onChange={e => setCreateForm({...createForm, endDate: e.target.value})} /></div>
                </div>
                <div className="form-group">
                  <label className="form-label">Jours d&apos;absence non justifiée</label>
                  <input type="number" className="form-input" min={0} value={createForm.triggerAbsenceDays} onChange={e => setCreateForm({...createForm, triggerAbsenceDays: parseInt(e.target.value) || 0})} />
                </div>
                <div className="form-group">
                  <label className="form-label">📋 Éléments déclencheurs (faits datés)</label>
                  <textarea className="form-input" rows={4} style={{ resize: 'vertical' }} placeholder="Absences non justifiées du ... au ..., livrables non rendus (sprints X et Y), incidents du ..." value={createForm.triggerNotes} onChange={e => setCreateForm({...createForm, triggerNotes: e.target.value})} />
                </div>
                <div className="form-group">
                  <label className="form-label">Notes de préparation (Étape 0)</label>
                  <textarea className="form-input" rows={3} style={{ resize: 'vertical' }} value={createForm.step0Notes} onChange={e => setCreateForm({...createForm, step0Notes: e.target.value})} />
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={() => setShowCreate(false)}>Annuler</button>
                <button type="submit" className="btn btn-danger" disabled={saving}>{saving ? '⏳...' : '⚠️ Déclencher la PRPE'}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
