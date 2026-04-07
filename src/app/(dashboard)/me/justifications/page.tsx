'use client';

export default function MyJustifications() {
  return (
    <>
      <div className="page-header">
        <div>
          <h1 className="page-title">Mes justificatifs d&apos;absence</h1>
          <p className="page-subtitle">Soumission et suivi des justificatifs</p>
        </div>
        <button className="btn btn-primary">+ Soumettre un justificatif</button>
      </div>
      <div className="page-body">
        <div className="empty-state">
          <p className="empty-state-title">Aucun justificatif</p>
          <p className="empty-state-text">Vous n&apos;avez pas encore soumis de justificatif d&apos;absence.</p>
        </div>
      </div>
    </>
  );
}
