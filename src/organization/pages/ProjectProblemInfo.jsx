import { useEffect, useRef, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, ArrowRight, Loader2 } from "lucide-react";

import ProjectFlowStepper from "../components/ProjectFlowStepper";
import { Skeleton, SkeletonGroup } from "../components/Skeleton";
import { PROJECT_REQUEST_STATUS_LABELS } from "../constants/projectRequestOptions";
import {
  createProjectRequest,
  getProjectRequest,
  getProjectRequests,
  updateProjectRequest,
} from "../services/organizationService";
import "../styles/ProjectProblemInfo.css";

const EMPTY_FORM = { title: "", shortTitle: "", description: "" };

const FIELDS = [
  {
    name: "title",
    serverKey: "title",
    label: "اسم المشروع",
    placeholder: "مثال: نظام إدارة",
    maxLength: 255,
  },
  {
    name: "shortTitle",
    serverKey: "intake_data.short_title",
    label: "عنوان قصير",
    placeholder: "مثال: صعوبة متابعة طلبات العملاء",
    maxLength: 255,
  },
  {
    name: "description",
    serverKey: "problem_description",
    label: "اشرح المشكلة",
    placeholder: "ماذا يحدث الآن؟ ما الذي يزعجك أو يكلفك وقتًا؟",
    maxLength: 10000,
    multiline: true,
  },
];

const toForm = (record) => ({
  title: record.title || "",
  shortTitle: record.intake_data?.short_title || "",
  description: record.problem_description || "",
});

const validate = (form) => {
  const errors = {};
  if (!form.title.trim()) errors.title = "اسم المشروع مطلوب.";
  if (!form.shortTitle.trim()) errors.shortTitle = "العنوان القصير مطلوب.";
  if (form.description.trim().length < 10)
    errors.description = "اشرح المشكلة في 10 أحرف على الأقل.";
  return errors;
};

