import { useCallback, useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { AlertTriangle, ArrowRight, CheckCircle2, ExternalLink, Flag, Plus, Send, Star } from "lucide-react";
import {
  completeProject,
  createProjectTask,
  evaluateTeamMember,
  getExecutionWorkspace,
  reviewTaskDeliverable,
  submitClientFeedback,
  submitTaskDeliverable,
  updateProjectMilestone,
  updateProjectTask,
} from "../services/workflowService";
import {
  DELIVERABLE_STATUSES,
  EVALUATION_CRITERIA,
  MANUAL_TASK_STATUSES,
  MILESTONE_STATUSES,
  PROJECT_STAGES,
  TASK_PRIORITIES,
  TASK_STATUSES,
  averageScore,
  completionBlockers,
  emptyTask,
  fieldErrors,
  formatDate,
  groupTasksByMilestone,
  taskPayload,
} from "../utils/workflow";
import { showAlert } from "../utils/alerts";
import "../styles/Workflow.css";

const ROLE_LABELS = { leader: "قائد الفريق", member: "عضو الفريق", organization: "المؤسسة", admin: "إدارة المنصة" };

function Pill({ map, value }) {
  const entry = map[value];
  return <span className={`wf-pill wf-pill-${entry?.tone || "neutral"}`}>{entry?.label || value}</span>;
}

function TaskForm({ milestones, members, busy, onCreate }) {
  const [form, setForm] = useState(emptyTask());
  const [errors, setErrors] = useState({});
  const set = (key, value) => setForm((f) => ({ ...f, [key]: value }));

  const submit = async (event) => {
    event.preventDefault();
    setErrors({});
    const result = await onCreate(taskPayload(form));
    if (result?.errors) setErrors(fieldErrors(result.errors));
    else if (!result) setForm(emptyTask());
  };

  return (
    <form onSubmit={submit} noValidate>
      <div className="wf-field">
        <label htmlFor="task-title">عنوان المهمة</label>
        <input id="task-title" className="wf-input" value={form.title} onChange={(e) => set("title", e.target.value)} maxLength={200} />
        {errors.title && <span className="wf-error">{errors.title}</span>}
      </div>
      <div className="wf-field">
        <label htmlFor="task-description">الوصف</label>
        <textarea id="task-description" className="wf-textarea" style={{ minHeight: 60 }} value={form.description} onChange={(e) => set("description", e.target.value)} maxLength={5000} />
      </div>
      <div className="wf-grid">
        <div className="wf-field">
          <label htmlFor="task-assignee">المسؤول</label>
          <select id="task-assignee" className="wf-select" value={form.assignee_member_id} onChange={(e) => set("assignee_member_id", e.target.value)}>
            <option value="">غير مسندة بعد</option>
            {members.map((m) => <option key={m.id} value={m.id}>{m.name} — {m.role}</option>)}
          </select>
          {errors.assignee_member_id && <span className="wf-error">{errors.assignee_member_id}</span>}
        </div>
        <div className="wf-field">
          <label htmlFor="task-milestone">المرحلة</label>
          <select id="task-milestone" className="wf-select" value={form.milestone_id} onChange={(e) => set("milestone_id", e.target.value)}>
            <option value="">بلا مرحلة</option>
            {milestones.map((m) => <option key={m.id} value={m.id}>{m.position}. {m.title}</option>)}
          </select>
          {errors.milestone_id && <span className="wf-error">{errors.milestone_id}</span>}
        </div>
        <div className="wf-field">
          <label htmlFor="task-priority">الأولوية</label>
          <select id="task-priority" className="wf-select" value={form.priority} onChange={(e) => set("priority", e.target.value)}>
            {Object.entries(TASK_PRIORITIES).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
          </select>
        </div>
        <div className="wf-field">
          <label htmlFor="task-due">الموعد</label>
          <input id="task-due" type="date" className="wf-input" value={form.due_date} onChange={(e) => set("due_date", e.target.value)} />
          {errors.due_date && <span className="wf-error">{errors.due_date}</span>}
        </div>
      </div>
      <button type="submit" className="wf-btn" disabled={busy || !form.title.trim()}><Plus size={16} aria-hidden="true" /> إضافة المهمة</button>
    </form>
  );
}

function DeliverableForm({ taskId, busy, onSubmit }) {
  const [url, setUrl] = useState("");
  const [notes, setNotes] = useState("");
  const [errors, setErrors] = useState({});

  const submit = async (event) => {
    event.preventDefault();
    setErrors({});
    const result = await onSubmit({ reference_url: url.trim() || null, notes: notes.trim() });
    if (result?.errors) setErrors(fieldErrors(result.errors));
  };

  return (
    <form className="wf-subcard" onSubmit={submit} noValidate>
      <div className="wf-field">
        <label htmlFor={`deliverable-url-${taskId}`}>رابط التسليم (مستودع، ملف، عرض…)</label>
        <input id={`deliverable-url-${taskId}`} className="wf-input" dir="ltr" type="url" placeholder="https://" value={url} onChange={(e) => setUrl(e.target.value)} maxLength={2048} />
        {errors.reference_url && <span className="wf-error">{errors.reference_url}</span>}
      </div>
      <div className="wf-field">
        <label htmlFor={`deliverable-notes-${taskId}`}>ماذا أنجزت؟</label>
        <textarea id={`deliverable-notes-${taskId}`} className="wf-textarea" style={{ minHeight: 60 }} value={notes} onChange={(e) => setNotes(e.target.value)} maxLength={5000} />
        {errors.notes && <span className="wf-error">{errors.notes}</span>}
      </div>
      <button type="submit" className="wf-btn wf-btn-sm" disabled={busy || notes.trim().length < 5}><Send size={14} aria-hidden="true" /> إرسال للمراجعة</button>
    </form>
  );
}

function ReviewForm({ deliverable, busy, onReview }) {
  const [feedback, setFeedback] = useState("");
  return (
    <div className="wf-subcard">
      <div className="wf-field">
        <label htmlFor={`review-${deliverable.id}`}>ملاحظاتك (إلزامية عند طلب التعديل)</label>
        <textarea id={`review-${deliverable.id}`} className="wf-textarea" style={{ minHeight: 56 }} value={feedback} onChange={(e) => setFeedback(e.target.value)} maxLength={3000} />
      </div>
      <div className="wf-actions">
        <button type="button" className="wf-btn wf-btn-sm" disabled={busy} onClick={() => onReview(deliverable.id, "accept", feedback)}>قبول التسليم</button>
        <button type="button" className="wf-btn wf-btn-light wf-btn-sm" disabled={busy || !feedback.trim()} onClick={() => onReview(deliverable.id, "request_revision", feedback)}>طلب تعديل</button>
      </div>
    </div>
  );
}

function TaskItem({ task, members, workspace, busy, actions }) {
  const { permissions, my_member_id: myMemberId, viewer_role: role } = workspace;
  const mine = myMemberId && task.assignee_member_id === myMemberId;
  const canSubmit = permissions.submit && mine && ["todo", "in_progress", "changes_requested"].includes(task.status);
  const pending = task.deliverables.find((d) => d.status === "pending_review");

  return (
    <li className="wf-task">
      <div className="wf-task-head">
        <div className="wf-list-main">
          <b>{task.title}</b>
          <span className="wf-muted wf-small">
            {task.assignee_name || "غير مسندة"} · أولوية {TASK_PRIORITIES[task.priority]}
            {task.due_date ? ` · الموعد ${formatDate(task.due_date)}` : ""}
          </span>
        </div>
        <Pill map={TASK_STATUSES} value={task.status} />
      </div>
      {task.description && <p className="wf-small" style={{ whiteSpace: "pre-wrap", margin: "6px 0" }}>{task.description}</p>}

      {permissions.manage && (
        <div className="wf-actions wf-small" style={{ marginTop: 6 }}>
          <label className="wf-inline">
            الحالة
            <select className="wf-select wf-select-sm" value={MANUAL_TASK_STATUSES.includes(task.status) ? task.status : ""} disabled={busy || task.status === "in_review"}
              onChange={(e) => e.target.value && actions.updateTask(task.id, { status: e.target.value })}>
              {!MANUAL_TASK_STATUSES.includes(task.status) && <option value="">{TASK_STATUSES[task.status]?.label}</option>}
              {MANUAL_TASK_STATUSES.map((s) => <option key={s} value={s}>{TASK_STATUSES[s].label}</option>)}
            </select>
          </label>
          <label className="wf-inline">
            المسؤول
            <select className="wf-select wf-select-sm" value={task.assignee_member_id ?? ""} disabled={busy}
              onChange={(e) => actions.updateTask(task.id, { assignee_member_id: e.target.value ? Number(e.target.value) : null })}>
              <option value="">غير مسندة</option>
              {members.map((m) => <option key={m.id} value={m.id}>{m.name}</option>)}
            </select>
          </label>
        </div>
      )}

      {task.deliverables.length > 0 && (
        <ul className="wf-deliverables">
          {task.deliverables.map((d) => (
            <li key={d.id}>
              <div className="wf-actions">
                <span className="wf-small"><b>التسليم {d.revision}</b> · {formatDate(d.submitted_at)}</span>
                <Pill map={DELIVERABLE_STATUSES} value={d.status} />
                {d.reference_url && (
                  <a className="wf-link" href={d.reference_url} target="_blank" rel="noopener noreferrer nofollow">
                    فتح الرابط <ExternalLink size={13} aria-hidden="true" />
                  </a>
                )}
              </div>
              <p className="wf-small" style={{ whiteSpace: "pre-wrap", margin: "4px 0" }}>{d.notes}</p>
              {d.feedback && <p className="wf-small wf-feedback">ملاحظات القائد{d.reviewed_by ? ` (${d.reviewed_by})` : ""}: {d.feedback}</p>}
            </li>
          ))}
        </ul>
      )}

      {permissions.manage && pending && role === "leader" && <ReviewForm deliverable={pending} busy={busy} onReview={actions.review} />}
      {canSubmit && <DeliverableForm taskId={task.id} busy={busy} onSubmit={(data) => actions.submit(task.id, data)} />}
      {mine && task.status === "in_review" && <p className="wf-muted wf-small">تسليمك بانتظار مراجعة قائد الفريق.</p>}
    </li>
  );
}

function EvaluationForm({ member, busy, onEvaluate }) {
  const [criteria, setCriteria] = useState(() => Object.fromEntries(Object.keys(EVALUATION_CRITERIA).map((k) => [k, 0])));
  const [comments, setComments] = useState("");
  const [errors, setErrors] = useState({});
  const ready = Object.values(criteria).every((v) => v >= 1) && comments.trim().length >= 10;

  const submit = async (event) => {
    event.preventDefault();
    setErrors({});
    const result = await onEvaluate({ member_id: member.id, criteria, comments: comments.trim() });
    if (result?.errors) setErrors(fieldErrors(result.errors));
  };

  return (
    <form className="wf-subcard" onSubmit={submit} noValidate>
      <div className="wf-grid">
        {Object.entries(EVALUATION_CRITERIA).map(([key, label]) => (
          <div className="wf-field" key={key}>
            <label htmlFor={`eval-${member.id}-${key}`}>{label}</label>
            <select id={`eval-${member.id}-${key}`} className="wf-select" value={criteria[key]} onChange={(e) => setCriteria((c) => ({ ...c, [key]: Number(e.target.value) }))}>
              <option value={0}>اختر</option>
              {[1, 2, 3, 4, 5].map((n) => <option key={n} value={n}>{n} من 5</option>)}
            </select>
            {errors[`criteria.${key}`] && <span className="wf-error">{errors[`criteria.${key}`]}</span>}
          </div>
        ))}
      </div>
      <div className="wf-field">
        <label htmlFor={`eval-${member.id}-comments`}>تقييم نوعي</label>
        <textarea id={`eval-${member.id}-comments`} className="wf-textarea" style={{ minHeight: 60 }} value={comments} onChange={(e) => setComments(e.target.value)} maxLength={3000} />
        {errors.comments && <span className="wf-error">{errors.comments}</span>}
      </div>
      <div className="wf-actions">
        <button type="submit" className="wf-btn wf-btn-sm" disabled={busy || !ready}>تسجيل التقييم</button>
        {averageScore(criteria) > 0 && <span className="wf-muted wf-small">المتوسط: {averageScore(criteria)} من 5</span>}
      </div>
    </form>
  );
}

function EvaluationView({ evaluation }) {
  return (
    <div className="wf-subcard">
      <p className="wf-small" style={{ margin: 0 }}><Star size={14} aria-hidden="true" /> <b>{evaluation.overall_score} من 5</b></p>
      <ul className="wf-checks">
        {Object.entries(evaluation.criteria || {}).map(([key, value]) => <li key={key}>{EVALUATION_CRITERIA[key] || key}: {value}/5</li>)}
      </ul>
      <p className="wf-small" style={{ whiteSpace: "pre-wrap", marginBottom: 0 }}>{evaluation.comments}</p>
    </div>
  );
}

function FeedbackForm({ busy, onSubmit }) {
  const [form, setForm] = useState({ satisfaction_score: 0, leader_score: 0, would_recommend: true, comments: "" });
  const [errors, setErrors] = useState({});
  const set = (key, value) => setForm((f) => ({ ...f, [key]: value }));

  const submit = async (event) => {
    event.preventDefault();
    setErrors({});
    const result = await onSubmit({ ...form, leader_score: form.leader_score || null, comments: form.comments.trim() });
    if (result?.errors) setErrors(fieldErrors(result.errors));
  };

  return (
    <form onSubmit={submit} noValidate>
      <div className="wf-grid">
        <div className="wf-field">
          <label htmlFor="fb-satisfaction">رضاكم عن نتيجة المشروع</label>
          <select id="fb-satisfaction" className="wf-select" value={form.satisfaction_score} onChange={(e) => set("satisfaction_score", Number(e.target.value))}>
            <option value={0}>اختر</option>
            {[1, 2, 3, 4, 5].map((n) => <option key={n} value={n}>{n} من 5</option>)}
          </select>
          {errors.satisfaction_score && <span className="wf-error">{errors.satisfaction_score}</span>}
        </div>
        <div className="wf-field">
          <label htmlFor="fb-leader">تقييم قائد الفريق (اختياري)</label>
          <select id="fb-leader" className="wf-select" value={form.leader_score} onChange={(e) => set("leader_score", Number(e.target.value))}>
            <option value={0}>بدون</option>
            {[1, 2, 3, 4, 5].map((n) => <option key={n} value={n}>{n} من 5</option>)}
          </select>
        </div>
        <div className="wf-field">
          <label htmlFor="fb-recommend">هل توصون بالفريق؟</label>
          <select id="fb-recommend" className="wf-select" value={form.would_recommend ? "1" : "0"} onChange={(e) => set("would_recommend", e.target.value === "1")}>
            <option value="1">نعم</option>
            <option value="0">لا</option>
          </select>
        </div>
      </div>
      <div className="wf-field">
        <label htmlFor="fb-comments">رأيكم في المشروع والفريق</label>
        <textarea id="fb-comments" className="wf-textarea" value={form.comments} onChange={(e) => set("comments", e.target.value)} maxLength={3000} />
        {errors.comments && <span className="wf-error">{errors.comments}</span>}
      </div>
      <button type="submit" className="wf-btn" disabled={busy || !form.satisfaction_score || form.comments.trim().length < 10}>إرسال التقييم النهائي</button>
    </form>
  );
}

export default function ProjectExecutionWorkspace() {
  const { projectId } = useParams();
  const [workspace, setWorkspace] = useState(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [flash, setFlash] = useState(null);

  const loadError = (err) => (err.status === 404 ? "المشروع غير موجود أو ليست لديك صلاحية الوصول إلى مساحة تنفيذه." : err.message);

  const load = useCallback(async () => {
    try {
      setWorkspace(await getExecutionWorkspace(projectId));
      setError("");
    } catch (err) {
      setError(loadError(err));
    }
  }, [projectId]);

  useEffect(() => {
    let active = true;
    getExecutionWorkspace(projectId)
      .then((data) => active && setWorkspace(data))
      .catch((err) => active && setError(loadError(err)));
    return () => {
      active = false;
    };
  }, [projectId]);

  // يعيد null عند النجاح أو { errors } عند الفشل ليعرض النموذج أخطاء حقوله
  const run = async (action, success) => {
    setBusy(true);
    setFlash(null);
    try {
      const data = await action();
      if (data?.project) setWorkspace(data);
      else await load();
      if (success) setFlash({ tone: "success", text: success });
      return null;
    } catch (err) {
      setFlash({ tone: "danger", text: err.message });
      if (err.status === 409) await load();
      return { errors: err.errors };
    } finally {
      setBusy(false);
    }
  };

  const actions = {
    updateTask: (taskId, changes) => run(() => updateProjectTask(projectId, taskId, changes), "تم تحديث المهمة."),
    submit: (taskId, data) => run(() => submitTaskDeliverable(projectId, taskId, data), "أُرسل التسليم لقائد الفريق."),
    review: (deliverableId, decision, feedback) => {
      if (decision === "request_revision" && !feedback.trim()) {
        setFlash({ tone: "danger", text: "اكتب التعديلات المطلوبة ليعرفها العضو." });
        return null;
      }
      return run(() => reviewTaskDeliverable(projectId, deliverableId, decision, feedback.trim()), decision === "accept" ? "تم قبول التسليم." : "أُرسل طلب التعديل للعضو.");
    },
  };

  const complete = async () => {
    const confirmation = await showAlert({
      icon: "question",
      title: "إعلان اكتمال المشروع؟",
      text: "يُغلق التنفيذ وتُضاف مشاركة الفريق إلى سجلات أدلة الخبرة، ثم يمكنك تقييم الأعضاء وتقييم المؤسسة للمشروع.",
      showCancelButton: true,
      confirmButtonText: "تأكيد الإكمال",
      cancelButtonText: "تراجع",
    });
    if (confirmation.isConfirmed) await run(() => completeProject(projectId), "اكتمل المشروع.");
  };

  if (error) {
    return (
      <main className="wf-page">
        <p className="wf-alert wf-alert-danger" role="alert"><AlertTriangle size={18} aria-hidden="true" /> {error}</p>
      </main>
    );
  }
  if (!workspace) return <main className="wf-page" aria-busy="true"><div className="wf-skeleton" /><div className="wf-skeleton" /></main>;

  const { project, progress, permissions, team, milestones, tasks, viewer_role: role } = workspace;
  const members = team?.members || [];
  const groups = groupTasksByMilestone(milestones, tasks);
  const blockers = completionBlockers(milestones, tasks);
  const started = ["in_progress", "completed"].includes(project.project_status);
  const back = role === "leader" ? `/student/leading/${project.id}` : role === "member" ? "/student/projects" : role === "organization" ? `/organization/projects/${project.id}` : `/admin/projects/${project.id}`;

  return (
    <main className="wf-page">
      <Link className="wf-back" to={back}><ArrowRight size={16} aria-hidden="true" /> العودة</Link>
      <header className="wf-card">
        <div className="wf-actions" style={{ marginBottom: 8 }}>
          <span className={`wf-pill ${project.project_status === "completed" ? "wf-pill-success" : "wf-pill-info"}`}>{PROJECT_STAGES[project.project_status]}</span>
          <span className="wf-pill">أنت: {ROLE_LABELS[role]}</span>
          {project.agreed_plan_version && <Link className="wf-pill" to={`/projects/${project.id}/plan`}>الخطة المتفق عليها (النسخة {project.agreed_plan_version})</Link>}
        </div>
        <h1>تنفيذ المشروع — {project.title}</h1>
        <p className="wf-muted">
          {project.organization_name} · قائد الفريق: {project.leader?.name || "غير معيّن"}
          {project.timeline ? ` · ${formatDate(project.timeline.start_date)} — ${formatDate(project.timeline.end_date)}` : ""}
        </p>
        {!started && <p className="wf-alert wf-alert-info">لم يبدأ التنفيذ بعد. يبدأ بعد اتفاق القائد والمؤسسة على الخطة وتأكيد الفريق.</p>}
      </header>

      {started && (
        <section className="wf-stats" aria-label="مؤشرات التقدم">
          <div className="wf-stat"><span>التقدم الكلي</span><b>{progress.percent}%</b>
            <div className="wf-progress" role="progressbar" aria-valuenow={progress.percent} aria-valuemin={0} aria-valuemax={100} aria-label="نسبة التقدم"><span style={{ width: `${progress.percent}%` }} /></div>
          </div>
          <div className="wf-stat"><span>المهام المنجزة</span><b>{progress.tasks_done}/{progress.tasks_total}</b></div>
          <div className="wf-stat"><span>المراحل المكتملة</span><b>{progress.milestones_completed}/{progress.milestones_total}</b></div>
          <div className="wf-stat"><span>بانتظار المراجعة</span><b>{progress.tasks_in_review}</b></div>
        </section>
      )}

      {flash && <p className={`wf-alert wf-alert-${flash.tone}`} role={flash.tone === "danger" ? "alert" : "status"}>{flash.text}</p>}

      {permissions.manage && (
        <section className="wf-card" aria-labelledby="new-task-title">
          <h2 id="new-task-title">مهمة جديدة</h2>
          {members.length === 0 && <p className="wf-muted wf-small">لا يوجد أعضاء في الفريق لإسناد المهام إليهم.</p>}
          <TaskForm milestones={milestones} members={members} busy={busy} onCreate={(task) => run(() => createProjectTask(projectId, task), "أُضيفت المهمة.")} />
        </section>
      )}

      {started && (
        <section className="wf-card" aria-labelledby="board-title">
          <h2 id="board-title">المراحل والمهام</h2>
          {groups.length === 0 && <p className="wf-empty">لا توجد مراحل أو مهام بعد.</p>}
          {groups.map(({ milestone, tasks: items }) => (
            <div className="wf-milestone" key={milestone?.id ?? "loose"}>
              <div className="wf-task-head">
                <div className="wf-list-main">
                  <b><Flag size={14} aria-hidden="true" /> {milestone ? `${milestone.position}. ${milestone.title}` : "مهام بلا مرحلة"}</b>
                  {milestone && <span className="wf-muted wf-small">الموعد {formatDate(milestone.due_date)}{milestone.description ? ` · ${milestone.description}` : ""}</span>}
                </div>
                {milestone && (permissions.manage ? (
                  <select className="wf-select wf-select-sm" aria-label={`حالة المرحلة ${milestone.title}`} value={milestone.status} disabled={busy}
                    onChange={(e) => run(() => updateProjectMilestone(projectId, milestone.id, e.target.value), "تم تحديث المرحلة.")}>
                    {Object.entries(MILESTONE_STATUSES).map(([value, s]) => <option key={value} value={value}>{s.label}</option>)}
                  </select>
                ) : <Pill map={MILESTONE_STATUSES} value={milestone.status} />)}
              </div>
              {items.length === 0 ? <p className="wf-muted wf-small">لا مهام في هذه المرحلة.</p> : (
                <ul className="wf-tasks">
                  {items.map((task) => <TaskItem key={task.id} task={task} members={members} workspace={workspace} busy={busy} actions={actions} />)}
                </ul>
              )}
            </div>
          ))}
        </section>
      )}

      {permissions.complete && (
        <section className="wf-card" aria-labelledby="complete-title">
          <h2 id="complete-title">إكمال المشروع</h2>
          {blockers.length > 0 ? (
            <ul className="wf-checks">{blockers.map((b) => <li key={b} className="wf-check-no"><AlertTriangle size={14} aria-hidden="true" /> {b}</li>)}</ul>
          ) : <p className="wf-alert wf-alert-success"><CheckCircle2 size={16} aria-hidden="true" /> كل المهام مغلقة وكل المراحل مكتملة.</p>}
          <button type="button" className="wf-btn" onClick={complete} disabled={busy || blockers.length > 0}>إعلان اكتمال المشروع</button>
        </section>
      )}

      {team && (
        <section className="wf-card" aria-labelledby="team-title">
          <h2 id="team-title">الفريق</h2>
          <ul className="wf-list">
            {members.map((member) => (
              <li key={member.id} style={{ display: "block" }}>
                <div className="wf-task-head">
                  <div className="wf-list-main"><b>{member.name}</b><span className="wf-muted wf-small">{member.role}</span></div>
                  {member.evaluation && <span className="wf-pill wf-pill-success">قُيّم: {member.evaluation.overall_score}/5</span>}
                </div>
                {member.evaluation && <EvaluationView evaluation={member.evaluation} />}
                {permissions.evaluate && !member.evaluated && (
                  <EvaluationForm member={member} busy={busy} onEvaluate={(data) => run(() => evaluateTeamMember(projectId, data), `تم تسجيل تقييم ${member.name}.`)} />
                )}
              </li>
            ))}
          </ul>
        </section>
      )}

      {(permissions.feedback || workspace.client_feedback) && (
        <section className="wf-card" aria-labelledby="feedback-title">
          <h2 id="feedback-title">التقييم النهائي من المؤسسة</h2>
          {workspace.client_feedback ? (
            <div>
              <p><b>الرضا: {workspace.client_feedback.satisfaction_score}/5</b>{workspace.client_feedback.leader_score ? ` · قائد الفريق: ${workspace.client_feedback.leader_score}/5` : ""} · {workspace.client_feedback.would_recommend ? "توصي بالفريق" : "لا توصي بالفريق"}</p>
              <p style={{ whiteSpace: "pre-wrap" }}>{workspace.client_feedback.comments}</p>
            </div>
          ) : <FeedbackForm busy={busy} onSubmit={(data) => run(() => submitClientFeedback(projectId, data), "شكرًا لتقييمكم.")} />}
        </section>
      )}
    </main>
  );
}
