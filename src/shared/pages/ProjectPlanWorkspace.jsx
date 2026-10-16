import { useCallback, useEffect, useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { AlertTriangle, ArrowRight, CheckCircle2, Plus, Rocket, Trash2 } from "lucide-react";
import {
  commentOnPlanVersion,
  decidePlanVersion,
  getPlanWorkspace,
  savePlanDraft,
  startProjectExecution,
  submitPlanVersion,
} from "../services/workflowService";
import {
  PLAN_STATUSES,
  PROJECT_STAGES,
  emptyPlan,
  fieldErrors,
  financialPreview,
  formatDate,
  formatMoney,
  paymentTotal,
  planFormFrom,
  planPayload,
} from "../utils/workflow";
import { showAlert } from "../utils/alerts";
import "../styles/Workflow.css";

const ROLE_LABELS = { leader: "قائد الفريق", organization: "المؤسسة", admin: "إدارة المنصة" };

function Money({ content }) {
  const f = content.financials || {};
  const currency = content.currency;
  return (
    <dl className="wf-money">
      <div><dt>ميزانية التنفيذ (للفريق)</dt><dd>{formatMoney(f.execution_budget, currency)}</dd></div>
      <div><dt>عمولة المنصة ({Math.round((f.platform_commission_rate || 0) * 1000) / 10}%)</dt><dd>{formatMoney(f.platform_commission, currency)}</dd></div>
      <div><dt>رسوم خدمة جمع المتطلبات</dt><dd>{formatMoney(f.requirements_gathering_fee, currency)}</dd></div>
      <div className="wf-total"><dt>الإجمالي على المؤسسة</dt><dd>{formatMoney(f.organization_total, currency)}</dd></div>
    </dl>
  );
}

function PlanView({ version }) {
  const c = version.content;
  return (
    <div>
      <h3>النطاق</h3>
      <p style={{ whiteSpace: "pre-wrap" }}>{c.scope}</p>
      <div className="wf-grid">
        <div>
          <h3>المخرجات</h3>
          <ul>{c.deliverables.map((d, i) => <li key={i}><b>{d.title}</b>{d.description ? ` — ${d.description}` : ""}</li>)}</ul>
          <h3>معايير القبول</h3>
          <ul>{c.acceptance_criteria.map((a, i) => <li key={i}>{a}</li>)}</ul>
        </div>
        <div>
          <h3>الميزانية</h3>
          <Money content={c} />
          <h3 style={{ marginTop: 12 }}>جدول الدفعات</h3>
          <ul>{c.payment_schedule.map((p, i) => <li key={i}>{p.label}: {p.percentage}% ({formatMoney(p.amount, c.currency)}){p.due_date ? ` · ${formatDate(p.due_date)}` : ""}</li>)}</ul>
        </div>
      </div>
      <h3>الجدول الزمني</h3>
      <p>{formatDate(c.timeline.start_date)} — {formatDate(c.timeline.end_date)} ({c.timeline.duration_days} يومًا)</p>
      <div className="wf-table-wrap">
        <table className="wf-table">
          <thead><tr><th>المرحلة</th><th>الموعد</th></tr></thead>
          <tbody>{c.milestones.map((m, i) => <tr key={i}><td><b>{m.title}</b>{m.description && <div className="wf-muted wf-small">{m.description}</div>}</td><td>{formatDate(m.due_date)}</td></tr>)}</tbody>
        </table>
      </div>
      {c.sprints.length > 0 && (
        <>
          <h3 style={{ marginTop: 12 }}>السبرنتات</h3>
          <ul>{c.sprints.map((s, i) => <li key={i}>{s.name}: {formatDate(s.start_date)} — {formatDate(s.end_date)}{s.goal ? ` · ${s.goal}` : ""}</li>)}</ul>
        </>
      )}
      {version.content_hash && <p className="wf-hash" title="بصمة محتوى النسخة">SHA-256: {version.content_hash}</p>}
    </div>
  );
}

function RowsEditor({ label, rows, onChange, blank, fields, error, min = 1 }) {
  const update = (index, key, value) => onChange(rows.map((row, i) => (i === index ? { ...row, [key]: value } : row)));
  return (
    <fieldset className="wf-field" style={{ border: 0, padding: 0 }}>
      <legend style={{ fontWeight: 600, marginBottom: 6 }}>{label}</legend>
      {rows.map((row, index) => (
        <div key={index} className="wf-row-3">
          {fields.map((field) => (
            <input
              key={field.key}
              className="wf-input"
              type={field.type || "text"}
              value={row[field.key] ?? ""}
              placeholder={field.placeholder}
              aria-label={`${field.placeholder} ${index + 1}`}
              onChange={(e) => update(index, field.key, e.target.value)}
              {...(field.type === "number" ? { min: 0, step: "0.01" } : {})}
            />
          ))}
          <button type="button" className="wf-btn wf-btn-light wf-btn-sm" aria-label={`حذف ${label} ${index + 1}`} disabled={rows.length <= min} onClick={() => onChange(rows.filter((_, i) => i !== index))}>
            <Trash2 size={14} aria-hidden="true" />
          </button>
        </div>
      ))}
      <button type="button" className="wf-btn wf-btn-light wf-btn-sm" onClick={() => onChange([...rows, { ...blank }])}><Plus size={14} aria-hidden="true" /> إضافة</button>
      {error && <span className="wf-error">{error}</span>}
    </fieldset>
  );
}

function PlanEditor({ initial, settings, busy, onSave }) {
  const [form, setForm] = useState(initial);
  const [errors, setErrors] = useState({});

  const set = (key, value) => setForm((f) => ({ ...f, [key]: value }));
  const preview = financialPreview(form.execution_budget, settings.platform_commission_rate, settings.requirements_gathering_fee);
  const total = paymentTotal(form.payment_schedule);
  const errorFor = (prefix) => Object.entries(errors).find(([key]) => key === prefix || key.startsWith(`${prefix}.`))?.[1];

  const submit = async (event) => {
    event.preventDefault();
    setErrors({});
    const result = await onSave(planPayload(form));
    if (result?.errors) setErrors(fieldErrors(result.errors));
  };

  return (
    <form onSubmit={submit} noValidate>
      <div className="wf-field">
        <label htmlFor="plan-scope">النطاق</label>
        <textarea id="plan-scope" className="wf-textarea" value={form.scope} onChange={(e) => set("scope", e.target.value)} maxLength={5000} />
        {errorFor("scope") && <span className="wf-error">{errorFor("scope")}</span>}
      </div>
      <RowsEditor label="المخرجات" rows={form.deliverables} onChange={(v) => set("deliverables", v)} blank={{ title: "", description: "" }}
        fields={[{ key: "title", placeholder: "المخرج" }, { key: "description", placeholder: "وصف مختصر" }]} error={errorFor("deliverables")} />
      <RowsEditor label="معايير القبول" rows={form.acceptance_criteria.map((text) => ({ text }))} onChange={(v) => set("acceptance_criteria", v.map((r) => r.text))} blank={{ text: "" }}
        fields={[{ key: "text", placeholder: "معيار قبول قابل للتحقق" }]} error={errorFor("acceptance_criteria")} />

      <div className="wf-grid">
        <div className="wf-field">
          <label htmlFor="plan-budget">ميزانية التنفيذ (للفريق)</label>
          <input id="plan-budget" className="wf-input" type="number" min="0" step="0.01" value={form.execution_budget} onChange={(e) => set("execution_budget", e.target.value)} />
          {errorFor("execution_budget") && <span className="wf-error">{errorFor("execution_budget")}</span>}
        </div>
        <div className="wf-field">
          <label htmlFor="plan-currency">العملة</label>
          <select id="plan-currency" className="wf-select" value={form.currency} onChange={(e) => set("currency", e.target.value)}>
            {(settings.currencies || ["USD"]).map((c) => <option key={c} value={c}>{c}</option>)}
          </select>
        </div>
        <div className="wf-card" style={{ margin: 0 }} aria-live="polite">
          <dl className="wf-money">
            <div><dt>ميزانية التنفيذ</dt><dd>{formatMoney(preview.execution, form.currency)}</dd></div>
            <div><dt>عمولة المنصة</dt><dd>{formatMoney(preview.commission, form.currency)}</dd></div>
            <div><dt>رسوم جمع المتطلبات</dt><dd>{formatMoney(preview.gathering, form.currency)}</dd></div>
            <div className="wf-total"><dt>الإجمالي على المؤسسة</dt><dd>{formatMoney(preview.total, form.currency)}</dd></div>
          </dl>
          <p className="wf-muted wf-small">معاينة؛ الخادم يحسب البنود النهائية عند الحفظ.</p>
        </div>
      </div>

      <RowsEditor label={`جدول الدفعات (المجموع ${total}%)`} rows={form.payment_schedule} onChange={(v) => set("payment_schedule", v)} blank={{ label: "", percentage: "", due_date: "" }}
        fields={[{ key: "label", placeholder: "الدفعة" }, { key: "percentage", placeholder: "النسبة %", type: "number" }, { key: "due_date", placeholder: "الاستحقاق", type: "date" }]}
        error={errorFor("payment_schedule") || (total !== 100 ? "مجموع النسب يجب أن يساوي 100%." : "")} />

      <div className="wf-grid">
        <div className="wf-field">
          <label htmlFor="plan-start">بداية المشروع</label>
          <input id="plan-start" className="wf-input" type="date" value={form.timeline.start_date} onChange={(e) => set("timeline", { ...form.timeline, start_date: e.target.value })} />
        </div>
        <div className="wf-field">
          <label htmlFor="plan-end">نهاية المشروع</label>
          <input id="plan-end" className="wf-input" type="date" value={form.timeline.end_date} onChange={(e) => set("timeline", { ...form.timeline, end_date: e.target.value })} />
          {errorFor("timeline") && <span className="wf-error">{errorFor("timeline")}</span>}
        </div>
      </div>
      <RowsEditor label="المراحل (Milestones)" rows={form.milestones} onChange={(v) => set("milestones", v)} blank={{ title: "", due_date: "", description: "" }}
        fields={[{ key: "title", placeholder: "المرحلة" }, { key: "due_date", placeholder: "الموعد", type: "date" }, { key: "description", placeholder: "تفاصيل" }]} error={errorFor("milestones")} />
      <RowsEditor label="السبرنتات (اختياري)" min={0} rows={form.sprints} onChange={(v) => set("sprints", v)} blank={{ name: "", start_date: "", end_date: "", goal: "" }}
        fields={[{ key: "name", placeholder: "السبرنت" }, { key: "start_date", placeholder: "من", type: "date" }, { key: "end_date", placeholder: "إلى", type: "date" }]} error={errorFor("sprints")} />

      <div className="wf-actions">
        <button type="submit" className="wf-btn" disabled={busy}>حفظ المسودة</button>
      </div>
    </form>
  );
}

export default function ProjectPlanWorkspace() {
  const { projectId } = useParams();
  const [workspace, setWorkspace] = useState(null);
  const [selectedId, setSelectedId] = useState(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [flash, setFlash] = useState(null);
  const [comment, setComment] = useState("");
  const [note, setNote] = useState("");

  const apply = useCallback((data) => {
    setWorkspace(data);
    setSelectedId((current) => (data.versions.some((v) => v.id === current) ? current : data.versions[0]?.id ?? null));
  }, []);

  const load = useCallback(async () => {
    try {
      apply(await getPlanWorkspace(projectId));
    } catch (err) {
      setError(err.status === 404 ? "المشروع غير موجود أو ليس لك صلاحية على خطته." : err.message);
    }
  }, [apply, projectId]);

  useEffect(() => {
    let active = true;
    getPlanWorkspace(projectId)
      .then((data) => active && apply(data))
      .catch((err) => active && setError(err.status === 404 ? "المشروع غير موجود أو ليس لك صلاحية على خطته." : err.message));
    return () => {
      active = false;
    };
  }, [apply, projectId]);

  const latest = workspace?.versions[0];
  const selected = workspace?.versions.find((v) => v.id === selectedId) || latest;
  const editorInitial = useMemo(
    () => (latest ? planFormFrom(latest.content, workspace?.financial_settings?.default_currency) : emptyPlan(workspace?.financial_settings?.default_currency)),
    [latest, workspace?.financial_settings?.default_currency],
  );

  const run = async (action, success) => {
    setBusy(true);
    setFlash(null);
    try {
      const data = await action();
      if (data?.versions) {
        apply(data);
        setSelectedId(data.versions[0]?.id ?? null);
      } else {
        await load();
      }
      if (success) setFlash({ tone: "success", text: success });
      return null;
    } catch (err) {
      setFlash({ tone: "danger", text: err.message });
      if (err.reason === "stale_version" || err.reason === "stale_content") await load();
      return { errors: err.errors };
    } finally {
      setBusy(false);
    }
  };

  const submitVersion = async () => {
    const confirmation = await showAlert({
      icon: "question",
      title: `تقديم النسخة ${latest.version} للمؤسسة؟`,
      text: "التقديم يعني موافقتك على هذه النسخة بعينها، وتُجمَّد فلا تُعدل بعده. أي تعديل لاحق يكون بنسخة جديدة.",
      showCancelButton: true,
      confirmButtonText: "تقديم وموافقة",
      cancelButtonText: "تراجع",
    });
    if (confirmation.isConfirmed) await run(() => submitPlanVersion(projectId, latest.id), "تم تقديم النسخة للمؤسسة.");
  };

  const decide = async (decision) => {
    if (decision === "request_changes" && !note.trim()) {
      setFlash({ tone: "danger", text: "اكتب التعديلات المطلوبة ليعرفها قائد الفريق." });
      return;
    }
    const confirmation = await showAlert({
      icon: "question",
      title: decision === "approve" ? `الموافقة على النسخة ${selected.version}؟` : "طلب تعديل الخطة؟",
      text: decision === "approve" ? "بموافقتك تصبح هذه النسخة خط الأساس المتفق عليه للتنفيذ ولا تُعدل بعد ذلك." : "ستعود الخطة لقائد الفريق مع ملاحظاتك.",
      showCancelButton: true,
      confirmButtonText: "تأكيد",
      cancelButtonText: "تراجع",
    });
    if (!confirmation.isConfirmed) return;
    const failed = await run(() => decidePlanVersion(projectId, selected.id, decision, selected.content_hash, note.trim()), decision === "approve" ? "تمت الموافقة؛ الخطة متفق عليها الآن." : "أُرسل طلب التعديل لقائد الفريق.");
    if (!failed) setNote("");
  };

  const addComment = async (event) => {
    event.preventDefault();
    if (!comment.trim()) return;
    const failed = await run(() => commentOnPlanVersion(projectId, selected.id, comment.trim()));
    if (!failed) setComment("");
  };

  const start = async () => {
    const confirmation = await showAlert({
      icon: "question",
      title: "بدء تنفيذ المشروع؟",
      text: "يبدأ التنفيذ وفق النسخة المتفق عليها من الخطة.",
      showCancelButton: true,
      confirmButtonText: "بدء التنفيذ",
      cancelButtonText: "تراجع",
    });
    if (confirmation.isConfirmed) await run(() => startProjectExecution(projectId), "بدأ تنفيذ المشروع.");
  };

  if (error) {
    return (
      <main className="wf-page">
        <p className="wf-alert wf-alert-danger" role="alert"><AlertTriangle size={18} aria-hidden="true" /> {error}</p>
      </main>
    );
  }
  if (!workspace) return <main className="wf-page"><div className="wf-skeleton" /><div className="wf-skeleton" /></main>;

  const { project, permissions, viewer_role: role } = workspace;
  const back = role === "leader" ? `/student/leading/${project.id}` : role === "organization" ? `/organization/projects/${project.id}` : `/admin/projects/${project.id}`;

  return (
    <main className="wf-page">
      <Link className="wf-back" to={back}><ArrowRight size={16} aria-hidden="true" /> العودة إلى المشروع</Link>
      <header className="wf-card">
        <div className="wf-actions" style={{ marginBottom: 8 }}>
          <span className="wf-pill wf-pill-info">{PROJECT_STAGES[project.project_status]}</span>
          <span className="wf-pill">أنت: {ROLE_LABELS[role]}</span>
          {project.agreed_at && <span className="wf-pill wf-pill-success"><CheckCircle2 size={13} aria-hidden="true" /> خطة متفق عليها</span>}
        </div>
        <h1>خطة التنفيذ والاتفاق — {project.title}</h1>
        <p className="wf-muted">
          {project.organization_name} · قائد الفريق: {project.leader?.name || "غير معيّن"}.
          {" "}لا يبدأ التنفيذ إلا بعد موافقة القائد والمؤسسة على النسخة نفسها.
        </p>
        {permissions.start_execution && (
          <button type="button" className="wf-btn" onClick={start} disabled={busy}><Rocket size={16} aria-hidden="true" /> بدء التنفيذ</button>
        )}
        {role === "leader" && project.agreed_at && !permissions.start_execution && !project.execution_started_at && (
          <p className="wf-muted wf-small">أكّد تشكيل الفريق من صفحة المتقدمين والفريق ليصبح بدء التنفيذ متاحًا.</p>
        )}
      </header>

      {flash && <p className={`wf-alert wf-alert-${flash.tone}`} role={flash.tone === "danger" ? "alert" : "status"}>{flash.text}</p>}

      {permissions.edit && (
        <section className="wf-card" aria-labelledby="editor-title">
          <h2 id="editor-title">{latest?.status === "draft" ? `تحرير المسودة (النسخة ${latest.version})` : `نسخة جديدة (${(latest?.version || 0) + 1})`}</h2>
          {latest?.status === "changes_requested" && <p className="wf-alert wf-alert-warning">طلبت المؤسسة تعديلات: {latest.organization_note}</p>}
          <PlanEditor key={`${latest?.id ?? "new"}-${latest?.updated_at ?? ""}`} initial={editorInitial} settings={workspace.financial_settings} busy={busy} onSave={(content) => run(() => savePlanDraft(projectId, content), "تم حفظ المسودة.")} />
          {permissions.submit && (
            <div className="wf-actions" style={{ marginTop: 12 }}>
              <button type="button" className="wf-btn" onClick={submitVersion} disabled={busy}>تقديم النسخة {latest.version} للمؤسسة</button>
            </div>
          )}
        </section>
      )}

      {workspace.versions.length === 0 ? (
        <section className="wf-card wf-empty">
          {role === "leader" ? "ابدأ بكتابة أول مسودة للخطة أعلاه." : "لم يكتب قائد الفريق خطة بعد."}
        </section>
      ) : (
        <section className="wf-card" aria-labelledby="versions-title">
          <h2 id="versions-title">النسخ</h2>
          <div className="wf-tabs" role="group" aria-label="اختيار نسخة الخطة">
            {workspace.versions.map((version) => (
              <button key={version.id} type="button" className="wf-tab" aria-pressed={selected?.id === version.id} onClick={() => setSelectedId(version.id)}>
                النسخة {version.version} · {PLAN_STATUSES[version.status]?.label}
              </button>
            ))}
          </div>

          {selected && (
            <>
              <div className="wf-actions" style={{ marginBottom: 12 }}>
                <span className={`wf-pill wf-pill-${PLAN_STATUSES[selected.status]?.tone}`}>{PLAN_STATUSES[selected.status]?.label}</span>
                {selected.submitted_at && <span className="wf-muted wf-small">قدّمها {selected.submitted_by} في {formatDate(selected.submitted_at)}</span>}
                {selected.organization_decided_at && <span className="wf-muted wf-small">قرار المؤسسة ({selected.organization_decided_by}) في {formatDate(selected.organization_decided_at)}</span>}
              </div>
              {selected.organization_note && <p className="wf-alert wf-alert-warning">ملاحظة المؤسسة: {selected.organization_note}</p>}
              <PlanView version={selected} />

              {permissions.decide && selected.id === latest.id && selected.status === "submitted" && (
                <div className="wf-card" style={{ background: "var(--wf-soft)", marginTop: 16 }}>
                  <h3>قرارك على النسخة {selected.version}</h3>
                  <div className="wf-field">
                    <label htmlFor="decision-note">ملاحظات (إلزامية عند طلب التعديل)</label>
                    <textarea id="decision-note" className="wf-textarea" value={note} onChange={(e) => setNote(e.target.value)} maxLength={2000} />
                  </div>
                  <div className="wf-actions">
                    <button type="button" className="wf-btn" disabled={busy} onClick={() => decide("approve")}>الموافقة على هذه النسخة</button>
                    <button type="button" className="wf-btn wf-btn-light" disabled={busy} onClick={() => decide("request_changes")}>طلب تعديل</button>
                  </div>
                </div>
              )}

              <h3 style={{ marginTop: 16 }}>التعليقات ({selected.comments.length})</h3>
              {selected.comments.length > 0 && (
                <ul className="wf-comments">
                  {selected.comments.map((c) => (
                    <li key={c.id}>
                      <b>{c.author}</b> <span className="wf-muted wf-small">({ROLE_LABELS[c.author_role] || c.author_role}) · {formatDate(c.created_at)}</span>
                      <p style={{ margin: "4px 0 0", whiteSpace: "pre-wrap" }}>{c.body}</p>
                    </li>
                  ))}
                </ul>
              )}
              {permissions.comment && (
                <form onSubmit={addComment} className="wf-row">
                  <textarea className="wf-textarea" style={{ minHeight: 60 }} value={comment} onChange={(e) => setComment(e.target.value)} placeholder="أضف تعليقًا على هذه النسخة" aria-label="تعليق على النسخة" maxLength={2000} />
                  <button type="submit" className="wf-btn wf-btn-light" disabled={busy || !comment.trim()}>إرسال</button>
                </form>
              )}
            </>
          )}
        </section>
      )}
    </main>
  );
}