export default function ProjectProblemInfo() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [form, setForm] = useState(EMPTY_FORM);
  const [savedForm, setSavedForm] = useState(null);
  const [errors, setErrors] = useState({});
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(Boolean(id));
  const [submitting, setSubmitting] = useState(false);
  const [requests, setRequests] = useState([]);
  const [requestsLoading, setRequestsLoading] = useState(true);
  const [requestsError, setRequestsError] = useState("");
  const submitLockRef = useRef(false);

  useEffect(() => {
    let active = true;

    getProjectRequests()
      .then((list) => active && setRequests(Array.isArray(list) ? list : []))
      .catch(() => active && setRequestsError("تعذر تحميل الطلبات السابقة."))
      .finally(() => active && setRequestsLoading(false));

    if (id) {
      getProjectRequest(id)
        .then((record) => {
          if (!active) return;
          setForm(toForm(record));
          setSavedForm(toForm(record));
        })
        .catch((loadError) => active && setError(loadError.message))
        .finally(() => active && setLoading(false));
    }

    return () => {
      active = false;
    };
  }, [id]);

  const handleChange = (event) => {
    const { name, value } = event.target;
    setForm((current) => ({ ...current, [name]: value }));
    setErrors((current) => ({ ...current, [name]: undefined }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (submitLockRef.current || loading) return;

    const clientErrors = validate(form);
    setErrors(clientErrors);
    setError("");
    if (Object.keys(clientErrors).length) return;

    const unchanged =
      savedForm &&
      FIELDS.every((field) => savedForm[field.name] === form[field.name].trim());
    if (id && unchanged) {
      navigate(`/organization/requests/${id}/intake`);
      return;
    }

    const payload = {
      title: form.title.trim(),
      problem_description: form.description.trim(),
      intake_data: { short_title: form.shortTitle.trim() },
    };

    submitLockRef.current = true;
    setSubmitting(true);
    try {
      if (id) {
        await updateProjectRequest(id, payload);
        navigate(`/organization/requests/${id}/intake`);
      } else {
        const created = await createProjectRequest(payload);
        // نستبدل صفحة الإنشاء بصفحة التعديل حتى لا يُنشئ الرجوع طلبًا مكررًا
        navigate(`/organization/requests/${created.id}/problem`, { replace: true });
        navigate(`/organization/requests/${created.id}/intake`);
      }
    } catch (submitError) {
      const serverErrors = submitError.errors || {};
      setErrors(
        Object.fromEntries(
          FIELDS.filter((field) => serverErrors[field.serverKey]).map((field) => [
            field.name,
            serverErrors[field.serverKey][0],
          ]),
        ),
      );
      setError(submitError.message || "تعذر حفظ بيانات المشروع، حاول مرة أخرى.");
    } finally {
      submitLockRef.current = false;
      setSubmitting(false);
    }
  };

  const previousRequests = requests.filter((item) => String(item.id) !== id);

  return (
    <div className="pp" dir="rtl">
      <ProjectFlowStepper current={0} />

      <form className="pp-form" onSubmit={handleSubmit} noValidate>
        <section className="pp-card" aria-busy={loading}>
          <h1 className="pp-title">ما التحدي الذي تواجهه؟</h1>

          {loading ? (
            <SkeletonGroup label="جارٍ تحميل بيانات المشروع">
              {FIELDS.map((field) => (
                <div className="pp-field" key={field.name}>
                  <Skeleton width={110} height={15} />
                  <Skeleton
                    className="pp-sk-control"
                    height={field.multiline ? 110 : 42}
                    radius={8}
                  />
                </div>
              ))}
            </SkeletonGroup>
          ) : FIELDS.map((field) => {
            const Control = field.multiline ? "textarea" : "input";
            const fieldId = `pp-${field.name}`;
            const fieldError = errors[field.name];

            return (
              <div className="pp-field" key={field.name}>
                <label htmlFor={fieldId}>{field.label}</label>
                <Control
                  id={fieldId}
                  name={field.name}
                  value={form[field.name]}
                  onChange={handleChange}
                  placeholder={field.placeholder}
                  maxLength={field.maxLength}
                  rows={field.multiline ? 4 : undefined}
                  disabled={loading || submitting}
                  required
                  aria-invalid={Boolean(fieldError)}
                  aria-describedby={fieldError ? `${fieldId}-error` : undefined}
                />
                {fieldError && (
                  <p className="pp-field-error" id={`${fieldId}-error`}>
                    {fieldError}
                  </p>
                )}
              </div>
            );
          })}

          <p className="pp-note">
            بعد الإرسال سيسألك مساعد ذكي بضعة أسئلة بسيطة، لن يبدأ أي مشروع قبل
            موافقتك.
          </p>

          {error && (
            <p className="pp-error" role="alert">
              {error}
            </p>
          )}
        </section>

        <nav className="pp-bar" aria-label="التنقل بين الخطوات">
          <button
            className="pp-next"
            type="submit"
            disabled={loading || submitting}
            aria-busy={submitting}
            aria-label="التالي"
          >
            {submitting ? (
              <Loader2 className="pp-spin" size={20} aria-hidden="true" />
            ) : (
              <ArrowLeft size={22} aria-hidden="true" />
            )}
          </button>

          <button
            className="pp-back"
            type="button"
            onClick={() => navigate("/organization/requests/new")}
            disabled={submitting}
            aria-label="رجوع"
          >
            <ArrowRight size={22} aria-hidden="true" />
          </button>
        </nav>
      </form>

      <section className="pp-card pp-history" aria-label="طلباتك السابقة">
        {requestsLoading ? (
          <SkeletonGroup label="جارٍ تحميل الطلبات السابقة" className="pp-sk-history">
            {[0, 1, 2].map((row) => (
              <div className="pp-sk-row" key={row}>
                <Skeleton width="45%" height={16} />
                <Skeleton width={90} height={14} />
              </div>
            ))}
          </SkeletonGroup>
        ) : requestsError ? (
          <p className="pp-muted">{requestsError}</p>
        ) : previousRequests.length === 0 ? (
          <>
            <span className="pp-history-icon" aria-hidden="true">
              📂
            </span>
            <p className="pp-muted">لا توجد طلبات سابقة بعد. أول طلب لك سيظهر هنا.</p>
          </>
        ) : (
          <ul className="pp-history-list">
            {previousRequests.slice(0, 5).map((item) => (
              <li key={item.id}>
                <Link to={`/organization/requests/${item.id}/intake`}>
                  <strong>{item.title}</strong>
                  <span>{PROJECT_REQUEST_STATUS_LABELS[item.status] || item.status}</span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
