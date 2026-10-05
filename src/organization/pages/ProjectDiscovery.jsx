import { useEffect, useState } from "react";
import { Link, useNavigate, useParams, useSearchParams } from "react-router-dom";
import { ArrowLeft, Check, LoaderCircle, Sparkles } from "lucide-react";
import {
  approveProposal,
  createProjectRequest,
  getIntake,
  getProjectRequest,
  requestRevision,
  saveIntake,
} from "../services/organizationService";
import {
  CURRENT_PROCESS_OPTIONS,
  DESIRED_OUTCOME_OPTIONS,
  EXISTING_TOOL_OPTIONS,
  PROJECT_REQUEST_STATUS_LABELS,
  TARGET_USER_OPTIONS,
} from "../constants/projectRequestOptions";
import DynamicProjectDiscovery from "../components/DynamicProjectDiscovery";
import "../styles/OrganizationDashboard.css";

const toggleValue = (values, value) =>
  values.includes(value)
    ? values.filter((item) => item !== value)
    : [...values, value];

function OptionCards({ values, selected, onToggle }) {
  return (
    <div className="project-option-grid">
      {values.map((value) => (
        <button
          aria-pressed={selected.includes(value)}
          className={`project-option-card ${selected.includes(value) ? "selected" : ""}`}
          key={value}
          onClick={() => onToggle(value)}
          type="button"
        >
          <span className="project-option-check">
            {selected.includes(value) ? <Check size={16} aria-hidden="true" /> : null}
          </span>
          {value}
        </button>
      ))}
    </div>
  );
}

function ProjectSection({ title, children, onEdit, variant = "" }) {
  return (
    <section className={`project-content-section ${variant}`}>
      <div className="project-section-heading">
        <h2>{title}</h2>
        {onEdit && (
          <button className="project-text-link" onClick={onEdit} type="button">
            تعديل
          </button>
        )}
      </div>
      {children}
    </section>
  );
}

function TextList({ items, emptyText = "لم تتم إضافة بيانات بعد." }) {
  if (!items?.length) return <p className="project-muted">{emptyText}</p>;
  return (
    <ul className="project-bullet-list">
      {items.map((item, index) => (
        <li key={`${item}-${index}`}>{item}</li>
      ))}
    </ul>
  );
}

