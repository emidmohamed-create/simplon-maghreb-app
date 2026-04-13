'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { 
  formatDate, formatDateTime, calcAbsenceRate, getRiskLevel, getRiskColor, 
  STATUS_LABELS, INSERTION_LABELS, cn 
} from '@/lib/utils';
import {
  Chart as ChartJS,
  RadialLinearScale,
  PointElement,
  LineElement,
  Filler,
  Tooltip,
  Legend,
} from 'chart.js';
import { Radar } from 'react-chartjs-2';
import { ACADEMIC_FIELD_OPTIONS, ACADEMIC_LEVEL_OPTIONS } from '@/lib/academic-options';

ChartJS.register(
  RadialLinearScale,
  PointElement,
  LineElement,
  Filler,
  Tooltip,
  Legend
);

const STATUS_COLORS: Record<string, string> = {
  IN_TRAINING: 'badge-blue',
  DROPPED: 'badge-red',
  INSERTED: 'badge-green',
  EXCLUDED: 'badge-gray',
  PRESENT: 'badge-green',
  ABSENT: 'badge-red',
  JUSTIFIED_ABSENT: 'badge-blue',
  LATE: 'badge-orange',
};

const MEETING_TYPES: Record<string, any> = {
  INDIVIDUAL: { label: 'Individuel', icon: '👤', color: '#3b82f6' },
  TECHNICAL: { label: 'Technique', icon: '💻', color: '#8b5cf6' },
  BEHAVIORAL: { label: 'Comportemental', icon: '🤝', color: '#f59e0b' },
  SITUATIONAL: { label: 'Mise en situation', icon: '🎭', color: '#10b981' },
  OTHER: { label: 'Autre', icon: '📌', color: '#6b7280' },
};

