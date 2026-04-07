'use client';

import { useEffect, useState } from 'react';
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

  // Filters
  const [filterInserted, setFilterInserted] = useState('');
  const [filterType, setFilterType] = useState('');
  const [filterLevel, setFilterLevel] = useState('');
  const [filterField, setFilterField] = useState('');

  useEffect(() => {
    Promise.all([
      fetch(`/api/cohorts/${params.id}`).then(r => r.json()).catch(() => null),
      fetch(`/api/cohorts/${params.id}/insertion`).then(r => r.json()).catch(() => null),
    ]).then(([c, d]) => {
      setCohort(c);
      setData(d);
    }).finally(() => setLoading(false));
  }, [params.id]);

  if (loading) return <div className="page-body"><div className="loading-overlay"><span className="loading-spinner" /> Chargement...</div></div>;
  if (!data || !cohort) return <div className="page-body"><div className="empty-state"><p>Données introuvables</p></div></div>;

  const { stats, byType, byLevel, byField, byGender, byTypeAndLevel, learners } = data;

  // Pie data - types
  const typeData = Object.entries(byType).map(([key, val]: any) => ({
    name: INSERTION_LABELS[key] || key,
    value: val,
  }));

  // Bar data - by gender / inserted
  const genderData = Object.entries(byGender).map(([key, val]: any) => ({
    name: GENDER_LABELS[key] || key,
    Insérés: val.inserted,
    'Non insérés': val.total - val.inserted,
  }));

  // Bar data - by level
  const levelData = Object.entries(byLevel).map(([key, val]: any) => ({
    name: key,
    count: val.total,
    inserted: val.inserted,
  }));

  // Bar data - by field
  const fieldData = Object.entries(byField).map(([key, val]: any) => ({
    name: key.length > 22 ? key.substring(0, 22) + '...' : key,
    fullName: key,
    count: val.inserted,
  })).sort((a, b) => b.count - a.count);

  // Stacked bar - by level and type
  const allTypes = Array.from(new Set(Object.values(byTypeAndLevel).flatMap((t: any) => Object.keys(t))));
  const stackedData = Object.entries(byTypeAndLevel).map(([lvl, types]: any) => ({
    name: lvl,
    ...allTypes.reduce((acc: any, t: string) => ({ ...acc, [INSERTION_LABELS[t] || t]: types[t] || 0 }), {}),
  }));

  // Filtered learners table
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

  return (
    <>
      <div className="page-header">
        <div>
          <div className="breadcrumbs">
            <Link href="/admin/cohorts">Cohortes</Link> / <Link href={`/admin/cohorts/${params.id}`}>{cohort.name}</Link> / <span>Insertion</span>
          </div>
          <h1 className="page-title">📊 Statistiques d&apos;insertion</h1>
          <p className="page-subtitle">{cohort.name} — {cohort.program?.campus?.name}</p>
        </div>
      </div>

      <div className="page-body">
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
          {/* Pie - Répartition insertions */}
          <div className="card">
            <div className="card-header"><h3 className="card-title" style={{ fontSize: 13 }}>Répartition par sortie positive</h3></div>
            <div style={{ height: 200 }}>
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={[{ name: 'Oui', value: stats.inserted }, { name: 'Non', value: stats.notInserted }]}
                    cx="50%" cy="50%" innerRadius={45} outerRadius={75} dataKey="value"
                    label={({ percent }) => `${(percent * 100).toFixed(1)}%`}>
                    <Cell fill="#22c55e" />
                    <Cell fill="#ef4444" />
                  </Pie>
                  <Tooltip />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Stacked bar - Types par niveau académique */}
          <div className="card">
            <div className="card-header"><h3 className="card-title" style={{ fontSize: 13 }}>Répartition des types d&apos;insertion par niveau académique</h3></div>
            <div style={{ height: 200 }}>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={stackedData} margin={{ top: 5, right: 10, left: -20, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                  <YAxis tick={{ fontSize: 11 }} />
                  <Tooltip />
                  <Legend wrapperStyle={{ fontSize: 11 }} />
                  {allTypes.map((t, i) => (
                    <Bar key={t} dataKey={INSERTION_LABELS[t] || t} stackId="a" fill={PALETTE[i % PALETTE.length]} />
                  ))}
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Bar simple - Insertions Oui/Non */}
          <div className="card">
            <div className="card-header"><h3 className="card-title" style={{ fontSize: 13 }}>Répartition par nombre d&apos;insertions</h3></div>
            <div style={{ height: 200 }}>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={[{ name: 'Oui', val: stats.inserted }, { name: 'Non', val: stats.notInserted }]} margin={{ top: 5, right: 10, left: -20, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" tick={{ fontSize: 12 }} />
                  <YAxis tick={{ fontSize: 12 }} />
                  <Tooltip />
                  <Bar dataKey="val" fill="#3b82f6" label={{ position: 'top', fontSize: 12 }} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>

        {/* Charts row 2 */}
        <div className="charts-grid" style={{ gridTemplateColumns: '1fr 1fr 1fr 1fr' }}>
          {/* Donut - Type de contrat */}
          <div className="card">
            <div className="card-header"><h3 className="card-title" style={{ fontSize: 13 }}>Répartition par type de contrat</h3></div>
            <div style={{ height: 220 }}>
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={typeData} cx="50%" cy="45%" innerRadius={50} outerRadius={75} dataKey="value"
                    label={({ percent }) => percent > 0.05 ? `${(percent * 100).toFixed(1)}%` : ''}>
                    {typeData.map((_, i) => <Cell key={i} fill={PALETTE[i % PALETTE.length]} />)}
                  </Pie>
                  <Tooltip />
                  <Legend wrapperStyle={{ fontSize: 10 }} />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Horizontal bar - Par niveau académique */}
          <div className="card">
            <div className="card-header"><h3 className="card-title" style={{ fontSize: 13 }}>Insertions par niveau académique</h3></div>
            <div style={{ height: 220 }}>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={levelData} layout="vertical" margin={{ top: 5, right: 20, left: 20, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis type="number" tick={{ fontSize: 11 }} />
                  <YAxis dataKey="name" type="category" tick={{ fontSize: 11 }} width={50} />
                  <Tooltip />
                  <Bar dataKey="inserted" name="Insérés" fill="#06b6d4" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Grouped bar - Par genre */}
          <div className="card">
            <div className="card-header"><h3 className="card-title" style={{ fontSize: 13 }}>Répartition par insertion et le genre</h3></div>
            <div style={{ height: 220 }}>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={genderData} margin={{ top: 5, right: 10, left: -20, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                  <YAxis tick={{ fontSize: 11 }} />
                  <Tooltip />
                  <Legend wrapperStyle={{ fontSize: 11 }} />
                  <Bar dataKey="Insérés" fill="#7dd3fc" />
                  <Bar dataKey="Non insérés" fill="#f9a8d4" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Horizontal bar - Par filière */}
          <div className="card">
            <div className="card-header"><h3 className="card-title" style={{ fontSize: 13 }}>Insertions par filière académique</h3></div>
            <div style={{ height: 220 }}>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={fieldData} layout="vertical" margin={{ top: 5, right: 20, left: 5, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis type="number" tick={{ fontSize: 11 }} />
                  <YAxis dataKey="name" type="category" tick={{ fontSize: 10 }} width={110} />
                  <Tooltip formatter={(val, name, props) => [val, props.payload.fullName]} />
                  <Bar dataKey="count" name="Insérés" fill="#a855f7" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>

        {/* Filter bar */}
        <div className="card">
          <div className="card-header" style={{ gap: 12 }}>
            <select className="form-select" style={{ maxWidth: 180 }} value={filterInserted} onChange={e => setFilterInserted(e.target.value)}>
              <option value="">Inséré (Oui/Non)</option>
              <option value="OUI">Oui</option>
              <option value="NON">Non</option>
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
              <button className="btn btn-ghost btn-sm" onClick={() => { setFilterInserted(''); setFilterType(''); setFilterLevel(''); setFilterField(''); }}>
                ✕ Réinitialiser
              </button>
            )}
          </div>

          <div>
            <div style={{ padding: '12px 16px', borderBottom: '1px solid var(--border)', fontWeight: 700, fontSize: 14 }}>
              Détail des insertions ({filteredLearners.length})
            </div>
            <table className="data-table">
              <thead>
                <tr>
                  <th>Nom</th>
                  <th>Prénom</th>
                  <th>Inséré</th>
                  <th>Type d&apos;insertion</th>
                  <th>Entreprise</th>
                  <th>Filière académique</th>
                  <th>Niveau académique</th>
                  <th>Genre</th>
                  <th>Date insertion</th>
                </tr>
              </thead>
              <tbody>
                {filteredLearners.map((l: any) => (
                  <tr key={l.id}>
                    <td style={{ fontWeight: 600 }}>{l.lastName}</td>
                    <td>{l.firstName}</td>
                    <td>
                      <span className={`badge ${l.statusCurrent === 'INSERTED' ? 'badge-green' : 'badge-gray'}`}>
                        {l.statusCurrent === 'INSERTED' ? 'Oui' : 'Non'}
                      </span>
                    </td>
                    <td>{l.insertionType ? (INSERTION_LABELS[l.insertionType] || l.insertionType) : <span className="text-muted">-</span>}</td>
                    <td>{l.insertionCompany || <span className="text-muted">-</span>}</td>
                    <td>{l.academicField || <span className="text-muted">-</span>}</td>
                    <td>{l.academicLevel || <span className="text-muted">-</span>}</td>
                    <td>{l.gender ? GENDER_LABELS[l.gender] || l.gender : <span className="text-muted">-</span>}</td>
                    <td>{l.insertionDate ? formatDate(l.insertionDate) : <span className="text-muted">-</span>}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </>
  );
}
