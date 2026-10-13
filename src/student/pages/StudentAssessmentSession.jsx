import { useCallback, useEffect, useRef, useState, useSyncExternalStore } from "react";
import { Link, useLocation, useParams } from "react-router-dom";
import {
  ArrowLeft,
  ArrowRight,
  BadgeCheck,
  Check,
  Lock,
  RotateCcw,
  Send,
  TriangleAlert,
  WifiOff,
  XCircle,
} from "lucide-react";

import {
  finalizeAssessmentSession,
  getAssessmentSession,
  submitAssessmentAnswer,
} from "../services/studentService";
import {
  ASSESSMENTS_PATH,
  answerError,
  assessmentError,
  formatClock,
  insertIndent,
  progressView,
  questionMeta,
  questionSkillsText,
  questionSteps,
  remainingSeconds,
  requestedSkillsText,
  resultsView,
} from "../utils/assessments";
import "../styles/Assessments.css";

// مسودة الإجابة تُحفظ في الجلسة فقط حتى لا تضيع عند تحديث الصفحة قبل الإرسال
const draftKey = (sessionId, questionId) => `gt-assessment-draft-${sessionId}-${questionId}`;

function readDraft(key) {
  try {
    return sessionStorage.getItem(key) || "";
  } catch {
    return "";
  }
}

function writeDraft(key, value) {
  try {
    sessionStorage.setItem(key, value);
  } catch {
    // التخزين غير متاح: تبقى المسودة في الصفحة فقط
  }
}

function clearDraft(key) {
  try {
    sessionStorage.removeItem(key);
  } catch {
    // لا شيء
  }
}

function BackLink() {
  return (
    <Link className="asmt-back" to={ASSESSMENTS_PATH}>
      <ArrowRight size={16} aria-hidden="true" /> تقييم المهارات
    </Link>
  );
}

const subscribeOnline = (notify) => {
  window.addEventListener("online", notify);
  window.addEventListener("offline", notify);
  return () => {
    window.removeEventListener("online", notify);
    window.removeEventListener("offline", notify);
  };
};

// حالة الاتصال من المتصفح؛ تُستخدم للتنبيه فقط، فالإرسال يبقى متاحًا ويعالج الخادم الخطأ
function useOnline() {
  return useSyncExternalStore(
    subscribeOnline,
    () => navigator.onLine,
    () => true,
  );
}

const STEP_LABELS = { answered: "تمت الإجابة", current: "السؤال الحالي", upcoming: "لم يُجب بعد" };

function StepIcon({ status }) {
  return (
    <span className={`qs-step-icon qs-step-icon-${status}`} aria-hidden="true">
      {status === "answered" && <Check size={11} strokeWidth={3.5} />}
    </span>
  );
}

// قائمة للعرض فقط: الأسئلة تظهر بالترتيب ولا يمكن الرجوع إلى سؤال سابق
function QuestionNav({ steps }) {
  return (
    <nav className="qs-nav" aria-labelledby="qs-nav-title">
      <h2 id="qs-nav-title">الأسئلة</h2>
      <ol>
        {steps.map((step) => (
          <li
            key={step.position}
            className={`qs-step qs-step-${step.status}`}
            aria-current={step.status === "current" ? "step" : undefined}
          >
            <span className="qs-step-text">
              <span className="qs-step-num">{step.position}</span>
              <span className="qs-step-label">. {STEP_LABELS[step.status]}</span>
            </span>
            <StepIcon status={step.status} />
          </li>
        ))}
      </ol>
    </nav>
  );
}

function SessionSkeleton() {
  return (
    <section className="qs-shell qs-skeleton" aria-busy="true">
      <span className="asmt-visually-hidden" role="status">
        جارٍ تحميل الاختبار...
      </span>
      <div className="qs-head" aria-hidden="true">
        <span className="qs-bone qs-bone-dark" style={{ width: 120 }} />
        <span className="qs-bone qs-bone-dark qs-bone-pill" />
        <span className="qs-bone qs-bone-dark" style={{ width: 220 }} />
      </div>
      <div className="qs-body" aria-hidden="true">
        <div className="qs-main">
          <span className="qs-bone" style={{ width: "62%", height: 20 }} />
          <span className="qs-bone" style={{ width: "88%" }} />
          <span className="qs-bone qs-bone-block" style={{ height: 150 }} />
          <span className="qs-bone qs-bone-block" style={{ height: 190 }} />
        </div>
        <div className="qs-nav">
          <span className="qs-bone" style={{ width: 70 }} />
          {[0, 1, 2, 3, 4, 5].map((item) => (
            <span key={item} className="qs-bone qs-bone-step" />
          ))}
        </div>
      </div>
      <div className="qs-foot" aria-hidden="true">
        <span className="qs-bone" style={{ width: 240 }} />
        <span className="qs-bone qs-bone-pill" style={{ width: 190, height: 40 }} />
      </div>
    </section>
  );
}

