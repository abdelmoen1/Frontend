import { useCallback, useEffect, useRef, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import {
  Award,
  BadgeCheck,
  CircleDashed,
  CirclePlus,
  Clock3,
  History,
  Info,
  ListChecks,
  PenTool,
  PlayCircle,
  RotateCcw,
  ScanSearch,
  SquareTerminal,
  Target,
  Trash2,
} from "lucide-react";
import { IoMdArrowDropleft } from "react-icons/io";

import welcomeImg from "../assets/welcome.png";
import { getAssessments, startAssessmentSession, updateStudentProfile } from "../services/studentService";
import {
  assessmentSettings,
  SKILL_CATEGORIES,
  SKILL_STATUSES,
  TARGET_LEVELS,
  assessmentError,
  formatDateTime,
  levelRank,
  parseAssessmentQuery,
  preAssessmentSkills,
  defaultExcluded,
  preAssessmentState,
  requestedSkillsText,
  sessionPath,
  setSkillLevel,
  specializationNotice,
} from "../utils/assessments";
import "../styles/Assessments.css";

const CATEGORY_ICONS = { programming: SquareTerminal, design: PenTool, applied: ScanSearch };
const CHIP_ICONS = { success: BadgeCheck, warning: Info, info: CirclePlus, neutral: CircleDashed };

// مؤشر المستوى: نقطة مملوءة لكل درجة (مبتدئ 1 … خبير 4)
function LevelDots({ level }) {
  const rank = levelRank(level);
  return (
    <span className="pre-dots" aria-hidden="true">
      {TARGET_LEVELS.map((item, index) => (
        <span key={item.key} className={index < rank ? "pre-dot pre-dot-on" : "pre-dot"} />
      ))}
    </span>
  );
}

function SkillRow({ skill, level, onLevel, onRemove, disabled }) {
  const Icon = CATEGORY_ICONS[skill.category] || SquareTerminal;
  const ChipIcon = CHIP_ICONS[skill.chip.tone] || CircleDashed;
  const selectId = `pre-level-${skill.id}`;

  return (
    <li className="pre-skill">
      <span className="pre-tile" aria-hidden="true">
        <Icon size={22} />
      </span>
      <span className="pre-skill-name">
        <bdi>{skill.name}</bdi>
        <small>{skill.categoryLabel}</small>
      </span>
      <span className={`pre-chip pre-chip-${skill.chip.tone}`}>
        <ChipIcon size={14} aria-hidden="true" />
        {skill.chip.text}
      </span>

      <span className={`pre-level ${level ? "" : "pre-level-empty"}`}>
        <label className="asmt-visually-hidden" htmlFor={selectId}>
          مستوى تقييم {skill.name}
        </label>
        <select
          id={selectId}
          value={level || ""}
          onChange={(event) => onLevel(skill.id, event.target.value)}
          disabled={disabled}
          aria-invalid={level ? undefined : "true"}
        >
          <option value="">اختر المستوى</option>
          {TARGET_LEVELS.map((item) => (
            <option key={item.key} value={item.key}>
              {item.label}
            </option>
          ))}
        </select>
        <LevelDots level={level} />
      </span>

      <button
        type="button"
        className="pre-remove"
        onClick={() => onRemove(skill.id)}
        disabled={disabled}
        aria-label={`حذف ${skill.name} من هذا التقييم`}
      >
        <Trash2 size={16} aria-hidden="true" /> حذف
      </button>
    </li>
  );
}

// وقت التحميل يصحح فرق ساعة الجهاز في مؤقت الجلسة (يُستدعى عند النقر فقط)
const sessionState = (session) => ({ session, loadedAt: Date.now() });

// قيمة من إعدادات الخادم أو "—" إن لم تصل
const shown = (value) => value ?? "—";

export default function StudentAssessments() {
  const location = useLocation();
  const navigate = useNavigate();
  const [preset] = useState(() => parseAssessmentQuery(location.search));
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  // المستوى المطلوب لكل مهارة على حدة؛ رابط من فرصة قد يحدد مستوى مهارة واحدة مسبقًا
  const [levels, setLevels] = useState(() => (preset.skillId && preset.level ? { [preset.skillId]: preset.level } : {}));
  // null حتى يعدّل الطالب الاختيار: حينها تُستبعد مبدئيًا المهارات الزائدة عن حد الجلسة
  const [excluded, setExcluded] = useState(null);
  const [confirmed, setConfirmed] = useState(false);
  const [starting, setStarting] = useState(false);
  const [startError, setStartError] = useState(null);
  const [filter, setFilter] = useState("all");
  const [savingSpecialization, setSavingSpecialization] = useState(false);
  const [specializationError, setSpecializationError] = useState("");
  const confirmRef = useRef(null);

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
      setData(await getAssessments());
    } catch {
      setSpecializationError("تعذر حفظ المسار المهني. حاول مرة أخرى.");
    } finally {
      setSavingSpecialization(false);
    }
  };

  const specialization = data?.specialization;
  const catalog = Array.isArray(data?.specializations) ? data.specializations : [];
  const notice = specializationNotice(specialization);
  const history = Array.isArray(data?.history) ? data.history : [];
  const activeSession = data?.active_session || null;
  const rules = assessmentSettings(data?.settings);
  const skills = preAssessmentSkills(data?.skills, preset.skillId);
  const effectiveExcluded = excluded ?? defaultExcluded(skills, rules.maxSkills, preset.skillId);
  const state = preAssessmentState({ skills, levels, excluded: effectiveExcluded, confirmed, maxSkills: rules.maxSkills });
  const removedSkills = skills.filter((skill) => effectiveExcluded.includes(skill.id));
  const verifiedCount = state.included.filter((skill) => skill.verifiedLevel).length;
  const locked = Boolean(activeSession) || Boolean(notice) || starting;
  const categories = Object.keys(SKILL_CATEGORIES).filter((key) =>
    state.included.some((skill) => skill.category === key),
  );
  // تبويب فرغ بعد حذف مهاراته يعود إلى "الكل"
  const activeFilter = categories.includes(filter) ? filter : "all";
  const visible = state.included.filter((skill) => activeFilter === "all" || skill.category === activeFilter);

  const goToConfirm = (event) => {
    event.preventDefault();
    confirmRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
    confirmRef.current?.focus({ preventScroll: true });
  };

  const removeSkill = (id) => {
    setExcluded([...effectiveExcluded, id]);
    setConfirmed(false);
  };

  const restoreSkill = (id) => {
    setExcluded(effectiveExcluded.filter((item) => item !== id));
    setConfirmed(false);
  };

  // يُرسل المهارات ومستوياتها فقط؛ الخادم يعيد التحقق ويقرأ الأسماء من قاعدة البيانات. لا انتقال قبل تأكيد الخادم
  const start = async () => {
    if (!state.canStart || !state.payload || starting || locked) return;
    setStarting(true);
    setStartError(null);
    try {
      const session = await startAssessmentSession(state.payload);
      navigate(sessionPath(session.id), { state: sessionState(session) });
    } catch (failure) {
      const mapped = assessmentError(failure);
      setStartError(mapped);
      // مثل مهلة إعادة أو حد يومي: نحدّث حالة المهارات من الخادم (الاختيارات في الصفحة تبقى)
      if (!mapped.retryable) load();
    } finally {
      setStarting(false);
    }
  };

  const stats = [
    {
      icon: Award,
      label: "المهارات المختارة للتقييم",
      value: state.included.length,
      caption: `${verifiedCount} مهارات مثبتة`,
      featured: true,
    },
    { icon: ListChecks, label: "عدد الأسئلة", value: shown(rules.questions), caption: "لكل المهارات معًا" },
    { icon: Clock3, label: "مدة التقييم", value: shown(rules.minutes), caption: "دقيقة" },
    {
      icon: Target,
      label: "توزيع الأسئلة",
      value: `${shown(rules.practical)} + ${shown(rules.written)}`,
      caption: "عملية + سؤال كتابي",
    },
  ];

  return (
    <div className="asmt-page pre-page" dir="rtl">
      <section className="pre-hero" aria-labelledby="pre-title">
        <div className="pre-hero-copy">
          <h1 id="pre-title">مهاراتي</h1>
          <p>اختر مستوى التقييم لكل مهارة من مهاراتك، لتساعدنا نتيجتك على ترشيح الفرص والمشاريع المناسبة لك.</p>
          <div className="pre-hero-actions">
            <a href="#pre-confirm" className="pre-btn pre-btn-primary" onClick={goToConfirm}>
              اختبار المهارات
              <IoMdArrowDropleft aria-hidden="true" />
            </a>
            <Link to="/student/profile" className="pre-btn pre-btn-ghost">
              إضافة مهارة جديدة
              <CirclePlus size={18} aria-hidden="true" />
            </Link>
          </div>
        </div>
        <img src={welcomeImg} alt="" className="pre-hero-art" />
      </section>

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
          {activeSession && (
            <div className="asmt-banner" role="status">
              <p>
                لديك تقييم غير مكتمل: <b>{requestedSkillsText(activeSession)}</b>
                {activeSession.status === "grading" ? " · بانتظار التصحيح" : ""}
              </p>
              <Link className="asmt-btn" to={sessionPath(activeSession.id)}>
                <PlayCircle size={16} aria-hidden="true" /> متابعة التقييم
              </Link>
            </div>
          )}

          {notice && (
            <section className="asmt-section" aria-labelledby="asmt-spec">
              <h2 id="asmt-spec">{notice.title}</h2>
              <p>{notice.body}</p>
              <div className="asmt-field">
                <label htmlFor="asmt-specialization" className="asmt-visually-hidden">
                  المسار المهني
                </label>
                <select
                  id="asmt-specialization"
                  value=""
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
              {specializationError && (
                <p className="asmt-error" role="alert">
                  {specializationError}
                </p>
              )}
            </section>
          )}

          <ul className="pre-stats" aria-label="ملخص التقييم">
            {stats.map((stat) => (
              <li key={stat.label} className={`pre-stat ${stat.featured ? "pre-stat-featured" : ""}`}>
                <span className="pre-tile" aria-hidden="true">
                  <stat.icon size={22} />
                </span>
                <span className="pre-stat-text">
                  <span className="pre-stat-label">{stat.label}</span>
                  <span className="pre-stat-value">
                    <b>{stat.value}</b> <small>{stat.caption}</small>
                  </span>
                </span>
              </li>
            ))}
          </ul>

          <div className="pre-info" role="note">
            <Info size={18} aria-hidden="true" />
            <p>
              يتكون التقييم من {shown(rules.questions)} أسئلة لكل المهارات المختارة معًا خلال {shown(rules.minutes)}{" "}
              دقيقة: {shown(rules.practical)} أسئلة عملية (كتابة كود للمهارات البرمجية، ومهام أو سيناريوهات تطبيقية
              لغيرها) وسؤال كتابي واحد. المستوى الذي تختاره لكل مهارة يحدد صعوبة أسئلتها فقط، ولا يُعد إثباتًا لمستواك.
            </p>
          </div>

          {skills.length === 0 ? (
            <div className="asmt-state">
              <h2>لا توجد مهارات في ملفك بعد</h2>
              <p>أضف المهارات التي تريد تقييمها إلى ملفك الشخصي أولًا، ثم عد لاختيار مستوى كل منها.</p>
              <Link className="asmt-btn" to="/student/profile">
                تحديث مهاراتي
              </Link>
            </div>
          ) : (
            <section aria-labelledby="pre-skills-title">
              <h2 id="pre-skills-title" className="asmt-visually-hidden">
                المهارات ومستوى التقييم
              </h2>
              <div className="pre-tabs" role="group" aria-label="تصفية المهارات">
                <button
                  type="button"
                  className="pre-tab"
                  aria-pressed={activeFilter === "all"}
                  onClick={() => setFilter("all")}
                >
                  الكل ({state.included.length})
                </button>
                {categories.map((key) => (
                  <button
                    type="button"
                    key={key}
                    className="pre-tab"
                    aria-pressed={activeFilter === key}
                    onClick={() => setFilter(key)}
                  >
                    {SKILL_CATEGORIES[key]} ({state.included.filter((skill) => skill.category === key).length})
                  </button>
                ))}
              </div>

              <ul className="pre-skills">
                {visible.map((skill) => (
                  <SkillRow
                    key={skill.id}
                    skill={skill}
                    level={levels[skill.id]}
                    onLevel={(id, value) => setLevels((current) => setSkillLevel(current, id, value))}
                    onRemove={removeSkill}
                    disabled={locked}
                  />
                ))}
              </ul>
              {state.included.length === 0 && (
                <p className="asmt-muted">حذفت كل المهارات من هذا التقييم. أعد إحداها أدناه للمتابعة.</p>
              )}
              {removedSkills.length > 0 && (
                <p className="pre-removed">
                  محذوفة من هذا التقييم فقط (تبقى في ملفك):{" "}
                  {removedSkills.map((skill) => (
                    <button
                      type="button"
                      key={skill.id}
                      className="pre-restore"
                      onClick={() => restoreSkill(skill.id)}
                      disabled={locked}
                    >
                      <bdi>{skill.name}</bdi> · إعادة
                    </button>
                  ))}
                </p>
              )}
            </section>
          )}

          {skills.length > 0 && (
            <section
              className="pre-confirm"
              id="pre-confirm"
              ref={confirmRef}
              tabIndex={-1}
              aria-labelledby="pre-confirm-title"
            >
              <h2 id="pre-confirm-title">تأكيد بدء التقييم</h2>
              <p className="pre-confirm-summary">
                {state.included.length} مهارات · {shown(rules.questions)} أسئلة · {shown(rules.minutes)} دقيقة
              </p>
              {state.tooMany && (
                <p className="pre-missing" role="status">
                  يشمل التقييم الواحد {rules.maxSkills} مهارات كحد أقصى. احذف {state.included.length - rules.maxSkills} من
                  القائمة أعلاه (يمكنك تقييمها في جلسة لاحقة).
                </p>
              )}
              {state.included.length > 0 && state.missing.length > 0 && (
                <p className="pre-missing" role="status">
                  اختر مستوى التقييم لكل مهارة قبل البدء. المتبقي: <bdi>{state.missing.join("، ")}</bdi>
                </p>
              )}
              <label className="pre-check">
                <input
                  type="checkbox"
                  checked={confirmed}
                  onChange={(event) => setConfirmed(event.target.checked)}
                  disabled={locked}
                />
                <span>
                  قرأت تعليمات التقييم وفهمتها: {shown(rules.questions)} أسئلة خلال {shown(rules.minutes)} دقيقة، تظهر
                  واحدًا تلو الآخر، ولا يمكن تعديل الإجابة بعد إرسالها.
                </span>
              </label>
              <div className="pre-confirm-actions">
                <button
                  type="button"
                  className="pre-btn pre-btn-primary"
                  onClick={start}
                  disabled={!state.canStart || locked}
                  aria-busy={starting}
                >
                  {starting ? "جارٍ إعداد الأسئلة..." : "ابدأ التقييم"}
                  <IoMdArrowDropleft aria-hidden="true" />
                </button>
                <Link to="/student/profile" className="pre-btn pre-btn-outline">
                  تعديل مهاراتي
                </Link>
              </div>
              {starting && (
                <div className="asmt-working" role="status" aria-live="polite">
                  <span className="asmt-spinner" aria-hidden="true" />
                  <span>يُعد الذكاء الاصطناعي أسئلة جديدة لمهاراتك ومستوياتها ويتحقق منها. قد يستغرق ذلك حتى دقيقة.</span>
                </div>
              )}
              {startError && (
                <div className="asmt-alert" role="alert">
                  <p>{startError.message}</p>
                  {startError.retryable && (
                    <button type="button" className="pre-btn pre-btn-outline" onClick={start} disabled={starting}>
                      <RotateCcw size={15} aria-hidden="true" /> إعادة المحاولة
                    </button>
                  )}
                </div>
              )}
              {activeSession && (
                <p className="pre-unavailable" role="note">
                  لديك تقييم غير مكتمل؛ أكمله أولًا من الرابط أعلى الصفحة قبل بدء تقييم جديد.
                </p>
              )}
            </section>
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
                      <b>{requestedSkillsText(session)}</b>
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
