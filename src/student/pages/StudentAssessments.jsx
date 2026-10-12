import { useCallback, useEffect, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { ClipboardCheck, History, PlayCircle, RotateCcw, Sparkles } from "lucide-react";

import { getAssessments, startAssessmentSession, updateStudentProfile } from "../services/studentService";
import {
  SKILL_STATUSES,
  assessmentError,
  attemptSummary,
  formatDateTime,
  groupSkills,
  levelLabel,
  levelNote,
  parseAssessmentQuery,
  sessionPath,
  specializationNotice,
} from "../utils/assessments";
import { showAlert } from "../../shared/utils/alerts";
import "../styles/Assessments.css";

// وقت التحميل يصحح فرق ساعة الجهاز في مؤقت المحاولة (يُستدعى عند النقر فقط)
const sessionState = (session) => ({ session, loadedAt: Date.now() });

// اختيار مهارة واحدة لكل محاولة؛ الحالة والمستوى المثبت من الخادم
function SkillOption({ skill, checked, disabled, onSelect }) {
  return (
    <label className={`asmt-skill ${checked ? "asmt-skill-checked" : ""}`}>
      <span className="asmt-skill-top">
        <span className="asmt-skill-name">
          <input
            type="radio"
            name="asmt-skill"
            value={skill.id}
            checked={checked}
            disabled={disabled}
            onChange={() => onSelect(skill.id)}
          />
          {skill.name}
        </span>
        {skill.verifiedLevel ? (
          <span className="asmt-badge asmt-tone-success">مثبت: {skill.verifiedLevelLabel}</span>
        ) : (
          <span className={`asmt-badge asmt-tone-${skill.tone}`}>{skill.label}</span>
        )}
      </span>
      {skill.note && <small>{skill.note}</small>}
    </label>
  );
}

function LevelOption({ level, checked, disabled, onSelect }) {
  return (
    <label className={`asmt-level ${checked ? "asmt-skill-checked" : ""} ${level.canAssess ? "" : "asmt-skill-disabled"}`}>
      <span className="asmt-skill-top">
        <span className="asmt-skill-name asmt-level-name">
          <input
            type="radio"
            name="asmt-level"
            value={level.key}
            checked={checked}
            disabled={disabled || !level.canAssess}
            onChange={() => onSelect(level.key)}
          />
          {level.label}
        </span>
        {level.status !== "not_assessed" && (
          <span className={`asmt-badge asmt-tone-${level.tone}`}>
            {level.statusLabel}
            {level.score !== null ? ` · ${level.score}%` : ""}
          </span>
        )}
      </span>
      <small>{level.hint}</small>
    </label>
  );
}

export default function StudentAssessments() {
  const navigate = useNavigate();
  const location = useLocation();
  const [preset] = useState(() => parseAssessmentQuery(location.search));
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [skillId, setSkillId] = useState(preset.skillId);
  const [level, setLevel] = useState(preset.level);
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
      setSkillId(null);
      setLevel(null);
      setStartError(null);
      setData(await getAssessments());
    } catch {
      setSpecializationError("تعذر حفظ المسار المهني. حاول مرة أخرى.");
    } finally {
      setSavingSpecialization(false);
    }
  };

  const specialization = data?.specialization;
  const catalog = Array.isArray(data?.specializations) ? data.specializations : [];
  const current = catalog.find((item) => item.key === specialization?.key) || null;
  const groups = groupSkills(data?.skills, current);
  const allSkills = [...groups.suggested, ...groups.others];
  const chosen = allSkills.find((skill) => skill.id === skillId) || null;
  const chosenLevel = chosen?.levels.find((item) => item.key === level) || null;
  const notice = specializationNotice(specialization);
  const verified = Array.isArray(data?.verified_levels) ? data.verified_levels : [];
  const history = Array.isArray(data?.history) ? data.history : [];
  const activeSession = data?.active_session || null;
  const attempts = data?.attempts || null;
  const outOfAttempts = attempts?.remaining === 0;
  const summary = attemptSummary(data?.settings, level);
  const canChoose = !notice && !activeSession && !starting;
  const canStart = canChoose && chosen && chosenLevel?.canAssess && !outOfAttempts;

  const start = async () => {
    if (!canStart) return;
    const confirmed = await showAlert({
      icon: "info",
      // titleText يُعرض نصًا (لا HTML)؛ داخل html أرقام ونصوص ثابتة فقط
      titleText: `بدء تقييم ${chosen.name}`,
      html:
        `<p>سيُعد الذكاء الاصطناعي ${summary.total} أسئلة مفتوحة جديدة بمستوى ${levelLabel(level)}: ${summary.practical} عملية و${summary.written} كتابية، والمدة ${summary.minutes} دقيقة.</p>` +
        "<p>تظهر الأسئلة واحدًا تلو الآخر، وتكتب إجابتك بنفسك نصًا أو كودًا. لا يمكن تعديل إجابة بعد إرسالها، ويبدأ المؤقت فور إعداد الأسئلة.</p>" +
        "<p>المستوى الذي تختاره يحدد صعوبة الأسئلة فقط؛ لا يُثبت إلا إذا نجحت فيه. تُضاف المهارة إلى مهارات ملفك.</p>",
      showCancelButton: true,
      confirmButtonText: "إعداد الأسئلة",
      cancelButtonText: "إلغاء",
      focusCancel: true,
    });
    if (!confirmed.isConfirmed) return;

    setStarting(true);
    setStartError(null);
    try {
      const session = await startAssessmentSession(chosen.id, level);
      navigate(sessionPath(session.id), { state: sessionState(session) });
    } catch (failure) {
      const mapped = assessmentError(failure);
      setStartError(mapped);
      if (!mapped.retryable) load();
    } finally {
      setStarting(false);
    }
  };

  const renderSkills = (skills) => (
    <div className="asmt-skill-grid" role="radiogroup" aria-label="المهارة">
      {skills.map((skill) => (
        <SkillOption
          key={skill.id}
          skill={skill}
          checked={skillId === skill.id}
          disabled={!canChoose}
          onSelect={(id) => {
            setSkillId(id);
            setStartError(null);
          }}
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
          اختر مهارة والمستوى الذي تريد إثباته، ثم أجب بنفسك عن عشرة أسئلة مفتوحة جديدة يعدها الذكاء الاصطناعي: سبعة
          عملية وثلاثة كتابية. لكل محاولة نتيجة مستقلة، ويمكنك إعادة التقييم بمستوى أعلى في أي وقت. النتيجة دليل على أدائك
          في هذا التقييم ولا تثبت خبرة احترافية.
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
            <b>مستوياتك المثبتة:</b>
            {verified.length ? (
              <ul className="asmt-chips">
                {verified.map((skill) => (
                  <li key={skill.id}>
                    {skill.name} · {skill.level_label}
                  </li>
                ))}
              </ul>
            ) : (
              <span>لا توجد بعد.</span>
            )}
            <Link className="asmt-btn asmt-btn-light" to="/student/opportunities">
              عرض فرص المشاريع
            </Link>
          </div>

          {activeSession && (
            <div className="asmt-banner" role="status">
              <p>
                لديك تقييم غير مكتمل: <b>{activeSession.title}</b>
                {activeSession.requested_level_label ? ` (${activeSession.requested_level_label})` : ""}
                {activeSession.status === "grading" ? " · بانتظار التصحيح" : ""}
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
            <>
              <section className="asmt-section" aria-labelledby="asmt-skills">
                <h2 id="asmt-skills">2. المهارة المراد تقييمها</h2>
                <p>تقيّم كل محاولة مهارة واحدة، ونتيجتها لا تؤثر في أي مهارة أخرى.</p>
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
              </section>

              <section className="asmt-section" aria-labelledby="asmt-levels">
                <h2 id="asmt-levels">3. مستوى التقييم</h2>
                <p>
                  اختر الصعوبة التي تريد إثباتها. النجاح يثبت هذا المستوى فقط، والرسوب لا يخفض مستوى أثبتّه سابقًا.
                </p>
                {chosen ? (
                  <div className="asmt-skill-grid" role="radiogroup" aria-label={`مستوى تقييم ${chosen.name}`}>
                    {chosen.levels.map((item) => (
                      <LevelOption
                        key={item.key}
                        level={item}
                        checked={level === item.key}
                        disabled={!canChoose}
                        onSelect={(key) => {
                          setLevel(key);
                          setStartError(null);
                        }}
                      />
                    ))}
                  </div>
                ) : (
                  <p className="asmt-muted">اختر مهارة أولًا.</p>
                )}
                {chosen && level && levelNote(chosen, level) && <p className="asmt-muted">{levelNote(chosen, level)}</p>}

                <div className="asmt-start">
                  <p>
                    {chosen && level
                      ? `${chosen.name} · ${levelLabel(level)} · ${summary.total} أسئلة (${summary.practical} عملية و${summary.written} كتابية) · ${summary.minutes} دقيقة`
                      : "اختر المهارة والمستوى."}
                  </p>
                  <button type="button" className="asmt-btn" onClick={start} disabled={!canStart}>
                    <Sparkles size={16} aria-hidden="true" /> {starting ? "جارٍ إعداد الأسئلة..." : "ابدأ التقييم"}
                  </button>
                </div>
                {outOfAttempts && (
                  <p className="asmt-muted" role="note">
                    بلغت الحد الأقصى لعدد المحاولات خلال 24 ساعة ({attempts.max}).
                    {attempts.next_attempt_at ? ` يمكنك بدء محاولة جديدة بعد ${formatDateTime(attempts.next_attempt_at)}.` : ""}
                  </p>
                )}

                {starting && (
                  <div className="asmt-working" role="status" aria-live="polite">
                    <span className="asmt-spinner" aria-hidden="true" />
                    <span>يُعد الذكاء الاصطناعي أسئلة جديدة لمهارتك ومستواك ويتحقق منها. قد يستغرق ذلك حتى دقيقة.</span>
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
            </>
          )}

          {history.length > 0 && (
            <section className="asmt-section" aria-labelledby="asmt-history">
              <h2 id="asmt-history">
                <History size={18} aria-hidden="true" /> محاولات سابقة
              </h2>
              <ul className="asmt-history">
                {history.map((session) => (
                  <li key={session.id}>
                    <span>
                      <b>{session.skill?.name || session.title}</b>
                      {session.requested_level_label && <span> · {session.requested_level_label}</span>}
                      <span className="asmt-muted"> · {formatDateTime(session.completed_at)}</span>
                    </span>
                    <span className="asmt-actions">
                      {session.outcomes.map((outcome) => (
                        <span
                          key={outcome.skill}
                          className={`asmt-badge asmt-tone-${SKILL_STATUSES[outcome.status]?.tone || "neutral"}`}
                        >
                          {SKILL_STATUSES[outcome.status]?.label || outcome.status}
                          {Number.isInteger(outcome.score) ? ` · ${outcome.score}%` : ""}
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

