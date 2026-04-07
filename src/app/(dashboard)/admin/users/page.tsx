'use client';

import { useEffect, useState } from 'react';
import { ROLE_LABELS } from '@/lib/utils';

export default function UsersPage() {
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/users').then(r => r.json()).then(setUsers).catch(() => setUsers([])).finally(() => setLoading(false));
  }, []);

  return (
    <>
      <div className="page-header">
        <div><h1 className="page-title">Utilisateurs</h1><p className="page-subtitle">Gestion des comptes utilisateurs</p></div>
      </div>
      <div className="page-body">
        {loading ? <div className="loading-overlay"><span className="loading-spinner" /> Chargement...</div> : (
          <div className="card">
            <table className="data-table">
              <thead><tr><th>Nom</th><th>Email</th><th>Rôle</th><th>Campus</th><th>Statut</th><th>Dernière connexion</th></tr></thead>
              <tbody>
                {users.map(u => (
                  <tr key={u.id}>
                    <td style={{ fontWeight: 600 }}>{u.firstName} {u.lastName}</td>
                    <td>{u.email}</td>
                    <td><span className="badge badge-purple">{ROLE_LABELS[u.role] || u.role}</span></td>
                    <td>{u.campus?.name || '-'}</td>
                    <td><span className={`badge ${u.isActive ? 'badge-green' : 'badge-red'}`}>{u.isActive ? 'Actif' : 'Inactif'}</span></td>
                    <td>{u.lastLogin ? new Date(u.lastLogin).toLocaleDateString('fr-FR') : 'Jamais'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </>
  );
}
