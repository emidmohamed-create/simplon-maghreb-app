'use client';

import { useEffect, useState } from 'react';
import { useSession } from 'next-auth/react';
import Link from 'next/link';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
  PieChart, Pie, Cell, LineChart, Line, FunnelChart, Funnel, LabelList,
} from 'recharts';
import { STATUS_LABELS, INSERTION_LABELS, formatDate } from '@/lib/utils';

const COLORS = {
  IN_TRAINING: '#3b82f6',
  DROPPED: '#ef4444',
  INSERTED: '#22c55e',
  EXCLUDED: '#6b7280',
};

const INSERTION_COLORS = ['#22c55e', '#3b82f6', '#f59e0b', '#8b5cf6', '#ec4899'];

interface AnalyticsData {
  overview: {
    totalLearners: number;
    activeLearners: number;
    droppedLearners: number;
    insertedLearners: number;
    excludedLearners: number;
    activeCohorts: number;
    absenceRate: number;
    lateRate: number;
    totalLateMinutes: number;
    totalAbsences: number;
  };
  funnel: {
    candidates: number;
    qualified: number;
    inTraining: number;
    inserted: number;
    dropped: number;
  };
  statusByProgram: Array<{
    program: string;
    IN_TRAINING: number;
    DROPPED: number;
    INSERTED: number;
    EXCLUDED: number;
  }>;
  insertionTypes: Array<{ type: string; count: number }>;
  cohortsTable: Array<{
    id: string;
    name: string;
    campus: string;
    program: string;
    project: string;
    trainer: string;
    startDate: string;
    endDate: string;
    progress: number;
    status: string;
    total: number;
    active: number;
    dropped: number;
    inserted: number;
    excluded: number;
    absenceRate: number;
    absences: number;
    lateRate: number;
    lateMinutes: number;
    risk: string;
  }>;
  absenceByCohort: Array<{ name: string; absenceRate: number; absences: number }>;
  riskLearners: Array<{
    id: string;
    name: string;
    cohort: string;
    absenceRate: number;
    absences: number;
    lates: number;
    lateMinutes: number;
    risk: string;
  }>;
  attendanceTrend: Array<{ name: string; presenceRate: number }>;
}

