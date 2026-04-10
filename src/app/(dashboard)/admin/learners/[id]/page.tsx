'use client';

import { useEffect, useState, useCallback } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { STATUS_LABELS, INSERTION_LABELS, formatDate } from '@/lib/utils';
import { RadarChart, Radar, PolarGrid, PolarAngleAxis, ResponsiveContainer, Tooltip } from 'recharts';

// ─── Constants ────────────────────────────────────────────────────────────────
const STATUS_COLORS: Record<string, string> = {
  IN_TRAINING: 'badge-blue', DROPPED: 'badge-red', INSERTED: 'badge-green', EXCLUDED: 'badge-gray',
};
const MASTERY = ['', 'Débutant', 'Opérationnel', 'Autonome', 'Moteur'];
const MASTERY_COLORS = ['', '#ef4444', '#f97316', '#22c55e', '#3b82f6'];

const FR_STATUS: Record<string, { label: string; color: string; icon: string }> = {
  PENDING:     { label: 'En attente',   color: '#94a3b8', icon: '⏳' },
  IN_PROGRESS: { label: 'En cours',     color: '#3b82f6', icon: '🔵' },
  SUBMITTED:   { label: 'Soumis',       color: '#f59e0b', icon: '📤' },
  TO_VALIDATE: { label: 'À Valider',    color: '#f97316', icon: '🔍' },
  VALIDATED:   { label: 'Terminé',      color: '#22c55e', icon: '✅' },
  REJECTED:    { label: 'Rejeté',       color: '#ef4444', icon: '❌' },
};

const TABS = [
  { key: 'overview',    label: '🏠 Vue d\'ensemble' },
  { key: 'sprints',     label: '📊 Évaluations Sprints' },
  { key: 'filrouge',   label: '🎯 Fil Rouge' },
  { key: 'meetings',   label: '🤝 Points de suivi' },
  { key: 'attendance', label: '📅 Présences' },
  { key: 'insertion',  label: '💼 Suivi Insertion' },
  { key: 'profile',    label: '👤 Profil' },
];

const MEETING_TYPES: Record<string, { label: string; color: string; bg: string; icon: string }> = {
  CADRAGE:       { label: 'Cadrage',        color: '#7c3aed', bg: '#ede9fe', icon: '🎯' },
  SUIVI:         { label: 'Point de suivi', color: '#0284c7', bg: '#e0f2fe', icon: '📋' },
  DEBRIEF:       { label: 'Débriefing',     color: '#0d9488', bg: '#ccfbf1', icon: '💬' },
  AVERTISSEMENT: { label: 'Avertissement',  color: '#dc2626', bg: '#fee2e2', icon: '⚠️' },
  ENCOURAGEMENT: { label: 'Encouragement',  color: '#16a34a', bg: '#dcfce7', icon: '🌟' },
  BILAN:         { label: 'Bilan',          color: '#d97706', bg: '#fef9c3', icon: '🏁' },
  OTHER:         { label: 'Autre',          color: '#6b7280', bg: '#f3f4f6', icon: '📌' },
};

const EMPTY_MEETING = { type: 'SUIVI', title: '', date: '', notes: '', outcome: '', isPrivate: false };