function QuestionForm({ sessionId, question, steps, isLast, timeUp, online, onAnswered, onReload }) {
  const key = draftKey(sessionId, question.id);
  const [answer, setAnswer] = useState(() => readDraft(key));
  const [error, setError] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [indentMode, setIndentMode] = useState(true);
  const fieldRef = useRef(null);
  const isCode = question.format === "code";
  const meta = questionMeta(question);

  useEffect(() => {
    fieldRef.current?.focus();
  }, []);

  const change = (value) => {
    setAnswer(value);
    writeDraft(key, value);
    if (error) setError(null);
  };

  // Tab يضيف مسافة بادئة في محرر الكود؛ Esc ثم Tab للخروج من الحقل بلوحة المفاتيح
  const keyDown = (event) => {
    if (!isCode) return;
    if (event.key === "Escape") {
      setIndentMode(false);
      return;
    }
    if (event.key === "Tab" && !event.shiftKey && indentMode) {
      event.preventDefault();
      const { selectionStart, selectionEnd } = event.currentTarget;
      const next = insertIndent(answer, selectionStart, selectionEnd);
      change(next.value);
      requestAnimationFrame(() => fieldRef.current?.setSelectionRange(next.cursor, next.cursor));
    }
  };

  const submit = async (event) => {
    event.preventDefault();
    const problem = answerError(answer);
    if (problem) {
      setError({ message: problem });
      fieldRef.current?.focus();
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      // تُرسل الإجابة كما كُتبت دون قص المسافات
      const updated = await submitAssessmentAnswer(sessionId, question.id, answer);
      clearDraft(key);
      onAnswered(updated);
    } catch (failure) {
      const mapped = assessmentError(failure);
      setError(mapped);
      if (mapped.reload) onReload();
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <form className="qs-form" onSubmit={submit} noValidate aria-busy={submitting}>
      <div className="qs-body">
        <div className="qs-main">
          <h2 className="qs-prompt" id={`asmt-q-${question.id}`}>
            <span className="qs-prompt-num">السؤال {question.position}:</span> <bdi>{question.prompt}</bdi>
          </h2>
          <div className="qs-meta">
            <span className="qs-tag qs-tag-skill">
              <bdi>{questionSkillsText(question)}</bdi>
            </span>
            {meta.category && (
              <span className="qs-tag">
                {meta.category}
                {meta.type ? ` · ${meta.type}` : ""}
              </span>
            )}
            <span className="qs-tag">{isCode ? "إجابة بالكود" : "إجابة مكتوبة"}</span>
          </div>

          {question.code_context && (
            <pre className="qs-code" aria-label="كود السؤال">
              <code>{question.code_context}</code>
            </pre>
          )}

          {!online && (
            <div className="qs-alert qs-alert-warn" role="status">
              <WifiOff size={16} aria-hidden="true" />
              <p>انقطع الاتصال بالإنترنت. تابع الكتابة، فإجابتك محفوظة على هذا الجهاز، وأرسلها عند عودة الاتصال. المؤقت لا يتوقف.</p>
            </div>
          )}
          {timeUp && (
            <div className="qs-alert qs-alert-danger" role="alert">
              <TriangleAlert size={16} aria-hidden="true" />
              <p>انتهى الوقت. أرسل إجابتك الآن قبل إغلاق الاختبار.</p>
            </div>
          )}

          <div className="qs-answer">
            <label htmlFor={`asmt-answer-${question.id}`}>
              {isCode ? `اكتب الكود${question.language ? ` (${question.language})` : ""}` : "اكتب إجابتك بالعربية أو الإنجليزية"}
            </label>
            <textarea
              id={`asmt-answer-${question.id}`}
              ref={fieldRef}
              className={isCode ? "qs-answer-code" : ""}
              value={answer}
              onChange={(event) => change(event.target.value)}
              onKeyDown={keyDown}
              onBlur={() => setIndentMode(true)}
              dir={isCode ? "ltr" : "auto"}
              spellCheck={!isCode}
              autoComplete="off"
              aria-describedby={`asmt-q-${question.id} asmt-answer-help-${question.id}`}
              aria-invalid={error?.validation || Boolean(error && !error.retryable) ? "true" : undefined}
              disabled={submitting}
            />
            <div className="qs-answer-meta" id={`asmt-answer-help-${question.id}`}>
              <span>
                {isCode
                  ? "تُحفظ المسافات والأسطر كما تكتبها. Tab يضيف مسافة بادئة، واضغط Esc ثم Tab للانتقال خارج الحقل."
                  : "اشرح بكلماتك؛ لا يهم أسلوب الكتابة بقدر صحة الفكرة."}
              </span>
              <span dir="ltr">{answer.length} / 8000</span>
            </div>
          </div>

          {error && (
            <div className="qs-alert qs-alert-danger" role="alert">
              <TriangleAlert size={16} aria-hidden="true" />
              <p>
                {error.message}
                {error.retryable ? " إجابتك محفوظة كمسودة؛ أعد الإرسال." : ""}
              </p>
            </div>
          )}
        </div>

        <QuestionNav steps={steps} />
      </div>

      <div className="qs-foot">
        <p className="qs-foot-note">
          <Lock size={14} aria-hidden="true" /> لا يمكن الرجوع إلى سؤال سابق أو تعديل الإجابة بعد إرسالها.
        </p>
        <button type="submit" className="qs-next" disabled={submitting}>
          {submitting ? (
            <>
              <span className="qs-btn-spinner" aria-hidden="true" /> جارٍ الإرسال...
            </>
          ) : (
            <>
              {isLast ? "إرسال وإنهاء الاختبار" : "إرسال والانتقال للسؤال التالي"}
              {isLast ? <Send size={15} aria-hidden="true" /> : <ArrowLeft size={16} aria-hidden="true" />}
            </>
          )}
        </button>
      </div>
    </form>
  );
}

function Results({ session }) {
  const results = resultsView(session);
  const headingRef = useRef(null);

  useEffect(() => {
    headingRef.current?.focus();
  }, []);

  return (
    <>
      <div className="asmt-bar">
        <div>
          <h1 ref={headingRef} tabIndex={-1}>
            نتيجة التقييم: {session.title}
          </h1>
          <span className="asmt-progress">
            {session.ended_by_timeout ? "انتهى الوقت قبل الإجابة عن كل الأسئلة. " : ""}
            لكل مهارة نتيجة مستقلة بمستواها المطلوب، حسبها الخادم من أسئلتها العملية ومعايير المقال الخاصة بها.
          </span>
        </div>
      </div>
      <div className="asmt-results" aria-live="polite">
        {results.map((result) => (
          <article className="asmt-result" key={result.skill}>
            <div className="asmt-result-head">
              <h2>
                {result.skill}
                {result.levelLabel ? ` · ${result.levelLabel}` : ""}
              </h2>
              <span className={`asmt-badge asmt-tone-${result.tone}`}>
                {result.status === "passed" ? <BadgeCheck size={13} aria-hidden="true" /> : null}
                {result.status === "failed" ? <XCircle size={13} aria-hidden="true" /> : null}
                {result.label}
                {result.score !== null ? ` · ${result.score}%` : ""}
              </span>
            </div>
            {result.note && <p>{result.note}</p>}
            <ul className="asmt-feedback">
              {result.questions.map((question) => (
                <li key={question.position}>
                  <b>
                    السؤال {question.position}
                    {question.category ? ` · ${question.category}` : ""}
                    {question.points ? ` · ${question.points}` : ""}
                    {!question.answered ? " · دون إجابة" : ""}
                  </b>
                  {question.feedback && <span>{question.feedback}</span>}
                  {question.missing.length > 0 && (
                    <span className="asmt-muted"> مفاهيم ناقصة: {question.missing.join("، ")}</span>
                  )}
                </li>
              ))}
            </ul>
          </article>
        ))}
      </div>
      <p className="asmt-muted">
        التقييم وتصحيحه مولّدان بالذكاء الاصطناعي وفق معايير محددة؛ النتيجة دليل على أدائك في هذا التقييم وليست شهادة
        خبرة احترافية.
      </p>
      <div className="asmt-actions">
        <Link className="asmt-btn" to={ASSESSMENTS_PATH}>
          العودة إلى التقييمات
        </Link>
        <Link className="asmt-btn asmt-btn-light" to="/student/opportunities">
          مدى توافقك مع فرص المشاريع
        </Link>
      </div>
    </>
  );
}

export default function StudentAssessmentSession() {
  const { sessionId } = useParams();
  const location = useLocation();
  const validId = /^\d+$/.test(sessionId || "");
  const initial = location.state?.session?.id === Number(sessionId) ? location.state : null;

  const [session, setSession] = useState(initial?.session || null);
  const [loadedAt, setLoadedAt] = useState(() => initial?.loadedAt || Date.now());
  const [loading, setLoading] = useState(validId && !initial);
  const [loadError, setLoadError] = useState(validId ? null : assessmentError({ status: 404 }));
  const [now, setNow] = useState(() => Date.now());
  const [gradingError, setGradingError] = useState(null);
  const [gradingRound, setGradingRound] = useState(0);
  const grading = useRef(false);
  const online = useOnline();

  const applySession = useCallback((next) => {
    setSession(next);
    setLoadedAt(Date.now());
    setNow(Date.now());
  }, []);

  const reload = useCallback(async () => {
    try {
      applySession(await getAssessmentSession(sessionId));
      setLoadError(null);
    } catch (failure) {
      setLoadError(assessmentError(failure));
    } finally {
      setLoading(false);
    }
  }, [applySession, sessionId]);

  useEffect(() => {
    if (!validId || initial) return undefined;
    let active = true;
    getAssessmentSession(sessionId)
      .then((result) => active && applySession(result))
      .catch((failure) => active && setLoadError(assessmentError(failure)))
      .finally(() => active && setLoading(false));
    return () => {
      active = false;
    };
    // initial ثابت لهذه الصفحة؛ التحميل مرة واحدة لكل جلسة
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sessionId, validId]);

  const status = session?.status;
  const inProgress = status === "in_progress";
  const remaining = inProgress
    ? remainingSeconds({ expiresAt: session.expires_at, serverTime: session.server_time, loadedAt }, now)
    : 0;
  const timeUp = inProgress && remaining === 0;

  useEffect(() => {
    if (!inProgress) return undefined;
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(timer);
  }, [inProgress]);

  // بعد انتهاء الوقت ومهلة الشبكة يغلق الخادم الإجابة؛ نعيد التحميل لننتقل إلى التصحيح
  useEffect(() => {
    if (!timeUp) return undefined;
    const timer = setTimeout(reload, 65000);
    return () => clearTimeout(timer);
  }, [timeUp, reload]);

  // التصحيح تدريجي: كل طلب يصحح ما يتسع له الوقت، ونكرر حتى الاكتمال أو ظهور خطأ
  useEffect(() => {
    if (status !== "grading" || gradingError || grading.current) return undefined;
    let active = true;
    const timer = setTimeout(
      () => {
        grading.current = true;
        finalizeAssessmentSession(sessionId)
          .then(({ session: next, gradingError: failure }) => {
            if (!active) return;
            applySession(next);
            if (failure) setGradingError(failure);
            else if (next.status === "grading") setGradingRound((round) => round + 1);
          })
          .catch((failure) => active && setGradingError(assessmentError(failure)))
          .finally(() => {
            grading.current = false;
          });
      },
      gradingRound === 0 ? 0 : 1500,
    );
    return () => {
      active = false;
      clearTimeout(timer);
    };
  }, [status, gradingError, gradingRound, sessionId, applySession]);

  const retryGrading = () => {
    setGradingError(null);
    setGradingRound((round) => round + 1);
  };

  if (loading) {
    return (
      <div className="asmt-page qs-page" dir="rtl">
        <BackLink />
        <SessionSkeleton />
      </div>
    );
  }

  if (loadError || !session) {
    return (
      <div className="asmt-page" dir="rtl">
        <BackLink />
        <div className="asmt-state" role="alert">
          <p>{loadError?.message || "تعذر تحميل التقييم."}</p>
          <div className="asmt-actions">
            {loadError?.retryable && (
              <button type="button" className="asmt-btn" onClick={reload}>
                <RotateCcw size={15} aria-hidden="true" /> إعادة المحاولة
              </button>
            )}
            <Link className="asmt-btn asmt-btn-light" to={ASSESSMENTS_PATH}>
              العودة إلى التقييمات
            </Link>
          </div>
        </div>
      </div>
    );
  }

  if (status === "completed") {
    return (
      <div className="asmt-page" dir="rtl">
        <BackLink />
        <Results session={session} />
      </div>
    );
  }

  if (status === "grading") {
    const graded = session.grading?.graded ?? 0;
    const total = session.grading?.total ?? session.answered_count ?? 0;
    return (
      <div className="asmt-page" dir="rtl">
        <BackLink />
        <div className="asmt-bar">
          <div>
            <h1>{session.title}</h1>
            <span className="asmt-progress">
              {session.ended_by_timeout ? "انتهى الوقت؛ تُصحَّح الإجابات المحفوظة فقط. " : "أُرسلت كل الإجابات. "}
              صُحح {graded} من {total}.
            </span>
          </div>
        </div>
        {gradingError ? (
          <div className="asmt-alert" role="alert">
            <h2>
              <TriangleAlert size={16} aria-hidden="true" /> تعذر إكمال التصحيح الآن
            </h2>
            <p>{gradingError.message}</p>
            <p>إجاباتك محفوظة كما هي، ولن تحتاج إلى إعادة التقييم.</p>
            <button type="button" className="asmt-btn asmt-btn-light" onClick={retryGrading}>
              <RotateCcw size={15} aria-hidden="true" /> إعادة محاولة التصحيح
            </button>
          </div>
        ) : (
          <div className="asmt-working" role="status" aria-live="polite">
            <span className="asmt-spinner" aria-hidden="true" />
            <span>يُصحح الذكاء الاصطناعي إجاباتك وفق معايير كل سؤال، ثم تُحسب نتيجة كل مهارة. لا تغلق الصفحة.</span>
          </div>
        )}
      </div>
    );
  }

  const progress = progressView(session);
  const steps = questionSteps(session);
  const question = session.current_question;
  const low = remaining <= 120;

  return (
    <div className="asmt-page qs-page" dir="rtl">
      <BackLink />
      <section className="qs-shell" aria-labelledby="qs-title">
        <header className="qs-head">
          <div className="qs-title">
            <h1 id="qs-title">{session.title}</h1>
            <bdi>{requestedSkillsText(session)}</bdi>
          </div>
          <div className={`qs-timer ${low ? "qs-timer-low" : ""}`} role="timer" aria-label={`الوقت المتبقي ${formatClock(remaining)}`}>
            <small>الوقت المتبقي</small>
            <b>{formatClock(remaining)}</b>
          </div>
          <div className="qs-progress">
            <span>
              السؤال {progress.current} من {progress.total}
            </span>
            <div
              className="qs-segments"
              role="progressbar"
              aria-valuemin={0}
              aria-valuemax={progress.total}
              aria-valuenow={progress.answered}
              aria-label="الأسئلة المجاب عنها"
            >
              {steps.map((step) => (
                <span key={step.position} className={`qs-seg qs-seg-${step.status}`} />
              ))}
            </div>
          </div>
        </header>
        <p className="asmt-visually-hidden" aria-live="polite">
          {remaining > 0 && remaining <= 60 ? "بقيت دقيقة واحدة أو أقل." : remaining > 0 && remaining <= 300 ? "بقيت خمس دقائق أو أقل." : ""}
        </p>

        {question ? (
          <QuestionForm
            key={question.id}
            sessionId={session.id}
            question={question}
            steps={steps}
            isLast={progress.current === progress.total}
            timeUp={timeUp}
            online={online}
            onAnswered={applySession}
            onReload={reload}
          />
        ) : (
          <div className="qs-empty" role="alert">
            <TriangleAlert size={22} aria-hidden="true" />
            <p>تعذر عرض السؤال الحالي. إجاباتك السابقة محفوظة.</p>
            <button type="button" className="qs-next" onClick={reload}>
              <RotateCcw size={15} aria-hidden="true" /> تحديث
            </button>
          </div>
        )}
      </section>
    </div>
  );
}