export default function LearnerDetailPage() {
  const { id } = useParams();
  const router = useRouter();
  const [learner, setLearner] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('overview');

  // Attendance states
  const [records, setRecords] = useState<any[]>([]);
  const [justifications, setJustifications] = useState<any[]>([]);
  const [editingNote, setEditingNote] = useState<string | null>(null);

  // Modals
  const [profileModal, setProfileModal] = useState(false);
  const [profileForm, setProfileForm] = useState<any>(null);
  const [savingProfile, setSavingProfile] = useState(false);

  const [statusModal, setStatusModal] = useState(false);
  const [newStatus, setNewStatus] = useState('');
  const [statusComment, setStatusComment] = useState('');

  const [insertionModal, setInsertionModal] = useState(false);
  const [insertion, setInsertion] = useState({ type: '', company: '', date: '' });

  const [showMeeting, setShowMeeting] = useState(false);
  const [editMeeting, setEditMeeting] = useState<any>(null);
  const [meetingForm, setMeetingForm] = useState({ type: 'INDIVIDUAL', date: new Date().toISOString().split('T')[0], title: '', notes: '', outcome: '', isPrivate: false });
  const [savingMeeting, setSavingMeeting] = useState(false);

  const [showJustModal, setShowJustModal] = useState(false);
  const [justForm, setJustForm] = useState({
    dateFrom: new Date().toISOString().split('T')[0],
    halfDayFrom: 'AM',
    dateTo: new Date().toISOString().split('T')[0],
    halfDayTo: 'PM',
    reasonType: 'MEDICAL',
    description: ''
  });
  const [savingJust, setSavingJust] = useState(false);
  const [addingAttach, setAddingAttach] = useState<string | null>(null);
  const [attachForm, setAttachForm] = useState<Record<string, { url: string; name: string }>>({});

  // Migration states
  const [monthlyRates, setMonthlyRates] = useState<any[]>([]);
  const [showMonthlyRateModal, setShowMonthlyRateModal] = useState(false);
  const [monthlyRateForm, setMonthlyRateForm] = useState({ year: new Date().getFullYear(), month: new Date().getMonth() + 1, presenceRate: '' });
  const [savingMonthlyRate, setSavingMonthlyRate] = useState(false);

  const loadData = useCallback(async () => {
    try {
      const res = await fetch(`/api/learners/${id}`);
      if (!res.ok) throw new Error('Failed to load');
      const data = await res.json();
      setLearner(data);
      setRecords(data.attendance || []);
      setJustifications(data.justifications || []);
      setMonthlyRates(data.monthlyPresenceRates || []);
      setProfileForm({
        firstName: data.firstName,
        lastName: data.lastName,
        email: data.email,
        phone: data.phone || '',
        cin: data.cin || '',
        birthdate: data.birthdate ? new Date(data.birthdate).toISOString().split('T')[0] : '',
        gender: data.gender || '',
        emergencyContact: data.emergencyContact || '',
        academicLevel: data.academicLevel || '',
        academicField: data.academicField || '',
        manualAbsenceRate: data.manualAbsenceRate !== null ? data.manualAbsenceRate : '',
      });
      setInsertion({
        type: data.insertionType || '',
        company: data.insertionCompany || '',
        date: data.insertionDate ? new Date(data.insertionDate).toISOString().split('T')[0] : '',
      });
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Actions
  const handleProfileSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingProfile(true);
    try {
      const res = await fetch(`/api/learners/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(profileForm)
      });
      if (res.ok) {
        setProfileModal(false);
        loadData();
      }
    } finally {
      setSavingProfile(false);
    }
  };

  const handleStatusChange = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newStatus) return;
    try {
      const res = await fetch(`/api/learners/${id}/status`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ toStatus: newStatus, comment: statusComment })
      });
      if (res.ok) {
        setStatusModal(false);
        setNewStatus('');
        setStatusComment('');
        loadData();
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleInsertionUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetch(`/api/learners/${id}/insertion`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(insertion)
      });
      if (res.ok) {
        setInsertionModal(false);
        loadData();
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleCreateMeeting = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingMeeting(true);
    try {
      const res = await fetch(`/api/learners/${id}/meetings`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(meetingForm)
      });
      if (res.ok) {
        setShowMeeting(false);
        setMeetingForm({ type: 'INDIVIDUAL', date: new Date().toISOString().split('T')[0], title: '', notes: '', outcome: '', isPrivate: false });
        loadData();
      }
    } finally {
      setSavingMeeting(false);
    }
  };

  const handleUpdateMeeting = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editMeeting) return;
    setSavingMeeting(true);
    try {
      const res = await fetch(`/api/learners/${id}/meetings/${editMeeting.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(editMeeting)
      });
      if (res.ok) {
        setEditMeeting(null);
        loadData();
      }
    } finally {
      setSavingMeeting(false);
    }
  };

  const handleDeleteMeeting = async (meetId: string) => {
    if (!confirm('Supprimer ce point de suivi ?')) return;
    const res = await fetch(`/api/learners/${id}/meetings/${meetId}`, { method: 'DELETE' });
    if (res.ok) loadData();
  };

  const handleCreateJust = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingJust(true);
    try {
      const res = await fetch(`/api/learners/${id}/justifications`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(justForm)
      });
      if (res.ok) {
        setShowJustModal(false);
        loadData();
      }
    } finally {
      setSavingJust(false);
    }
  };

  const handleDeleteJust = async (justId: string) => {
    if (!confirm('Supprimer cette justification ?')) return;
    const res = await fetch(`/api/learners/${id}/justifications/${justId}`, { method: 'DELETE' });
    if (res.ok) loadData();
  };

  const handleAddAttachment = async (justId: string) => {
    const data = attachForm[justId];
    if (!data?.url || !data?.name) return;
    setAddingAttach(justId);
    try {
      const res = await fetch(`/api/learners/${id}/justifications/${justId}/attachments`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ filePath: data.url, filename: data.name })
      });
      if (res.ok) {
        setAttachForm(prev => {
          const n = { ...prev };
          delete n[justId];
          return n;
        });
        loadData();
      }
    } finally {
      setAddingAttach(null);
    }
  };

  const handleDeleteAttachment = async (justId: string, attachId: string) => {
    if (!confirm('Supprimer cette pièce jointe ?')) return;
    const res = await fetch(`/api/learners/${id}/justifications/${justId}/attachments/${attachId}`, { method: 'DELETE' });
    if (res.ok) loadData();
  };

  const handleSaveRecordNote = async (recordId: string, note: string) => {
    try {
      const res = await fetch(`/api/learners/${id}/attendance/${recordId}/note`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ note })
      });
      if (res.ok) {
        setEditingNote(null);
        loadData();
      }
    } catch (err) {
      console.error(err);
    }
  };

  // Migration Actions
  const handleMonthlyRateSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingMonthlyRate(true);
    try {
      const res = await fetch(`/api/learners/${id}/monthly-presence`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(monthlyRateForm)
      });
      if (res.ok) {
        setShowMonthlyRateModal(false);
        loadData();
      }
    } finally {
      setSavingMonthlyRate(false);
    }
  };

  const deleteMonthlyRate = async (year: number, month: number) => {
    if (!confirm(`Supprimer le taux de ${month}/${year} ?`)) return;
    const res = await fetch(`/api/learners/${id}/monthly-presence?year=${year}&month=${month}`, { method: 'DELETE' });
    if (res.ok) loadData();
  };

  // Data derived
  const radarData = useMemo(() => {
    if (!learner) return null;
    return {
      labels: ['Assiduité', 'Sprints', 'Fil Rouge', 'Participation', 'Technique', 'Soft Skills'],
      datasets: [{
        label: 'Performance',
        data: [
          100 - (learner.globalAbsenceRate || 0),
          learner.sprintAverage || 80,
          learner.filRougeProgress || 70,
          85, 75, 90
        ],
        backgroundColor: 'rgba(59, 130, 246, 0.2)',
        borderColor: '#3b82f6',
        pointBackgroundColor: '#3b82f6',
        pointBorderColor: '#fff',
      }]
    };
  }, [learner]);

  if (loading) return <div className="page-body">Chargement...</div>;
  if (!learner) return <div className="page-body">Apprenant introuvable.</div>;

  return (
    <>
      <div className="page-header" style={{ marginBottom: 24 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 20 }}>
          <div style={{ width: 80, height: 80, borderRadius: '50%', background: 'linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontSize: 28, fontWeight: 700, boxShadow: '0 4px 12px rgba(37, 99, 235, 0.2)' }}>
            {learner.firstName[0]}{learner.lastName[0]}
          </div>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <h1 className="page-title">{learner.firstName} {learner.lastName}</h1>
              <span className={`badge ${STATUS_COLORS[learner.statusCurrent] || 'badge-gray'}`} style={{ fontSize: 12, padding: '4px 12px' }}>
                {STATUS_LABELS[learner.statusCurrent]}
              </span>
            </div>
            <p className="page-subtitle" style={{ marginTop: 4 }}>
              Apprenant • {learner.cohort?.name} • {learner.cohort?.program?.name}
            </p>
          </div>
        </div>
        <div style={{ display: 'flex', gap: 10 }}>
          <button className="btn btn-secondary" onClick={() => setStatusModal(true)}>Changer statut</button>
          {learner.statusCurrent === 'INSERTED' && (
            <button className="btn btn-secondary" onClick={() => setInsertionModal(true)}>Données insertion</button>
          )}
          <button className="btn btn-primary" onClick={() => setProfileModal(true)}>Modifier profil</button>
        </div>
      </div>

      <div className="page-body">
        {/* KPI Row */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16, marginBottom: 24 }}>
          <div className="card" style={{ padding: '16px 20px' }}>
            <div className="text-muted text-xs font-bold uppercase tracking-wider mb-1">Taux d&apos;absence</div>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: 8 }}>
              <div style={{ fontSize: 24, fontWeight: 700, color: getRiskColor(getRiskLevel(learner.globalAbsenceRate)) }}>
                {learner.globalAbsenceRate}%
              </div>
              {learner.manualAbsenceRate !== null && <span style={{ fontSize: 10, color: '#3b82f6' }}>(Manuel)</span>}
            </div>
            <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 4 }}>
              Risque: <span style={{ fontWeight: 600 }}>{getRiskLevel(learner.globalAbsenceRate).toUpperCase()}</span>
            </div>
          </div>
          <div className="card" style={{ padding: '16px 20px' }}>
            <div className="text-muted text-xs font-bold uppercase tracking-wider mb-1">Moyenne Sprints</div>
            <div style={{ fontSize: 24, fontWeight: 700, color: '#8b5cf6' }}>{learner.sprintAverage || '—'}%</div>
            <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 4 }}>Sur {learner.sprintsCount || 0} sprints rendus</div>
          </div>
          <div className="card" style={{ padding: '16px 20px' }}>
            <div className="text-muted text-xs font-bold uppercase tracking-wider mb-1">Progression Fil Rouge</div>
            <div style={{ fontSize: 24, fontWeight: 700, color: '#10b981' }}>{learner.filRougeProgress || 0}%</div>
            <div className="progress-bar" style={{ height: 6, marginTop: 10 }}><div className="progress-fill" style={{ width: `${learner.filRougeProgress || 0}%`, background: '#10b981' }}></div></div>
          </div>
          <div className="card" style={{ padding: '16px 20px' }}>
            <div className="text-muted text-xs font-bold uppercase tracking-wider mb-1">Points de suivi</div>
            <div style={{ fontSize: 24, fontWeight: 700, color: '#f59e0b' }}>{learner.meetings?.length || 0}</div>
            <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 4 }}>Dernier le: {learner.meetings?.[0] ? formatDate(learner.meetings[0].date) : 'Aucun'}</div>
          </div>
        </div>

        {/* Navigation Tabs */}
        <div className="tabs" style={{ marginBottom: 20 }}>
          <button className={`tab-item ${activeTab === 'overview' ? 'active' : ''}`} onClick={() => setActiveTab('overview')}>📊 Aperçu</button>
          <button className={`tab-item ${activeTab === 'attendance' ? 'active' : ''}`} onClick={() => setActiveTab('attendance')}>📅 Présences</button>
          <button className={`tab-item ${activeTab === 'sprints' ? 'active' : ''}`} onClick={() => setActiveTab('sprints')}>🚀 Sprints</button>
          <button className={`tab-item ${activeTab === 'filrouge' ? 'active' : ''}`} onClick={() => setActiveTab('filrouge')}>🏁 Fil Rouge</button>
          <button className={`tab-item ${activeTab === 'meetings' ? 'active' : ''}`} onClick={() => setActiveTab('meetings')}>🤝 Suivi (Points)</button>
          <button className={`tab-item ${activeTab === 'insertion' ? 'active' : ''}`} onClick={() => setActiveTab('insertion')}>💼 Insertion</button>
          <button className={`tab-item ${activeTab === 'profile' ? 'active' : ''}`} onClick={() => setActiveTab('profile')}>👤 Profil complet</button>
          <button className={`tab-item ${activeTab === 'migration' ? 'active' : ''}`} onClick={() => setActiveTab('migration')}>📥 Migration</button>
        </div>

        {/* Tab Content */}
        <div style={{ minHeight: 400 }}>
          {activeTab === 'overview' && (
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 300px', gap: 20 }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
                <div className="card">
                  <div className="card-header"><h3 className="card-title">📈 Progression & Performance</h3></div>
                  <div className="card-body" style={{ height: 360, position: 'relative' }}>
                    {radarData && <Radar data={radarData} options={{ maintainAspectRatio: false, scales: { r: { min: 0, max: 100, ticks: { display: false } } } }} />}
                  </div>
                </div>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                <div className="card" style={{ padding: 16 }}>
                  <h4 style={{ fontSize: 13, fontWeight: 700, marginBottom: 12 }}>Contact</h4>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 10, fontSize: 12 }}>
                    <div>📧 {learner.email}</div>
                    <div>📱 {learner.phone || '—'}</div>
                    <div style={{ marginTop: 8, color: 'var(--text-muted)' }}>📍 CIN: {learner.cin || '—'}</div>
                  </div>
                </div>
                <div className="card" style={{ padding: 16 }}>
                  <h4 style={{ fontSize: 13, fontWeight: 700, marginBottom: 12 }}>Cohorte</h4>
                  <div style={{ fontSize: 12, fontWeight: 600 }}>{learner.cohort?.name}</div>
                  <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 4 }}>{learner.cohort?.program?.name}</div>
                  <Link href={`/admin/cohorts/${learner.cohortId}`} className="btn btn-ghost btn-sm" style={{ width: '100%', marginTop: 12, fontSize: 11 }}>Voir cohorte</Link>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'attendance' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
              <div className="card">
                <div className="card-header">
                  <h3 className="card-title">📋 Justificatifs d&apos;absence</h3>
                  <button className="btn btn-primary btn-sm" onClick={() => setShowJustModal(true)}>+ Ajouter</button>
                </div>
                {justifications.length === 0 ? (
                  <div className="card-body" style={{ textAlign: 'center', py: 32 }}>Aucun justificatif enregistré.</div>
                ) : (
                  <div className="card-body" style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                    {justifications.map((j: any) => {
                      const af = attachForm[j.id] || { url: '', name: '' };
                      return (
                        <div key={j.id} style={{ border: '1px solid var(--border)', borderRadius: 10, padding: 16 }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 }}>
                            <div>
                              <div style={{ fontWeight: 700, fontSize: 14 }}>{j.reasonType}</div>
                              <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>Du {formatDate(j.dateFrom)} ({j.halfDayFrom}) au {formatDate(j.dateTo)} ({j.halfDayTo})</div>
                            </div>
                            <button className="btn btn-ghost btn-icon" style={{ color: '#ef4444' }} onClick={() => handleDeleteJust(j.id)}>🗑️</button>
                          </div>
                          <div style={{ fontSize: 13, color: 'var(--text-secondary)', marginBottom: 12 }}>{j.description || 'Pas de description'}</div>
                          
                          <div style={{ background: 'var(--bg-faint)', borderRadius: 8, padding: 12 }}>
                            <div style={{ fontSize: 11, fontWeight: 700, marginBottom: 8 }}>📎 PIÈCES JOINTES</div>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginBottom: 12 }}>
                              {j.attachments?.map((att: any) => (
                                <div key={att.id} style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12 }}>
                                  <a href={att.filePath} target="_blank" rel="noreferrer" style={{ color: '#3b82f6', textDecoration: 'none' }}>{att.filename}</a>
                                  <button onClick={() => handleDeleteAttachment(j.id, att.id)} style={{ padding: 2, background: 'none', border: 'none', cursor: 'pointer' }}>❌</button>
                                </div>
                              ))}
                            </div>
                            <div style={{ display: 'flex', gap: 8 }}>
                               <input className="form-input" style={{ fontSize: 11 }} placeholder="URL (Drive...)" value={af.url} onChange={e => setAttachForm({...attachForm, [j.id]: {...af, url: e.target.value}})} />
                               <input className="form-input" style={{ fontSize: 11 }} placeholder="Nom" value={af.name} onChange={e => setAttachForm({...attachForm, [j.id]: {...af, name: e.target.value}})} />
                               <button className="btn btn-primary btn-sm" disabled={addingAttach === j.id} onClick={() => handleAddAttachment(j.id)}>{addingAttach === j.id ? '...' : '+'}</button>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
              <div className="card">
                <div className="card-header"><h3 className="card-title">Historique des présences (50 dernières)</h3></div>
                <table className="data-table">
                  <thead><tr><th>Date</th><th>Période</th><th>Statut</th><th>Retard</th><th>Note</th></tr></thead>
                  <tbody>
                    {records.map((r: any) => (
                      <tr key={r.id}>
                        <td>{formatDate(r.session.date)}</td>
                        <td>{r.session.halfDay}</td>
                        <td><span className={`badge ${STATUS_COLORS[r.status] || 'badge-gray'}`}>{STATUS_LABELS[r.status] || r.status}</span></td>
                        <td>{r.lateMinutes ? `${r.lateMinutes} min` : '—'}</td>
                        <td>
                          {editingNote === r.id ? (
                            <input autoFocus className="form-input" defaultValue={r.note} onBlur={(e) => handleSaveRecordNote(r.id, e.target.value)} />
                          ) : (
                            <div onClick={() => setEditingNote(r.id)} style={{ cursor: 'pointer', fontStyle: r.note ? 'normal' : 'italic', color: r.note ? 'inherit' : 'var(--text-muted)' }}>
                              {r.note || 'Ajouter une note...'}
                            </div>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {activeTab === 'meetings' && (
            <div className="card">
              <div className="card-header">
                <h3 className="card-title">🤝 Historique des points de suivi</h3>
                <button className="btn btn-primary btn-sm" onClick={() => setShowMeeting(true)}>+ Nouveau point</button>
              </div>
              <div className="card-body">
                {(learner.meetings || []).length === 0 ? (
                  <p className="text-muted text-center py-8">Aucun point de suivi enregistré.</p>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                    {learner.meetings.map((m: any) => (
                      <div key={m.id} className="card" style={{ padding: 16, borderLeft: `4px solid ${MEETING_TYPES[m.type]?.color || '#ccc'}` }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 }}>
                          <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
                            <span style={{ fontSize: 24 }}>{MEETING_TYPES[m.type]?.icon}</span>
                            <div>
                              <div style={{ fontWeight: 700, fontSize: 15 }}>{m.title}</div>
                              <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                                {formatDate(m.date)} • {MEETING_TYPES[m.type]?.label} {m.isPrivate && '• 🔒 Privé'}
                              </div>
                            </div>
                          </div>
                          <div style={{ display: 'flex', gap: 8 }}>
                            <button className="btn btn-ghost btn-icon btn-sm" onClick={() => setEditMeeting(m)}>✏️</button>
                            <button className="btn btn-ghost btn-icon btn-sm" style={{ color: '#ef4444' }} onClick={() => handleDeleteMeeting(m.id)}>🗑️</button>
                          </div>
                        </div>
                        <div style={{ fontSize: 13, color: 'var(--text-secondary)', marginBottom: 12 }}>{m.notes}</div>
                        {m.outcome && <div style={{ fontSize: 12, padding: 8, background: 'var(--bg-faint)', borderRadius: 6 }}><strong>RÉSULTAT:</strong> {m.outcome}</div>}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {activeTab === 'insertion' && (
            <div className="card">
              <div className="card-header"><h3 className="card-title">💼 Suivi d&apos;insertion</h3></div>
              <div className="card-body">
                 <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24 }}>
                   <div>
                     <h4 style={{ marginBottom: 12 }}>Statut actuel</h4>
                     <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                       <div style={{ display: 'flex', justifyContent: 'space-between' }}><span>Type:</span> <span style={{ fontWeight: 600 }}>{INSERTION_LABELS[learner.insertionType] || '—'}</span></div>
                       <div style={{ display: 'flex', justifyContent: 'space-between' }}><span>Entreprise:</span> <span style={{ fontWeight: 600 }}>{learner.insertionCompany || '—'}</span></div>
                       <div style={{ display: 'flex', justifyContent: 'space-between' }}><span>Date effective:</span> <span style={{ fontWeight: 600 }}>{learner.insertionDate ? formatDate(learner.insertionDate) : '—'}</span></div>
                       <button className="btn btn-secondary btn-sm" style={{ marginTop: 12 }} onClick={() => setInsertionModal(true)}>Mettre à jour les données</button>
                     </div>
                   </div>
                   <div>
                     <h4 style={{ marginBottom: 12 }}>Calendrier de suivi</h4>
                     <p className="text-muted text-sm">Suivis planifiés après la formation.</p>
                     {/* Placeholder for insertion followups */}
                     <div style={{ marginTop: 12, padding: 20, textAlign: 'center', background: 'var(--bg-faint)', borderRadius: 10, fontSize: 12 }}>
                       Bientôt disponible : Gestion automatique des relances à M+1, M+3, M+6.
                     </div>
                   </div>
                 </div>
              </div>
            </div>
          )}

          {activeTab === 'profile' && (
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
                    <span className="text-muted">Début formation</span><span>{learner.cohort?.startDate ? formatDate(learner.cohort.startDate) : '—'}</span>
                    <span className="text-muted">Fin formation</span><span>{learner.cohort?.endDate ? formatDate(learner.cohort.endDate) : '—'}</span>
                  </div>
                </div>
              </div>
              <div className="card" style={{ gridColumn: '1 / -1' }}>
                <div className="card-header"><h3 className="card-title">📋 Historique des statuts</h3></div>
                <table className="data-table">
                  <thead><tr><th>Date</th><th>De</th><th>Vers</th><th>Commentaire</th><th>Par</th></tr></thead>
                  <tbody>
                    {learner.statusHistory?.map((h: any) => (
                      <tr key={h.id}>
                        <td>{formatDate(h.effectiveDate)}</td>
                        <td>{h.fromStatus ? <span className={`badge ${STATUS_COLORS[h.fromStatus] || 'badge-gray'}`}>{STATUS_LABELS[h.fromStatus]}</span> : '—'}</td>
                        <td><span className={`badge ${STATUS_COLORS[h.toStatus] || 'badge-gray'}`}>{STATUS_LABELS[h.toStatus]}</span></td>
                        <td>{h.comment || '—'}</td>
                        <td>{h.changedBy ? `${h.changedBy.firstName} ${h.changedBy.lastName}` : '—'}</td>
                      </tr>
                    ))}
                    {(!learner.statusHistory || learner.statusHistory.length === 0) && (
                      <tr><td colSpan={5} style={{ textAlign: 'center', color: 'var(--text-muted)' }}>Aucun historique</td></tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {activeTab === 'migration' && (
            <div className="card">
              <div className="card-header">
                <h3 className="card-title">📥 Migration : Taux de présence mensuels manuels</h3>
                <button className="btn btn-primary" onClick={() => setShowMonthlyRateModal(true)}>+ Ajouter un mois</button>
              </div>
              <div className="card-body">
                <p className="text-muted text-sm mb-4">
                  💡 Ces taux écrasent le calcul automatique basé sur l&apos;appel pour les mois spécifiés. 
                  Utile pour remonter les données d&apos;une ancienne plateforme sans avoir à saisir l&apos;appel quotidien historique.
                </p>
                
                {monthlyRates.length === 0 ? (
                  <div className="empty-state">
                    <p>Aucun taux mensuel manuel enregistré.</p>
                  </div>
                ) : (
                  <table className="data-table">
                    <thead>
                      <tr>
                        <th>Période</th>
                        <th>Taux de présence</th>
                        <th>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {[...monthlyRates].sort((a,b) => (b.year*12+b.month) - (a.year*12+a.month)).map((r: any) => (
                        <tr key={r.id}>
                          <td style={{ fontWeight: 600 }}>{r.month.toString().padStart(2, '0')}/{r.year}</td>
                          <td style={{ color: '#22c55e', fontWeight: 700 }}>{r.presenceRate}%</td>
                          <td>
                            <button className="btn btn-ghost btn-sm" style={{ color: '#ef4444' }} onClick={() => deleteMonthlyRate(r.year, r.month)}>🗑️ Supprimer</button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* MODALS */}
      {profileModal && (
        <div className="modal-overlay" onClick={() => setProfileModal(false)}>
          <div className="modal" style={{ maxWidth: 760 }} onClick={e => e.stopPropagation()}>
            <div className="modal-header"><h2 className="modal-title">Modifier le profil</h2><button className="btn btn-ghost btn-icon" onClick={() => setProfileModal(false)}>✕</button></div>
            <form onSubmit={handleProfileSave}>
              <div className="modal-body">
                <div className="form-row">
                  <div className="form-group"><label className="form-label">Prénom</label><input className="form-input" value={profileForm.firstName} onChange={e => setProfileForm({ ...profileForm, firstName: e.target.value })} /></div>
                  <div className="form-group"><label className="form-label">Nom</label><input className="form-input" value={profileForm.lastName} onChange={e => setProfileForm({ ...profileForm, lastName: e.target.value })} /></div>
                </div>
                <div className="form-row">
                  <div className="form-group"><label className="form-label">Email</label><input type="email" className="form-input" value={profileForm.email} onChange={e => setProfileForm({ ...profileForm, email: e.target.value })} /></div>
                  <div className="form-group"><label className="form-label">Téléphone</label><input className="form-input" value={profileForm.phone} onChange={e => setProfileForm({ ...profileForm, phone: e.target.value })} /></div>
                </div>
                <div className="form-row">
                   <div className="form-group"><label className="form-label">CIN</label><input className="form-input" value={profileForm.cin} onChange={e => setProfileForm({ ...profileForm, cin: e.target.value })} /></div>
                   <div className="form-group"><label className="form-label">Date de naissance</label><input type="date" className="form-input" value={profileForm.birthdate} onChange={e => setProfileForm({ ...profileForm, birthdate: e.target.value })} /></div>
                </div>
                <div className="form-row">
                  <div className="form-group">
                    <label className="form-label">Niveau académique</label>
                    <select className="form-select" value={profileForm.academicLevel} onChange={e => setProfileForm({ ...profileForm, academicLevel: e.target.value })}>
                       <option value="">Sélectionner...</option>
                       {ACADEMIC_LEVEL_OPTIONS.map(o => <option key={o} value={o}>{o}</option>)}
                    </select>
                  </div>
                  <div className="form-group">
                    <label className="form-label">Filière</label>
                    <select className="form-select" value={profileForm.academicField} onChange={e => setProfileForm({ ...profileForm, academicField: e.target.value })}>
                       <option value="">Sélectionner...</option>
                       {ACADEMIC_FIELD_OPTIONS.map(o => <option key={o} value={o}>{o}</option>)}
                    </select>
                  </div>
                </div>
                <div className="form-group" style={{ marginTop: 12 }}>
                   <label className="form-label">Taux d&apos;absence manuel GLOBAL (%)</label>
                   <input type="number" step="0.01" className="form-input" placeholder="Laisser vide pour calcul auto" value={profileForm.manualAbsenceRate} onChange={e => setProfileForm({ ...profileForm, manualAbsenceRate: e.target.value })} />
                   <p style={{ fontSize: 10, color: 'var(--text-muted)', marginTop: 4 }}>💡 Note : Pour un suivi mensuel précis, utilisez l&apos;onglet Migration.</p>
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={() => setProfileModal(false)}>Annuler</button>
                <button type="submit" className="btn btn-primary" disabled={savingProfile}>{savingProfile ? 'Enregistrement...' : 'Enregistrer'}</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {statusModal && (
        <div className="modal-overlay" onClick={() => setStatusModal(false)}>
          <div className="modal" style={{ maxWidth: 400 }} onClick={e => e.stopPropagation()}>
            <div className="modal-header"><h2 className="modal-title">Changer le statut</h2><button className="btn btn-ghost btn-icon" onClick={() => setStatusModal(false)}>✕</button></div>
            <form onSubmit={handleStatusChange}>
              <div className="modal-body">
                <div className="form-group">
                  <label className="form-label">Nouveau statut</label>
                  <select className="form-select" required value={newStatus} onChange={e => setNewStatus(e.target.value)}>
                    <option value="">Sélectionner...</option>
                    <option value="IN_TRAINING">En formation</option>
                    <option value="DROPPED">Abandonné</option>
                    <option value="EXCLUDED">Exclu</option>
                    <option value="INSERTED">Inséré</option>
                  </select>
                </div>
                <div className="form-group">
                  <label className="form-label">Commentaire</label>
                  <textarea className="form-input" rows={3} placeholder="Motif du changement..." value={statusComment} onChange={e => setStatusComment(e.target.value)} />
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={() => setStatusModal(false)}>Annuler</button>
                <button type="submit" className="btn btn-primary">Confirmer</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {(showMeeting || editMeeting) && (
        <div className="modal-overlay" onClick={() => { setShowMeeting(false); setEditMeeting(null); }}>
          <div className="modal" style={{ maxWidth: 540 }} onClick={e => e.stopPropagation()}>
            <div className="modal-header"><h2 className="modal-title">{editMeeting ? 'Modifier le point' : 'Nouveau point de suivi'}</h2><button className="btn btn-ghost btn-icon" onClick={() => { setShowMeeting(false); setEditMeeting(null); }}>✕</button></div>
            <form onSubmit={editMeeting ? handleUpdateMeeting : handleCreateMeeting}>
              <div className="modal-body">
                <div className="form-row">
                  <div className="form-group">
                    <label className="form-label">Type</label>
                    <select className="form-select" value={editMeeting ? editMeeting.type : meetingForm.type} onChange={e => editMeeting ? setEditMeeting({...editMeeting, type: e.target.value}) : setMeetingForm({ ...meetingForm, type: e.target.value })}>
                      {Object.entries(MEETING_TYPES).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
                    </select>
                  </div>
                  <div className="form-group">
                    <label className="form-label">Date</label>
                    <input type="date" className="form-input" required value={editMeeting ? editMeeting.date : meetingForm.date} onChange={e => editMeeting ? setEditMeeting({...editMeeting, date: e.target.value}) : setMeetingForm({ ...meetingForm, date: e.target.value })} />
                  </div>
                </div>
                <div className="form-group">
                  <label className="form-label">Titre / Objet</label>
                  <input className="form-input" required value={editMeeting ? editMeeting.title : meetingForm.title} onChange={e => editMeeting ? setEditMeeting({...editMeeting, title: e.target.value}) : setMeetingForm({ ...meetingForm, title: e.target.value })} />
                </div>
                <div className="form-group">
                  <label className="form-label">Notes détaillées</label>
                  <textarea className="form-input" rows={5} value={editMeeting ? editMeeting.notes : meetingForm.notes} onChange={e => editMeeting ? setEditMeeting({...editMeeting, notes: e.target.value}) : setMeetingForm({ ...meetingForm, notes: e.target.value })} />
                </div>
                <div className="form-group">
                  <label className="form-label">Décision / Outcome</label>
                  <input className="form-input" value={editMeeting ? editMeeting.outcome : meetingForm.outcome} onChange={e => editMeeting ? setEditMeeting({...editMeeting, outcome: e.target.value}) : setMeetingForm({ ...meetingForm, outcome: e.target.value })} />
                </div>
                <div className="form-group">
                  <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13 }}>
                    <input type="checkbox" checked={editMeeting ? editMeeting.isPrivate : meetingForm.isPrivate} onChange={e => editMeeting ? setEditMeeting({...editMeeting, isPrivate: e.target.checked}) : setMeetingForm({ ...meetingForm, isPrivate: e.target.checked })} />
                    Point confidentiel
                  </label>
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={() => { setShowMeeting(false); setEditMeeting(null); }}>Annuler</button>
                <button type="submit" className="btn btn-primary" disabled={savingMeeting}>{savingMeeting ? 'Enregistrement...' : 'Enregistrer'}</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {showJustModal && (
        <div className="modal-overlay" onClick={() => setShowJustModal(false)}>
          <div className="modal" style={{ maxWidth: 540 }} onClick={e => e.stopPropagation()}>
            <div className="modal-header"><h2 className="modal-title">Justifier une absence</h2><button className="btn btn-ghost btn-icon" onClick={() => setShowJustModal(false)}>✕</button></div>
            <form onSubmit={handleCreateJust}>
              <div className="modal-body">
                 <div className="form-row">
                   <div className="form-group">
                     <label className="form-label">Du</label>
                     <div style={{ display: 'flex', gap: 8 }}>
                       <input type="date" className="form-input" required value={justForm.dateFrom} onChange={e => setJustForm({...justForm, dateFrom: e.target.value})} />
                       <select className="form-select" style={{ width: 80 }} value={justForm.halfDayFrom} onChange={e => setJustForm({...justForm, halfDayFrom: e.target.value})}><option value="AM">Matin</option><option value="PM">Après-midi</option></select>
                     </div>
                   </div>
                   <div className="form-group">
                     <label className="form-label">Au</label>
                     <div style={{ display: 'flex', gap: 8 }}>
                       <input type="date" className="form-input" required value={justForm.dateTo} onChange={e => setJustForm({...justForm, dateTo: e.target.value})} />
                       <select className="form-select" style={{ width: 80 }} value={justForm.halfDayTo} onChange={e => setJustForm({...justForm, halfDayTo: e.target.value})}><option value="AM">Matin</option><option value="PM">Après-midi</option></select>
                     </div>
                   </div>
                 </div>
                 <div className="form-group">
                    <label className="form-label">Type</label>
                    <select className="form-select" value={justForm.reasonType} onChange={e => setJustForm({...justForm, reasonType: e.target.value})}>
                      <option value="MEDICAL">Médical</option>
                      <option value="FAMILY">Familial</option>
                      <option value="TRANSPORT">Transport</option>
                      <option value="ADMIN">Administratif</option>
                      <option value="OTHER">Autre</option>
                    </select>
                 </div>
                 <div className="form-group">
                    <label className="form-label">Commentaire</label>
                    <textarea className="form-input" rows={3} value={justForm.description} onChange={e => setJustForm({...justForm, description: e.target.value})} />
                 </div>
              </div>
              <div className="modal-footer">
                 <button type="button" className="btn btn-secondary" onClick={() => setShowJustModal(false)}>Annuler</button>
                 <button type="submit" className="btn btn-primary" disabled={savingJust}>{savingJust ? '...' : 'Enregistrer'}</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {showMonthlyRateModal && (
        <div className="modal-overlay" onClick={() => setShowMonthlyRateModal(false)}>
          <div className="modal" style={{ maxWidth: 400 }} onClick={e => e.stopPropagation()}>
            <div className="modal-header"><h2 className="modal-title">Ajouter un taux mensuel</h2><button className="btn btn-ghost btn-icon" onClick={() => setShowMonthlyRateModal(false)}>✕</button></div>
            <form onSubmit={handleMonthlyRateSave}>
              <div className="modal-body">
                <div style={{ display: 'flex', gap: 12, marginBottom: 16 }}>
                  <div style={{ flex: 1 }}>
                    <label className="form-label">Mois</label>
                    <select className="form-select" value={monthlyRateForm.month} onChange={e => setMonthlyRateForm({ ...monthlyRateForm, month: parseInt(e.target.value) })}>
                      {Array.from({ length: 12 }).map((_, i) => (
                        <option key={i + 1} value={i + 1}>{new Date(2000, i).toLocaleString('fr-FR', { month: 'long' })}</option>
                      ))}
                    </select>
                  </div>
                  <div style={{ flex: 1 }}>
                    <label className="form-label">Année</label>
                    <select className="form-select" value={monthlyRateForm.year} onChange={e => setMonthlyRateForm({ ...monthlyRateForm, year: parseInt(e.target.value) })}>
                      {[2023, 2024, 2025, 2026].map(y => (
                        <option key={y} value={y}>{y}</option>
                      ))}
                    </select>
                  </div>
                </div>
                <div className="form-group">
                  <label className="form-label">Taux de présence (%)</label>
                  <input type="number" step="0.01" className="form-input" required placeholder="Ex: 95.5" value={monthlyRateForm.presenceRate} onChange={e => setMonthlyRateForm({ ...monthlyRateForm, presenceRate: e.target.value })} />
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={() => setShowMonthlyRateModal(false)}>Annuler</button>
                <button type="submit" className="btn btn-primary" disabled={savingMonthlyRate}>{savingMonthlyRate ? '...' : 'Enregistrer'}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