export default function DashboardPilotage() {
  const { data: session } = useSession();
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [searchCohort, setSearchCohort] = useState('');

  useEffect(() => {
    fetch('/api/analytics')
      .then(r => r.json())
      .then(setData)
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <>
        <div className="page-header">
          <div>
            <h1 className="page-title">Dashboard de pilotage</h1>
            <p className="page-subtitle">Vue globale de toutes les formations</p>
          </div>
        </div>
        <div className="page-body">
          <div className="loading-overlay">
            <span className="loading-spinner" />
            Chargement des données...
          </div>
        </div>
      </>
    );
  }

  if (!data) return null;

  const funnelData = [
    { name: 'Candidats', value: data.funnel.candidates, fill: '#8b5cf6' },
    { name: 'Qualifiés', value: data.funnel.qualified, fill: '#6366f1' },
    { name: 'En formation', value: data.funnel.inTraining, fill: '#3b82f6' },
    { name: 'Insérés', value: data.funnel.inserted, fill: '#22c55e' },
  ];

  const statusPieData = [
    { name: 'En formation', value: data.overview.activeLearners, color: COLORS.IN_TRAINING },
    { name: 'Abandonnés', value: data.overview.droppedLearners, color: COLORS.DROPPED },
    { name: 'Insérés', value: data.overview.insertedLearners, color: COLORS.INSERTED },
    { name: 'Exclus', value: data.overview.excludedLearners, color: COLORS.EXCLUDED },
  ].filter(d => d.value > 0);

  const filteredCohorts = data.cohortsTable.filter(c =>
    c.name.toLowerCase().includes(searchCohort.toLowerCase()) ||
    c.campus.toLowerCase().includes(searchCohort.toLowerCase()) ||
    c.program.toLowerCase().includes(searchCohort.toLowerCase())
  );

  return (
    <>
      <div className="page-header">
        <div>
          <h1 className="page-title">Dashboard de pilotage</h1>
          <p className="page-subtitle">Vue globale de toutes les formations — Simplon Maghreb</p>
        </div>
      </div>

      <div className="page-body">
        {/* KPI Cards */}
        <div className="kpi-grid">
          <div className="kpi-card">
            <div className="kpi-icon blue">🎓</div>
            <div className="kpi-label">Total apprenants</div>
            <div className="kpi-value">{data.overview.totalLearners}</div>
          </div>
          <div className="kpi-card">
            <div className="kpi-icon green">✅</div>
            <div className="kpi-label">Apprenants actifs</div>
            <div className="kpi-value">{data.overview.activeLearners}</div>
          </div>
          <div className="kpi-card">
            <div className="kpi-icon purple">👥</div>
            <div className="kpi-label">Cohortes en cours</div>
            <div className="kpi-value">{data.overview.activeCohorts}</div>
          </div>
          <div className="kpi-card">
            <div className="kpi-icon orange">📅</div>
            <div className="kpi-label">Taux d&apos;absence</div>
            <div className="kpi-value">{data.overview.absenceRate}%</div>
          </div>
          <div className="kpi-card">
            <div className="kpi-icon green">📈</div>
            <div className="kpi-label">Taux de présence</div>
            <div className="kpi-value">{Math.round((100 - data.overview.absenceRate) * 100) / 100}%</div>
          </div>
          <div className="kpi-card">
            <div className="kpi-icon red">⏱️</div>
            <div className="kpi-label">Taux de retard</div>
            <div className="kpi-value">{data.overview.lateRate}%</div>
          </div>
          <div className="kpi-card">
            <div className="kpi-icon green">💼</div>
            <div className="kpi-label">Insertions</div>
            <div className="kpi-value">{data.overview.insertedLearners}</div>
          </div>
        </div>

        {/* Charts Row 1 */}
        <div className="charts-grid">
          {/* Funnel */}
          <div className="card">
            <div className="card-header">
              <h3 className="card-title">Pipeline parcours apprenant</h3>
            </div>
            <div className="chart-container">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={funnelData} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                  <XAxis type="number" />
                  <YAxis type="category" dataKey="name" width={100} tick={{ fontSize: 12 }} />
                  <Tooltip />
                  <Bar dataKey="value" radius={[0, 4, 4, 0]}>
                    {funnelData.map((entry, i) => (
                      <Cell key={i} fill={entry.fill} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Status Pie */}
          <div className="card">
            <div className="card-header">
              <h3 className="card-title">Répartition des statuts</h3>
            </div>
            <div className="chart-container">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={statusPieData}
                    cx="50%"
                    cy="50%"
                    innerRadius={55}
                    outerRadius={85}
                    paddingAngle={3}
                    dataKey="value"
                    label={({ name, value }) => `${name}: ${value}`}
                  >
                    {statusPieData.map((entry, i) => (
                      <Cell key={i} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Status by Program - Stacked Bar */}
          <div className="card">
            <div className="card-header">
              <h3 className="card-title">Statuts par programme</h3>
            </div>
            <div className="chart-container">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={data.statusByProgram}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                  <XAxis dataKey="program" tick={{ fontSize: 11 }} />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  <Bar dataKey="IN_TRAINING" name="En formation" stackId="a" fill={COLORS.IN_TRAINING} />
                  <Bar dataKey="DROPPED" name="Abandonné" stackId="a" fill={COLORS.DROPPED} />
                  <Bar dataKey="INSERTED" name="Inséré" stackId="a" fill={COLORS.INSERTED} />
                  <Bar dataKey="EXCLUDED" name="Exclu" stackId="a" fill={COLORS.EXCLUDED} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
          {/* Presence Trend Chart */}
          <div className="card" style={{ gridColumn: 'span 2' }}>
            <div className="card-header">
              <h3 className="card-title">Évolution du taux de présence mensuel</h3>
            </div>
            <div className="chart-container" style={{ height: 300 }}>
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={data.attendanceTrend}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                  <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                  <YAxis domain={[0, 100]} unit="%" />
                  <Tooltip formatter={(v: number) => `${v}%`} />
                  <Legend />
                  <Line type="monotone" dataKey="presenceRate" name="Taux de présence" stroke="#22c55e" strokeWidth={3} dot={{ r: 4 }} activeDot={{ r: 6 }} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Absences by Cohort */}
          <div className="card">
            <div className="card-header">
              <h3 className="card-title">Absences par cohorte</h3>
            </div>
            <div className="chart-container">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={data.absenceByCohort} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                  <XAxis type="number" unit="%" />
                  <YAxis type="category" dataKey="name" width={120} tick={{ fontSize: 11 }} />
                  <Tooltip formatter={(v: number) => `${v}%`} />
                  <Bar dataKey="absenceRate" name="Taux d'absence" fill="#f59e0b" radius={[0, 4, 4, 0]}>
                    {data.absenceByCohort.map((entry, i) => (
                      <Cell key={i} fill={entry.absenceRate >= 20 ? '#ef4444' : entry.absenceRate >= 10 ? '#f59e0b' : '#22c55e'} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Insertion Types */}
          <div className="card">
            <div className="card-header">
              <h3 className="card-title">Types d&apos;insertion</h3>
            </div>
            <div className="chart-container">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={data.insertionTypes.map((t, i) => ({
                      name: INSERTION_LABELS[t.type!] || t.type,
                      value: t.count,
                    }))}
                    cx="50%"
                    cy="50%"
                    outerRadius={80}
                    dataKey="value"
                    label={({ name, value }) => `${name}: ${value}`}
                  >
                    {data.insertionTypes.map((_, i) => (
                      <Cell key={i} fill={INSERTION_COLORS[i % INSERTION_COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Top Risk Learners */}
          <div className="card">
            <div className="card-header">
              <h3 className="card-title">Top apprenants à risque</h3>
            </div>
            <div className="card-body" style={{ maxHeight: 260, overflowY: 'auto' }}>
              {data.riskLearners.length === 0 ? (
                <div className="empty-state">
                  <p className="empty-state-text">Aucun apprenant à risque</p>
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                  {data.riskLearners.map((l, i) => (
                    <Link
                      key={l.id}
                      href={`/admin/learners/${l.id}`}
                      style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '6px 8px', borderRadius: 'var(--radius-md)', textDecoration: 'none', color: 'inherit', fontSize: 13, background: i % 2 === 0 ? 'var(--gray-50)' : 'white' }}
                    >
                      <span style={{ width: 8, height: 8, borderRadius: '50%', background: l.risk === 'high' ? '#ef4444' : l.risk === 'medium' ? '#f59e0b' : '#22c55e', flexShrink: 0 }} />
                      <span style={{ flex: 1, fontWeight: 500 }}>{l.name}</span>
                      <span className="badge badge-gray" style={{ fontSize: 10 }}>{l.cohort}</span>
                      <span style={{ fontWeight: 600, color: l.risk === 'high' ? '#ef4444' : l.risk === 'medium' ? '#f59e0b' : '#22c55e' }}>
                        {l.absenceRate}%
                      </span>
                    </Link>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Cohorts Table */}
        <div className="card">
          <div className="card-header">
            <h3 className="card-title">Suivi des cohortes</h3>
            <div style={{ display: 'flex', gap: 8 }}>
              <input
                type="text"
                className="form-input"
                placeholder="Rechercher..."
                value={searchCohort}
                onChange={(e) => setSearchCohort(e.target.value)}
                style={{ width: 240 }}
              />
            </div>
          </div>
          <div className="table-container">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Cohorte</th>
                  <th>Campus</th>
                  <th>Programme</th>
                  <th>Formateur</th>
                  <th>Statut</th>
                  <th>Progression</th>
                  <th>Effectif</th>
                  <th>Actifs</th>
                  <th>Dropped</th>
                  <th>Insérés</th>
                  <th>Taux abs.</th>
                  <th>Taux ret.</th>
                  <th>Risque</th>
                </tr>
              </thead>
              <tbody>
                {filteredCohorts.map((c) => (
                  <tr key={c.id} className="clickable" onClick={() => window.location.href = `/admin/cohorts/${c.id}`}>
                    <td style={{ fontWeight: 600 }}>{c.name}</td>
                    <td>{c.campus}</td>
                    <td>{c.program}</td>
                    <td>{c.trainer}</td>
                    <td>
                      <span className={`badge ${c.status === 'En cours' ? 'badge-blue' : c.status === 'Terminée' ? 'badge-green' : 'badge-gray'}`}>
                        {c.status}
                      </span>
                    </td>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <div className="progress-bar" style={{ flex: 1 }}>
                          <div className={`progress-bar-fill ${c.progress > 80 ? 'green' : c.progress > 50 ? '' : 'orange'}`} style={{ width: `${c.progress}%` }} />
                        </div>
                        <span style={{ fontSize: 11, color: 'var(--text-muted)', width: 32 }}>{c.progress}%</span>
                      </div>
                    </td>
                    <td>{c.total}</td>
                    <td>{c.active}</td>
                    <td style={{ color: c.dropped > 0 ? '#ef4444' : 'inherit' }}>{c.dropped}</td>
                    <td style={{ color: c.inserted > 0 ? '#22c55e' : 'inherit' }}>{c.inserted}</td>
                    <td style={{ fontWeight: 600, color: c.absenceRate >= 20 ? '#ef4444' : c.absenceRate >= 10 ? '#f59e0b' : 'inherit' }}>
                      {c.absenceRate}%
                    </td>
                    <td>{c.lateRate}%</td>
                    <td>
                      <span style={{
                        display: 'inline-block', width: 10, height: 10, borderRadius: '50%',
                        background: c.risk === 'high' ? '#ef4444' : c.risk === 'medium' ? '#f59e0b' : '#22c55e',
                      }} />
                    </td>
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