export default function LearnerDetailPage() {
  const params  = useParams();
  const [learner, setLearner] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('overview');

  // Meetings state
  const [meetings,      setMeetings]      = useState<any[]>([]);
  const [meetingForm,   setMeetingForm]   = useState<any>(EMPTY_MEETING);
  const [showMeeting,   setShowMeeting]   = useState(false);
  const [editMeeting,   setEditMeeting]   = useState<any>(null);
  const [savingMeeting, setSavingMeeting] = useState(false);

  // Modals
  const [statusModal,    setStatusModal]    = useState(false);
  const [insertionModal, setInsertionModal] = useState(false);
  const [profileModal,   setProfileModal]   = useState(false);
  const [savingProfile,  setSavingProfile]  = useState(false);
  const [profileForm,    setProfileForm]    = useState<any>(null);
  const [newStatus,      setNewStatus]      = useState('');
  const [statusComment,  setStatusComment]  = useState('');
  const [insertion, setInsertion] = useState({ type: '', company: '', date: '' });

  // Justifications state
  const [justifications,   setJustifications]   = useState<any[]>([]);
  const [showJustModal,    setShowJustModal]    = useState(false);
  const [justForm,         setJustForm]         = useState({ dateFrom: '', halfDayFrom: 'AM', dateTo: '', halfDayTo: 'PM', reasonType: 'MEDICAL', description: '' });
  const [savingJust,       setSavingJust]       = useState(false);
  const [expandedJust,     setExpandedJust]     = useState<string|null>(null); // open row detail
  const [attachForm,       setAttachForm]       = useState<Record<string, { url: string; name: string }>>({});
  const [addingAttach,     setAddingAttach]     = useState<string|null>(null);
  const [editingNote,      setEditingNote]      = useState<string|null>(null); // recordId being edited

  const load = useCallback(() => {
    Promise.all([
      fetch(`/api/learners/${params.id}`).then(r => r.json()),
      fetch(`/api/learners/${params.id}/meetings`).then(r => r.json()).catch(() => []),
      fetch(`/api/learners/${params.id}/justifications`).then(r => r.json()).catch(() => []),
    ]).then(([l, m, j]) => {
      setLearner(l);
      setMeetings(Array.isArray(m) ? m : []);
      setJustifications(Array.isArray(j) ? j : []);
    }).finally(() => setLoading(false));
  }, [params.id]);

  useEffect(() => { load(); }, [load]);

  useEffect(() => {
    if (!learner) return;
    setProfileForm({
      firstName: learner.firstName || '',
      lastName: learner.lastName || '',
      email: learner.email || '',
      phone: learner.phone || '',
      cin: learner.cin || '',
      birthdate: learner.birthdate ? new Date(learner.birthdate).toISOString().split('T')[0] : '',
      gender: learner.gender || '',
      emergencyContact: learner.emergencyContact || '',
      academicLevel: learner.academicLevel || '',
      academicField: learner.academicField || '',
    });
  }, [learner]);

  // ─── Justification handlers ────────────────────────────────────────────────
  const handleCreateJust = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingJust(true);
    try {
      await fetch(`/api/learners/${params.id}/justifications`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ cohortId: learner?.cohortId, ...justForm }),
      });
      setShowJustModal(false);
      setJustForm({ dateFrom: '', halfDayFrom: 'AM', dateTo: '', halfDayTo: 'PM', reasonType: 'MEDICAL', description: '' });
      load();
    } finally { setSavingJust(false); }
  };

  const handleReviewJust = async (justId: string, status: 'APPROVED' | 'REJECTED', comment?: string) => {
    await fetch(`/api/learners/${params.id}/justifications/${justId}`, {
      method: 'PUT', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status, reviewComment: comment || '' }),
    });
    load();
  };

  const handleDeleteJust = async (justId: string) => {
    if (!confirm('Supprimer ce justificatif ?')) return;
    await fetch(`/api/learners/${params.id}/justifications/${justId}`, { method: 'DELETE' });
    load();
  };

  const handleAddAttachment = async (justId: string) => {
    const form = attachForm[justId];
    if (!form?.url || !form?.name) return;
    setAddingAttach(justId);
    try {
      await fetch(`/api/learners/${params.id}/justifications/${justId}/attachments`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ fileUrl: form.url, filename: form.name }),
      });
      setAttachForm(prev => ({ ...prev, [justId]: { url: '', name: '' } }));
      load();
    } finally { setAddingAttach(null); }
  };

  const handleDeleteAttachment = async (justId: string, attachmentId: string) => {
    await fetch(`/api/learners/${params.id}/justifications/${justId}/attachments?attachmentId=${attachmentId}`, { method: 'DELETE' });
    load();
  };

  const handleSaveRecordNote = async (recordId: string, note: string) => {
    await fetch(`/api/learners/${params.id}/attendance/${recordId}`, {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ note }),
    });
    setEditingNote(null);
    load();
  };

  // ─── Meeting handlers ─────────────────────────────────────────────────────
  const handleCreateMeeting = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingMeeting(true);
    try {
      await fetch(`/api/learners/${params.id}/meetings`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(meetingForm),
      });
      setShowMeeting(false);
      setMeetingForm(EMPTY_MEETING);
      load();
    } finally { setSavingMeeting(false); }
  };

  const handleUpdateMeeting = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editMeeting) return;
    setSavingMeeting(true);
    try {
      await fetch(`/api/learners/${params.id}/meetings/${editMeeting.id}`, {
        method: 'PUT', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(editMeeting),
      });
      setEditMeeting(null);
      load();
    } finally { setSavingMeeting(false); }
  };

  const handleDeleteMeeting = async (meetingId: string) => {
    if (!confirm('Supprimer ce point de suivi ?')) return;
    await fetch(`/api/learners/${params.id}/meetings/${meetingId}`, { method: 'DELETE' });
    load();
  };

  const handleStatusChange = async () => {
    await fetch(`/api/learners/${params.id}`, {
      method: 'PUT', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ statusCurrent: newStatus, _previousStatus: learner.statusCurrent, statusComment }),
    });
    setStatusModal(false); load();
  };

  const handleInsertionUpdate = async () => {
    await fetch(`/api/learners/${params.id}`, {
      method: 'PUT', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        statusCurrent: 'INSERTED', _previousStatus: learner.statusCurrent,
        statusComment: `Insertion: ${INSERTION_LABELS[insertion.type] || insertion.type} chez ${insertion.company}`,
        insertionType: insertion.type, insertionCompany: insertion.company, insertionDate: insertion.date,
      }),
    });
    setInsertionModal(false); load();
  };

  const handleProfileSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profileForm) return;
    setSavingProfile(true);
    try {
      const res = await fetch(`/api/learners/${params.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(profileForm),
      });
      const data = await res.json();
      if (!res.ok) {
        alert(data.error || 'Erreur lors de la mise a jour du profil');
        return;
      }
      setProfileModal(false);
      load();
    } finally {
      setSavingProfile(false);
    }
  };

  if (loading) return <div className="page-body"><div className="loading-overlay"><span className="loading-spinner" /> Chargement...</div></div>;
  if (!learner) return <div className="page-body"><div className="empty-state"><p>Apprenant non trouvé</p></div></div>;

  // ─── Computed stats ──────────────────────────────────────────────────────
  const records    = learner.attendanceRecords || [];
  const total      = records.length;
  const absences   = records.filter((r: any) => r.status === 'ABSENT' || r.status === 'JUSTIFIED_ABSENT').length;
  const lates      = records.filter((r: any) => r.status === 'LATE').length;
  const lateMin    = records.reduce((s: number, r: any) => s + (r.lateMinutes || 0), 0);
  const absRate    = total > 0 ? Math.round((absences / total) * 100) : 0;

  // Sprint evaluations
  const sprintEvals  = learner.sprintEvaluations || [];
  const latestLevel  = sprintEvals.length > 0 ? sprintEvals[sprintEvals.length - 1]?.masteryLevel : 0;
  const avgLevel     = sprintEvals.length > 0 ? (sprintEvals.reduce((s: number, e: any) => s + e.masteryLevel, 0) / sprintEvals.length) : 0;

  // Fil rouge
  const frSubmissions  = learner.filRougeSubmissions || [];
  const frPhases       = learner.cohort?.filRougeProject?.phases || [];
  const frDone         = frSubmissions.filter((s: any) => s.status === 'VALIDATED').length;
  const frTotal        = frPhases.length;
  const frPct          = frTotal > 0 ? Math.round((frDone / frTotal) * 100) : 0;
  const frProject      = learner.cohort?.filRougeProject;

  // PRPE: count unjustified absences (status = ABSENT only, no JUSTIFIED_ABSENT)
  const unjustifiedAbsences = records.filter((r: any) => r.status === 'ABSENT');
  const unjustifiedDays = new Set(unjustifiedAbsences.map((r: any) => r.session?.date?.split('T')[0])).size;

  // Radar chart data for sprint evaluations
  const radarData = sprintEvals.slice(0, 8).map((e: any) => ({
    sprint: e.sprintPhase?.title?.replace(/Sprint\s*/i, 'S').slice(0, 12) || `S${e.sprintPhase?.orderIndex + 1}`,
    niveau: e.masteryLevel,
  }));

  return (
    <>
      {/* ═══ PAGE HEADER ═══ */}
      <div className="page-header">
        <div>
          <div className="breadcrumbs">
            <Link href="/admin/learners">Apprenants</Link> / <span>{learner.firstName} {learner.lastName}</span>
          </div>
          <h1 className="page-title">{learner.firstName} {learner.lastName}</h1>
          <p className="page-subtitle">{learner.cohort?.name} — {learner.cohort?.program?.name} — {learner.cohort?.campus?.name}</p>
        </div>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          <button className="btn btn-secondary" onClick={() => setStatusModal(true)}>🔄 Changer statut</button>
          <button className="btn btn-primary" onClick={() => setInsertionModal(true)}>💼 Insertion</button>
          <Link href={`/admin/learners/${params.id}/prpe`} className={`btn ${unjustifiedDays >= 3 ? 'btn-danger' : 'btn-secondary'}`}>
            {unjustifiedDays >= 3 ? `⚠️ PRPE (${unjustifiedDays}j)` : '⚠️ PRPE'}
          </Link>
          {frProject && <Link href={`/admin/cohorts/${learner.cohortId}/fil-rouge/${learner.id}`} className="btn btn-secondary">🎯 Fil Rouge détail</Link>}
        </div>
      </div>

      <div className="page-body">
        {/* PRPE alert banner */}
        {unjustifiedDays >= 3 && (
          <div style={{ padding: '12px 18px', background: '#fef2f2', border: '2px solid #fca5a5', borderRadius: 10, marginBottom: 16, display: 'flex', alignItems: 'center', gap: 14 }}>
            <span style={{ fontSize: 24 }}>🚨</span>
            <div style={{ flex: 1 }}>
              <div style={{ fontWeight: 700, color: '#dc2626', fontSize: 14 }}>
                Alerte PRPE — {unjustifiedDays} jours d&apos;absence non justifiée
              </div>
              <div style={{ fontSize: 12, color: '#991b1b' }}>
                Le seuil de déclenchement PRPE est atteint. Une procédure PRPE doit être enclenchée.
              </div>
            </div>
            <Link href={`/admin/learners/${params.id}/prpe`} className="btn btn-danger" style={{ flexShrink: 0 }}>
              ⚠️ Gérer PRPE
            </Link>
          </div>
        )}
        {/* ═══ TOP KPIs ═══ */}
        <div className="kpi-grid" style={{ gridTemplateColumns: 'repeat(6, 1fr)', marginBottom: 20 }}>
          <div className="kpi-card">
            <div className="kpi-label">Statut</div>
            <span className={`badge ${STATUS_COLORS[learner.statusCurrent]}`} style={{ fontSize: 13, padding: '5px 12px', marginTop: 4 }}>{STATUS_LABELS[learner.statusCurrent]}</span>
          </div>
          <div className="kpi-card" style={{ borderLeft: `4px solid ${absRate >= 20 ? '#ef4444' : absRate >= 10 ? '#f59e0b' : '#22c55e'}` }}>
            <div className="kpi-label">Taux absence</div>
            <div className="kpi-value" style={{ color: absRate >= 20 ? '#ef4444' : absRate >= 10 ? '#f59e0b' : '#22c55e' }}>{absRate}%</div>
            <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{absences} abs · {lates} retards</div>
          </div>
          <div className="kpi-card" style={{ borderLeft: `4px solid ${MASTERY_COLORS[Math.round(avgLevel)] || '#94a3b8'}` }}>
            <div className="kpi-label">Niveau moyen</div>
            <div className="kpi-value" style={{ color: MASTERY_COLORS[Math.round(avgLevel)] || '#94a3b8' }}>{avgLevel > 0 ? avgLevel.toFixed(1) : '—'}</div>
            <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{avgLevel > 0 ? MASTERY[Math.round(avgLevel)] : 'Non évalué'}</div>
          </div>
          <div className="kpi-card" style={{ borderLeft: `4px solid ${latestLevel > 0 ? MASTERY_COLORS[latestLevel] : '#94a3b8'}` }}>
            <div className="kpi-label">Dernier sprint</div>
            <div className="kpi-value" style={{ color: MASTERY_COLORS[latestLevel] || '#94a3b8' }}>{latestLevel > 0 ? latestLevel : '—'}</div>
            <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{latestLevel > 0 ? MASTERY[latestLevel] : ''}</div>
          </div>
          <div className="kpi-card" style={{ borderLeft: `4px solid ${frPct === 100 ? '#22c55e' : frPct >= 60 ? '#f59e0b' : '#3b82f6'}` }}>
            <div className="kpi-label">Fil Rouge</div>
            <div className="kpi-value" style={{ color: frPct === 100 ? '#22c55e' : frPct >= 60 ? '#f59e0b' : '#3b82f6' }}>{frTotal > 0 ? `${frPct}%` : '—'}</div>
            <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{frDone}/{frTotal} phases</div>
          </div>
          <div className="kpi-card">
            <div className="kpi-label">Sprints évalués</div>
            <div className="kpi-value">{sprintEvals.length}</div>
          </div>
        </div>

        {/* ═══ TABS ═══ */}
        <div className="tabs" style={{ marginBottom: 20 }}>
          {TABS.map(tab => (
            <button key={tab.key} className={`tab ${activeTab === tab.key ? 'active' : ''}`} onClick={() => setActiveTab(tab.key)}>
              {tab.label}
            </button>
          ))}
        </div>

        {/* ══════════════ TAB: OVERVIEW ══════════════ */}
        {activeTab === 'overview' && (
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
            {/* Sprint radar */}
            <div className="card">
              <div className="card-header"><h3 className="card-title">📊 Progression par sprint</h3></div>
              {sprintEvals.length === 0 ? (
                <div className="card-body"><p className="text-muted text-sm">Aucune évaluation de sprint encore.</p></div>
              ) : (
                <>
                  <div style={{ height: 220 }}>
                    <ResponsiveContainer width="100%" height="100%">
                      <RadarChart data={radarData}>
                        <PolarGrid />
                        <PolarAngleAxis dataKey="sprint" tick={{ fontSize: 10 }} />
                        <Radar name="Niveau" dataKey="niveau" stroke="#3b82f6" fill="#3b82f6" fillOpacity={0.3} />
                        <Tooltip formatter={(v: any) => [MASTERY[v] || v, 'Niveau']} />
                      </RadarChart>
                    </ResponsiveContainer>
                  </div>
                  <div className="card-body" style={{ paddingTop: 0 }}>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                      {sprintEvals.map((e: any) => (
                        <div key={e.id} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '6px 10px', borderRadius: 8, background: `${MASTERY_COLORS[e.masteryLevel]}15`, border: `1px solid ${MASTERY_COLORS[e.masteryLevel]}40`, minWidth: 72 }}>
                          <span style={{ fontSize: 10, color: 'var(--text-muted)', marginBottom: 2, maxWidth: 70, textAlign: 'center', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={e.sprintPhase?.title}>{e.sprintPhase?.title?.slice(0, 10) || '—'}</span>
                          <span style={{ fontWeight: 700, fontSize: 16, color: MASTERY_COLORS[e.masteryLevel] }}>{e.masteryLevel}</span>
                          <span style={{ fontSize: 9, color: MASTERY_COLORS[e.masteryLevel] }}>{MASTERY[e.masteryLevel]}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </>
              )}
            </div>

            {/* Fil Rouge progress */}
            <div className="card">
              <div className="card-header">
                <h3 className="card-title">🎯 Avancement Fil Rouge</h3>
                {frProject && <Link href={`/admin/cohorts/${learner.cohortId}/fil-rouge/${learner.id}`} style={{ fontSize: 12, color: 'var(--primary)' }}>Détail →</Link>}
              </div>
              {!frProject ? (
                <div className="card-body"><p className="text-muted text-sm">Aucun projet fil rouge configuré pour cette cohorte.</p></div>
              ) : (
                <div className="card-body">
                  {/* Big progress bar */}
                  <div style={{ marginBottom: 16 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                      <span style={{ fontWeight: 700, fontSize: 14 }}>{frProject.name}</span>
                      <span style={{ fontWeight: 700, fontSize: 18, color: frPct === 100 ? '#22c55e' : '#3b82f6' }}>{frPct}%</span>
                    </div>
                    <div style={{ height: 10, background: 'var(--border)', borderRadius: 5, overflow: 'hidden' }}>
                      <div style={{ height: '100%', width: `${frPct}%`, background: frPct === 100 ? '#22c55e' : frPct >= 60 ? '#f59e0b' : '#3b82f6', borderRadius: 5, transition: 'width 0.4s' }} />
                    </div>
                    {frProject.defenseDate && <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 4 }}>
                      Soutenance : {new Date(frProject.defenseDate).toLocaleDateString('fr-FR', { day: '2-digit', month: 'long', year: 'numeric' })}
                    </div>}
                  </div>
                  {/* Mini phase list */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 5, maxHeight: 240, overflowY: 'auto' }}>
                    {frPhases.slice(0, 12).map((phase: any) => {
                      const sub = frSubmissions.find((s: any) => s.phaseId === phase.id);
                      const status = sub?.status || 'PENDING';
                      const cfg = FR_STATUS[status] || FR_STATUS.PENDING;
                      const isOverdue = phase.deadline && new Date(phase.deadline) < new Date() && status !== 'VALIDATED';
                      return (
                        <div key={phase.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '5px 8px', borderRadius: 6, background: `${cfg.color}10` }}>
                          <span style={{ flexShrink: 0, fontSize: 14 }}>{cfg.icon}</span>
                          <span style={{ flex: 1, fontSize: 12, fontWeight: status === 'VALIDATED' ? 600 : 400, color: status === 'VALIDATED' ? '#22c55e' : 'var(--text-primary)', textDecoration: status === 'VALIDATED' ? 'line-through' : 'none' }}>
                            {phase.name}
                          </span>
                          {isOverdue && <span style={{ fontSize: 9, color: '#ef4444', flexShrink: 0 }}>⚠️ retard</span>}
                          {phase.deadline && <span style={{ fontSize: 9, color: 'var(--text-muted)', flexShrink: 0 }}>{new Date(phase.deadline).toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit' })}</span>}
                        </div>
                      );
                    })}
                    {frPhases.length > 12 && <div style={{ fontSize: 11, color: 'var(--text-muted)', textAlign: 'center' }}>+{frPhases.length - 12} phases supplémentaires</div>}
                  </div>
                </div>
              )}
            </div>

            {/* Info perso */}
            <div className="card">
              <div className="card-header"><h3 className="card-title">👤 Informations</h3></div>
              <div className="card-body">
                <div style={{ display: 'grid', gridTemplateColumns: '130px 1fr', gap: '8px 16px', fontSize: 13 }}>
                  <span className="text-muted">Email</span><span>{learner.email}</span>
                  <span className="text-muted">Téléphone</span><span>{learner.phone || '—'}</span>
                  <span className="text-muted">CIN</span><span>{learner.cin || '—'}</span>
                  <span className="text-muted">Genre</span><span>{learner.gender === 'MALE' ? '♂ Homme' : learner.gender === 'FEMALE' ? '♀ Femme' : '—'}</span>
                  <span className="text-muted">Niveau académique</span><span>{learner.academicLevel || '—'}</span>
                  <span className="text-muted">Filière</span><span>{learner.academicField || '—'}</span>
                  <span className="text-muted">Formateur</span><span>{learner.cohort?.trainer ? `${learner.cohort.trainer.firstName} ${learner.cohort.trainer.lastName}` : '—'}</span>
                </div>
              </div>
            </div>

            {/* Insertion */}
            <div className="card">
              <div className="card-header">
                <h3 className="card-title">💼 Insertion professionnelle</h3>
                <button className="btn btn-secondary" style={{ fontSize: 12 }} onClick={() => setInsertionModal(true)}>Mettre à jour</button>
              </div>
              <div className="card-body">
                {learner.insertionType ? (
                  <div style={{ display: 'grid', gridTemplateColumns: '130px 1fr', gap: '8px 16px', fontSize: 13 }}>
                    <span className="text-muted">Type</span><span className="badge badge-green" style={{ display: 'inline-block' }}>{INSERTION_LABELS[learner.insertionType]}</span>
                    <span className="text-muted">Entreprise</span><span>{learner.insertionCompany || '—'}</span>
                    <span className="text-muted">Date</span><span>{learner.insertionDate ? formatDate(learner.insertionDate) : '—'}</span>
                  </div>
                ) : (
                  <p className="text-muted text-sm">Pas encore d&apos;insertion enregistrée.</p>
                )}
              </div>
            </div>
          </div>
        )}

        {/* ══════════════ TAB: SPRINTS ══════════════ */}
        {activeTab === 'sprints' && (
          <div className="card">
            <div className="card-header">
              <h3 className="card-title">Évaluations par sprint — {sprintEvals.length} évaluation(s)</h3>
              <Link href={`/admin/cohorts/${learner.cohortId}/evaluations`} style={{ fontSize: 12, color: 'var(--primary)' }}>Voir la matrice cohorte →</Link>
            </div>
            {sprintEvals.length === 0 ? (
              <div className="card-body"><p className="text-muted text-sm">Aucune évaluation de sprint enregistrée.</p></div>
            ) : (
              <table className="data-table">
                <thead>
                  <tr><th>Sprint</th><th>Dates</th><th style={{ width: 180 }}>Niveau de maîtrise</th><th>Commentaire</th></tr>
                </thead>
                <tbody>
                  {sprintEvals.map((e: any) => (
                    <tr key={e.id}>
                      <td style={{ fontWeight: 600 }}>{e.sprintPhase?.title || '—'}</td>
                      <td style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                        {e.sprintPhase?.startDate ? new Date(e.sprintPhase.startDate).toLocaleDateString('fr-FR') : '—'}
                        {e.sprintPhase?.endDate ? ` → ${new Date(e.sprintPhase.endDate).toLocaleDateString('fr-FR')}` : ''}
                      </td>
                      <td>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                          <div style={{ display: 'flex', gap: 3 }}>
                            {[1,2,3,4].map(n => <div key={n} style={{ width: 14, height: 14, borderRadius: 3, background: n <= e.masteryLevel ? MASTERY_COLORS[e.masteryLevel] : 'var(--border)' }} />)}
                          </div>
                          <span style={{ fontWeight: 700, color: MASTERY_COLORS[e.masteryLevel], fontSize: 13 }}>{MASTERY[e.masteryLevel]}</span>
                        </div>
                      </td>
                      <td style={{ fontSize: 12 }}>{e.comment || '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        )}

        {/* ══════════════ TAB: FIL ROUGE ══════════════ */}
        {activeTab === 'filrouge' && (
          <>
            {!frProject ? (
              <div className="empty-state">
                <p style={{ fontSize: 18 }}>Aucun projet Fil Rouge configuré</p>
                <p className="text-muted text-sm mt-2">Configurez le Fil Rouge depuis la fiche cohorte.</p>
                <Link href={`/admin/cohorts/${learner.cohortId}/fil-rouge`} className="btn btn-primary" style={{ marginTop: 16 }}>Configurer le Fil Rouge</Link>
              </div>
            ) : (
              <>
                <div className="card" style={{ marginBottom: 16 }}>
                  <div className="card-body" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '16px 20px', flexWrap: 'wrap', gap: 12 }}>
                    <div>
                      <div style={{ fontWeight: 700, fontSize: 16 }}>{frProject.name}</div>
                      <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                        {frProject.assignedAt && `Assigné le ${new Date(frProject.assignedAt).toLocaleDateString('fr-FR')} · `}
                        {frProject.defenseDate && `Soutenance ${new Date(frProject.defenseDate).toLocaleDateString('fr-FR')}`}
                      </div>
                    </div>
                    <div style={{ textAlign: 'center' }}>
                      <div style={{ fontSize: 28, fontWeight: 700, color: frPct === 100 ? '#22c55e' : '#3b82f6' }}>{frPct}%</div>
                      <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>{frDone}/{frTotal} Terminées</div>
                    </div>
                    <Link href={`/admin/cohorts/${learner.cohortId}/fil-rouge/${learner.id}`} className="btn btn-primary">Ouvrir le suivi →</Link>
                  </div>
                  <div style={{ padding: '0 20px 16px' }}>
                    <div style={{ height: 8, background: 'var(--border)', borderRadius: 4, overflow: 'hidden' }}>
                      <div style={{ height: '100%', width: `${frPct}%`, background: frPct === 100 ? '#22c55e' : frPct >= 60 ? '#f59e0b' : '#3b82f6', borderRadius: 4, transition: 'width 0.4s' }} />
                    </div>
                  </div>
                </div>

                <div className="card">
                  <table className="data-table">
                    <thead>
                      <tr><th style={{ width: 40 }}>#</th><th>Phase</th><th style={{ width: 120 }}>Deadline</th><th style={{ width: 140 }}>Statut</th><th style={{ width: 80 }}>Validé</th><th>Livrable</th></tr>
                    </thead>
                    <tbody>
                      {frPhases.map((phase: any, i: number) => {
                        const sub = frSubmissions.find((s: any) => s.phaseId === phase.id);
                        const status = sub?.status || 'PENDING';
                        const cfg = FR_STATUS[status] || FR_STATUS.PENDING;
                        const isOverdue = phase.deadline && new Date(phase.deadline) < new Date() && status !== 'VALIDATED';
                        return (
                          <tr key={phase.id}>
                            <td style={{ color: 'var(--text-muted)', fontWeight: 600 }}>{i + 1}</td>
                            <td>
                              <div style={{ fontWeight: status === 'VALIDATED' ? 600 : 400, color: status === 'VALIDATED' ? '#22c55e' : 'var(--text-primary)' }}>{phase.name}</div>
                              {phase.isOptional && <span style={{ fontSize: 10, color: '#3b82f6' }}>optionnel</span>}
                              {sub?.learnerNote && <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>{sub.learnerNote}</div>}
                            </td>
                            <td>
                              <span style={{ fontSize: 12, color: isOverdue ? '#ef4444' : 'var(--text-muted)', fontWeight: isOverdue ? 700 : 400 }}>
                                {phase.deadline ? new Date(phase.deadline).toLocaleDateString('fr-FR') : '—'}
                                {isOverdue && ' ⚠️'}
                              </span>
                            </td>
                            <td><span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: 12, fontWeight: 600, color: cfg.color }}>{cfg.icon} {cfg.label}</span></td>
                            <td style={{ textAlign: 'center' }}>{sub?.trainerValidated ? <span style={{ color: '#22c55e' }}>✅</span> : <span style={{ color: 'var(--border)' }}>—</span>}</td>
                            <td>
                              {sub?.deliverableUrl ? (
                                <a href={sub.deliverableUrl} target="_blank" rel="noreferrer" style={{ fontSize: 12, color: '#3b82f6' }}>🔗 Voir</a>
                              ) : '—'}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </>
            )}
          </>
        )}

        {/* ══════════════ TAB: MEETINGS ══════════════ */}
        {activeTab === 'meetings' && (
          <>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
              <div>
                <div style={{ fontWeight: 700, fontSize: 16 }}>🤝 Points de suivi — {meetings.length} enregistré(s)</div>
                <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>Cadrage, suivi, débriefing, bilan de formation...</div>
              </div>
              <button className="btn btn-primary" onClick={() => { setMeetingForm(EMPTY_MEETING); setShowMeeting(true); }}>+ Nouveau point</button>
            </div>

            {meetings.length === 0 ? (
              <div className="card" style={{ textAlign: 'center', padding: '40px 24px' }}>
                <div style={{ fontSize: 40, marginBottom: 12 }}>🤝</div>
                <p style={{ fontWeight: 600, marginBottom: 6 }}>Aucun point de suivi encore enregistré</p>
                <p className="text-muted text-sm">Ajoutez des points de cadrage, suivi, débriefing ou bilan pour cet apprenant.</p>
                <button className="btn btn-primary" style={{ marginTop: 16 }} onClick={() => { setMeetingForm(EMPTY_MEETING); setShowMeeting(true); }}>+ Premier point de suivi</button>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 0, position: 'relative' }}>
                {/* Timeline line */}
                <div style={{ position: 'absolute', left: 28, top: 20, bottom: 20, width: 2, background: 'var(--border)', zIndex: 0 }} />
                {meetings.map((m: any) => {
                  const cfg = MEETING_TYPES[m.type] || MEETING_TYPES.OTHER;
                  return (
                    <div key={m.id} style={{ display: 'flex', gap: 16, marginBottom: 16, position: 'relative', zIndex: 1 }}>
                      {/* Timeline dot */}
                      <div style={{ flexShrink: 0, width: 40, height: 40, borderRadius: '50%', background: cfg.bg, border: `2px solid ${cfg.color}`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16, zIndex: 2 }}>
                        {cfg.icon}
                      </div>
                      {/* Card */}
                      <div className="card" style={{ flex: 1, borderLeft: `3px solid ${cfg.color}` }}>
                        <div className="card-body" style={{ padding: '12px 16px' }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12, marginBottom: 6 }}>
                            <div style={{ flex: 1 }}>
                              <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
                                <span style={{ padding: '2px 10px', borderRadius: 12, background: cfg.bg, color: cfg.color, fontSize: 11, fontWeight: 700 }}>{cfg.label}</span>
                                {m.isPrivate && <span style={{ fontSize: 10, color: '#6b7280', padding: '1px 8px', background: '#f3f4f6', borderRadius: 8 }}>🔒 Privé</span>}
                                <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                                  📅 {new Date(m.date).toLocaleDateString('fr-FR', { weekday: 'long', day: '2-digit', month: 'long', year: 'numeric' })}
                                </span>
                              </div>
                              <div style={{ fontWeight: 700, fontSize: 14, marginTop: 6 }}>{m.title}</div>
                              {m.organizedBy && <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>Par {m.organizedBy.firstName} {m.organizedBy.lastName}</div>}
                            </div>
                            <div style={{ display: 'flex', gap: 6, flexShrink: 0 }}>
                              <button className="btn btn-sm btn-secondary" onClick={() => setEditMeeting({ ...m, date: new Date(m.date).toISOString().split('T')[0] })}>✏️</button>
                              <button className="btn btn-sm btn-danger" onClick={() => handleDeleteMeeting(m.id)}>🗑️</button>
                            </div>
                          </div>
                          {m.notes && (
                            <div style={{ marginTop: 10, padding: '10px 14px', background: 'var(--bg-secondary)', borderRadius: 8, fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.6 }}>
                              <strong style={{ color: 'var(--text-primary)', display: 'block', marginBottom: 4, fontSize: 11 }}>📝 Compte-rendu / Observations</strong>
                              {m.notes}
                            </div>
                          )}
                          {m.outcome && (
                            <div style={{ marginTop: 8, padding: '10px 14px', background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: 8, fontSize: 13, color: '#166534', lineHeight: 1.6 }}>
                              <strong style={{ display: 'block', marginBottom: 4, fontSize: 11 }}>✅ Actions décidées / Suites à donner</strong>
                              {m.outcome}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </>
        )}

        {/* ══════════════ TAB: ATTENDANCE ══════════════ */}
        {activeTab === 'attendance' && (
          <>
            <div className="kpi-grid" style={{ gridTemplateColumns: 'repeat(4, 1fr)', marginBottom: 20 }}>
              <div className="kpi-card"><div className="kpi-label">Total séances</div><div className="kpi-value">{total}</div></div>
              <div className="kpi-card" style={{ borderLeft: `4px solid ${absRate >= 20 ? '#ef4444' : absRate >= 10 ? '#f59e0b' : '#22c55e'}` }}>
                <div className="kpi-label">Taux absence</div><div className="kpi-value" style={{ color: absRate >= 20 ? '#ef4444' : absRate >= 10 ? '#f59e0b' : '#22c55e' }}>{absRate}%</div>
              </div>
              <div className="kpi-card"><div className="kpi-label">Absences</div><div className="kpi-value" style={{ color: '#ef4444' }}>{absences}</div></div>
              <div className="kpi-card"><div className="kpi-label">Retards</div><div className="kpi-value" style={{ color: '#f59e0b' }}>{lates}</div><div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{lateMin} min au total</div></div>
            </div>

            {/* PRPE alert in tab */}
            {unjustifiedDays >= 3 && (
              <div style={{ padding: '10px 16px', background: '#fef2f2', border: '1px solid #fca5a5', borderRadius: 8, display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 }}>
                <span style={{ fontSize: 18 }}>🚨</span>
                <span style={{ fontSize: 13, color: '#dc2626', fontWeight: 600 }}>{unjustifiedDays} jours d&apos;absence non justifiée — seuil PRPE atteint</span>
                <Link href={`/admin/learners/${params.id}/prpe`} className="btn btn-sm btn-danger" style={{ marginLeft: 'auto' }}>Gérer PRPE →</Link>
              </div>
            )}

            {/* Justificatifs */}
            <div className="card">
              <div className="card-header">
                <h3 className="card-title">📋 Justificatifs d&apos;absence ({justifications.length})</h3>
                <button className="btn btn-primary" onClick={() => setShowJustModal(true)}>+ Ajouter</button>
              </div>
              {justifications.length === 0 ? (
                <div style={{ padding: '20px', textAlign: 'center', color: 'var(--text-muted)', fontSize: 13 }}>Aucun justificatif enregistré</div>
              ) : (
                <div>
                  {justifications.map((j: any) => {
                    const statusColors: Record<string, string> = { PENDING: '#64748b', APPROVED: '#16a34a', REJECTED: '#dc2626' };
                    const statusBgs: Record<string, string> = { PENDING: '#f1f5f9', APPROVED: '#dcfce7', REJECTED: '#fee2e2' };
                    const statusLabels: Record<string, string> = { PENDING: '⏳ En attente', APPROVED: '✅ Approuvé', REJECTED: '❌ Rejeté' };
                    const isOpen = expandedJust === j.id;
                    const af = attachForm[j.id] || { url: '', name: '' };
                    return (
                      <div key={j.id} style={{ borderBottom: '1px solid var(--border)' }}>
                        {/* Summary row */}
                        <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 16px', cursor: 'pointer', background: isOpen ? 'var(--bg-secondary)' : 'transparent' }}
                          onClick={() => setExpandedJust(isOpen ? null : j.id)}>
                          <span style={{ fontSize: 14, flexShrink: 0 }}>{isOpen ? '🔽' : '▶️'}</span>
                          {/* Period */}
                          <div style={{ flex: 2, fontSize: 12, fontWeight: 600 }}>
                            {new Date(j.dateFrom).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short' })} {j.halfDayFrom === 'AM' ? 'mat.' : 'apr.'}
                            {' → '}
                            {new Date(j.dateTo).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short' })} {j.halfDayTo === 'AM' ? 'mat.' : 'apr.'}
                          </div>
                          {/* Type */}
                          <div style={{ flex: 1, fontSize: 12 }}>
                            {j.reasonType === 'MEDICAL' ? '🏥 Médical' : j.reasonType === 'FAMILY' ? '👨‍👩‍👧 Familial' : j.reasonType === 'TRANSPORT' ? '🚌 Transport' : j.reasonType === 'ADMIN' ? '📋 Admin' : '📌 Autre'}
                          </div>
                          {/* Attachments count */}
                          <div style={{ flex: 1, fontSize: 11, color: 'var(--text-muted)' }}>
                            {j.attachments?.length > 0 ? `📎 ${j.attachments.length} pièce(s)` : '📎 Aucune pièce'}
                          </div>
                          {/* Status */}
                          <span style={{ padding: '3px 12px', borderRadius: 12, fontSize: 11, fontWeight: 700, background: statusBgs[j.status] || '#f1f5f9', color: statusColors[j.status] || '#64748b', flexShrink: 0 }}>
                            {statusLabels[j.status] || j.status}
                          </span>
                          {/* Actions */}
                          <div style={{ display: 'flex', gap: 4, flexShrink: 0 }} onClick={e => e.stopPropagation()}>
                            {j.status === 'PENDING' && <>
                              <button className="btn btn-sm btn-primary" style={{ fontSize: 10 }} onClick={() => handleReviewJust(j.id, 'APPROVED')}>✅</button>
                              <button className="btn btn-sm btn-danger" style={{ fontSize: 10 }} onClick={() => handleReviewJust(j.id, 'REJECTED')}>❌</button>
                            </>}
                            <button className="btn btn-sm btn-secondary" style={{ fontSize: 10 }} onClick={() => handleDeleteJust(j.id)}>🗑️</button>
                          </div>
                        </div>

                        {/* Expanded detail */}
                        {isOpen && (
                          <div style={{ padding: '0 16px 16px 44px', background: 'var(--bg-secondary)' }}>
                            {/* Description */}
                            {j.description && (
                              <div style={{ padding: '8px 12px', background: 'var(--card-bg)', borderRadius: 6, fontSize: 12, color: 'var(--text-secondary)', marginBottom: 12, borderLeft: '3px solid var(--border)' }}>
                                <strong style={{ fontSize: 11, color: 'var(--text-muted)', display: 'block', marginBottom: 2 }}>📝 Description / Motif</strong>
                                {j.description}
                              </div>
                            )}
                            {/* Reviewer comment */}
                            {j.reviewComment && (
                              <div style={{ padding: '8px 12px', background: j.status === 'APPROVED' ? '#f0fdf4' : '#fef2f2', borderRadius: 6, fontSize: 12, marginBottom: 12, borderLeft: `3px solid ${j.status === 'APPROVED' ? '#22c55e' : '#ef4444'}` }}>
                                <strong style={{ fontSize: 11, color: 'var(--text-muted)', display: 'block', marginBottom: 2 }}>
                                  {j.status === 'APPROVED' ? '✅' : '❌'} Commentaire de révision {j.reviewedBy ? `(${j.reviewedBy.firstName} ${j.reviewedBy.lastName})` : ''}
                                </strong>
                                {j.reviewComment}
                              </div>
                            )}
                            {/* Attachments */}
                            <div>
                              <div style={{ fontSize: 12, fontWeight: 700, marginBottom: 8, color: 'var(--text-primary)' }}>📎 Pièces justificatives</div>
                              {(j.attachments || []).length === 0 ? (
                                <p style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 8, fontStyle: 'italic' }}>Aucune pièce jointe</p>
                              ) : (
                                <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginBottom: 10 }}>
                                  {j.attachments.map((att: any) => (
                                    <div key={att.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '6px 12px', background: 'var(--card-bg)', borderRadius: 6, border: '1px solid var(--border)' }}>
                                      <span style={{ fontSize: 16 }}>
                                        {att.mimeType?.includes('image') ? '🖼️' : att.filePath?.includes('drive.google') ? '📁' : att.filePath?.includes('dropbox') ? '📦' : '📄'}
                                      </span>
                                      <a href={att.filePath} target="_blank" rel="noreferrer" style={{ flex: 1, fontSize: 12, color: '#3b82f6', textDecoration: 'none', fontWeight: 500 }}>
                                        {att.filename}
                                      </a>
                                      <span style={{ fontSize: 10, color: 'var(--text-muted)' }}>
                                        {new Date(att.uploadedAt).toLocaleDateString('fr-FR')}
                                      </span>
                                      <button style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 13, color: '#ef4444' }}
                                        onClick={() => handleDeleteAttachment(j.id, att.id)} title="Supprimer">🗑️</button>
                                    </div>
                                  ))}
                                </div>
                              )}
                              {/* Add attachment form */}
                              <div style={{ display: 'flex', gap: 8, alignItems: 'flex-end' }}>
                                <div style={{ flex: 2 }}>
                                  <label style={{ fontSize: 10, color: 'var(--text-muted)', display: 'block', marginBottom: 2 }}>Lien vers la pièce (Google Drive, Dropbox...)</label>
                                  <input className="form-input" style={{ fontSize: 11, padding: '4px 8px' }} placeholder="https://drive.google.com/..." value={af.url}
                                    onChange={e => setAttachForm(prev => ({ ...prev, [j.id]: { ...af, url: e.target.value } }))} />
                                </div>
                                <div style={{ flex: 1 }}>
                                  <label style={{ fontSize: 10, color: 'var(--text-muted)', display: 'block', marginBottom: 2 }}>Nom du document</label>
                                  <input className="form-input" style={{ fontSize: 11, padding: '4px 8px' }} placeholder="Certificat médical..." value={af.name}
                                    onChange={e => setAttachForm(prev => ({ ...prev, [j.id]: { ...af, name: e.target.value } }))} />
                                </div>
                                <button className="btn btn-sm btn-primary" style={{ fontSize: 11, flexShrink: 0 }}
                                  disabled={addingAttach === j.id || !af.url || !af.name}
                                  onClick={() => handleAddAttachment(j.id)}>
                                  {addingAttach === j.id ? '⏳' : '+ Attacher'}
                                </button>
                              </div>
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}

            </div>

            {/* Attendance history table */}
            <div className="card">
              <div className="card-header"><h3 className="card-title">Historique des présences (50 dernières)</h3></div>
              <table className="data-table">
                <thead><tr><th>Date</th><th>Demi-journée</th><th>Statut</th><th>Retard</th><th>Commentaire</th></tr></thead>
                <tbody>
                  {records.slice(0, 50).map((r: any) => {
                    const isEditing = editingNote === r.id;
                    return (
                      <tr key={r.id}>
                        <td style={{ fontSize: 12 }}>{formatDate(r.session.date)}</td>
                        <td style={{ fontSize: 12 }}>{r.session.halfDay === 'AM' ? '🌅 Matin' : '🌇 Après-midi'}</td>
                        <td><span className={`badge ${r.status === 'PRESENT' ? 'badge-green' : r.status === 'ABSENT' ? 'badge-red' : r.status === 'JUSTIFIED_ABSENT' ? 'badge-blue' : r.status === 'LATE' ? 'badge-orange' : 'badge-gray'}`}>{STATUS_LABELS[r.status]}</span></td>
                        <td style={{ fontSize: 12 }}>{r.lateMinutes ? `${r.lateMinutes} min` : '—'}</td>
                        <td style={{ minWidth: 200 }}>
                          {isEditing ? (
                            <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                              <input autoFocus className="form-input" style={{ fontSize: 11, padding: '3px 8px', flex: 1 }}
                                defaultValue={r.note || ''}
                                id={`note-${r.id}`}
                                onKeyDown={e => { if (e.key === 'Enter') handleSaveRecordNote(r.id, (e.target as HTMLInputElement).value); if (e.key === 'Escape') setEditingNote(null); }}
                              />
                              <button className="btn btn-sm btn-primary" style={{ fontSize: 10, padding: '3px 8px' }}
                                onClick={() => handleSaveRecordNote(r.id, (document.getElementById(`note-${r.id}`) as HTMLInputElement)?.value || '')}>
                                💾
                              </button>
                              <button className="btn btn-sm btn-secondary" style={{ fontSize: 10, padding: '3px 8px' }} onClick={() => setEditingNote(null)}>✕</button>
                            </div>
                          ) : (
                            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                              <span style={{ fontSize: 11, color: r.note ? 'var(--text-secondary)' : 'var(--text-muted)', fontStyle: r.note ? 'normal' : 'italic', flex: 1 }}>
                                {r.note || 'Aucun commentaire'}
                              </span>
                              <button style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 12, color: 'var(--text-muted)', padding: '0 2px', flexShrink: 0 }}
                                title="Modifier le commentaire" onClick={() => setEditingNote(r.id)}>✏️</button>
                            </div>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                  {records.length === 0 && <tr><td colSpan={5} style={{ textAlign: 'center', color: 'var(--text-muted)' }}>Aucune présence enregistrée</td></tr>}
                </tbody>
              </table>
            </div>
          </>
        )}

        {/* ══════════════ TAB: INSERTION FOLLOWUP ══════════════ */}
        {activeTab === 'insertion' && (
          <div className="card">
            <div className="card-header"><h3 className="card-title">💼 Calendrier de suivi d'insertion</h3></div>
            {(learner.insertionFollowUps || []).length === 0 ? (
               <div className="card-body" style={{ textAlign: 'center', padding: '40px 24px' }}>
                 <p className="text-muted text-sm">Aucun suivi planifié pour cet apprenant.</p>
               </div>
            ) : (
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Date prévue</th>
                    <th>Modèle</th>
                    <th>Statut</th>
                    <th>Notes & Échanges</th>
                  </tr>
                </thead>
                <tbody>
                  {learner.insertionFollowUps.map((f: any) => (
                    <tr key={f.id}>
                      <td style={{ fontWeight: 600 }}>{new Date(f.plannedDate).toLocaleDateString('fr-FR', { weekday: 'short', day: '2-digit', month: 'short', year: 'numeric' })}</td>
                      <td>{f.modality === 'CALL' ? '📞 Appel' : f.modality === 'ONLINE_MEETING' ? '💻 Visio' : f.modality === 'IN_PERSON' ? '👥 Présentiel' : '✉️ Email'}</td>
                      <td>
                        <span className={`badge ${f.status === 'COMPLETED' ? 'badge-green' : f.status === 'SCHEDULED' ? 'badge-blue' : f.status === 'NO_SHOW' ? 'badge-orange' : 'badge-red'}`}>
                          {f.status === 'COMPLETED' ? '✅ Réalisé' : f.status === 'SCHEDULED' ? '📅 Planifié' : f.status === 'NO_SHOW' ? '⚠️ Injoignable' : '❌ Annulé'}
                        </span>
                      </td>
                      <td style={{ fontSize: 13, color: 'var(--text-secondary)' }}>
                        <div style={{ marginBottom: f.attachmentPath ? 4 : 0 }}>
                          {f.notes ? f.notes : <span style={{ fontStyle: 'italic', color: 'var(--text-muted)' }}>Aucune note</span>}
                        </div>
                        {f.attachmentPath && (
                          <a href={f.attachmentPath} target="_blank" rel="noreferrer" style={{ fontSize: 11, color: 'var(--primary-600)', textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: 4, background: 'var(--primary-50)', padding: '2px 8px', borderRadius: 10 }}>
                            📎 {f.attachmentName || 'Pièce jointe'}
                          </a>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        )}

        {/* ══════════════ TAB: PROFILE ══════════════ */}
        {activeTab === 'profile' && (
          <div>
            <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 12 }}>
              <button className="btn btn-primary" onClick={() => setProfileModal(true)}>Modifier profil</button>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
            <div className="card">
              <div className="card-header"><h3 className="card-title">👤 Informations personnelles</h3></div>
              <div className="card-body">
                <div style={{ display: 'grid', gridTemplateColumns: '140px 1fr', gap: '10px 16px', fontSize: 13 }}>
                  <span className="text-muted">Prénom</span><span style={{ fontWeight: 600 }}>{learner.firstName}</span>
                  <span className="text-muted">Nom</span><span style={{ fontWeight: 600 }}>{learner.lastName}</span>
                  <span className="text-muted">Email</span><span>{learner.email}</span>
                  <span className="text-muted">Téléphone</span><span>{learner.phone || '—'}</span>
                  <span className="text-muted">CIN</span><span>{learner.cin || '—'}</span>
                  <span className="text-muted">Date de naissance</span><span>{learner.birthdate ? formatDate(learner.birthdate) : '—'}</span>
                  <span className="text-muted">Genre</span><span>{learner.gender === 'MALE' ? 'Homme' : learner.gender === 'FEMALE' ? 'Femme' : '—'}</span>
                  <span className="text-muted">Contact urgence</span><span>{learner.emergencyContact || '—'}</span>
                </div>
              </div>
            </div>
            <div className="card">
              <div className="card-header"><h3 className="card-title">🎓 Parcours académique</h3></div>
              <div className="card-body">
                <div style={{ display: 'grid', gridTemplateColumns: '140px 1fr', gap: '10px 16px', fontSize: 13 }}>
                  <span className="text-muted">Niveau académique</span><span>{learner.academicLevel || '—'}</span>
                  <span className="text-muted">Filière</span><span>{learner.academicField || '—'}</span>
                  <span className="text-muted">Cohorte</span><span>{learner.cohort?.name}</span>
                  <span className="text-muted">Programme</span><span>{learner.cohort?.program?.name}</span>
                  <span className="text-muted">Campus</span><span>{learner.cohort?.campus?.name || '—'}</span>
                  <span className="text-muted">Formateur</span><span>{learner.cohort?.trainer ? `${learner.cohort.trainer.firstName} ${learner.cohort.trainer.lastName}` : '—'}</span>
                  <span className="text-muted">Début formation</span><span>{learner.cohort?.startDate ? formatDate(learner.cohort.startDate) : '—'}</span>
                  <span className="text-muted">Fin formation</span><span>{learner.cohort?.endDate ? formatDate(learner.cohort.endDate) : '—'}</span>
                </div>
              </div>
            </div>

            {/* Status History */}
            <div className="card" style={{ gridColumn: '1 / -1' }}>
              <div className="card-header"><h3 className="card-title">📋 Historique des statuts</h3></div>
              <table className="data-table">
                <thead><tr><th>Date</th><th>De</th><th>Vers</th><th>Commentaire</th><th>Par</th></tr></thead>
                <tbody>
                  {learner.statusHistory?.length === 0 && <tr><td colSpan={5} style={{ textAlign: 'center', color: 'var(--text-muted)' }}>Aucun historique</td></tr>}
                  {learner.statusHistory?.map((h: any) => (
                    <tr key={h.id}>
                      <td>{formatDate(h.effectiveDate)}</td>
                      <td>{h.fromStatus ? <span className={`badge ${STATUS_COLORS[h.fromStatus] || 'badge-gray'}`}>{STATUS_LABELS[h.fromStatus]}</span> : '—'}</td>
                      <td><span className={`badge ${STATUS_COLORS[h.toStatus] || 'badge-gray'}`}>{STATUS_LABELS[h.toStatus]}</span></td>
                      <td>{h.comment || '—'}</td>
                      <td>{h.changedBy ? `${h.changedBy.firstName} ${h.changedBy.lastName}` : '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
          </div>
        )}
      </div>

      {/* ═══ PROFILE MODAL ═══ */}
      {profileModal && profileForm && (
        <div className="modal-overlay" onClick={() => setProfileModal(false)}>
          <div className="modal" style={{ maxWidth: 760 }} onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h2 className="modal-title">Modifier le profil apprenant</h2>
              <button className="btn btn-ghost btn-icon" onClick={() => setProfileModal(false)}>✕</button>
            </div>
            <form onSubmit={handleProfileSave}>
              <div className="modal-body">
                <div className="form-row">
                  <div className="form-group">
                    <label className="form-label">Prenom</label>
                    <input className="form-input" value={profileForm.firstName} onChange={e => setProfileForm({ ...profileForm, firstName: e.target.value })} />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Nom</label>
                    <input className="form-input" value={profileForm.lastName} onChange={e => setProfileForm({ ...profileForm, lastName: e.target.value })} />
                  </div>
                </div>
                <div className="form-row">
                  <div className="form-group">
                    <label className="form-label">Email</label>
                    <input type="email" className="form-input" value={profileForm.email} onChange={e => setProfileForm({ ...profileForm, email: e.target.value })} />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Telephone</label>
                    <input className="form-input" value={profileForm.phone} onChange={e => setProfileForm({ ...profileForm, phone: e.target.value })} />
                  </div>
                </div>
                <div className="form-row">
                  <div className="form-group">
                    <label className="form-label">CIN</label>
                    <input className="form-input" value={profileForm.cin} onChange={e => setProfileForm({ ...profileForm, cin: e.target.value })} />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Date de naissance</label>
                    <input type="date" className="form-input" value={profileForm.birthdate} onChange={e => setProfileForm({ ...profileForm, birthdate: e.target.value })} />
                  </div>
                </div>
                <div className="form-row">
                  <div className="form-group">
                    <label className="form-label">Genre</label>
                    <select className="form-select" value={profileForm.gender} onChange={e => setProfileForm({ ...profileForm, gender: e.target.value })}>
                      <option value="">Non precise</option>
                      <option value="MALE">Homme</option>
                      <option value="FEMALE">Femme</option>
                    </select>
                  </div>
                  <div className="form-group">
                    <label className="form-label">Contact urgence</label>
                    <input className="form-input" value={profileForm.emergencyContact} onChange={e => setProfileForm({ ...profileForm, emergencyContact: e.target.value })} />
                  </div>
                </div>
                <div className="form-row">
                  <div className="form-group">
                    <label className="form-label">Niveau academique</label>
                    <input className="form-input" value={profileForm.academicLevel} onChange={e => setProfileForm({ ...profileForm, academicLevel: e.target.value })} />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Filiere</label>
                    <input className="form-input" value={profileForm.academicField} onChange={e => setProfileForm({ ...profileForm, academicField: e.target.value })} />
                  </div>
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={() => setProfileModal(false)}>Annuler</button>
                <button type="submit" className="btn btn-primary" disabled={savingProfile}>
                  {savingProfile ? 'Enregistrement...' : 'Enregistrer'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ═══ STATUS MODAL ═══ */}
      {statusModal && (
        <div className="modal-overlay" onClick={() => setStatusModal(false)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <div className="modal-header"><h2 className="modal-title">🔄 Changer le statut</h2><button className="btn btn-ghost btn-icon" onClick={() => setStatusModal(false)}>✕</button></div>
            <div className="modal-body">
              <p className="text-sm" style={{ marginBottom: 12 }}>Statut actuel : <span className={`badge ${STATUS_COLORS[learner.statusCurrent]}`}>{STATUS_LABELS[learner.statusCurrent]}</span></p>
              <div className="form-group"><label className="form-label">Nouveau statut</label>
                <select className="form-select" value={newStatus} onChange={e => setNewStatus(e.target.value)}>
                  <option value="">Sélectionner</option>
                  <option value="IN_TRAINING">En formation</option>
                  <option value="DROPPED">Abandonné</option>
                  <option value="EXCLUDED">Exclu</option>
                  <option value="INSERTED">Inséré</option>
                </select>
              </div>
              <div className="form-group"><label className="form-label">Commentaire</label><textarea className="form-input" rows={3} value={statusComment} onChange={e => setStatusComment(e.target.value)} /></div>
            </div>
            <div className="modal-footer"><button className="btn btn-secondary" onClick={() => setStatusModal(false)}>Annuler</button><button className="btn btn-primary" onClick={handleStatusChange} disabled={!newStatus}>Confirmer</button></div>
          </div>
        </div>
      )}

      {/* ═══ INSERTION MODAL ═══ */}
      {insertionModal && (
        <div className="modal-overlay" onClick={() => setInsertionModal(false)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <div className="modal-header"><h2 className="modal-title">💼 Insertion professionnelle</h2><button className="btn btn-ghost btn-icon" onClick={() => setInsertionModal(false)}>✕</button></div>
            <div className="modal-body">
              <div className="form-group"><label className="form-label">Type d&apos;insertion</label>
                <select className="form-select" value={insertion.type} onChange={e => setInsertion({...insertion, type: e.target.value})}>
                  <option value="">Sélectionner</option>
                  <option value="INTERNSHIP">Stage</option>
                  <option value="CDI">CDI</option>
                  <option value="CDD">CDD</option>
                  <option value="FREELANCE">Freelance</option>
                  <option value="PRE_HIRE">Pré-embauche</option>
                  <option value="FURTHER_STUDIES">Poursuite d&apos;études</option>
                </select>
              </div>
              <div className="form-group"><label className="form-label">Entreprise</label><input className="form-input" value={insertion.company} onChange={e => setInsertion({...insertion, company: e.target.value})} /></div>
              <div className="form-group"><label className="form-label">Date d&apos;insertion</label><input type="date" className="form-input" value={insertion.date} onChange={e => setInsertion({...insertion, date: e.target.value})} /></div>
            </div>
            <div className="modal-footer"><button className="btn btn-secondary" onClick={() => setInsertionModal(false)}>Annuler</button><button className="btn btn-primary" onClick={handleInsertionUpdate} disabled={!insertion.type}>Enregistrer</button></div>
          </div>
        </div>
      )}

      {/* ═══ CREATE MEETING MODAL ═══ */}
      {showMeeting && (
        <div className="modal-overlay" onClick={() => setShowMeeting(false)}>
          <div className="modal" style={{ maxWidth: 600 }} onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h2 className="modal-title">🤝 Nouveau point de suivi</h2>
              <button className="btn btn-ghost btn-icon" onClick={() => setShowMeeting(false)}>✕</button>
            </div>
            <form onSubmit={handleCreateMeeting}>
              <div className="modal-body">
                <div className="form-row">
                  <div className="form-group">
                    <label className="form-label">Type de point *</label>
                    <select className="form-select" value={meetingForm.type} onChange={e => setMeetingForm({...meetingForm, type: e.target.value})}>
                      {Object.entries(MEETING_TYPES).map(([k, v]) => <option key={k} value={k}>{v.icon} {v.label}</option>)}
                    </select>
                  </div>
                  <div className="form-group">
                    <label className="form-label">Date *</label>
                    <input type="date" className="form-input" value={meetingForm.date} onChange={e => setMeetingForm({...meetingForm, date: e.target.value})} required />
                  </div>
                </div>
                <div className="form-group">
                  <label className="form-label">Titre / Objet *</label>
                  <input className="form-input" placeholder="Ex: Point de cadrage mi-formation, Débriefing semaine 8..." required value={meetingForm.title} onChange={e => setMeetingForm({...meetingForm, title: e.target.value})} />
                </div>
                <div className="form-group">
                  <label className="form-label">📝 Compte-rendu / Observations</label>
                  <textarea className="form-input" rows={4} style={{ resize: 'vertical' }} placeholder="Points abordés, observations, difficultés évoquées..." value={meetingForm.notes} onChange={e => setMeetingForm({...meetingForm, notes: e.target.value})} />
                </div>
                <div className="form-group">
                  <label className="form-label">✅ Actions décidées / Suites à donner</label>
                  <textarea className="form-input" rows={3} style={{ resize: 'vertical' }} placeholder="Actions à mener, objectifs fixés, échéances..." value={meetingForm.outcome} onChange={e => setMeetingForm({...meetingForm, outcome: e.target.value})} />
                </div>
                <label style={{ display: 'flex', alignItems: 'center', gap: 10, fontSize: 13, cursor: 'pointer' }}>
                  <input type="checkbox" checked={meetingForm.isPrivate} onChange={e => setMeetingForm({...meetingForm, isPrivate: e.target.checked})} />
                  🔒 Note privée (non visible par l&apos;apprenant)
                </label>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={() => setShowMeeting(false)}>Annuler</button>
                <button type="submit" className="btn btn-primary" disabled={savingMeeting}>{savingMeeting ? '⏳ Enregistrement...' : '💾 Enregistrer'}</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ═══ EDIT MEETING MODAL ═══ */}
      {editMeeting && (
        <div className="modal-overlay" onClick={() => setEditMeeting(null)}>
          <div className="modal" style={{ maxWidth: 600 }} onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h2 className="modal-title">✏️ Modifier le point de suivi</h2>
              <button className="btn btn-ghost btn-icon" onClick={() => setEditMeeting(null)}>✕</button>
            </div>
            <form onSubmit={handleUpdateMeeting}>
              <div className="modal-body">
                <div className="form-row">
                  <div className="form-group">
                    <label className="form-label">Type *</label>
                    <select className="form-select" value={editMeeting.type} onChange={e => setEditMeeting({...editMeeting, type: e.target.value})}>
                      {Object.entries(MEETING_TYPES).map(([k, v]) => <option key={k} value={k}>{v.icon} {v.label}</option>)}
                    </select>
                  </div>
                  <div className="form-group">
                    <label className="form-label">Date *</label>
                    <input type="date" className="form-input" value={editMeeting.date} onChange={e => setEditMeeting({...editMeeting, date: e.target.value})} required />
                  </div>
                </div>
                <div className="form-group">
                  <label className="form-label">Titre / Objet *</label>
                  <input className="form-input" required value={editMeeting.title} onChange={e => setEditMeeting({...editMeeting, title: e.target.value})} />
                </div>
                <div className="form-group">
                  <label className="form-label">📝 Compte-rendu / Observations</label>
                  <textarea className="form-input" rows={4} style={{ resize: 'vertical' }} value={editMeeting.notes || ''} onChange={e => setEditMeeting({...editMeeting, notes: e.target.value})} />
                </div>
                <div className="form-group">
                  <label className="form-label">✅ Actions décidées / Suites à donner</label>
                  <textarea className="form-input" rows={3} style={{ resize: 'vertical' }} value={editMeeting.outcome || ''} onChange={e => setEditMeeting({...editMeeting, outcome: e.target.value})} />
                </div>
                <label style={{ display: 'flex', alignItems: 'center', gap: 10, fontSize: 13, cursor: 'pointer' }}>
                  <input type="checkbox" checked={editMeeting.isPrivate} onChange={e => setEditMeeting({...editMeeting, isPrivate: e.target.checked})} />
                  🔒 Note privée
                </label>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={() => setEditMeeting(null)}>Annuler</button>
                <button type="submit" className="btn btn-primary" disabled={savingMeeting}>{savingMeeting ? '⏳...' : '💾 Enregistrer'}</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ═══ JUSTIFICATION MODAL ═══ */}
      {showJustModal && (
        <div className="modal-overlay" onClick={() => setShowJustModal(false)}>
          <div className="modal" style={{ maxWidth: 560 }} onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h2 className="modal-title">📋 Ajouter un justificatif</h2>
              <button className="btn btn-ghost btn-icon" onClick={() => setShowJustModal(false)}>✕</button>
            </div>
            <form onSubmit={handleCreateJust}>
              <div className="modal-body">
                <div className="form-group">
                  <label className="form-label">Type de justificatif *</label>
                  <select className="form-select" value={justForm.reasonType} onChange={e => setJustForm({...justForm, reasonType: e.target.value})}>
                    <option value="MEDICAL">🏥 Médical (maladie, hospitalisation...)</option>
                    <option value="FAMILY">👨‍👩‍👧 Familial (deuil, urgence...)</option>
                    <option value="TRANSPORT">🚌 Transport (grève, panne...)</option>
                    <option value="ADMIN">📋 Administratif (convocation officielle...)</option>
                    <option value="OTHER">📌 Autre</option>
                  </select>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr auto 1fr', gap: 10, alignItems: 'end' }}>
                  <div>
                    <div className="form-group">
                      <label className="form-label">Date de début *</label>
                      <input type="date" className="form-input" required value={justForm.dateFrom} onChange={e => setJustForm({...justForm, dateFrom: e.target.value})} />
                    </div>
                    <div className="form-group">
                      <label className="form-label">Demi-journée</label>
                      <select className="form-select" value={justForm.halfDayFrom} onChange={e => setJustForm({...justForm, halfDayFrom: e.target.value})}>
                        <option value="AM">🌅 Matin</option>
                        <option value="PM">🌇 Après-midi</option>
                      </select>
                    </div>
                  </div>
                  <div style={{ textAlign: 'center', paddingBottom: 16, color: 'var(--text-muted)' }}>→</div>
                  <div>
                    <div className="form-group">
                      <label className="form-label">Date de fin *</label>
                      <input type="date" className="form-input" required value={justForm.dateTo} onChange={e => setJustForm({...justForm, dateTo: e.target.value})} />
                    </div>
                    <div className="form-group">
                      <label className="form-label">Demi-journée</label>
                      <select className="form-select" value={justForm.halfDayTo} onChange={e => setJustForm({...justForm, halfDayTo: e.target.value})}>
                        <option value="AM">🌅 Matin</option>
                        <option value="PM">🌇 Après-midi</option>
                      </select>
                    </div>
                  </div>
                </div>
                <div className="form-group">
                  <label className="form-label">Description / Motif</label>
                  <textarea className="form-input" rows={3} style={{ resize: 'vertical' }} placeholder="Détails du motif d'absence..." value={justForm.description} onChange={e => setJustForm({...justForm, description: e.target.value})} />
                </div>
                <div style={{ padding: '10px 14px', background: '#fef9c3', borderRadius: 8, fontSize: 12, color: '#713f12' }}>
                  💡 Si approuvé, les enregistrements d&apos;absence sur cette période passeront automatiquement en <strong>Absence justifiée</strong>.
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={() => setShowJustModal(false)}>Annuler</button>
                <button type="submit" className="btn btn-primary" disabled={savingJust}>{savingJust ? '⏳...' : '📋 Enregistrer'}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
