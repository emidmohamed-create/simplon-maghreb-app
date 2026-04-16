'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

const STATUS_META: Record<string, { label: string; badgeClass: string }> = {
  DRAFT: { label: 'Brouillon', badgeClass: 'badge-gray' },
  OPEN: { label: 'Ouverte', badgeClass: 'badge-blue' },
  IN_PROGRESS: { label: 'En cours', badgeClass: 'badge-orange' },
  CLOSED: { label: 'Clôturée', badgeClass: 'badge-gray' },
  DECIDED: { label: 'Décisions prises', badgeClass: 'badge-green' },
  ARCHIVED: { label: 'Archivée', badgeClass: 'badge-gray' },
};

export default function SourcingSessionsPage() {
  const router = useRouter();
  const [sessions, setSessions] = useState<any[]>([]);
  const [projects, setProjects] = useState<any[]>([]);
  const [campuses, setCampuses] = useState<any[]>([]);
  const [cohorts, setCohorts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [creating, setCreating] = useState(false);
  const [form, setForm] = useState({
    name: '',
    date: '',
    location: '',
    campusId: '',
    projectId: '',
    cohortId: '',
    notes: '',
  });

  const load = () => {
    setLoading(true);
    Promise.all([
      fetch('/api/sourcing/sessions').then((r) => r.json()).catch(() => []),
      fetch('/api/projects').then((r) => r.json()).catch(() => []),
      fetch('/api/campuses').then((r) => r.json()).catch(() => []),
      fetch('/api/cohorts').then((r) => r.json()).catch(() => []),
    ]).then(([s, p, ca, co]) => {
      setSessions(Array.isArray(s) ? s : []);
      setProjects(Array.isArray(p) ? p : []);
      setCampuses(Array.isArray(ca) ? ca : []);
      setCohorts(Array.isArray(co) ? co : []);
    }).finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, []);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreating(true);
    try {
      const res = await fetch('/api/sourcing/sessions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...form, status: 'OPEN' }),
      });
      if (res.ok) {
        const session = await res.json();
        router.push(`/admin/sourcing/sessions/${session.id}`);
      } else {
        const err = await res.json();
        alert(err.error || 'Erreur création session');
      }
    } finally {
      setCreating(false);
    }
  };

  return (
    <>
      <div className="page-header">
        <div>
          <div className="breadcrumbs">
            <Link href="/admin/candidates">Candidats</Link> / <span>Sessions de sourcing</span>
          </div>
          <h1 className="page-title">Sessions de sourcing</h1>
          <p className="page-subtitle">Journées de sélection, jurys, grilles et décisions finales.</p>
        </div>
        <button className="btn btn-primary" onClick={() => setShowCreate(true)}>+ Nouvelle session</button>
      </div>

      <div className="page-body">
        {loading ? (
          <div className="loading-overlay"><span className="loading-spinner" /> Chargement...</div>
        ) : sessions.length === 0 ? (
          <div className="card" style={{ textAlign: 'center', padding: '48px 32px' }}>
            <h2 style={{ marginBottom: 8 }}>Aucune session de sourcing</h2>
            <p className="text-muted" style={{ maxWidth: 560, margin: '0 auto 24px' }}>
              Crée une session pour regrouper les candidats d'une journée, affecter les jurys et consolider les décisions.
            </p>
            <button className="btn btn-primary" onClick={() => setShowCreate(true)}>Créer une session</button>
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))', gap: 16 }}>
            {sessions.map((session) => {
              const meta = STATUS_META[session.status] || STATUS_META.DRAFT;
              return (
                <div
                  key={session.id}
                  className="card"
                  style={{ cursor: 'pointer' }}
                  onClick={() => router.push(`/admin/sourcing/sessions/${session.id}`)}
                >
                  <div className="card-body">
                    <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, alignItems: 'flex-start', marginBottom: 12 }}>
                      <div>
                        <div style={{ fontWeight: 800, fontSize: 16 }}>{session.name}</div>
                        <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 4 }}>
                          {session.date ? new Date(session.date).toLocaleDateString('fr-FR') : 'Date non définie'}
                          {session.location ? ` - ${session.location}` : ''}
                        </div>
                      </div>
                      <span className={`badge ${meta.badgeClass}`}>{meta.label}</span>
                    </div>
                    <div style={{ display: 'grid', gap: 8, fontSize: 13, color: 'var(--text-secondary)' }}>
                      <div><strong>Projet :</strong> {session.project?.name || '-'}</div>
                      <div><strong>Cohorte cible :</strong> {session.cohort?.name || '-'}</div>
                      <div><strong>Campus :</strong> {session.campus?.name || '-'}</div>
                    </div>
                    <div style={{ display: 'flex', gap: 8, marginTop: 14, flexWrap: 'wrap' }}>
                      <span className="badge badge-blue">{session._count?.candidates || 0} candidats</span>
                      <span className="badge badge-gray">{session._count?.juryMembers || 0} jurys</span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {showCreate && (
        <div className="modal-overlay" onClick={() => setShowCreate(false)}>
          <div className="modal" style={{ maxWidth: 720 }} onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2 className="modal-title">Nouvelle session de sourcing</h2>
              <button className="btn btn-ghost btn-icon" onClick={() => setShowCreate(false)}>x</button>
            </div>
            <form onSubmit={handleCreate}>
              <div className="modal-body">
                <div className="form-row">
                  <div className="form-group">
                    <label className="form-label">Nom *</label>
                    <input className="form-input" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Sourcing JobIntech AGA - Backend" required />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Date</label>
                    <input type="date" className="form-input" value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} />
                  </div>
                </div>
                <div className="form-row">
                  <div className="form-group">
                    <label className="form-label">Campus</label>
                    <select className="form-select" value={form.campusId} onChange={(e) => setForm({ ...form, campusId: e.target.value })}>
                      <option value="">Non défini</option>
                      {campuses.map((campus) => <option key={campus.id} value={campus.id}>{campus.name}</option>)}
                    </select>
                  </div>
                  <div className="form-group">
                    <label className="form-label">Lieu</label>
                    <input className="form-input" value={form.location} onChange={(e) => setForm({ ...form, location: e.target.value })} placeholder="Technopark, salle..." />
                  </div>
                </div>
                <div className="form-row">
                  <div className="form-group">
                    <label className="form-label">Projet</label>
                    <select className="form-select" value={form.projectId} onChange={(e) => setForm({ ...form, projectId: e.target.value })}>
                      <option value="">Non défini</option>
                      {projects.map((project) => <option key={project.id} value={project.id}>{project.name}</option>)}
                    </select>
                  </div>
                  <div className="form-group">
                    <label className="form-label">Cohorte cible</label>
                    <select className="form-select" value={form.cohortId} onChange={(e) => setForm({ ...form, cohortId: e.target.value })}>
                      <option value="">Non définie</option>
                      {cohorts.map((cohort) => <option key={cohort.id} value={cohort.id}>{cohort.name}</option>)}
                    </select>
                  </div>
                </div>
                <div className="form-group">
                  <label className="form-label">Notes internes</label>
                  <textarea className="form-input" rows={3} value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} />
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={() => setShowCreate(false)}>Annuler</button>
                <button type="submit" className="btn btn-primary" disabled={creating}>{creating ? 'Création...' : 'Créer la session'}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