function ProjectDiscovery({ mode }) {
  const { id } = useParams();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const [project, setProject] = useState(null);
  const [loading, setLoading] = useState(mode !== "intro");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [formErrors, setFormErrors] = useState({});
  const [revisionMode, setRevisionMode] = useState(false);
  const [revisionNote, setRevisionNote] = useState("");
  const [approved, setApproved] = useState(false);
  const [data, setData] = useState({
    title: "",
    problem_description: "",
    current_process: [],
    other_process: "",
    target_users: [],
    other_user: "",
    desired_outcomes: [],
    existing_tools: [],
    deadline: "",
    priority: "",
    budget_range: "",
    special_requirements: "",
    expected_outcome: "",
    responses: {},
  });
  const step = searchParams.get("step") || "problem";

  useEffect(() => {
    if (mode === "intro") return undefined;
    let active = true;

    const load = async () => {
      try {
        const result =
          mode === "intake"
            ? await getIntake(id)
            : { project_request: await getProjectRequest(id), questions: [] };
        if (!active) return;

        const loaded = result.project_request;
        const savedAnswers = loaded.intake_data || {};
        setProject(loaded);
        setData((previous) => ({
          ...previous,
          title: loaded.title || "",
          problem_description: loaded.problem_description || "",
          current_process: loaded.current_process || [],
          target_users: loaded.target_users || [],
          desired_outcomes: loaded.desired_outcomes || [],
          existing_tools: loaded.existing_tools || [],
          deadline: loaded.deadline || "",
          priority: loaded.priority || "",
          budget_range: loaded.budget_range || "",
          special_requirements: loaded.special_requirements || "",
          other_process: savedAnswers.other_process || "",
          other_user: savedAnswers.other_user || "",
          expected_outcome: savedAnswers.expected_outcome || "",
          responses: savedAnswers,
        }));
        if (
          mode === "intake"
          && !new URLSearchParams(window.location.search).has("step")
          && loaded.problem_description
        ) {
          setSearchParams({ step: "discovery" }, { replace: true });
        }
      } catch (loadError) {
        console.error("تعذر تحميل طلب المشروع:", loadError);
        if (active) setError(loadError.message || "تعذر تحميل الطلب.");
      } finally {
        if (active) setLoading(false);
      }
    };

    load();
    return () => {
      active = false;
    };
  }, [id, mode, setSearchParams]);

  const updateData = (key, value) =>
    setData((previous) => ({ ...previous, [key]: value }));

  const goToStep = (nextStep) => {
    setFormErrors({});
    setError("");
    setSearchParams({ step: nextStep });
  };

  const handleStart = async () => {
    setSaving(true);
    setError("");
    try {
      const created = await createProjectRequest({ title: "مشروع جديد" });
      navigate(`/organization/requests/${created.id}/intake?step=problem`);
    } catch (createError) {
      console.error("تعذر إنشاء طلب المشروع:", createError);
      setError(createError.message || "تعذر إنشاء الطلب.");
    } finally {
      setSaving(false);
    }
  };

  const saveProblem = async () => {
    const nextErrors = {};
    if (!data.title.trim()) nextErrors.title = "عنوان المشروع مطلوب.";
    if (data.problem_description.trim().length < 10) {
      nextErrors.problem_description = "اكتب وصفًا للمشكلة من 10 أحرف على الأقل.";
    }
    setFormErrors(nextErrors);
    if (Object.keys(nextErrors).length) return false;

    const updated = await saveIntake(id, {
      title: data.title.trim(),
      problem_description: data.problem_description.trim(),
      current_process: data.current_process,
      responses: { other_process: data.other_process },
    });
    setProject(updated);
    return true;
  };

  const saveUsers = async () => {
    const nextErrors = {};
    if (data.target_users.length === 0) {
      nextErrors.target_users = "اختر مستخدمًا واحدًا على الأقل.";
    }
    if (data.desired_outcomes.length === 0) {
      nextErrors.desired_outcomes = "اختر هدفًا واحدًا على الأقل.";
    }
    setFormErrors(nextErrors);
    if (Object.keys(nextErrors).length) return false;

    const updated = await saveIntake(id, {
      target_users: data.target_users,
      desired_outcomes: data.desired_outcomes,
      existing_tools: data.existing_tools,
      deadline: data.deadline || null,
      priority: data.priority || null,
      budget_range: data.budget_range || null,
      special_requirements: data.special_requirements,
      responses: { expected_outcome: data.expected_outcome, other_user: data.other_user },
    });
    setProject(updated);
    return true;
  };

  const continueIntake = async (event) => {
    event.preventDefault();
    setSaving(true);
    setError("");

    try {
      if (step === "problem" && (await saveProblem())) {
        goToStep("users");
      } else if (step === "users" && (await saveUsers())) {
        goToStep("discovery");
      }
    } catch (saveError) {
      console.error("تعذر حفظ إجابات الاستكشاف:", saveError);
      setError(saveError.message || "تعذر حفظ الإجابات.");
    } finally {
      setSaving(false);
    }
  };

  const saveAndReturn = async () => {
    setSaving(true);
    setError("");
    try {
      if (step === "problem") {
        if (!(await saveProblem())) return;
      } else if (step === "users") {
        await saveIntake(id, {
          target_users: data.target_users,
          desired_outcomes: data.desired_outcomes,
          existing_tools: data.existing_tools,
          deadline: data.deadline || null,
          priority: data.priority || null,
          budget_range: data.budget_range || null,
          special_requirements: data.special_requirements,
          responses: { expected_outcome: data.expected_outcome },
        });
      }
      navigate("/organization/dashboard");
    } catch (saveError) {
      console.error("تعذر حفظ الطلب قبل الخروج:", saveError);
      setError(saveError.message || "تعذر حفظ الطلب.");
    } finally {
      setSaving(false);
    }
  };

  const handleSubmitRevision = async (event) => {
    event.preventDefault();
    if (revisionNote.trim().length < 5) {
      setFormErrors({ revision: "اكتب توضيحًا من 5 أحرف على الأقل." });
      return;
    }

    setSaving(true);
    setError("");
    try {
      const updated = await requestRevision(id, { note: revisionNote.trim() });
      setProject(updated);
      setRevisionMode(false);
    } catch (revisionError) {
      console.error("تعذر إرسال طلب التعديل:", revisionError);
      setError(revisionError.message || "تعذر إرسال طلب التعديل.");
    } finally {
      setSaving(false);
    }
  };

  const handleApprove = async () => {
    setSaving(true);
    setError("");
    try {
      await approveProposal(id);
      setApproved(true);
    } catch (approveError) {
      console.error("تعذر اعتماد المقترح:", approveError);
      setError(approveError.message || "تعذر اعتماد المقترح.");
    } finally {
      setSaving(false);
    }
  };

  if (mode === "intro") {
    return (
      <main className="project-flow-page" dir="rtl">
        <div className="project-flow-narrow">
          <span className="project-eyebrow">
            <Sparkles size={16} aria-hidden="true" /> اكتشاف مشروع جديد
          </span>
          <h1>أخبرنا عن المشكلة التي تريد حلها</h1>
          <p className="project-lead">
            لا تحتاج إلى معرفة تقنية. أخبرنا عن التحدي الذي تواجهه مؤسستك وسنساعدك على تحويله إلى مشروع واضح.
          </p>
          <div className="project-steps-intro">
            {[
              ["01", "احكِ لنا عن المشكلة"],
              ["02", "نطرح عليك بعض الأسئلة"],
              ["03", "نُنشئ لك تصورًا للمشروع"],
            ].map(([number, label]) => (
              <div className="project-step-card" key={number}>
                <strong>{number}</strong>
                <span>{label}</span>
              </div>
            ))}
          </div>
          <p className="project-save-note">
            يمكنك حفظ الطلب والعودة إليه لاحقًا.
          </p>
          {error && <p className="project-alert project-alert-error">{error}</p>}
          <div className="project-flow-actions">
            <button
              className="project-primary-button"
              type="button"
              onClick={handleStart}
              disabled={saving}
            >
              {saving ? "جارٍ إنشاء الطلب..." : "ابدأ اكتشاف المشروع"}
              <ArrowLeft size={17} aria-hidden="true" />
            </button>
            <Link className="project-secondary-button" to="/organization/dashboard">
              العودة إلى لوحة التحكم
            </Link>
          </div>
        </div>
      </main>
    );
  }

  if (loading) {
    return (
      <main className="project-flow-page" dir="rtl" aria-busy="true">
        <div className="project-flow-narrow project-loading-card">
          <LoaderCircle className="project-spinner" aria-hidden="true" />
          <p>جارٍ تحميل بيانات الطلب...</p>
        </div>
      </main>
    );
  }

  if (error && !project) {
    return (
      <main className="project-flow-page" dir="rtl">
        <div className="project-flow-narrow project-alert project-alert-error" role="alert">
          {error}
        </div>
      </main>
    );
  }

  if (mode === "intake" && step === "discovery") {
    return <DynamicProjectDiscovery projectId={id} project={project} />;
  }

  if (mode === "intake") {
    return (
      <main className="project-flow-page" dir="rtl">
        <div className="project-flow-narrow">
          <header className="project-flow-heading">
            <span className="project-eyebrow">
              بيانات المشروع · {step === "problem" ? "١ من ٢" : "٢ من ٢"}
            </span>
            <h1>
              {step === "problem"
                ? "ما المشكلة التي تحاول حلها؟"
                : "من سيستخدم هذا الحل؟"}
            </h1>
            <p>
              {step === "problem"
                ? "اكتبها بطريقتك. لا تحتاج إلى استخدام أي مصطلحات تقنية."
                : "أضف ما تعرفه الآن عن المستخدمين والنتيجة المطلوبة. يمكنك ترك بعض التفاصيل لتحديدها مع أسئلة الاكتشاف."}
            </p>
          </header>

          {error ? (
            <div className="project-alert project-alert-error" role="alert">
              {error}
            </div>
          ) : null}

          <form className="project-form-card" onSubmit={continueIntake}>
            {step === "problem" && (
              <>
                <label className="project-field">
                  <span>عنوان المشروع</span>
                  <input
                    value={data.title}
                    onChange={(event) => updateData("title", event.target.value)}
                    maxLength={255}
                    placeholder="مثال: نظام إدارة مواعيد العيادة"
                  />
                  {formErrors.title && <small>{formErrors.title}</small>}
                </label>
                <label className="project-field">
                  <span>صف المشكلة</span>
                  <textarea
                    rows={5}
                    value={data.problem_description}
                    onChange={(event) =>
                      updateData("problem_description", event.target.value)
                    }
                    maxLength={10000}
                    placeholder="مثال: ندير مواعيد المرضى حاليًا من خلال واتساب ودفتر ورقي، وهذا يسبب تداخلًا في المواعيد وصعوبة في متابعة المرضى."
                  />
                  {formErrors.problem_description && (
                    <small>{formErrors.problem_description}</small>
                  )}
                </label>
                <fieldset className="project-field project-fieldset">
                  <legend>كيف تتعاملون مع هذه المشكلة حاليًا؟</legend>
                  <OptionCards
                    values={CURRENT_PROCESS_OPTIONS}
                    selected={data.current_process}
                    onToggle={(value) =>
                      updateData(
                        "current_process",
                        toggleValue(data.current_process, value),
                      )
                    }
                  />
                </fieldset>
                {data.current_process.includes("شيء آخر") && (
                  <label className="project-field">
                    <span>اذكر طريقة التعامل الحالية</span>
                    <input
                      value={data.other_process}
                      onChange={(event) =>
                        updateData("other_process", event.target.value)
                      }
                      maxLength={255}
                    />
                  </label>
                )}
              </>
            )}

            {step === "users" && (
              <>
                <fieldset className="project-field project-fieldset">
                  <legend>الأشخاص الذين سيستخدمون الحل</legend>
                  <OptionCards
                    values={TARGET_USER_OPTIONS}
                    selected={data.target_users}
                    onToggle={(value) =>
                      updateData("target_users", toggleValue(data.target_users, value))
                    }
                  />
                  {formErrors.target_users && <small>{formErrors.target_users}</small>}
                </fieldset>
                {data.target_users.includes("أخرى") && (
                  <label className="project-field">
                    <span>من هم؟</span>
                    <input
                      value={data.other_user}
                      onChange={(event) => updateData("other_user", event.target.value)}
                      maxLength={255}
                    />
                  </label>
                )}
                <fieldset className="project-field project-fieldset">
                  <legend>ما الذي تريدون تحسينه؟</legend>
                  <OptionCards
                    values={DESIRED_OUTCOME_OPTIONS}
                    selected={data.desired_outcomes}
                    onToggle={(value) =>
                      updateData(
                        "desired_outcomes",
                        toggleValue(data.desired_outcomes, value),
                      )
                    }
                  />
                  {formErrors.desired_outcomes && (
                    <small>{formErrors.desired_outcomes}</small>
                  )}
                </fieldset>
                <label className="project-field">
                  <span>هل هناك نتيجة محددة تتوقعون الوصول إليها؟ (اختياري)</span>
                  <textarea
                    rows={3}
                    value={data.expected_outcome}
                    onChange={(event) =>
                      updateData("expected_outcome", event.target.value)
                    }
                    maxLength={2000}
                  />
                </label>
                <fieldset className="project-field project-fieldset">
                  <legend>أدوات تستخدمونها حاليًا (اختياري)</legend>
                  <OptionCards
                    values={EXISTING_TOOL_OPTIONS}
                    selected={data.existing_tools}
                    onToggle={(value) =>
                      updateData(
                        "existing_tools",
                        toggleValue(data.existing_tools, value),
                      )
                    }
                  />
                </fieldset>
                <div className="project-context-grid">
                  <label className="project-field">
                    <span>الموعد المستهدف (اختياري)</span>
                    <input
                      type="date"
                      min={new Date().toISOString().slice(0, 10)}
                      value={data.deadline}
                      onChange={(event) => updateData("deadline", event.target.value)}
                    />
                  </label>
                  <label className="project-field">
                    <span>الأولوية (اختياري)</span>
                    <select
                      value={data.priority}
                      onChange={(event) => updateData("priority", event.target.value)}
                    >
                      <option value="">اختر الأولوية</option>
                      <option value="low">منخفضة</option>
                      <option value="medium">متوسطة</option>
                      <option value="high">عالية</option>
                      <option value="urgent">عاجلة</option>
                    </select>
                  </label>
                  <label className="project-field">
                    <span>الميزانية المتوقعة (اختياري)</span>
                    <select
                      value={data.budget_range}
                      onChange={(event) => updateData("budget_range", event.target.value)}
                    >
                      <option value="">غير محددة</option>
                      <option value="under_500">أقل من 500 دولار</option>
                      <option value="500_1500">500–1,500 دولار</option>
                      <option value="1500_5000">1,500–5,000 دولار</option>
                      <option value="over_5000">أكثر من 5,000 دولار</option>
                      <option value="needs_estimate">تحتاج إلى تقدير</option>
                    </select>
                  </label>
                </div>
                <label className="project-field">
                  <span>متطلبات أو قيود خاصة (اختياري)</span>
                  <textarea
                    rows={3}
                    value={data.special_requirements}
                    onChange={(event) =>
                      updateData("special_requirements", event.target.value)
                    }
                    maxLength={5000}
                  />
                </label>
              </>
            )}

            <footer className="project-flow-actions">
              <div>
                {step !== "problem" && (
                  <button
                    className="project-secondary-button"
                    type="button"
                    onClick={() => goToStep("problem")}
                    disabled={saving}
                  >
                    السابق
                  </button>
                )}
                <button
                  className="project-secondary-button"
                  type="button"
                  onClick={saveAndReturn}
                  disabled={saving}
                >
                  حفظ والعودة لاحقًا
                </button>
              </div>
              <button className="project-primary-button" type="submit" disabled={saving}>
                {saving
                  ? "جاري حفظ التقدم..."
                  : step === "users"
                    ? "ابدأ اكتشاف المشروع"
                    : "متابعة"}
                <ArrowLeft size={17} aria-hidden="true" />
              </button>
            </footer>
          </form>
        </div>
      </main>
    );
  }

  if (mode === "proposal" || mode === "review" || mode === "detail") {
    if (!project) return null;
    const proposal = project.proposal || {};
    const overview = mode === "detail";
    const overviewData = proposal.project_overview || {};
    const problem = proposal.business_problem || {};
    const technical = proposal.technical_recommendation || {};
    const srs = proposal.srs_summary || {};
    const editSection = (section) => {
      setRevisionNote(
        section ? `أرغب في تعديل قسم "${section}" أو توضيحه:\n` : "",
      );
      setRevisionMode(true);
      setFormErrors({});
    };

    if (
      mode !== "detail"
      && (approved || project.status === "approved")
    ) {
      return (
        <main className="project-flow-page" dir="rtl">
          <section className="project-success-card">
            <span className="project-success-icon"><Check size={26} /></span>
            <h1>تم اعتماد المقترح بنجاح</h1>
            <p>أصبح المشروع جاهزًا للانتقال إلى مرحلة المطابقة وتكوين الفريق.</p>
            <div className="project-flow-actions">
              <Link className="project-primary-button" to={`/organization/requests/${id}`}>
                عرض المشروع
              </Link>
              <Link className="project-secondary-button" to="/organization/dashboard">
                العودة إلى لوحة التحكم
              </Link>
            </div>
          </section>
        </main>
      );
    }

    if (!overview && !project.proposal) {
      return (
        <main className="project-flow-page" dir="rtl">
          <section className="project-success-card">
            <h1>لا يوجد مقترح جاهز للمراجعة</h1>
            <p>أكمل اكتشاف احتياج المشروع أولًا، ثم أعد إعداد المقترح.</p>
            <Link
              className="project-primary-button"
              to={`/organization/requests/${id}/intake?step=discovery`}
            >
              متابعة اكتشاف المشروع
            </Link>
          </section>
        </main>
      );
    }

    return (
      <main className="project-flow-page" dir="rtl">
        <div className="project-document">
          {error && <p className="project-alert project-alert-error" role="alert">{error}</p>}
          {overview ? (
            <>
              <span className="project-eyebrow">طلب مشروع</span>
              <h1>{project.title}</h1>
              <p className="project-lead">
                الحالة: {PROJECT_REQUEST_STATUS_LABELS[project.status] || project.status}
              </p>
              <p>{project.problem_description}</p>
              <Link
                className="project-primary-button"
                to={project.proposal ? `/organization/requests/${id}/proposal` : `/organization/requests/${id}/intake`}
              >
                متابعة الطلب <ArrowLeft size={16} aria-hidden="true" />
              </Link>
            </>
          ) : (
            <>
              <div className="project-proposal-header">
                <span className="project-status-badge project-status-draft">
                  {project.status === "revision_requested" ? "طلب تعديل قيد المراجعة" : "مقترح مشروع — مسودة"}
                </span>
                <h1>{mode === "review" ? "راجع مقترح مشروعك" : overviewData.project_name || project.title}</h1>
                <p>{overviewData.executive_summary || project.problem_description}</p>
                <p className="proposal-draft-notice">
                  هذا المقترح أولي ومبني على المعلومات التي قدمتها المؤسسة، ويمكن مراجعته وتعديله قبل الاعتماد.
                </p>
                {project.revision_note && (
                  <p className="project-revision-note">
                    طلب التعديل المرسل: {project.revision_note}
                  </p>
                )}
              </div>

              <div className="project-estimate-grid proposal-summary-cards">
                <article>
                  <span>المدة المتوقعة</span>
                  <strong>{proposal.estimated_duration}</strong>
                </article>
                <article>
                  <span>التكلفة</span>
                  <strong>{proposal.estimated_cost}</strong>
                  <small>تقدير مبدئي — ليس عرضًا ملزمًا</small>
                </article>
                <article>
                  <span>حجم الفريق</span>
                  <strong>{proposal.proposed_team?.length || "يحدد بعد المراجعة"}</strong>
                </article>
              </div>

              <ProjectSection title="نظرة عامة على المشروع" onEdit={() => editSection("نظرة عامة على المشروع")}>
                <h3>{overviewData.project_name || project.title}</h3>
                <p>{overviewData.executive_summary || "لم يرد ملخص مستقل."}</p>
                <div className="proposal-detail-grid">
                  <div><strong>المشكلة</strong><p>{overviewData.business_problem || project.problem_description}</p></div>
                  <div><strong>الحل المقترح</strong><p>{overviewData.proposed_solution || proposal.proposed_solution}</p></div>
                </div>
              </ProjectSection>

              <ProjectSection title="المشكلة وأثرها" onEdit={() => editSection("المشكلة وأثرها")}>
                <div className="proposal-detail-grid">
                  <div><strong>الوضع الحالي</strong><p>{problem.current_situation || project.problem_description}</p></div>
                  <div><strong>الأثر</strong><p>{problem.impact || "يحتاج الأثر إلى تأكيد."}</p></div>
                </div>
                <h3>نقاط التحدي</h3>
                <TextList items={problem.pain_points} />
              </ProjectSection>

              <ProjectSection title="الأهداف" onEdit={() => editSection("الأهداف")}>
                <TextList items={proposal.objectives || project.desired_outcomes} />
              </ProjectSection>

              <ProjectSection title="المستخدمون المستهدفون" onEdit={() => editSection("المستخدمون المستهدفون")}>
                {proposal.target_users?.length ? (
                  <div className="proposal-table-wrap">
                    <table className="proposal-table">
                      <thead><tr><th>المستخدم</th><th>الدور</th><th>التفاعل مع النظام</th></tr></thead>
                      <tbody>{proposal.target_users.map((user, index) => (
                        <tr key={`${user.user}-${index}`}>
                          <td>{user.user}</td><td>{user.role}</td><td>{user.interaction}</td>
                        </tr>
                      ))}</tbody>
                    </table>
                  </div>
                ) : <TextList items={project.target_users} />}
              </ProjectSection>

              <ProjectSection title="الحل المقترح" onEdit={() => editSection("الحل المقترح")}>
                <p>{proposal.proposed_solution}</p>
              </ProjectSection>

              <ProjectSection title="النطاق الوظيفي" onEdit={() => editSection("النطاق الوظيفي")}>
                <div className="proposal-scope-groups">
                  {(proposal.functional_scope || []).map((group) => (
                    <article key={group.group}>
                      <h3>{group.group}</h3>
                      <TextList items={group.requirements} />
                    </article>
                  ))}
                </div>
              </ProjectSection>

              <ProjectSection title="خارج النطاق" onEdit={() => editSection("ما هو خارج النطاق")}>
                <TextList items={proposal.out_of_scope} emptyText="لم يتم تحديد عناصر مستثناة." />
              </ProjectSection>

              <ProjectSection title="التوصية التقنية" onEdit={() => editSection("التوصية التقنية")}>
                <div className="proposal-table-wrap">
                  <table className="proposal-table">
                    <tbody>
                      <tr><th>نوع التطبيق</th><td>{technical.application_type}</td></tr>
                      <tr><th>الواجهة</th><td>{technical.frontend}</td></tr>
                      <tr><th>الخلفية</th><td>{technical.backend}</td></tr>
                      <tr><th>قاعدة البيانات</th><td>{technical.database}</td></tr>
                      <tr><th>التكاملات</th><td><TextList items={technical.integrations} emptyText="لا توجد تكاملات مؤكدة." /></td></tr>
                    </tbody>
                  </table>
                </div>
                <p>{technical.rationale}</p>
              </ProjectSection>

              <ProjectSection title="المهارات المطلوبة" onEdit={() => editSection("المهارات المطلوبة")}>
                <div className="proposal-skill-chips">
                  {(proposal.required_skills || []).map((skill) => <span key={skill}>{skill}</span>)}
                </div>
              </ProjectSection>

              <ProjectSection title="الفريق المقترح" onEdit={() => editSection("الفريق المقترح")}>
                <div className="proposal-scope-groups">
                  {(proposal.proposed_team || []).map((member) => (
                    <article key={member.role}>
                      <h3>{member.role}</h3>
                      <p>{member.responsibilities}</p>
                    </article>
                  ))}
                </div>
              </ProjectSection>

              <ProjectSection title="المدة والمراحل" onEdit={() => editSection("المدة والمراحل")}>
                <p><strong>المدة الإجمالية المتوقعة:</strong> {proposal.estimated_duration}</p>
                <ol className="project-milestone-list">
                  {(proposal.milestones || []).map((milestone) => (
                    <li key={milestone.title}>
                      <strong>{milestone.title}</strong>
                      <p>{milestone.description}</p>
                      <span>{milestone.duration}</span>
                    </li>
                  ))}
                </ol>
              </ProjectSection>

              <ProjectSection title="التكلفة التقديرية والتشغيلية" onEdit={() => editSection("التكاليف")}>
                <p className="proposal-draft-notice">{proposal.estimated_cost} — تقدير مبدئي غير ملزم.</p>
                {proposal.operational_cost?.length ? (
                  <div className="proposal-table-wrap">
                    <table className="proposal-table">
                      <thead><tr><th>البند</th><th>التقدير</th><th>ملاحظات</th></tr></thead>
                      <tbody>{proposal.operational_cost.map((cost, index) => (
                        <tr key={`${cost.item}-${index}`}>
                          <td>{cost.item}</td><td>{cost.estimate}</td><td>{cost.notes}</td>
                        </tr>
                      ))}</tbody>
                    </table>
                  </div>
                ) : <p>لا توجد تكاليف تشغيل إضافية مؤكدة حاليًا.</p>}
              </ProjectSection>

              <ProjectSection title="الافتراضات" onEdit={() => editSection("الافتراضات")} variant="proposal-assumptions">
                <TextList items={proposal.assumptions} emptyText="لم تُضف افتراضات." />
              </ProjectSection>

              <ProjectSection title="نقاط تحتاج إلى تأكيد" onEdit={() => editSection("نقاط تحتاج إلى تأكيد")} variant="proposal-confirmations">
                <TextList items={proposal.needs_confirmation} emptyText="لا توجد قرارات معلقة محددة." />
              </ProjectSection>

              <ProjectSection title="معايير النجاح" onEdit={() => editSection("معايير النجاح")}>
                <TextList items={proposal.success_criteria} />
              </ProjectSection>

              <ProjectSection title="ملخص المتطلبات" onEdit={() => editSection("ملخص المتطلبات")}>
                <div className="proposal-detail-grid">
                  <div>
                    <h3>متطلبات وظيفية</h3>
                    <TextList items={srs.functional_requirements} />
                  </div>
                  <div>
                    <h3>اعتبارات غير وظيفية</h3>
                    <TextList items={srs.non_functional_considerations} />
                  </div>
                </div>
              </ProjectSection>

              {revisionMode ? (
                <section className="project-decision-card">
                  <h2>ما الذي تريد تعديله أو توضيحه؟</h2>
                  <form onSubmit={handleSubmitRevision} className="project-field">
                    <label htmlFor="revision-note">اكتب ما تريد مراجعته في المقترح</label>
                    <textarea
                      id="revision-note"
                      rows={4}
                      value={revisionNote}
                      onChange={(event) => setRevisionNote(event.target.value)}
                      maxLength={5000}
                    />
                    {formErrors.revision && <small>{formErrors.revision}</small>}
                    <div className="project-flow-actions">
                      <button className="project-secondary-button" type="button" onClick={() => setRevisionMode(false)}>رجوع</button>
                      <button className="project-primary-button" type="submit" disabled={saving}>
                        {saving ? "جارٍ الإرسال..." : "إرسال طلب التعديل"}
                      </button>
                    </div>
                  </form>
                </section>
              ) : mode === "review" ? (
                <section className="project-decision-card">
                  <h2>هل المقترح مناسب لاحتياج مؤسستك؟</h2>
                  <p>يمكنك طلب تعديل أو اعتماد المقترح للانتقال إلى الخطوة التالية.</p>
                  <div className="project-flow-actions">
                    <button className="project-primary-button" type="button" onClick={handleApprove} disabled={saving}>
                      {saving ? "جارٍ الاعتماد..." : "اعتماد المقترح"}
                    </button>
                    <button className="project-secondary-button" type="button" onClick={() => editSection("")}>
                      طلب تعديلات
                    </button>
                  </div>
                </section>
              ) : (
                <div className="project-flow-actions">
                  <Link className="project-primary-button" to={`/organization/requests/${id}/review`}>
                    راجع مقترح مشروعك <ArrowLeft size={16} aria-hidden="true" />
                  </Link>
                  <Link className="project-secondary-button" to="/organization/dashboard">
                    حفظ والعودة لاحقًا
                  </Link>
                </div>
              )}
            </>
          )}
        </div>
      </main>
    );
  }

  return null;
}

export default ProjectDiscovery;
