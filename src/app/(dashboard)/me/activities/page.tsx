'use client';

export default function MyActivities() {
  return (
    <>
      <div className="page-header">
        <div>
          <h1 className="page-title">Mes activités</h1>
          <p className="page-subtitle">Activités pédagogiques et suivi</p>
        </div>
      </div>
      <div className="page-body">
        <div className="empty-state">
          <p className="empty-state-title">Aucune activité</p>
          <p className="empty-state-text">Les activités pédagogiques apparaîtront ici une fois créées par votre formateur.</p>
        </div>
      </div>
    </>
  );
}
