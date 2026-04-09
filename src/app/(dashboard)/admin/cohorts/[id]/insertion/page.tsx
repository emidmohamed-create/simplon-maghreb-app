'use client';

import { useEffect, useState, useMemo } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { formatDate } from '@/lib/utils';
import {
  PieChart, Pie, Cell, Tooltip, Legend, ResponsiveContainer,
  BarChart, Bar, XAxis, YAxis, CartesianGrid,
} from 'recharts';

// Labels for insertion types
const INSERTION_LABELS: Record<string, string> = {
  CDI: 'CDI', CDD: 'CDD', FREELANCE: 'Freelance', INTERNSHIP: 'Stage',
  PRE_HIRE: 'Stage Pré-embauche', FURTHER_STUDIES: 'Poursuite des études',
  ACTIVE_SEARCH: 'En recherche active',
};
const GENDER_LABELS: Record<string, string> = { MALE: 'Homme', FEMALE: 'Femme', 'Non renseigné': 'Non renseigné' };

const PALETTE = ['#3b82f6', '#f97316', '#8b5cf6', '#06b6d4', '#22c55e', '#eab308', '#ec4899', '#94a3b8'];

export default function CohortInsertionPage() {
  const params = useParams();
  const [cohort, setCohort] = useState<any>(null);
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  // Tabs
  const [activeTab, setActiveTab] = useState<'STATS' | 'FOLLOWUP'>('STATS');

  // Filters
  const [filterInserted, setFilterInserted] = useState('');
  const [filterType, setFilterType] = useState('');
  const [filterLevel, setFilterLevel] = useState('');
  const [filterField, setFilterField] = useState('');

  // Follow-up state
  const [followUps, setFollowUps] = useState<any[]>([]);
  const [generating, setGenerating] = useState(false);
  const [genForm, setGenForm] = useState({ startDate: '', endDate: '', intervalDays: 15 });
  const [selectedLearners, setSelectedLearners] = useState<string[]>([]);
  const [updating, setUpdating] = useState<string | null>(null); // followupId
  const [updateForm, setUpdateForm] = useState<any>({}); 

  const loadData = () => {
    setLoading(true);
    Promise.all([
      fetch(`/api/cohorts/${params.id}`).then(r => r.json()).catch(() => null),
      fetch(`/api/cohorts/${params.id}/insertion`).then(r => r.json()).catch(() => null),
      fetch(`/api/cohorts/${params.id}/insertion/followups`).then(r => r.json()).catch(() => []),
    ]).then(([c, d, f]) => {
      setCohort(c);
      setData(d);
      setFollowUps(f || []);
    }).finally(() => setLoading(false));
  };

  useEffect(() => { loadData(); }, [params.id]);

  if (loading) return <div className="page-body"><div className="loading-overlay"><span className="loading-spinner" /> Chargement...</div></div>;
  if (!data || !cohort) return <div className="page-body"><div className="empty-state"><p>Données introuvables</p></div></div>;

  const { stats, byType, byLevel, byField, byGender, byTypeAndLevel, learners } = data;

  // --- STATS DATA ---
  const typeData = Object.entries(byType).map(([key, val]: any) => ({ name: INSERTION_LABELS[key] || key, value: val }));
  const genderData = Object.entries(byGender).map(([key, val]: any) => ({ name: GENDER_LABELS[key] || key, Insérés: val.inserted, 'Non insérés': val.total - val.inserted }));
  const levelData = Object.entries(byLevel).map(([key, val]: any) => ({ name: key, count: val.total, inserted: val.inserted }));
  const fieldData = Object.entries(byField).map(([key, val]: any) => ({ name: key.length > 22 ? key.substring(0, 22) + '...' : key, fullName: key, count: val.inserted })).sort((a, b) => b.count - a.count);
  const allTypes = Array.from(new Set(Object.values(byTypeAndLevel).flatMap((t: any) => Object.keys(t))));
  const stackedData = Object.entries(byTypeAndLevel).map(([lvl, types]: any) => ({ name: lvl, ...allTypes.reduce((acc: any, t: string) => ({ ...acc, [INSERTION_LABELS[t] || t]: types[t] || 0 }), {}) }));

  const filteredLearners = learners.filter((l: any) => {
    if (filterInserted === 'OUI' && l.statusCurrent !== 'INSERTED') return false;
    if (filterInserted === 'NON' && l.statusCurrent === 'INSERTED') return false;
    if (filterType && l.insertionType !== filterType) return false;
    if (filterLevel && l.academicLevel !== filterLevel) return false;
    if (filterField && l.academicField !== filterField) return false;
    return true;
  });

  const uniqueLevels = Array.from(new Set(learners.map((l: any) => l.academicLevel).filter(Boolean)));
  const uniqueFields = Array.from(new Set(learners.map((l: any) => l.academicField).filter(Boolean)));
  const uniqueTypes = Array.from(new Set(learners.map((l: any) => l.insertionType).filter(Boolean)));

  // --- FOLLOW UP HANDLERS ---
  const handleGenerateFollowUps = async (e: React.FormEvent) => {
    e.preventDefault();
    if (selectedLearners.length === 0) return alert('Sélectionnez au moins un apprenant');
    setGenerating(true);
    try {
      const res = await fetch(`/api/cohorts/${params.id}/insertion/followups`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          learnerIds: selectedLearners,
          startDate: genForm.startDate,
          endDate: genForm.endDate,
          intervalDays: genForm.intervalDays,
          modality: 'CALL'
        })
      });
      if (res.ok) {
        alert('Planification générée avec succès !');
        loadData();
      } else alert('Erreur lors de la génération');
    } finally {
      setGenerating(false);
    }
  };

  const handleUpdateFollowUp = async (id: string, learnerId: string, updates: any) => {
    setUpdating(id);
    try {
      const res = await fetch(`/api/learners/${learnerId}/insertion-followups/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates)
      });
      if (res.ok) loadData();
    } finally {
      setUpdating(null);
      setUpdateForm({});
    }
  };

  const handleDeleteFollowUp = async (id: string, learnerId: string) => {
    if (!confirm('Supprimer ce point de suivi ?')) return;
    await fetch(`/api/learners/${learnerId}/insertion-followups/${id}`, { method: 'DELETE' });
    loadData();
  };

  // Group followups by learner
  const followUpsByLearner = learners.map((l: any) => ({
    ...l,
    followUps: followUps.filter(f => f.learnerProfileId === l.id)
  }));


  return (
    <>
      <div className="page-header">
        <div>
          <div className="breadcrumbs">
            <Link href="/admin/cohorts">Cohortes</Link> / <Link href={`/admin/cohorts/${params.id}`}>{cohort.name}</Link> / <span>Insertion</span>
          </div>
          <h1 className="page-title">📊 Insertion Professionnelle</h1>
          <p className="page-subtitle">{cohort.name} — {cohort.program?.campus?.name}</p>
        </div>
      </div>

      <div className="tabs" style={{ padding: '0 32px' }}>
        <button className={`tab ${activeTab === 'STATS' ? 'active' : ''}`} onClick={() => setActiveTab('STATS')}>
          📊 Statistiques d'insertion
        </button>
        <button className={`tab ${activeTab === 'FOLLOWUP' ? 'active' : ''}`} onClick={() => setActiveTab('FOLLOWUP')}>
          📞 Suivi & Planification (15 jours)
        </button>
      </div>

      <div className="page-body">
        {activeTab === 'STATS' && (
          <>
            {/* KPIs */}
            <div className="kpi-grid" style={{ gridTemplateColumns: 'repeat(4, 1fr)' }}>
              <div className="kpi-card" style={{ borderLeft: '4px solid #3b82f6' }}>
                <div className="kpi-label" style={{ color: '#3b82f6', fontWeight: 600 }}>Effectif total</div>
                <div className="kpi-value" style={{ color: '#3b82f6' }}>{stats.total}</div>
              </div>
              <div className="kpi-card" style={{ borderLeft: '4px solid #22c55e' }}>
                <div className="kpi-label" style={{ color: '#22c55e', fontWeight: 600 }}>Nombre insérés</div>
                <div className="kpi-value" style={{ color: '#22c55e' }}>{stats.inserted}</div>
              </div>
              <div className="kpi-card" style={{ borderLeft: '4px solid #ef4444' }}>
                <div className="kpi-label" style={{ color: '#ef4444', fontWeight: 600 }}>Non insérés</div>
                <div className="kpi-value" style={{ color: '#ef4444' }}>{stats.notInserted}</div>
              </div>
              <div className="kpi-card" style={{ borderLeft: '4px solid #06b6d4' }}>
                <div className="kpi-label" style={{ color: '#06b6d4', fontWeight: 600 }}>Taux d&apos;insertion</div>
                <div className="kpi-value" style={{ color: '#06b6d4' }}>{stats.insertionRate} %</div>
              </div>
            </div>

            {/* Charts row 1 */}
            <div className="charts-grid" style={{ gridTemplateColumns: '1fr 2fr 1fr' }}>
              <div className="card">
                <div className="card-header"><h3 className="card-title" style={{ fontSize: 13 }}>Répartition par sortie positive</h3></div>
                <div style={{ height: 200 }}>
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie data={[{ name: 'Oui', value: stats.inserted }, { name: 'Non', value: stats.notInserted }]} cx="50%" cy="50%" innerRadius={45} outerRadius={75} dataKey="value" label={({ percent }) => `${(percent * 100).toFixed(1)}%`}>
                        <Cell fill="#22c55e" /><Cell fill="#ef4444" />
                      </Pie>
                      <Tooltip /><Legend />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              </div>
              <div className="card">
                <div className="card-header"><h3 className="card-title" style={{ fontSize: 13 }}>Répartition des types d&apos;insertion par niveau académique</h3></div>
                <div style={{ height: 200 }}>
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={stackedData} margin={{ top: 5, right: 10, left: -20, bottom: 5 }}>
                      <CartesianGrid strokeDasharray="3 3" /><XAxis dataKey="name" tick={{ fontSize: 11 }} /><YAxis tick={{ fontSize: 11 }} /><Tooltip /><Legend wrapperStyle={{ fontSize: 11 }} />
                      {allTypes.map((t, i) => <Bar key={t} dataKey={INSERTION_LABELS[t] || t} stackId="a" fill={PALETTE[i % PALETTE.length]} />)}
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>
              <div className="card">
                <div className="card-header"><h3 className="card-title" style={{ fontSize: 13 }}>Répartition par nombre d&apos;insertions</h3></div>
                <div style={{ height: 200 }}>
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={[{ name: 'Oui', val: stats.inserted }, { name: 'Non', val: stats.notInserted }]} margin={{ top: 5, right: 10, left: -20, bottom: 5 }}>
                      <CartesianGrid strokeDasharray="3 3" /><XAxis dataKey="name" tick={{ fontSize: 12 }} /><YAxis tick={{ fontSize: 12 }} /><Tooltip /><Bar dataKey="val" fill="#3b82f6" label={{ position: 'top', fontSize: 12 }} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </div>

            {/* Charts row 2 */}
            <div className="charts-grid" style={{ gridTemplateColumns: '1fr 1fr 1fr 1fr' }}>
              <div className="card">
                <div className="card-header"><h3 className="card-title" style={{ fontSize: 13 }}>Répartition par type de contrat</h3></div>
                <div style={{ height: 220 }}>
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie data={typeData} cx="50%" cy="45%" innerRadius={50} outerRadius={75} dataKey="value" label={({ percent }) => percent > 0.05 ? `${(percent * 100).toFixed(1)}%` : ''}>
                        {typeData.map((_, i) => <Cell key={i} fill={PALETTE[i % PALETTE.length]} />)}
                      </Pie>
                      <Tooltip /><Legend wrapperStyle={{ fontSize: 10 }} />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              </div>
              <div className="card">
                <div className="card-header"><h3 className="card-title" style={{ fontSize: 13 }}>Insertions par niveau académique</h3></div>
                <div style={{ height: 220 }}>
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={levelData} layout="vertical" margin={{ top: 5, right: 20, left: 20, bottom: 5 }}>
                      <CartesianGrid strokeDasharray="3 3" /><XAxis type="number" tick={{ fontSize: 11 }} /><YAxis dataKey="name" type="category" tick={{ fontSize: 11 }} width={50} /><Tooltip /><Bar dataKey="inserted" name="Insérés" fill="#06b6d4" />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>
              <div className="card">
                <div className="card-header"><h3 className="card-title" style={{ fontSize: 13 }}>Répartition par insertion et le genre</h3></div>
                <div style={{ height: 220 }}>
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={genderData} margin={{ top: 5, right: 10, left: -20, bottom: 5 }}>
                      <CartesianGrid strokeDasharray="3 3" /><XAxis dataKey="name" tick={{ fontSize: 11 }} /><YAxis tick={{ fontSize: 11 }} /><Tooltip /><Legend wrapperStyle={{ fontSize: 11 }} /><Bar dataKey="Insérés" fill="#7dd3fc" /><Bar dataKey="Non insérés" fill="#f9a8d4" />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>
              <div className="card">
                <div className="card-header"><h3 className="card-title" style={{ fontSize: 13 }}>Insertions par filière académique</h3></div>
                <div style={{ height: 220 }}>
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={fieldData} layout="vertical" margin={{ top: 5, right: 20, left: 5, bottom: 5 }}>
                      <CartesianGrid strokeDasharray="3 3" /><XAxis type="number" tick={{ fontSize: 11 }} /><YAxis dataKey="name" type="category" tick={{ fontSize: 10 }} width={110} /><Tooltip formatter={(val, name, props) => [val, props.payload.fullName]} /><Bar dataKey="count" name="Insérés" fill="#a855f7" />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </div>

            {/* Filter bar */}
            <div className="card">
              <div className="card-header" style={{ gap: 12 }}>
                <select className="form-select" style={{ maxWidth: 180 }} value={filterInserted} onChange={e => setFilterInserted(e.target.value)}>
                  <option value="">Inséré (Oui/Non)</option><option value="OUI">Oui</option><option value="NON">Non</option>
                </select>
                <select className="form-select" style={{ maxWidth: 200 }} value={filterType} onChange={e => setFilterType(e.target.value)}>
                  <option value="">Type d&apos;insertion</option>
                  {uniqueTypes.map((t: any) => <option key={t} value={t}>{INSERTION_LABELS[t] || t}</option>)}
                </select>
                <select className="form-select" style={{ maxWidth: 180 }} value={filterLevel} onChange={e => setFilterLevel(e.target.value)}>
                  <option value="">Niveau académique</option>
                  {uniqueLevels.map((l: any) => <option key={l} value={l}>{l}</option>)}
                </select>
                <select className="form-select" style={{ maxWidth: 220 }} value={filterField} onChange={e => setFilterField(e.target.value)}>
                  <option value="">Filière académique</option>
                  {uniqueFields.map((f: any) => <option key={f} value={f}>{f}</option>)}
                </select>
                {(filterInserted || filterType || filterLevel || filterField) && (
                  <button className="btn btn-ghost btn-sm" onClick={() => { setFilterInserted(''); setFilterType(''); setFilterLevel(''); setFilterField(''); }}>✕ Réinitialiser</button>
                )}
              </div>

              <div>
                <table className="data-table">
                  <thead>
                    <tr><th>Nom / Prénom</th><th>Inséré</th><th>Type</th><th>Entreprise</th><th>Genre</th><th>Date</th></tr>
                  </thead>
                  <tbody>
                    {filteredLearners.map((l: any) => (
                      <tr key={l.id}>
                        <td style={{ fontWeight: 600 }}>{l.lastName} {l.firstName}</td>
                        <td><span className={`badge ${l.statusCurrent === 'INSERTED' ? 'badge-green' : 'badge-gray'}`}>{l.statusCurrent === 'INSERTED' ? 'Oui' : 'Non'}</span></td>
                        <td>{l.insertionType ? (INSERTION_LABELS[l.insertionType] || l.insertionType) : <span className="text-muted">-</span>}</td>
                        <td>{l.insertionCompany || <span className="text-muted">-</span>}</td>
                        <td>{l.gender ? GENDER_LABELS[l.gender] || l.gender : <span className="text-muted">-</span>}</td>
                        <td>{l.insertionDate ? formatDate(l.insertionDate) : <span className="text-muted">-</span>}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </>
        )}

        {/* --- TAB FOLLOW UP --- */}
        {activeTab === 'FOLLOWUP' && (
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 3fr', gap: 24 }}>
            {/* Left: Generator */}
            <div>
              <div className="card sticky" style={{ top: 20 }}>
                <div className="card-header"><h3 className="card-title">📅 Planification auto</h3></div>
                <div className="card-body">
                  <p style={{ fontSize: 13, color: 'var(--text-secondary)', marginBottom: 20 }}>
                    Planifiez automatiquement un suivi récurrent pour un ou plusieurs apprenants (ex: 1 fois tous les 15 jours sur une période). Utile après l&apos;atelier TRE.
                  </p>
                  <form onSubmit={handleGenerateFollowUps}>
                    <div className="form-group">
                      <label className="form-label">Sélectionner les apprenants</label>
                      <select className="form-select" multiple size={6} value={selectedLearners} onChange={e => setSelectedLearners(Array.from(e.target.selectedOptions, option => option.value))}>
                        {learners.map((l: any) => (
                          <option key={l.id} value={l.id}>{l.lastName} {l.firstName}</option>
                        ))}
                      </select>
                      <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 4 }}>Ctrl+Clic pour sélectionner plusieurs</div>
                    </div>
                    <div className="form-group">
                      <label className="form-label">Date de début</label>
                      <input type="date" required className="form-input" value={genForm.startDate} onChange={e => setGenForm({ ...genForm, startDate: e.target.value })} />
                    </div>
                    <div className="form-group">
                      <label className="form-label">Date de fin</label>
                      <input type="date" required className="form-input" value={genForm.endDate} onChange={e => setGenForm({ ...genForm, endDate: e.target.value })} />
                    </div>
                    <div className="form-group">
                      <label className="form-label">Fréquence (en jours)</label>
                      <input type="number" required min="1" max="180" className="form-input" value={genForm.intervalDays} onChange={e => setGenForm({ ...genForm, intervalDays: parseInt(e.target.value) })} />
                    </div>
                    <button type="submit" className="btn btn-primary" style={{ width: '100%' }} disabled={generating}>
                      {generating ? '⏳ Génération...' : 'Générer la planification'}
                    </button>
                  </form>
                </div>
              </div>
            </div>

            {/* Right: List of followups */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              {followUpsByLearner.filter((l: any) => l.followUps.length > 0 || selectedLearners.includes(l.id)).map((l: any) => (
                <div key={l.id} className="card">
                  <div className="card-header" style={{ background: 'var(--bg-secondary)', borderBottom: '1px solid var(--border)' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                      <div style={{ width: 32, height: 32, borderRadius: '50%', background: 'var(--bg-card)', border: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: 13 }}>
                        {l.firstName[0]}{l.lastName[0]}
                      </div>
                      <div>
                        <h3 className="card-title" style={{ fontSize: 14 }}>{l.firstName} {l.lastName}</h3>
                        <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>{l.statusCurrent === 'INSERTED' ? '✅ Inséré' : '⏳ En recherche'} • {l.followUps.length} point(s) de suivi</div>
                      </div>
                    </div>
                  </div>
                  
                  {l.followUps.length === 0 ? (
                    <div style={{ padding: 20, textAlign: 'center', color: 'var(--text-muted)', fontSize: 13 }}>Aucun suivi planifié</div>
                  ) : (
                    <table className="data-table" style={{ margin: 0 }}>
                      <thead><tr><th style={{width: 100}}>Date prévue</th><th style={{width: 130}}>Statut</th><th>Modalité</th><th>Notes / Résultat</th><th style={{width: 80}}>Actions</th></tr></thead>
                      <tbody>
                        {l.followUps.map((f: any) => {
                          const isEditing = updateForm.id === f.id;
                          return (
                            <tr key={f.id} style={{ background: f.status === 'COMPLETED' ? '#f0fdf4' : f.status === 'NO_SHOW' ? '#fef2f2' : 'transparent' }}>
                              <td style={{ fontSize: 13, fontWeight: 600 }}>{formatDate(f.plannedDate)}</td>
                              
                              {isEditing ? (
                                <>
                                  <td>
                                    <select className="form-select" style={{ fontSize: 12, padding: '4px 8px' }} value={updateForm.status} onChange={e => setUpdateForm({ ...updateForm, status: e.target.value })}>
                                      <option value="SCHEDULED">Planifié</option>
                                      <option value="COMPLETED">✅ Réalisé</option>
                                      <option value="NO_SHOW">❌ Injoignable</option>
                                      <option value="CANCELLED">Annulé</option>
                                    </select>
                                  </td>
                                  <td>
                                    <select className="form-select" style={{ fontSize: 12, padding: '4px 8px' }} value={updateForm.modality} onChange={e => setUpdateForm({ ...updateForm, modality: e.target.value })}>
                                      <option value="CALL">📞 Appel</option>
                                      <option value="ONLINE_MEETING">💻 Visio</option>
                                      <option value="IN_PERSON">👥 Présentiel</option>
                                      <option value="EMAIL">✉️ Email</option>
                                    </select>
                                  </td>
                                  <td>
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                                      <input className="form-input" style={{ fontSize: 12, padding: '4px 8px' }} placeholder="Notes de l'échange..." value={updateForm.notes || ''} onChange={e => setUpdateForm({ ...updateForm, notes: e.target.value })} />
                                      <div style={{ display: 'flex', gap: 4 }}>
                                        <input className="form-input" style={{ fontSize: 11, padding: '2px 6px' }} placeholder="Nom du fichier joint..." value={updateForm.attachmentName || ''} onChange={e => setUpdateForm({ ...updateForm, attachmentName: e.target.value })} />
                                        <input className="form-input" style={{ fontSize: 11, padding: '2px 6px' }} placeholder="Lien URL de la PJ..." value={updateForm.attachmentPath || ''} onChange={e => setUpdateForm({ ...updateForm, attachmentPath: e.target.value })} />
                                      </div>
                                    </div>
                                  </td>
                                  <td>
                                    <div style={{ display: 'flex', gap: 4 }}>
                                      <button className="btn btn-sm btn-primary" onClick={() => handleUpdateFollowUp(f.id, l.id, updateForm)}>💾</button>
                                      <button className="btn btn-sm btn-secondary" onClick={() => setUpdateForm({})}>✕</button>
                                    </div>
                                  </td>
                                </>
                              ) : (
                                <>
                                  <td>
                                    <span style={{ fontSize: 11, padding: '4px 8px', borderRadius: 10, fontWeight: 600, background: f.status === 'COMPLETED' ? '#dcfce7' : f.status === 'NO_SHOW' ? '#fee2e2' : f.status === 'CANCELLED' ? '#f1f5f9' : '#e0e7ff', color: f.status === 'COMPLETED' ? '#166534' : f.status === 'NO_SHOW' ? '#991b1b' : f.status === 'CANCELLED' ? '#64748b' : '#3730a3' }}>
                                      {f.status === 'COMPLETED' ? 'Réalisé' : f.status === 'NO_SHOW' ? 'Injoignable' : f.status === 'CANCELLED' ? 'Annulé' : 'Planifié'}
                                    </span>
                                  </td>
                                  <td style={{ fontSize: 13 }}>
                                    {f.modality === 'CALL' ? '📞 Appel' : f.modality === 'ONLINE_MEETING' ? '💻 Visio' : f.modality === 'IN_PERSON' ? '👥 Présentiel' : '✉️ Email'}
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
                                  <td>
                                    <div style={{ display: 'flex', gap: 4 }}>
                                      <button className="btn btn-sm btn-secondary" style={{ fontSize: 11 }} onClick={() => setUpdateForm(f)}>✏️</button>
                                      <button className="btn btn-sm btn-danger" style={{ fontSize: 11 }} onClick={() => handleDeleteFollowUp(f.id, l.id)}>🗑️</button>
                                    </div>
                                  </td>
                                </>
                              )}
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </>
  );
}
