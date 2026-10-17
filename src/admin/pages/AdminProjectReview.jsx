import { useCallback, useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { AlertTriangle, ArrowRight, CheckCircle2, Crown, Search, XCircle } from "lucide-react";
import {
  assignProjectLeader,
  getAdminProject,
  getLeaderCandidates,
  reviewProject,
  revokeProjectLeader,
} from "../../shared/services/workflowService";
import {
  NOTE_REQUIRED,
  PROJECT_STAGES,
  PUBLICATION_STATUSES,
  REVIEW_ACTION_LABELS,
  formatDate,
  reviewActions,
} from "../../shared/utils/workflow";
import { showAlert } from "../../shared/utils/alerts";
import "../../shared/styles/Workflow.css";

function EligibilityChecks({ eligibility }) {
  if (!eligibility) return null;
  return (
    <ul className="wf-checks">
      {eligibility.checks.map((check) => (
        <li key={check.key} className={check.passed ? "wf-check-ok" : check.blocking ? "wf-check-no" : "wf-check-soft"}>
          {check.passed ? <CheckCircle2 size={14} aria-hidden="true" /> : <XCircle size={14} aria-hidden="true" />}
          <span>{check.label}</span>
          <span className="wf-sr">{check.passed ? "متحقق" : check.blocking ? "تعارض يمنع التعيين" : "غير متحقق"}</span>
        </li>
      ))}
    </ul>
  );
}

function LeaderAssignment({ project, onChanged }) {
  const [search, setSearch] = useState("");
  const [candidates, setCandidates] = useState(null);
  const [selected, setSelected] = useState(null);
  const [justification, setJustification] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState(null);

  const find = async (event) => {
    event?.preventDefault();
    setBusy(true);
    setMessage(null);
    try {
      setCandidates(await getLeaderCandidates(project.id, search.trim()));
    } catch (err) {
      setMessage({ tone: "danger", text: err.message });
    } finally {
      setBusy(false);
    }
  };

  const assign = async () => {
    if (!selected) return;
    setBusy(true);
    setMessage(null);
    try {
      await assignProjectLeader(project.id, selected.id, justification.trim());
      setMessage({ tone: "success", text: `تم تعيين ${selected.name} قائدًا لفريق هذا المشروع.` });
      setSelected(null);
      setJustification("");
      onChanged();
    } catch (err) {
      setMessage({ tone: "danger", text: err.message });
    } finally {
      setBusy(false);
    }
  };

  const revoke = async () => {
    const result = await showAlert({
      icon: "warning",
      title: "إلغاء تعيين القائد؟",
      input: "text",
      inputLabel: "سبب الإلغاء",
      inputValidator: (value) => (!value || value.trim().length < 5 ? "اكتب سببًا واضحًا (5 أحرف على الأقل)." : undefined),
      showCancelButton: true,
      confirmButtonText: "إلغاء التعيين",
      cancelButtonText: "تراجع",
    });
    if (!result.isConfirmed) return;
    setBusy(true);
    try {
      await revokeProjectLeader(project.id, result.value.trim());
      setMessage({ tone: "success", text: "تم إلغاء تعيين القائد." });
      onChanged();
    } catch (err) {
      setMessage({ tone: "danger", text: err.message });
    } finally {
      setBusy(false);
    }
  };

  const needsJustification = selected && !selected.eligibility.eligible;

  return (
    <section className="wf-card" aria-labelledby="leader-title">
      <h2 id="leader-title"><Crown size={18} aria-hidden="true" /> قائد الفريق</h2>
      <p className="wf-muted wf-small">
        يعيّن مدير المنصة قائدًا لهذا المشروع بعينه. المؤسسة لا تختار القائد. يمكن للقائد التقديم كطالب على مشاريع أخرى.
      </p>
      {project.leader ? (
        <div className="wf-actions" style={{ justifyContent: "space-between", margin: "8px 0 12px" }}>
          <span>القائد الحالي: <b>{project.leader.name}</b></span>
          <button type="button" className="wf-btn wf-btn-danger wf-btn-sm" onClick={revoke} disabled={busy}>إلغاء التعيين</button>
        </div>
      ) : (
        <p className="wf-alert wf-alert-warning">لم يُعيَّن قائد بعد.</p>
      )}

      {project.status === "published" ? (
        <>
          <form className="wf-row" onSubmit={find} role="search">
            <input className="wf-input" type="search" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="ابحث باسم الطالب أو بريده" aria-label="بحث عن مرشح للقيادة" />
            <button type="submit" className="wf-btn wf-btn-light" disabled={busy}><Search size={16} aria-hidden="true" /> بحث</button>
          </form>
          {candidates && candidates.length === 0 && <p className="wf-empty">لا يوجد طلاب مطابقون.</p>}
          {candidates && candidates.length > 0 && (
            <ul className="wf-list">
              {candidates.map((candidate) => (
                <li key={candidate.id}>
                  <div className="wf-list-main">
                    <b>{candidate.name}</b>
                    <span className="wf-muted wf-small">
                      {candidate.email}
                      {candidate.university ? ` · ${candidate.university}` : ""}
                      {` · مهارات مثبتة: ${candidate.eligibility.verified_skills}`}
                    </span>
                    <EligibilityChecks eligibility={candidate.eligibility} />
                  </div>
                  <button
                    type="button"
                    className="wf-btn wf-btn-sm"
                    aria-pressed={selected?.id === candidate.id}
                    disabled={busy || candidate.eligibility.blocked || project.leader?.id === candidate.id}
                    onClick={() => setSelected(candidate)}
                  >
                    {candidate.eligibility.blocked ? "تعارض" : selected?.id === candidate.id ? "مختار" : "اختيار"}
                  </button>
                </li>
              ))}
            </ul>
          )}
          {selected && (
            <div className="wf-card" style={{ background: "var(--wf-soft)" }}>
              <p>تعيين <b>{selected.name}</b> {project.leader ? `بدلًا من ${project.leader.name}` : ""}.</p>
              {needsJustification && (
                <div className="wf-field">
                  <label htmlFor="justification">مبرر تجاوز معايير القيادة غير المستوفاة (إلزامي)</label>
                  <textarea id="justification" className="wf-textarea" value={justification} onChange={(e) => setJustification(e.target.value)} maxLength={1000} />
                </div>
              )}
              <div className="wf-actions">
                <button type="button" className="wf-btn" onClick={assign} disabled={busy || (needsJustification && justification.trim().length < 15)}>تأكيد التعيين</button>
                <button type="button" className="wf-btn wf-btn-light" onClick={() => setSelected(null)}>إلغاء</button>
              </div>
            </div>
          )}
        </>
      ) : (
        <p className="wf-muted wf-small">يُعيَّن القائد بعد قبول المشروع ونشره.</p>
      )}

      {message && <p className={`wf-alert wf-alert-${message.tone}`} role={message.tone === "danger" ? "alert" : "status"}>{message.text}</p>}

      {project.leader_history?.length > 0 && (
        <>
          <h3>سجل التعيينات</h3>
          <div className="wf-table-wrap">
            <table className="wf-table">
              <thead><tr><th>القائد</th><th>عُيّن</th><th>بواسطة</th><th>الحالة</th></tr></thead>
              <tbody>
                {project.leader_history.map((entry) => (
                  <tr key={entry.id}>
                    <td>{entry.leader.name}{entry.override_justification && <div className="wf-muted wf-small">استثناء: {entry.override_justification}</div>}</td>
                    <td>{formatDate(entry.assigned_at)}</td>
                    <td>{entry.assigned_by || "—"}</td>
                    <td>{entry.active ? <span className="wf-pill wf-pill-success">سارٍ</span> : <span className="wf-muted wf-small">أُلغي {formatDate(entry.revoked_at)} ({entry.revocation_reason === "replaced" ? "استُبدل" : entry.revocation_reason})</span>}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </section>
  );
}

export default function AdminProjectReview() {
  const { projectId } = useParams();
  const [project, setProject] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);
  const [flash, setFlash] = useState(null);

  const load = useCallback(async () => {
    setError("");
    try {
      setProject(await getAdminProject(projectId));
    } catch (err) {
      setError(err.status === 404 ? "المشروع غير موجود." : err.message);
    } finally {
      setLoading(false);
    }
  }, [projectId]);

  useEffect(() => {
    let active = true;
    getAdminProject(projectId)
      .then((data) => active && setProject(data))
      .catch((err) => active && setError(err.status === 404 ? "المشروع غير موجود." : err.message))
      .finally(() => active && setLoading(false));
    return () => {
      active = false;
    };
  }, [projectId]);

  const decide = async (decision) => {
    if (NOTE_REQUIRED.includes(decision) && note.trim() === "") {
      setFlash({ tone: "danger", text: "اكتب سبب القرار في خانة الملاحظة ليصل إلى المؤسسة." });
      return;
    }
    const confirmation = await showAlert({
      icon: "question",
      title: `${REVIEW_ACTION_LABELS[decision]}؟`,
      text: decision === "approve" ? "سيظهر المشروع للطلاب المؤهلين ويمكن تعيين قائد الفريق." : "سيصل القرار والملاحظة إلى المؤسسة.",
      showCancelButton: true,
      confirmButtonText: "تأكيد",
      cancelButtonText: "تراجع",
    });
    if (!confirmation.isConfirmed) return;
    setBusy(true);
    setFlash(null);
    try {
      await reviewProject(projectId, decision, note.trim());
      setNote("");
      setFlash({ tone: "success", text: "تم تسجيل القرار." });
      await load();
    } catch (err) {
      setFlash({ tone: "danger", text: err.message });
    } finally {
      setBusy(false);
    }
  };

  if (loading) return <main className="wf-page"><div className="wf-skeleton" /><div className="wf-skeleton" /></main>;
  if (error || !project) {
    return (
      <main className="wf-page">
        <div className="wf-alert wf-alert-danger" role="alert"><AlertTriangle size={18} aria-hidden="true" /> {error}</div>
        <Link className="wf-btn wf-btn-light" to="/admin/dashboard">العودة للوحة الإدارة</Link>
      </main>
    );
  }

  const status = PUBLICATION_STATUSES[project.status] || { label: project.status, tone: "neutral" };
  const proposal = project.proposal || {};
  const actions = reviewActions(project.status);

  return (
    <main className="wf-page">
      <Link className="wf-back" to="/admin/dashboard"><ArrowRight size={16} aria-hidden="true" /> لوحة الإدارة</Link>
      <header className="wf-card">
        <div className="wf-actions" style={{ marginBottom: 8 }}>
          <span className={`wf-pill wf-pill-${status.tone}`}>{status.label}</span>
          {project.status === "published" && <span className="wf-pill">{PROJECT_STAGES[project.project_status]}</span>}
          <span className="wf-pill">النسخة {project.version}</span>
        </div>
        <h1>{project.title}</h1>
        <p className="wf-muted">{project.organization?.name} · {project.organization_contact?.name} ({project.organization_contact?.email})</p>
        {project.summary && <p>{project.summary}</p>}
        {project.review_note && <p className="wf-alert wf-alert-info">آخر ملاحظة: {project.review_note}</p>}
      </header>

      {flash && <p className={`wf-alert wf-alert-${flash.tone}`} role={flash.tone === "danger" ? "alert" : "status"}>{flash.text}</p>}

      <div className="wf-grid">
        <section className="wf-card" aria-labelledby="proposal-title">
          <h2 id="proposal-title">المقترح المعتمد من المؤسسة</h2>
          <dl className="wf-money">
            {typeof proposal.estimated_cost === "string" && <div><dt>التكلفة التقديرية</dt><dd>{proposal.estimated_cost}</dd></div>}
            {typeof proposal.estimated_duration === "string" && <div><dt>المدة التقديرية</dt><dd>{proposal.estimated_duration}</dd></div>}
            <div><dt>طلبات الانضمام</dt><dd>{project.applications_count}</dd></div>
          </dl>
          <h3 style={{ marginTop: 12 }}>الأدوار المطلوبة</h3>
          <ul className="wf-list">
            {(project.roles || []).map((role) => (
              <li key={role.id}>
                <div className="wf-list-main">
                  <b>{role.title} × {role.headcount}</b>
                  <span className="wf-muted wf-small">
                    {role.skills.filter((s) => s.importance === "mandatory").map((s) => `${s.name}${s.min_level ? ` (${s.min_level})` : ""}`).join("، ")}
                  </span>
                </div>
              </li>
            ))}
          </ul>
        </section>

        <section className="wf-card" aria-labelledby="decision-title">
          <h2 id="decision-title">قرار المراجعة</h2>
          {actions.length === 0 ? (
            <p className="wf-muted">لا توجد قرارات متاحة في هذه الحالة.</p>
          ) : (
            <>
              <div className="wf-field">
                <label htmlFor="review-note">ملاحظة للمؤسسة (إلزامية للرفض وطلب التعديل والتعليق والسحب)</label>
                <textarea id="review-note" className="wf-textarea" value={note} onChange={(e) => setNote(e.target.value)} maxLength={2000} />
              </div>
              <div className="wf-actions">
                {actions.map((action) => (
                  <button
                    key={action}
                    type="button"
                    className={`wf-btn ${action === "approve" || action === "republish" ? "" : action === "request_changes" ? "wf-btn-light" : "wf-btn-danger"}`}
                    disabled={busy}
                    onClick={() => decide(action)}
                  >
                    {REVIEW_ACTION_LABELS[action]}
                  </button>
                ))}
              </div>
            </>
          )}
          {project.plan && (
            <p className="wf-muted wf-small" style={{ marginTop: 12 }}>
              خطة التنفيذ: {project.plan.versions} نسخة{project.plan.agreed_at ? ` · متفق عليها في ${formatDate(project.plan.agreed_at)}` : ""}
              {project.plan.versions > 0 && <> · <Link to={`/projects/${project.id}/plan`}>عرض الخطة</Link></>}
              {["in_progress", "completed"].includes(project.project_status) && <> · <Link to={`/projects/${project.id}/execution`}>متابعة التنفيذ</Link></>}
            </p>
          )}
        </section>
      </div>

      <LeaderAssignment project={project} onChanged={load} />

      {project.audit?.length > 0 && (
        <section className="wf-card" aria-labelledby="audit-title">
          <h2 id="audit-title">سجل التدقيق</h2>
          <ul className="wf-list">
            {project.audit.map((entry, index) => (
              <li key={index}>
                <span className="wf-hash">{entry.action}</span>
                <span className="wf-muted wf-small">{entry.actor || "النظام"} · {formatDate(entry.created_at)}</span>
              </li>
            ))}
          </ul>
        </section>
      )}
    </main>
  );
}
