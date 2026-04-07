'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { STATUS_LABELS } from '@/lib/utils';

const STAGE_COLORS: Record<string, string> = {
  NEW: 'badge-gray', CONTACTED: 'badge-blue', EVALUATED: 'badge-orange',
  QUALIFIED: 'badge-teal', REJECTED: 'badge-red', CONVERTED: 'badge-green',
};

export default function CandidatesPage() {
  const router = useRouter();
  const [candidates, setCandidates] = useState<any[]>([]);
  const [cohorts, setCohorts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [stageFilter, setStageFilter] = useState('');
  const [showCreate, setShowCreate] = useState(false);
  const [showConvert, setShowConvert] = useState<string | null>(null);
  const [convertCohort, setConvertCohort] = useState('');
  const [form, setForm] = useState({ firstName: '', lastName: '', email: '', phone: '', sourceChannel: '' });

  const load = () => {
    const params = new URLSearchParams();
    if (search) params.set('search', search);
    if (stageFilter) params.set('stage', stageFilter);
    Promise.all([
      fetch(`/api/candidates?${params}`).then(r => r.json()),
      fetch('/api/cohorts').then(r => r.json()),
    ]).then(([c, co]) => { setCandidates(c); setCohorts(co); }).finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, [search, stageFilter]);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    await fetch('/api/candidates', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(form) });
    setShowCreate(false);
    setForm({ firstName: '', lastName: '', email: '', phone: '', sourceChannel: '' });
    load();
  };

  const handleConvert = async () => {
    if (!showConvert || !convertCohort) return;
    await fetch(`/api/candidates/${showConvert}/convert`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ cohortId: convertCohort }) });
    setShowConvert(null);
    setConvertCohort('');
    load();
  };

  const stages = ['', 'NEW', 'CONTACTED', 'EVALUATED', 'QUALIFIED', 'REJECTED', 'CONVERTED'];

  return (
    <>
      <div className="page-header">
        <div>
          <h1 className="page-title">Candidats</h1>
          <p className="page-subtitle">Sourcing et qualification des candidats</p>
        </div>
        <button className="btn btn-primary" onClick={() => setShowCreate(true)}>+ Nouveau candidat</button>
      </div>
      <div className="page-body">
        <div style={{ display: 'flex', gap: 12, marginBottom: 16 }}>
          <input type="text" className="form-input" placeholder="Rechercher par nom ou email..." value={search} onChange={e => setSearch(e.target.value)} style={{ maxWidth: 300 }} />
          <select className="form-select" value={stageFilter} onChange={e => setStageFilter(e.target.value)} style={{ maxWidth: 200 }}>
            <option value="">Tous les statuts</option>
            {stages.filter(Boolean).map(s => <option key={s} value={s}>{STATUS_LABELS[s] || s}</option>)}
          </select>
        </div>

        {loading ? (
          <div className="loading-overlay"><span className="loading-spinner" /> Chargement...</div>
        ) : (
          <div className="card">
            <table className="data-table">
              <thead><tr><th>Nom</th><th>Email</th><th>Téléphone</th><th>Source</th><th>Niveau</th><th>Score</th><th>Statut</th><th>Actions</th></tr></thead>
              <tbody>
                {candidates.length === 0 && <tr><td colSpan={8} style={{ textAlign: 'center', color: 'var(--text-muted)', padding: 24 }}>Aucun candidat trouvé</td></tr>}
                {candidates.map(c => (
                  <tr key={c.id} className="clickable" onClick={() => router.push(`/admin/candidates/${c.id}`)}>
                    <td style={{ fontWeight: 600 }}>{c.firstName} {c.lastName}</td>
                    <td>{c.email}</td>
                    <td>{c.phone || '-'}</td>
                    <td>{c.sourceChannel || '-'}</td>
                    <td>{c.academicLevel || '-'}</td>
                    <td>{c.evaluations?.[0]?.score ? Math.round(c.evaluations[0].score) + '/100' : '-'}</td>
                    <td><span className={`badge ${STAGE_COLORS[c.currentStage] || 'badge-gray'}`}>{STATUS_LABELS[c.currentStage] || c.currentStage}</span></td>
                    <td>
                      {c.currentStage !== 'CONVERTED' && c.currentStage !== 'REJECTED' && (
                        <button className="btn btn-sm btn-primary" onClick={(e) => { e.stopPropagation(); setShowConvert(c.id); }}>Convertir</button>
                      )}
                      {c.learnerProfile && (
                        <button className="btn btn-sm btn-secondary" onClick={e => { e.stopPropagation(); router.push(`/admin/learners/${c.learnerProfile.id}`); }}>Voir apprenant</button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {showCreate && (
        <div className="modal-overlay" onClick={() => setShowCreate(false)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <div className="modal-header"><h2 className="modal-title">Nouveau candidat</h2><button className="btn btn-ghost btn-icon" onClick={() => setShowCreate(false)}>✕</button></div>
            <form onSubmit={handleCreate}>
              <div className="modal-body">
                <div className="form-row">
                  <div className="form-group"><label className="form-label">Prénom</label><input className="form-input" value={form.firstName} onChange={e => setForm({...form, firstName: e.target.value})} required /></div>
                  <div className="form-group"><label className="form-label">Nom</label><input className="form-input" value={form.lastName} onChange={e => setForm({...form, lastName: e.target.value})} required /></div>
                </div>
                <div className="form-group"><label className="form-label">Email</label><input type="email" className="form-input" value={form.email} onChange={e => setForm({...form, email: e.target.value})} required /></div>
                <div className="form-row">
                  <div className="form-group"><label className="form-label">Téléphone</label><input className="form-input" value={form.phone} onChange={e => setForm({...form, phone: e.target.value})} /></div>
                  <div className="form-group"><label className="form-label">Source</label><input className="form-input" placeholder="Site web, Facebook..." value={form.sourceChannel} onChange={e => setForm({...form, sourceChannel: e.target.value})} /></div>
                </div>
              </div>
              <div className="modal-footer"><button type="button" className="btn btn-secondary" onClick={() => setShowCreate(false)}>Annuler</button><button type="submit" className="btn btn-primary">Créer</button></div>
            </form>
          </div>
        </div>
      )}

      {showConvert && (
        <div className="modal-overlay" onClick={() => setShowConvert(null)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <div className="modal-header"><h2 className="modal-title">Convertir en apprenant</h2><button className="btn btn-ghost btn-icon" onClick={() => setShowConvert(null)}>✕</button></div>
            <div className="modal-body">
              <div className="form-group">
                <label className="form-label">Cohorte d&apos;affectation</label>
                <select className="form-select" value={convertCohort} onChange={e => setConvertCohort(e.target.value)} required>
                  <option value="">Sélectionner une cohorte</option>
                  {cohorts.map((c: any) => <option key={c.id} value={c.id}>{c.name} ({c.program.name})</option>)}
                </select>
              </div>
            </div>
            <div className="modal-footer"><button className="btn btn-secondary" onClick={() => setShowConvert(null)}>Annuler</button><button className="btn btn-primary" onClick={handleConvert} disabled={!convertCohort}>Convertir</button></div>
          </div>
        </div>
      )}
    </>
  );
}
