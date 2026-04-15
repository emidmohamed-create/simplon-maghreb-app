$path = 'src/app/(dashboard)/admin/candidates/[id]/page.tsx'
$lines = Get-Content -LiteralPath $path

function Find-LineIndex {
  param(
    [string[]]$Array,
    [string]$Needle,
    [int]$Start = 0
  )
  for ($i = $Start; $i -lt $Array.Length; $i++) {
    if ($Array[$i] -like "*$Needle*") {
      return $i
    }
  }
  return -1
}

$startEvalTab = Find-LineIndex -Array $lines -Needle "{activeTab === 'evaluation' && (" -Start 0
$contactComment = Find-LineIndex -Array $lines -Needle "CONTACT MODAL" -Start ($startEvalTab + 1)
if ($startEvalTab -lt 0 -or $contactComment -lt 0) {
  throw "Unable to locate evaluation tab block"
}

$newEvalTab = (@'
        {activeTab === 'evaluation' && (
          <>
            <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 12 }}>
              {candidate.currentStage !== 'CONVERTED' && candidate.currentStage !== 'REJECTED' && (
                <button className="btn btn-warning" onClick={() => setShowEvalModal(true)}>+ Nouvelle évaluation</button>
              )}
            </div>
            {candidate.evaluations?.length === 0 ? (
              <div className="empty-state"><p>Aucune évaluation enregistrée</p></div>
            ) : (
              candidate.evaluations?.map((ev: any) => {
                let criteria: any = null;
                try {
                  if (ev.criteriaJson) criteria = JSON.parse(ev.criteriaJson);
                } catch {}

                const metrics = criteria ? computeSourcingScore(criteria) : null;
                const badge = recommendationBadge(ev.recommendation || '');
                const adminInfo = criteria?.gridVersion === 'sourcing_v2' ? criteria?.adminInfo || {} : null;
                const comments = criteria?.gridVersion === 'sourcing_v2' ? criteria?.comments || {} : {};

                return (
                  <div key={ev.id} className="card" style={{ marginBottom: 16 }}>
                    <div className="card-header">
                      <div>
                        <h3 className="card-title">Évaluation du {new Date(ev.evaluationDate).toLocaleDateString('fr-FR')}</h3>
                        <p className="text-muted text-sm">par {ev.evaluator?.firstName} {ev.evaluator?.lastName}</p>
                      </div>
                      <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
                        {ev.score && (
                          <div style={{ textAlign: 'center' }}>
                            <div style={{ fontSize: 24, fontWeight: 700, color: ev.score >= 70 ? '#22c55e' : ev.score >= 50 ? '#f59e0b' : '#ef4444' }}>
                              {Math.round(ev.score)}/100
                            </div>
                            <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>Score global</div>
                          </div>
                        )}
                        {ev.recommendation && <span className={`badge ${badge.className}`}>{badge.label}</span>}
                      </div>
                    </div>

                    {criteria && (
                      <div className="card-body">
                        {metrics && (
                          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, minmax(140px, 1fr))', gap: 10, marginBottom: 14 }}>
                            <div style={{ border: '1px solid var(--border)', borderRadius: 8, padding: '10px 12px' }}>
                              <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>Admin / motivation</div>
                              <div style={{ fontWeight: 700 }}>{metrics.adminAvg.toFixed(1)}/5</div>
                            </div>
                            <div style={{ border: '1px solid var(--border)', borderRadius: 8, padding: '10px 12px' }}>
                              <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>Technique</div>
                              <div style={{ fontWeight: 700 }}>{metrics.techAvg.toFixed(1)}/5</div>
                            </div>
                            <div style={{ border: '1px solid var(--border)', borderRadius: 8, padding: '10px 12px' }}>
                              <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>Serious game</div>
                              <div style={{ fontWeight: 700 }}>{metrics.gameAvg.toFixed(1)}/5</div>
                            </div>
                          </div>
                        )}

                        {adminInfo && (
                          <div style={{ borderTop: '1px solid var(--border)', paddingTop: 12, marginBottom: 12 }}>
                            <p style={{ fontWeight: 600, marginBottom: 8, fontSize: 13 }}>Informations administratives</p>
                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 8 }}>
                              {Object.entries(adminInfo)
                                .filter(([, value]) => !!value)
                                .slice(0, 8)
                                .map(([key, value]) => {
                                  const field = ADMIN_INFO_FIELDS.find((f) => f.key === key);
                                  return (
                                    <div key={key} style={{ fontSize: 12 }}>
                                      <span style={{ color: 'var(--text-muted)' }}>{field?.label || key}:</span>{' '}
                                      <span style={{ color: 'var(--text-primary)' }}>{String(value)}</span>
                                    </div>
                                  );
                                })}
                            </div>
                          </div>
                        )}

                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(230px, 1fr))', gap: 12, marginBottom: 12 }}>
                          {EVAL_CRITERIA.map((c) => {
                            const score = getScoreFromCriteria(criteria, c.key);
                            const pct = (score / 5) * 100;
                            return (
                              <div key={c.key}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, marginBottom: 4 }}>
                                  <span>{c.label}</span>
                                  <span style={{ fontWeight: 700 }}>{score}/5</span>
                                </div>
                                <div style={{ height: 6, background: 'var(--border)', borderRadius: 3, overflow: 'hidden' }}>
                                  <div
                                    style={{
                                      height: '100%',
                                      width: `${pct}%`,
                                      background: score >= 4 ? '#22c55e' : score >= 3 ? '#f59e0b' : '#ef4444',
                                      borderRadius: 3,
                                    }}
                                  />
                                </div>
                              </div>
                            );
                          })}
                        </div>

                        {(comments?.admin || comments?.technical || comments?.seriousGame || comments?.decision) && (
                          <div style={{ borderTop: '1px solid var(--border)', paddingTop: 12, display: 'grid', gap: 8 }}>
                            {comments?.admin && <p style={{ fontSize: 12, margin: 0 }}><strong>Commentaire admin:</strong> {comments.admin}</p>}
                            {comments?.technical && <p style={{ fontSize: 12, margin: 0 }}><strong>Commentaire technique:</strong> {comments.technical}</p>}
                            {comments?.seriousGame && <p style={{ fontSize: 12, margin: 0 }}><strong>Commentaire serious game:</strong> {comments.seriousGame}</p>}
                            {comments?.decision && <p style={{ fontSize: 12, margin: 0 }}><strong>Justification décision:</strong> {comments.decision}</p>}
                          </div>
                        )}

                        {ev.comment && (
                          <p style={{ fontSize: 13, color: 'var(--text-secondary)', margin: 0, borderTop: '1px solid var(--border)', paddingTop: 12 }}>
                            {ev.comment}
                          </p>
                        )}
                      </div>
                    )}
                    {!criteria && ev.comment && <div className="card-body"><p style={{ fontSize: 13 }}>{ev.comment}</p></div>}
                  </div>
                );
              })
            )}
          </>
        )}
      </div>
