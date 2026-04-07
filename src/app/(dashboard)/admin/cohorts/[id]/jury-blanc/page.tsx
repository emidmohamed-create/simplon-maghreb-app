'use client';

import { useEffect, useState, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';

// Competency templates from the screenshot
const TECH_TEMPLATES = [
  { code: 'C1', name: 'Application du socle', description: 'Application du socle de connaissances communes au format du projet mezze mobile' },
  { code: 'C2', name: 'Installer & configurer', description: 'Installer et configurer son environnement de travail en fonction du projet mobile' },
  { code: 'C3', name: 'Gestion du projet mobile', description: 'Gestion du fonctionnement et de la mise en place des solutions techniques' },
  { code: 'C4', name: 'Proposer des interfaces utilisateurs', description: 'Proposer des interfaces utilisateur utilisant des frameworks ou web mobile' },
  { code: 'C5', name: 'Réaliser des interfaces utilisant une web mobile', description: 'Réaliser des interfaces utilisant un framework web mobile adapté' },
  { code: 'C6', name: 'Développer à partir', description: 'Développer à partir d\'une base de données existant en mobile' },
  { code: 'C7', name: 'Nature et accès base de données', description: 'Identifier la nature et les accès base de données en mobile' },
  { code: 'C8', name: 'Développer des composants', description: 'Développer des composants permettant la mise en cache en mobile server' },
  { code: 'C9', name: 'Découper des données', description: 'Découper des données du modèle métier de façon valide' },
];
const TRANSVERSAL_TEMPLATES = [
  { code: 'T1', name: 'Présenter un travail', description: 'Présenter un travail réalisé en synthétisant ses résultats, sa démarche et en répondant aux questions afin de le restituer au commanditaire' },
  { code: 'T2', name: 'Interagir en contexte professionnel', description: 'Interagir dans un contexte professionnel de façon respectueuse et constructive pour favoriser la collaboration' },
  { code: 'T3', name: 'Rechercher des solutions', description: 'Rechercher de façon méthodique une ou des solutions au problème rencontré afin de retenir une solution adaptée au contexte' },
];

export default function JuryBlancIndexPage() {
  const params  = useParams();
  const router  = useRouter();
  const [cohort,    setCohort]    = useState<any>(null);
  const [sessions,  setSessions]  = useState<any[]>([]);
  const [loading,   setLoading]   = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [creating,   setCreating]  = useState(false);

  const [form, setForm] = useState({
    name: 'Jury Blanc 1', date: '', description: '',
    useTemplate: true,
    techComps: TECH_TEMPLATES.map(t => ({ ...t, category: 'TECHNIQUE', selected: true, description: t.description })),
    transComps: TRANSVERSAL_TEMPLATES.map(t => ({ ...t, category: 'TRANSVERSAL', selected: true, description: t.description })),
  });

  const load = useCallback(() => {
    setLoading(true);
    Promise.all([
      fetch(`/api/cohorts/${params.id}`).then(r => r.json()).catch(() => null),
      fetch(`/api/cohorts/${params.id}/jury-blanc`).then(r => r.json()).catch(() => []),
    ]).then(([c, s]) => { setCohort(c); setSessions(Array.isArray(s) ? s : []); }).finally(() => setLoading(false));
  }, [params.id]);

  useEffect(() => { load(); }, [load]);

  const handleDelete = async (sessionId: string, name: string) => {
    if (!confirm(`Supprimer la session "${name}" ? Toutes les évaluations associées seront définitivement effacées.`)) return;
    await fetch(`/api/cohorts/${params.id}/jury-blanc/${sessionId}`, { method: 'DELETE' });
    load();
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreating(true);
    try {
      const competencies = form.useTemplate
        ? [
            ...form.techComps.filter(c => c.selected).map((c, i) => ({ ...c, orderIndex: i })),
            ...form.transComps.filter(c => c.selected).map((c, i) => ({ ...c, orderIndex: i })),
          ]
        : [];

      const res = await fetch(`/api/cohorts/${params.id}/jury-blanc`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: form.name, date: form.date || null, description: form.description, competencies }),
      });
      if (res.ok) {
        const session = await res.json();
        router.push(`/admin/cohorts/${params.id}/jury-blanc/${session.id}`);
      } else {
        const err = await res.json();
        alert('Erreur: ' + err.error);
      }
    } finally { setCreating(false); }
  };

  if (loading) return <div className="page-body"><div className="loading-overlay"><span className="loading-spinner" /> Chargement...</div></div>;

  return (
    <>
      <div className="page-header">
        <div>
          <div className="breadcrumbs">
            <Link href="/admin/cohorts">Cohortes</Link> /
            <Link href={`/admin/cohorts/${params.id}`}>{cohort?.name}</Link> /
            <span>Jury Blanc</span>
          </div>
          <h1 className="page-title">⚖️ Jury Blanc</h1>
          <p className="page-subtitle">Grilles d&apos;évaluation — {cohort?.name}</p>
        </div>
        <button className="btn btn-primary" onClick={() => setShowCreate(true)}>+ Nouvelle session</button>
      </div>

      <div className="page-body">
        {sessions.length === 0 ? (
          <div className="card" style={{ textAlign: 'center', padding: '48px 32px' }}>
            <div style={{ fontSize: 48, marginBottom: 16 }}>⚖️</div>
            <h2 style={{ marginBottom: 8 }}>Aucune session de Jury Blanc</h2>
            <p className="text-muted" style={{ maxWidth: 480, margin: '0 auto 24px' }}>
              Créez votre première grille d&apos;évaluation. Vous pourrez configurer les compétences techniques et transversales selon votre formation.
            </p>
            <button className="btn btn-primary" style={{ fontSize: 15, padding: '10px 24px' }} onClick={() => setShowCreate(true)}>+ Créer une session Jury Blanc</button>
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))', gap: 16 }}>
            {sessions.map((s: any) => {
              const techCount  = s.competencies.filter((c: any) => c.category === 'TECHNIQUE').length;
              const transCount = s.competencies.filter((c: any) => c.category === 'TRANSVERSAL').length;
              return (
                <div key={s.id} className="card" style={{ cursor: 'pointer', transition: 'transform 0.15s, box-shadow 0.15s' }}
                  onClick={() => router.push(`/admin/cohorts/${params.id}/jury-blanc/${s.id}`)}
                  onMouseEnter={e => { (e.currentTarget as HTMLDivElement).style.transform = 'translateY(-2px)'; (e.currentTarget as HTMLDivElement).style.boxShadow = '0 8px 25px rgba(0,0,0,0.12)'; }}
                  onMouseLeave={e => { (e.currentTarget as HTMLDivElement).style.transform = ''; (e.currentTarget as HTMLDivElement).style.boxShadow = ''; }}>
                  <div className="card-body">
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 }}>
                      <div>
                        <div style={{ fontWeight: 700, fontSize: 16, marginBottom: 4 }}>{s.name}</div>
                        {s.date && <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>📅 {new Date(s.date).toLocaleDateString('fr-FR', { day: '2-digit', month: 'long', year: 'numeric' })}</div>}
                      </div>
                      {s.isLocked ? <span className="badge badge-gray">🔒 Clôturé</span> : <span className="badge badge-green">🟢 Actif</span>}
                    </div>
                    {s.description && <p style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 12 }}>{s.description}</p>}
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 12 }}>
                      <div style={{ display: 'flex', gap: 10 }}>
                        <span style={{ fontSize: 12, padding: '4px 10px', borderRadius: 12, background: '#dbeafe', color: '#1d4ed8', fontWeight: 600 }}>🔧 {techCount} tech</span>
                        <span style={{ fontSize: 12, padding: '4px 10px', borderRadius: 12, background: '#ede9fe', color: '#6d28d9', fontWeight: 600 }}>🤝 {transCount} transv.</span>
                      </div>
                      <button
                        className="btn btn-sm btn-danger"
                        style={{ fontSize: 11 }}
                        onClick={e => { e.stopPropagation(); handleDelete(s.id, s.name); }}
                        title="Supprimer cette session"
                      >
                        🗑️ Supprimer
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* ═══ CREATE SESSION MODAL ═══ */}
      {showCreate && (
        <div className="modal-overlay" onClick={() => setShowCreate(false)}>
          <div className="modal" style={{ maxWidth: 780 }} onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h2 className="modal-title">⚖️ Nouvelle session Jury Blanc</h2>
              <button className="btn btn-ghost btn-icon" onClick={() => setShowCreate(false)}>✕</button>
            </div>
            <form onSubmit={handleCreate}>
              <div className="modal-body" style={{ maxHeight: '75vh', overflowY: 'auto' }}>
                <div className="form-row">
                  <div className="form-group">
                    <label className="form-label">Nom de la session *</label>
                    <input className="form-input" value={form.name} onChange={e => setForm({...form, name: e.target.value})} required placeholder="Jury Blanc 1, Jury Final..." />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Date</label>
                    <input type="date" className="form-input" value={form.date} onChange={e => setForm({...form, date: e.target.value})} />
                  </div>
                </div>
                <div className="form-group">
                  <label className="form-label">Description</label>
                  <textarea className="form-input" rows={2} value={form.description} onChange={e => setForm({...form, description: e.target.value})} />
                </div>

                <div style={{ height: 1, background: 'var(--border)', margin: '16px 0' }} />
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                  <p style={{ fontWeight: 700, margin: 0 }}>Compétences évaluées</p>
                  <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, cursor: 'pointer' }}>
                    <input type="checkbox" checked={form.useTemplate} onChange={e => setForm({...form, useTemplate: e.target.checked})} />
                    Utiliser le modèle standard
                  </label>
                </div>

                {form.useTemplate && (
                  <>
                    {/* Tech competencies */}
                    <div style={{ marginBottom: 16 }}>
                      <div style={{ fontWeight: 700, fontSize: 13, color: '#1d4ed8', marginBottom: 8, display: 'flex', alignItems: 'center', gap: 6 }}>
                        🔧 Compétences Techniques
                      </div>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 6, border: '1px solid var(--border)', borderRadius: 8, padding: 12, maxHeight: 220, overflowY: 'auto' }}>
                        {form.techComps.map((c, i) => (
                          <label key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: 10, cursor: 'pointer', padding: '4px 0' }}>
                            <input type="checkbox" checked={c.selected} style={{ marginTop: 2, flexShrink: 0 }}
                              onChange={e => {
                                const updated = [...form.techComps];
                                updated[i] = { ...updated[i], selected: e.target.checked };
                                setForm({...form, techComps: updated});
                              }} />
                            <div>
                              <span style={{ fontWeight: 700, marginRight: 8, color: '#1d4ed8' }}>{c.code}</span>
                              <span style={{ fontWeight: 600, fontSize: 13 }}>{c.name}</span>
                              <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{c.description}</div>
                            </div>
                          </label>
                        ))}
                      </div>
                    </div>
                    {/* Transversal competencies */}
                    <div>
                      <div style={{ fontWeight: 700, fontSize: 13, color: '#6d28d9', marginBottom: 8 }}>🤝 Compétences Transversales</div>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 6, border: '1px solid var(--border)', borderRadius: 8, padding: 12 }}>
                        {form.transComps.map((c, i) => (
                          <label key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: 10, cursor: 'pointer', padding: '4px 0' }}>
                            <input type="checkbox" checked={c.selected} style={{ marginTop: 2, flexShrink: 0 }}
                              onChange={e => {
                                const updated = [...form.transComps];
                                updated[i] = { ...updated[i], selected: e.target.checked };
                                setForm({...form, transComps: updated});
                              }} />
                            <div>
                              <span style={{ fontWeight: 700, marginRight: 8, color: '#6d28d9' }}>{c.code}</span>
                              <span style={{ fontWeight: 600, fontSize: 13 }}>{c.name}</span>
                              <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{c.description}</div>
                            </div>
                          </label>
                        ))}
                      </div>
                    </div>
                  </>
                )}
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={() => setShowCreate(false)}>Annuler</button>
                <button type="submit" className="btn btn-primary" disabled={creating}>{creating ? '⏳ Création...' : '⚖️ Créer la session'}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
