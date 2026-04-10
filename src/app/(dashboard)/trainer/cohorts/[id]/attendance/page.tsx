'use client';

import { useEffect, useState, useCallback } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';

// ─── Types ────────────────────────────────────────────────────────────────────
type AttendanceStatus = 'PRESENT' | 'ABSENT' | 'JUSTIFIED_ABSENT' | 'LATE' | 'NOT_APPLICABLE';

interface RecordState {
  status: AttendanceStatus;
  lateMinutes: number;
  note: string;          // inline comment
  recordId?: string;     // existing DB record id (to update note)
}

const REASON_TYPES = [
  { value: 'MEDICAL',   label: '🏥 Médical' },
  { value: 'FAMILY',    label: '👨‍👩‍👧 Familial' },
  { value: 'TRANSPORT', label: '🚌 Transport' },
  { value: 'ADMIN',     label: '📋 Administratif' },
  { value: 'OTHER',     label: '📌 Autre' },
];

const EMPTY_JUST = { reasonType: 'MEDICAL', description: '', docUrl: '', docName: '' };

export default function AttendancePage() {
  const params    = useParams();
  const cohortId  = params.id as string;

  const [cohort,  setCohort]  = useState<any>(null);
  const [date,    setDate]    = useState(new Date().toISOString().split('T')[0]);
  const [halfDay, setHalfDay] = useState<'AM' | 'PM'>('AM');
  const [records, setRecords] = useState<Record<string, RecordState>>({});
  const [loading, setLoading] = useState(true);
  const [saving,  setSaving]  = useState(false);
  const [saved,   setSaved]   = useState(false);

  // Justification modal
  const [justModal,   setJustModal]   = useState<{ learnerId: string; learnerName: string } | null>(null);
  const [justList,    setJustList]    = useState<any[]>([]);          // existing justifs for modal learner
  const [justForm,    setJustForm]    = useState<typeof EMPTY_JUST>(EMPTY_JUST);
  const [savingJust,  setSavingJust]  = useState(false);
  const [addingDoc,   setAddingDoc]   = useState(false);
  const [newDocForm,  setNewDocForm]  = useState<Record<string, { url: string; name: string }>>({});

  // ─── Load session ────────────────────────────────────────────────────────────
  const loadSession = useCallback(() => {
    setLoading(true);
    Promise.all([
      fetch(`/api/cohorts/${cohortId}`).then(r => r.json()),
      fetch(`/api/attendance?cohortId=${cohortId}&date=${date}&halfDay=${halfDay}`).then(r => r.json()),
    ]).then(([c, sessions]) => {
      setCohort(c);
      const existing: Record<string, RecordState> = {};
      const session = sessions?.[0];
      if (session?.records) {
        session.records.forEach((r: any) => {
          existing[r.learnerProfile.id] = {
            status: r.status,
            lateMinutes: r.lateMinutes || 0,
            note: r.note || '',
            recordId: r.id,
          };
        });
      }
      c.learnerProfiles?.forEach((l: any) => {
        if (!existing[l.id]) {
          existing[l.id] = { status: 'PRESENT', lateMinutes: 0, note: '' };
        }
      });
      setRecords(existing);
    }).finally(() => setLoading(false));
  }, [cohortId, date, halfDay]);

  useEffect(() => { loadSession(); }, [loadSession]);

  // ─── Attendance handlers ─────────────────────────────────────────────────────
  const updateStatus = (learnerId: string, status: AttendanceStatus) => {
    setRecords(prev => ({
      ...prev,
      [learnerId]: { ...prev[learnerId], status, lateMinutes: status === 'LATE' ? (prev[learnerId]?.lateMinutes || 10) : 0 },
    }));
    setSaved(false);
  };

  const updateLateMinutes = (learnerId: string, minutes: number) => {
    setRecords(prev => ({ ...prev, [learnerId]: { ...prev[learnerId], lateMinutes: minutes } }));
    setSaved(false);
  };

  const updateNote = (learnerId: string, note: string) => {
    setRecords(prev => ({ ...prev, [learnerId]: { ...prev[learnerId], note } }));
    setSaved(false);
  };

  const handleSave = async () => {
    setSaving(true);
    const recordsList = Object.entries(records).map(([learnerProfileId, data]) => ({
      learnerProfileId,
      status: data.status,
      lateMinutes: data.status === 'LATE' ? data.lateMinutes : null,
      note: data.note || null,
    }));

    await fetch('/api/attendance', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ cohortId, date, halfDay, records: recordsList }),
    });

    setSaving(false);
    setSaved(true);
  };

  // ─── Justification modal logic ───────────────────────────────────────────────
  const openJustModal = async (learnerId: string, learnerName: string) => {
    setJustModal({ learnerId, learnerName });
    setJustForm(EMPTY_JUST);
    // Load existing justifications for this learner
    const res = await fetch(`/api/learners/${learnerId}/justifications`);
    const data = await res.json();
    setJustList(Array.isArray(data) ? data : []);
  };

  const handleCreateJust = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!justModal) return;
    setSavingJust(true);
    try {
      const res = await fetch(`/api/learners/${justModal.learnerId}/justifications`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          cohortId,
          dateFrom: date,
          halfDayFrom: halfDay,
          dateTo: date,
          halfDayTo: halfDay,
          reasonType: justForm.reasonType,
          description: justForm.description,
        }),
      });
      const created = await res.json();

      // If a doc URL was provided, attach it
      if (justForm.docUrl && justForm.docName && created.id) {
        await fetch(`/api/learners/${justModal.learnerId}/justifications/${created.id}/attachments`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ fileUrl: justForm.docUrl, filename: justForm.docName }),
        });
      }

      // Auto-mark as JUSTIFIED_ABSENT in local state
      updateStatus(justModal.learnerId, 'JUSTIFIED_ABSENT');
      setSaved(false);

      // Refresh list
      const res2 = await fetch(`/api/learners/${justModal.learnerId}/justifications`);
      setJustList(await res2.json());
      setJustForm(EMPTY_JUST);
    } finally { setSavingJust(false); }
  };

  const handleApproveJust = async (justId: string) => {
    if (!justModal) return;
    await fetch(`/api/learners/${justModal.learnerId}/justifications/${justId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: 'APPROVED' }),
    });
    const res = await fetch(`/api/learners/${justModal.learnerId}/justifications`);
    setJustList(await res.json());
  };

  const handleAddDocToJust = async (justId: string) => {
    if (!justModal) return;
    const form = newDocForm[justId];
    if (!form?.url || !form?.name) return;
    setAddingDoc(true);
    try {
      await fetch(`/api/learners/${justModal.learnerId}/justifications/${justId}/attachments`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ fileUrl: form.url, filename: form.name }),
      });
      setNewDocForm(prev => ({ ...prev, [justId]: { url: '', name: '' } }));
      const res = await fetch(`/api/learners/${justModal.learnerId}/justifications`);
      setJustList(await res.json());
    } finally { setAddingDoc(false); }
  };

  const handleDeleteJust = async (justId: string) => {
    if (!justModal || !confirm('Supprimer ce justificatif ?')) return;
    await fetch(`/api/learners/${justModal.learnerId}/justifications/${justId}`, { method: 'DELETE' });
    const res = await fetch(`/api/learners/${justModal.learnerId}/justifications`);
    setJustList(await res.json());
  };

  // ─── Render ──────────────────────────────────────────────────────────────────
  if (loading) return <div className="page-body"><div className="loading-overlay"><span className="loading-spinner" /> Chargement...</div></div>;

  const activeLearners = cohort?.learnerProfiles?.filter((l: any) => l.statusCurrent === 'IN_TRAINING') || [];
    late:      Object.values(records).filter(r => r.status === 'LATE').length,
    na:        Object.values(records).filter(r => r.status === 'NOT_APPLICABLE').length,
  };

  return (
    <>
      {/* ═══ HEADER ═══ */}
      <div className="page-header">
        <div>
          <div className="breadcrumbs">
            <Link href="/admin/cohorts">Cohortes</Link> /
            <Link href={`/admin/cohorts/${cohortId}`}>{cohort?.name}</Link> /
            <span>Présence</span>
          </div>
          <h1 className="page-title">📋 Saisie de présence — {cohort?.name}</h1>
          <p className="page-subtitle">{cohort?.program?.name} — {cohort?.program?.campus?.name}</p>
        </div>
        <button className="btn btn-primary" onClick={handleSave} disabled={saving}>
          {saving ? <><span className="loading-spinner" style={{ width: 14, height: 14 }} /> Enregistrement...</> : saved ? '✓ Enregistré' : '💾 Enregistrer'}
        </button>
      </div>

      <div className="page-body">
        {/* Date & Half-day selector */}
        <div style={{ display: 'flex', gap: 12, marginBottom: 20, alignItems: 'center', flexWrap: 'wrap' }}>
          <input type="date" className="form-input" value={date} onChange={e => { setDate(e.target.value); setLoading(true); }} style={{ width: 180 }} />
          <div style={{ display: 'flex', gap: 4 }}>
            <button className={`btn ${halfDay === 'AM' ? 'btn-primary' : 'btn-secondary'}`} onClick={() => { setHalfDay('AM'); setLoading(true); }}>🌅 Matin</button>
            <button className={`btn ${halfDay === 'PM' ? 'btn-primary' : 'btn-secondary'}`} onClick={() => { setHalfDay('PM'); setLoading(true); }}>🌇 Après-midi</button>
          </div>
          {/* Stats */}
          <div style={{ marginLeft: 'auto', display: 'flex', gap: 12, flexWrap: 'wrap' }}>
            <span style={{ padding: '4px 12px', borderRadius: 20, background: '#dcfce7', color: '#16a34a', fontSize: 12, fontWeight: 700 }}>✅ {stats.present} Présents</span>
            <span style={{ padding: '4px 12px', borderRadius: 20, background: '#fee2e2', color: '#dc2626', fontSize: 12, fontWeight: 700 }}>❌ {stats.absent} Absents</span>
            <span style={{ padding: '4px 12px', borderRadius: 20, background: '#dbeafe', color: '#1d4ed8', fontSize: 12, fontWeight: 700 }}>📋 {stats.justified} Justifiés</span>
            <span style={{ padding: '4px 12px', borderRadius: 20, background: '#fef9c3', color: '#92400e', fontSize: 12, fontWeight: 700 }}>⏰ {stats.late} Retards</span>
            <span style={{ padding: '4px 12px', borderRadius: 20, background: '#f3f4f6', color: '#4b5563', fontSize: 12, fontWeight: 700 }}>⚪ {stats.na} N/A</span>
          </div>
        </div>

        {/* Attendance grid */}
        <div className="card">
          <div className="card-body" style={{ padding: 0 }}>
            {activeLearners.length === 0 && (
              <div className="empty-state"><p>Aucun apprenant actif dans cette cohorte.</p></div>
            )}
            {activeLearners.map((l: any, idx: number) => {
              const rec = records[l.id] || { status: 'PRESENT', lateMinutes: 0, note: '' };
              const isAbsent = rec.status === 'ABSENT' || rec.status === 'JUSTIFIED_ABSENT';
              return (
                <div key={l.id} style={{
                  display: 'flex', alignItems: 'flex-start', gap: 12, padding: '12px 20px',
                  borderBottom: idx < activeLearners.length - 1 ? '1px solid var(--border)' : 'none',
                  background: rec.status === 'ABSENT' ? '#fff5f5' : rec.status === 'JUSTIFIED_ABSENT' ? '#eff6ff' : rec.status === 'LATE' ? '#fffbeb' : rec.status === 'NOT_APPLICABLE' ? '#f9fafb' : 'transparent',
                  transition: 'background 0.2s',
                }}>
                  {/* Avatar */}
                  <div style={{ width: 36, height: 36, borderRadius: '50%', background: 'var(--bg-secondary)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, fontSize: 14, color: 'var(--text-muted)', flexShrink: 0 }}>
                    {l.firstName?.[0]}{l.lastName?.[0]}
                  </div>
                  {/* Name */}
                  <div style={{ flex: 1, minWidth: 140 }}>
                    <div style={{ fontWeight: 700, fontSize: 14 }}>{l.firstName} {l.lastName}</div>
                    {rec.status !== 'PRESENT' && (
                      <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>
                        {rec.status === 'ABSENT' ? '❌ Absent non justifié' : rec.status === 'JUSTIFIED_ABSENT' ? '📋 Absent justifié' : rec.status === 'NOT_APPLICABLE' ? '⚪ Non applicable (N/A)' : `⏰ Retard ${rec.lateMinutes} min`}
                      </div>
                    )}
                  </div>

                  {/* Status buttons */}
                  <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', alignItems: 'center' }}>
                    <button className={`attendance-btn present ${rec.status === 'PRESENT' ? 'selected' : ''}`} onClick={() => updateStatus(l.id, 'PRESENT')}>Présent</button>
                    <button className={`attendance-btn absent ${rec.status === 'ABSENT' ? 'selected' : ''}`} onClick={() => updateStatus(l.id, 'ABSENT')}>Absent</button>
                    <button className={`attendance-btn justified ${rec.status === 'JUSTIFIED_ABSENT' ? 'selected' : ''}`} onClick={() => updateStatus(l.id, 'JUSTIFIED_ABSENT')}>Justifié</button>
                    <button className={`attendance-btn late ${rec.status === 'LATE' ? 'selected' : ''}`} onClick={() => updateStatus(l.id, 'LATE')}>Retard</button>
                    <button className={`attendance-btn ${rec.status === 'NOT_APPLICABLE' ? 'selected' : ''}`} style={{ background: rec.status === 'NOT_APPLICABLE' ? '#6b7280' : 'transparent', color: rec.status === 'NOT_APPLICABLE' ? 'white' : 'var(--text-secondary)', borderColor: 'var(--border)' }} onClick={() => updateStatus(l.id, 'NOT_APPLICABLE')}>N/A</button>
                    {rec.status === 'LATE' && (
                      <input type="number" className="form-input" style={{ width: 60, padding: '4px 6px', fontSize: 12 }}
                        value={rec.lateMinutes || 0} onChange={e => updateLateMinutes(l.id, parseInt(e.target.value) || 0)} placeholder="min" min={0} />
                    )}
                  </div>

                  {/* Comment input — always visible */}
                  <div style={{ flex: 1.2, minWidth: 180 }}>
                    <input className="form-input" style={{ fontSize: 12, padding: '5px 10px', background: 'var(--bg-secondary)' }}
                      placeholder="💬 Commentaire..."
                      value={rec.note}
                      onChange={e => updateNote(l.id, e.target.value)}
                    />
                  </div>

                  {/* Justification button — shown for absent/justified */}
                  {isAbsent && (
                    <button
                      className="btn btn-sm btn-secondary"
                      style={{ fontSize: 11, flexShrink: 0, borderColor: rec.status === 'JUSTIFIED_ABSENT' ? '#3b82f6' : undefined, color: rec.status === 'JUSTIFIED_ABSENT' ? '#3b82f6' : undefined }}
                      onClick={() => openJustModal(l.id, `${l.firstName} ${l.lastName}`)}
                      title="Gérer les justificatifs"
                    >
                      📎 Justificatif{rec.status === 'JUSTIFIED_ABSENT' ? ' ✓' : ''}
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* ═══ JUSTIFICATION MODAL ═══ */}
      {justModal && (
        <div className="modal-overlay" onClick={() => setJustModal(null)}>
          <div className="modal" style={{ maxWidth: 640, maxHeight: '90vh', overflow: 'auto' }} onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h2 className="modal-title">📎 Justificatifs — {justModal.learnerName}</h2>
              <button className="btn btn-ghost btn-icon" onClick={() => setJustModal(null)}>✕</button>
            </div>

            <div className="modal-body">
              {/* ── Existing justifications ── */}
              {justList.length > 0 && (
                <div style={{ marginBottom: 20 }}>
                  <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 10, color: 'var(--text-primary)' }}>
                    Justificatifs existants ({justList.length})
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                    {justList.map((j: any) => {
                      const statusCfg: Record<string, { color: string; bg: string; label: string }> = {
                        PENDING:  { color: '#92400e', bg: '#fef9c3', label: '⏳ En attente' },
                        APPROVED: { color: '#166534', bg: '#dcfce7', label: '✅ Approuvé' },
                        REJECTED: { color: '#991b1b', bg: '#fee2e2', label: '❌ Rejeté' },
                      };
                      const cfg = statusCfg[j.status] || statusCfg.PENDING;
                      const nd  = newDocForm[j.id] || { url: '', name: '' };
                      return (
                        <div key={j.id} style={{ border: '1px solid var(--border)', borderRadius: 10, overflow: 'hidden' }}>
                          {/* Header row */}
                          <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 14px', background: 'var(--bg-secondary)' }}>
                            <div style={{ flex: 1, fontSize: 12 }}>
                              <span style={{ fontWeight: 700 }}>
                                {REASON_TYPES.find(r => r.value === j.reasonType)?.label || j.reasonType}
                              </span>
                              <span style={{ color: 'var(--text-muted)', marginLeft: 8 }}>
                                {new Date(j.dateFrom).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short' })} {j.halfDayFrom === 'AM' ? 'mat.' : 'apr.'}
                                {' → '}
                                {new Date(j.dateTo).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short' })} {j.halfDayTo === 'AM' ? 'mat.' : 'apr.'}
                              </span>
                            </div>
                            <span style={{ padding: '2px 10px', borderRadius: 10, fontSize: 11, fontWeight: 700, background: cfg.bg, color: cfg.color }}>{cfg.label}</span>
                            {j.status === 'PENDING' && (
                              <button className="btn btn-sm btn-primary" style={{ fontSize: 10 }} onClick={() => handleApproveJust(j.id)}>✅ Approuver</button>
                            )}
                            <button className="btn btn-sm btn-danger" style={{ fontSize: 10 }} onClick={() => handleDeleteJust(j.id)}>🗑️</button>
                          </div>
                          {/* Description */}
                          {j.description && (
                            <div style={{ padding: '6px 14px', fontSize: 12, color: 'var(--text-secondary)', borderBottom: '1px solid var(--border)' }}>
                              📝 {j.description}
                            </div>
                          )}
                          {/* Attachments */}
                          <div style={{ padding: '10px 14px' }}>
                            {(j.attachments || []).length > 0 && (
                              <div style={{ display: 'flex', flexDirection: 'column', gap: 5, marginBottom: 8 }}>
                                {j.attachments.map((att: any) => (
                                  <div key={att.id} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '4px 10px', background: 'var(--bg-secondary)', borderRadius: 6 }}>
                                    <span>📄</span>
                                    <a href={att.filePath} target="_blank" rel="noreferrer" style={{ flex: 1, fontSize: 12, color: '#3b82f6', fontWeight: 500 }}>{att.filename}</a>
                                    <span style={{ fontSize: 10, color: 'var(--text-muted)' }}>{new Date(att.uploadedAt).toLocaleDateString('fr-FR')}</span>
                                  </div>
                                ))}
                              </div>
                            )}
                            {/* Add doc */}
                            <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                              <input className="form-input" style={{ fontSize: 11, padding: '3px 8px', flex: 2 }} placeholder="🔗 Lien (Google Drive, Dropbox...)" value={nd.url}
                                onChange={e => setNewDocForm(prev => ({ ...prev, [j.id]: { ...nd, url: e.target.value } }))} />
                              <input className="form-input" style={{ fontSize: 11, padding: '3px 8px', flex: 1 }} placeholder="Nom du document" value={nd.name}
                                onChange={e => setNewDocForm(prev => ({ ...prev, [j.id]: { ...nd, name: e.target.value } }))} />
                              <button className="btn btn-sm btn-secondary" style={{ fontSize: 11, flexShrink: 0 }} disabled={addingDoc || !nd.url || !nd.name}
                                onClick={() => handleAddDocToJust(j.id)}>
                                {addingDoc ? '⏳' : '+ Doc'}
                              </button>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* ── Create new justification ── */}
              <div style={{ borderTop: justList.length > 0 ? '2px dashed var(--border)' : 'none', paddingTop: justList.length > 0 ? 20 : 0 }}>
                <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 12, color: 'var(--text-primary)' }}>
                  {justList.length === 0 ? '📋 Ajouter un justificatif' : '+ Nouveau justificatif'}
                </div>
                <form onSubmit={handleCreateJust}>
                  <div className="form-group">
                    <label className="form-label">Type *</label>
                    <select className="form-select" value={justForm.reasonType} onChange={e => setJustForm({ ...justForm, reasonType: e.target.value })}>
                      {REASON_TYPES.map(r => <option key={r.value} value={r.value}>{r.label}</option>)}
                    </select>
                  </div>
                  <div style={{ padding: '8px 12px', background: '#f0f9ff', borderRadius: 6, fontSize: 12, color: '#0369a1', marginBottom: 12 }}>
                    📅 Date automatiquement fixée au <strong>{new Date(date).toLocaleDateString('fr-FR', { weekday: 'long', day: '2-digit', month: 'long' })}</strong> — {halfDay === 'AM' ? '🌅 Matin' : '🌇 Après-midi'}
                  </div>
                  <div className="form-group">
                    <label className="form-label">Motif / Description</label>
                    <textarea className="form-input" rows={2} style={{ resize: 'vertical' }} placeholder="Certificat médical, urgence familiale..."
                      value={justForm.description} onChange={e => setJustForm({ ...justForm, description: e.target.value })} />
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 10 }}>
                    <div className="form-group" style={{ margin: 0 }}>
                      <label className="form-label">🔗 Lien pièce justificative (optionnel)</label>
                      <input className="form-input" placeholder="https://drive.google.com/..." value={justForm.docUrl}
                        onChange={e => setJustForm({ ...justForm, docUrl: e.target.value })} />
                    </div>
                    <div className="form-group" style={{ margin: 0 }}>
                      <label className="form-label">Nom du document</label>
                      <input className="form-input" placeholder="Certificat médical..." value={justForm.docName}
                        onChange={e => setJustForm({ ...justForm, docName: e.target.value })} />
                    </div>
                  </div>
                  <div style={{ marginTop: 12, padding: '8px 12px', background: '#fef9c3', borderRadius: 6, fontSize: 11, color: '#713f12' }}>
                    💡 L&apos;apprenant passera automatiquement en statut &quot;Absent justifié&quot; et le justificatif sera visible dans son profil.
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 14, gap: 8 }}>
                    <button type="button" className="btn btn-secondary" onClick={() => setJustModal(null)}>Fermer</button>
                    <button type="submit" className="btn btn-primary" disabled={savingJust}>
                      {savingJust ? '⏳ Enregistrement...' : '📋 Créer le justificatif'}
                    </button>
                  </div>
                </form>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