'@).Trim() -split "\r?\n"

$beforeTab = if ($startEvalTab -gt 0) { $lines[0..($startEvalTab - 1)] } else { @() }
$afterTab = $lines[$contactComment..($lines.Length - 1)]
$lines = @($beforeTab + $newEvalTab + $afterTab)

$startEvalModal = Find-LineIndex -Array $lines -Needle "{showEvalModal && (" -Start 0
$convertComment = Find-LineIndex -Array $lines -Needle "CONVERT MODAL" -Start ($startEvalModal + 1)
if ($startEvalModal -lt 0 -or $convertComment -lt 0) {
  throw "Unable to locate evaluation modal block"
}

$newEvalModal = (@'
      {/* â•â•â• EVALUATION MODAL â•â•â• */}
      {showEvalModal && (
        <div className="modal-overlay" onClick={() => setShowEvalModal(false)}>
          <div className="modal" style={{ maxWidth: 920 }} onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h2 className="modal-title">📋 Grille sourcing candidat</h2>
              <button className="btn btn-ghost btn-icon" onClick={() => setShowEvalModal(false)}>✕</button>
            </div>
            <form onSubmit={handleSubmitEval}>
              <div className="modal-body" style={{ maxHeight: '74vh', overflowY: 'auto' }}>
                <div className="form-row">
                  <div className="form-group">
                    <label className="form-label">Date d&apos;évaluation</label>
                    <input
                      type="date"
                      className="form-input"
                      value={evalForm.evaluationDate}
                      onChange={e => setEvalForm((prev: any) => ({ ...prev, evaluationDate: e.target.value }))}
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Décision finale</label>
                    <select
                      className="form-select"
                      value={evalForm.recommendation}
                      onChange={e => setEvalForm((prev: any) => ({ ...prev, recommendation: e.target.value }))}
                    >
                      {RECOMMENDATION_OPTIONS.map((option) => (
                        <option key={option.value} value={option.value}>{option.label}</option>
                      ))}
                    </select>
                  </div>
                </div>

                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 12 }}>
                  <button
                    type="button"
                    className="btn btn-secondary"
                    onClick={() => {
                      applyScorePreset(4);
                      setEvalForm((prev: any) => ({ ...prev, recommendation: 'QUALIFIED' }));
                    }}
                  >
                    Préremplir profil admis
                  </button>
                  <button
                    type="button"
                    className="btn btn-secondary"
                    onClick={() => {
                      applyScorePreset(3);
                      setEvalForm((prev: any) => ({ ...prev, recommendation: 'WAITLIST' }));
                    }}
                  >
                    Préremplir liste d&apos;attente
                  </button>
                  <button
                    type="button"
                    className="btn btn-secondary"
                    onClick={() => {
                      applyScorePreset(2);
                      setEvalForm((prev: any) => ({ ...prev, recommendation: 'REJECTED' }));
                    }}
                  >
                    Préremplir profil à risque
                  </button>
                </div>

                <div style={{ border: '1px solid var(--border)', borderRadius: 10, padding: 12, marginBottom: 14 }}>
                  <p style={{ fontWeight: 700, marginBottom: 10, fontSize: 13 }}>Entretien administratif et motivation</p>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 10 }}>
                    {ADMIN_INFO_FIELDS.map((field) => {
                      const hasOptions = 'options' in field;
                      return (
                        <div key={field.key} className="form-group" style={{ marginBottom: 0 }}>
                          <label className="form-label" style={{ fontSize: 12 }}>{field.label}</label>
                          {hasOptions ? (
                            <select
                              className="form-select"
                              value={evalForm.criteria?.adminInfo?.[field.key] || ''}
                              onChange={(e) => setAdminInfo(field.key, e.target.value)}
                            >
                              <option value="">Non renseigné</option>
                              {field.options.map((option) => (
                                <option key={option} value={option}>{option}</option>
                              ))}
                            </select>
                          ) : (
                            <input
                              type={field.type === 'number' ? 'number' : 'text'}
                              className="form-input"
                              value={evalForm.criteria?.adminInfo?.[field.key] || ''}
                              onChange={(e) => setAdminInfo(field.key, e.target.value)}
                            />
                          )}
                        </div>
                      );
                    })}
                  </div>
                  <div className="form-group" style={{ marginTop: 10, marginBottom: 0 }}>
                    <label className="form-label">Commentaire admin/motivation</label>
                    <textarea
                      className="form-input"
                      rows={2}
                      style={{ resize: 'vertical' }}
                      value={evalForm.criteria?.comments?.admin || ''}
                      onChange={(e) => setCriteriaComment('admin', e.target.value)}
                    />
                  </div>
                </div>

                <div style={{ border: '1px solid var(--border)', borderRadius: 10, padding: 12, marginBottom: 14 }}>
                  <p style={{ fontWeight: 700, marginBottom: 10, fontSize: 13 }}>Jury admin + motivation (notation /5)</p>
                  {ADMIN_SOFT_SKILLS.map((criterion) => {
                    const score = getScoreFromCriteria(evalForm.criteria, criterion.key);
                    return (
                      <div key={criterion.key} style={{ marginBottom: 14 }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                          <span style={{ fontSize: 13 }}>{criterion.label}</span>
                          <strong>{score}/5</strong>
                        </div>
                        <input
                          type="range"
                          min={1}
                          max={5}
                          step={1}
                          value={score}
                          onChange={(e) => setScore(criterion.key, Number(e.target.value))}
                          style={{ width: '100%' }}
                        />
                        <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{SCORE_SCALE_LABELS[score]}</div>
                      </div>
                    );
                  })}
                </div>

                <div style={{ border: '1px solid var(--border)', borderRadius: 10, padding: 12, marginBottom: 14 }}>
                  <p style={{ fontWeight: 700, marginBottom: 10, fontSize: 13 }}>Jury technique (notation /5)</p>
                  {TECH_SKILLS.map((criterion) => {
                    const score = getScoreFromCriteria(evalForm.criteria, criterion.key);
                    return (
                      <div key={criterion.key} style={{ marginBottom: 14 }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                          <span style={{ fontSize: 13 }}>{criterion.label}</span>
                          <strong>{score}/5</strong>
                        </div>
                        <input
                          type="range"
                          min={1}
                          max={5}
                          step={1}
                          value={score}
                          onChange={(e) => setScore(criterion.key, Number(e.target.value))}
                          style={{ width: '100%' }}
                        />
                        <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{SCORE_SCALE_LABELS[score]}</div>
                      </div>
                    );
                  })}
                  <div className="form-group" style={{ marginBottom: 0 }}>
                    <label className="form-label">Commentaire technique</label>
                    <textarea
                      className="form-input"
                      rows={2}
                      style={{ resize: 'vertical' }}
                      value={evalForm.criteria?.comments?.technical || ''}
                      onChange={(e) => setCriteriaComment('technical', e.target.value)}
                    />
                  </div>
                </div>

                <div style={{ border: '1px solid var(--border)', borderRadius: 10, padding: 12, marginBottom: 14 }}>
                  <p style={{ fontWeight: 700, marginBottom: 10, fontSize: 13 }}>Jury serious game (notation /5)</p>
                  {SERIOUS_GAME_SKILLS.map((criterion) => {
                    const score = getScoreFromCriteria(evalForm.criteria, criterion.key);
                    return (
                      <div key={criterion.key} style={{ marginBottom: 14 }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                          <span style={{ fontSize: 13 }}>{criterion.label}</span>
                          <strong>{score}/5</strong>
                        </div>
                        <input
                          type="range"
                          min={1}
                          max={5}
                          step={1}
                          value={score}
                          onChange={(e) => setScore(criterion.key, Number(e.target.value))}
                          style={{ width: '100%' }}
                        />
                        <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{SCORE_SCALE_LABELS[score]}</div>
                      </div>
                    );
                  })}
                  <div className="form-group" style={{ marginBottom: 0 }}>
                    <label className="form-label">Commentaire serious game</label>
                    <textarea
                      className="form-input"
                      rows={2}
                      style={{ resize: 'vertical' }}
                      value={evalForm.criteria?.comments?.seriousGame || ''}
                      onChange={(e) => setCriteriaComment('seriousGame', e.target.value)}
                    />
                  </div>
                </div>

                <div className="form-group">
                  <label className="form-label">Justification de la décision</label>
                  <textarea
                    className="form-input"
                    rows={2}
                    style={{ resize: 'vertical' }}
                    value={evalForm.criteria?.comments?.decision || ''}
                    onChange={(e) => setCriteriaComment('decision', e.target.value)}
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Commentaire général</label>
                  <textarea
                    className="form-input"
                    rows={3}
                    style={{ resize: 'vertical' }}
                    value={evalForm.comment}
                    onChange={(e) => setEvalForm((prev: any) => ({ ...prev, comment: e.target.value }))}
                  />
                </div>

                <div style={{ textAlign: 'center', padding: '12px', background: 'var(--bg-secondary)', borderRadius: 10, marginTop: 8 }}>
                  <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 4 }}>Score calculé automatiquement</div>
                  <div style={{ fontSize: 28, fontWeight: 700, color: evalPreview.weighted >= 70 ? '#22c55e' : evalPreview.weighted >= 50 ? '#f59e0b' : '#ef4444' }}>
                    {evalPreview.weighted.toFixed(1)}/100
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'center', gap: 14, fontSize: 12, color: 'var(--text-muted)' }}>
                    <span>Admin: {evalPreview.adminAvg.toFixed(1)}/5</span>
                    <span>Tech: {evalPreview.techAvg.toFixed(1)}/5</span>
                    <span>Serious game: {evalPreview.gameAvg.toFixed(1)}/5</span>
                  </div>
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={() => setShowEvalModal(false)}>Annuler</button>
                <button type="submit" className="btn btn-primary" disabled={savingEval}>{savingEval ? 'Enregistrement...' : 'Enregistrer l\'évaluation'}</button>
              </div>
            </form>
          </div>
        </div>
      )}
'@).Trim() -split "\r?\n"

$beforeModal = if ($startEvalModal -gt 0) { $lines[0..($startEvalModal - 1)] } else { @() }
$afterModal = $lines[$convertComment..($lines.Length - 1)]
$lines = @($beforeModal + $newEvalModal + $afterModal)

Set-Content -LiteralPath $path -Value $lines -Encoding utf8
