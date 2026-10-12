import { useCallback, useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { ClipboardCheck, History, PlayCircle, RotateCcw, Sparkles } from "lucide-react";

import { getAssessments, startAssessmentSession, updateStudentProfile } from "../services/studentService";
import {
  SKILL_STATUSES,
  assessmentError,
  formatDateTime,
  groupSkills,
  sessionPath,
  specializationNotice,
  toggleSkill,
} from "../utils/assessments";
import { showAlert } from "../../shared/utils/alerts";
import "../styles/Assessments.css";

function SkillOption({ skill, checked, disabled, onToggle }) {
  const blocked = !skill.selectable;
  return (
    <label
      className={`asmt-skill ${checked ? "asmt-skill-checked" : ""} ${blocked ? "asmt-skill-disabled" : ""}`}
    >
      <span className="asmt-skill-top">
        <span className="asmt-skill-name">
          {!blocked && (
            <input type="checkbox" checked={checked} disabled={disabled && !checked} onChange={() => onToggle(skill.id)} />
          )}
          {skill.name}
        </span>
        <span className={`asmt-badge asmt-tone-${skill.tone}`}>
          {skill.label}
          {skill.score !== null && skill.status !== "not_assessed" ? ` · ${skill.score}%` : ""}
        </span>
      </span>
      {skill.note && <small>{skill.note}</small>}
    </label>
  );
}

export default function StudentAssessments() {
  const navigate = useNavigate();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selected, setSelected] = useState([]);
  const [savingSpecialization, setSavingSpecialization] = useState(false);
  const [specializationError, setSpecializationError] = useState("");
  const [starting, setStarting] = useState(false);
  const [startError, setStartError] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      setData(await getAssessments());
    } catch (loadError) {
      setError(assessmentError(loadError));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    let active = true;
    getAssessments()
      .then((result) => active && setData(result))
      .catch((loadError) => active && setError(assessmentError(loadError)))
      .finally(() => active && setLoading(false));
    return () => {
      active = false;
    };
  }, []);

  const changeSpecialization = async (event) => {
    const value = event.target.value;
    if (!value) return;
    setSavingSpecialization(true);
    setSpecializationError("");
    try {
      await updateStudentProfile({ professional_specialization: value });
      setSelected([]);
      setStartError(null);
      setData(await getAssessments());
    } catch {
      setSpecializationError("تعذر حفظ المسار المهني. حاول مرة أخرى.");
    } finally {
      setSavingSpecialization(false);
    }
  };

  const settings = data?.settings || {};
  const maxSkills = Number(settings.max_skills_per_session) || 3;
  const perSkill = Number(settings.questions_per_skill) || 2;
  const minutesPerQuestion = Number(settings.minutes_per_question) || 10;

  const start = async () => {
    const questions = selected.length * perSkill;
    const confirmed = await showAlert({
      icon: "info",
      title: "بدء التقييم",
      // أرقام فقط داخل html
      html:
        `<p>سيُعد الذكاء الاصطناعي ${questions} أسئلة مفتوحة الإجابة لمهاراتك المختارة، والمدة ${questions * minutesPerQuestion} دقيقة.</p>` +
        "<p>تظهر الأسئلة واحدًا تلو الآخر، وتكتب إجابتك بنفسك نصًا أو كودًا. لا يمكن تعديل إجابة بعد إرسالها، ويبدأ المؤقت فور إعداد الأسئلة.</p>" +
        "<p>تُضاف المهارات المختارة إلى مهارات ملفك، ولا تُحتسب متحققًا منها إلا بعد النجاح في تقييمها.</p>",
      showCancelButton: true,
      confirmButtonText: "إعداد الأسئلة",
      cancelButtonText: "إلغاء",
      focusCancel: true,
    });
    if (!confirmed.isConfirmed) return;

    setStarting(true);
    setStartError(null);
    try {
      const session = await startAssessmentSession(selected);
      navigate(sessionPath(session.id), { state: { session, loadedAt: Date.now() } });
    } catch (failure) {
      const mapped = assessmentError(failure);
      setStartError(mapped);
      if (!mapped.retryable) load();
    } finally {
      setStarting(false);
    }
  };

  const specialization = data?.specialization;
  const catalog = Array.isArray(data?.specializations) ? data.specializations : [];
  const current = catalog.find((item) => item.key === specialization?.key) || null;
  const groups = groupSkills(data?.skills, current);
  const notice = specializationNotice(specialization);
  const verified = Array.isArray(data?.verified_skills) ? data.verified_skills : [];
  const history = Array.isArray(data?.history) ? data.history : [];
  const activeSession = data?.active_session || null;
  const canChoose = !notice && !activeSession && !starting;

  const renderSkills = (skills) => (
    <div className="asmt-skill-grid">
      {skills.map((skill) => (
        <SkillOption
          key={skill.id}
          skill={skill}
          checked={selected.includes(skill.id)}
          disabled={!canChoose || selected.length >= maxSkills}
          onToggle={(id) => setSelected((items) => toggleSkill(items, id, maxSkills))}
        />
      ))}
    </div>
  );

  return (
    <div className="asmt-page" dir="rtl">
      <header className="asmt-head">
        <h1>
          <ClipboardCheck size={22} aria-hidden="true" /> تقييم المهارات
        </h1>
        <p>
          اختر مسارك المهني والمهارات التي تريد إثباتها، ثم أجب بنفسك عن أسئلة مفتوحة يعدها الذكاء الاصطناعي لمهاراتك.
          تُصحَّح الإجابات وفق معايير محددة، ولكل مهارة نتيجة مستقلة. النتيجة دليل على أدائك في هذا التقييم ولا تثبت
          خبرة احترافية.
        </p>
      </header>

      {loading ? (
        <div className="asmt-skeleton" aria-busy="true" aria-label="جارٍ تحميل التقييمات" />
      ) : error ? (
        <div className="asmt-state" role="alert">
          <p>{error.message}</p>
          {error.retryable && (
            <button type="button" className="asmt-btn" onClick={load}>
              <RotateCcw size={15} aria-hidden="true" /> إعادة المحاولة
            </button>
          )}
          {error.login && (
            <Link className="asmt-btn" to="/login">
              تسجيل الدخول
            </Link>
          )}
        </div>
      ) : (
        <>
          <div className="asmt-summary">
            <b>مهاراتك المتحقق منها:</b>
            {verified.length ? (
              <ul className="asmt-chips">
                {verified.map((skill) => (
                  <li key={skill}>{skill}</li>
                ))}
              </ul>
            ) : (
              <span>لا توجد بعد.</span>
            )}
            {verified.length > 0 && (
              <Link className="asmt-btn asmt-btn-light" to="/student/opportunities">
                عرض فرص المشاريع
              </Link>
            )}
          </div>

          {activeSession && (
            <div className="asmt-banner" role="status">
              <p>
                لديك تقييم غير مكتمل: <b>{activeSession.title}</b>
                {activeSession.status === "grading" ? " (بانتظار التصحيح)" : ""}
              </p>
              <Link className="asmt-btn" to={sessionPath(activeSession.id)}>
                <PlayCircle size={16} aria-hidden="true" /> متابعة التقييم
              </Link>
            </div>
          )}

          <section className="asmt-section" aria-labelledby="asmt-spec">
            <h2 id="asmt-spec">1. مسارك المهني</h2>
            <p>يحدد نوع الأسئلة وأدوار المشاريع التي تُطابَق معها. يختلف عن تخصصك الجامعي.</p>
            <div className="asmt-field">
              <label htmlFor="asmt-specialization" className="asmt-visually-hidden">
                المسار المهني
              </label>
              <select
                id="asmt-specialization"
                value={current?.key || ""}
                onChange={changeSpecialization}
                disabled={savingSpecialization || Boolean(activeSession)}
              >
                <option value="">اختر مسارك المهني</option>
                {catalog.map((item) => (
                  <option key={item.key} value={item.key}>
                    {item.label}
                  </option>
                ))}
              </select>
              {savingSpecialization && <span className="asmt-muted">جارٍ الحفظ...</span>}
            </div>
            {current && <p className="asmt-muted">الأدوار المتوافقة: {current.role_labels.join("، ")}</p>}
            {specializationError && (
              <p className="asmt-error" role="alert">
                {specializationError}
              </p>
            )}
            {notice && (
              <div className="asmt-alert" role="note">
                <h2>{notice.title}</h2>
                <p>{notice.body}</p>
              </div>
            )}
          </section>

          {!notice && (
            <section className="asmt-section" aria-labelledby="asmt-skills">
              <h2 id="asmt-skills">2. المهارات المراد تقييمها</h2>
              <p>
                اختر حتى {maxSkills} مهارات. لكل مهارة {perSkill} أسئلة، ونتيجة كل مهارة مستقلة عن غيرها.
              </p>
              {groups.suggested.length > 0 && (
                <>
                  <h3>مقترحة لمسارك</h3>
                  {renderSkills(groups.suggested)}
                </>
              )}
              {groups.others.length > 0 && (
                <>
                  <h3>مهارات أخرى في المنصة</h3>
                  {renderSkills(groups.others)}
                </>
              )}

              <div className="asmt-start">
                <p>
                  {selected.length
                    ? `اخترت ${selected.length} من ${maxSkills} · ${selected.length * perSkill} أسئلة · ${selected.length * perSkill * minutesPerQuestion} دقيقة`
                    : "لم تختر مهارات بعد."}
                </p>
                <button type="button" className="asmt-btn" onClick={start} disabled={!canChoose || selected.length === 0}>
                  <Sparkles size={16} aria-hidden="true" /> {starting ? "جارٍ إعداد الأسئلة..." : "ابدأ التقييم"}
                </button>
              </div>

              {starting && (
                <div className="asmt-working" role="status" aria-live="polite">
                  <span className="asmt-spinner" aria-hidden="true" />
                  <span>يُعد الذكاء الاصطناعي أسئلة مخصصة لمسارك ومهاراتك ويتحقق منها. قد يستغرق ذلك حتى دقيقة.</span>
                </div>
              )}
              {startError && (
                <div className="asmt-alert" role="alert">
                  <p>{startError.message}</p>
                  {startError.retryable && (
                    <button type="button" className="asmt-btn asmt-btn-light" onClick={start} disabled={starting}>
                      <RotateCcw size={15} aria-hidden="true" /> إعادة المحاولة
                    </button>
                  )}
                </div>
              )}
            </section>
          )}

          {history.length > 0 && (
            <section className="asmt-section" aria-labelledby="asmt-history">
              <h2 id="asmt-history">
                <History size={18} aria-hidden="true" /> تقييمات سابقة
              </h2>
              <ul className="asmt-history">
                {history.map((session) => (
                  <li key={session.id}>
                    <span>
                      <b>{session.title}</b>
                      <span className="asmt-muted"> · {formatDateTime(session.completed_at)}</span>
                    </span>
                    <span className="asmt-actions">
                      {session.outcomes.map((outcome) => (
                        <span
                          key={outcome.skill}
                          className={`asmt-badge asmt-tone-${SKILL_STATUSES[outcome.status]?.tone || "neutral"}`}
                        >
                          {outcome.skill}: {SKILL_STATUSES[outcome.status]?.label || outcome.status}
                        </span>
                      ))}
                      <Link to={sessionPath(session.id)}>التفاصيل</Link>
                    </span>
                  </li>
                ))}
              </ul>
            </section>
          )}
        </>
      )}
    </div>
  );
}
