import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import { ArrowDown, Bot, Check, FileText, LoaderCircle, RotateCcw, Send } from "lucide-react";
import { Link, useNavigate, useParams, useSearchParams } from "react-router-dom";

import ProjectFlowStepper from "./ProjectFlowStepper";
import { Skeleton, SkeletonGroup } from "./Skeleton";
import { FindingsSummary, RequirementsPanel } from "./DiscoveryFindings";
import { useAuth } from "../../shared/auth/useAuth";
import {
  analyzeProjectRequest,
  getNextDiscoveryQuestion,
  requestRevision,
  submitDiscoveryAnswer,
} from "../services/organizationService";
import {
  CHOICE_TYPES,
  REVISION_MAX_LENGTH,
  YES_NO_OPTIONS,
  buildAnswer,
  composerPlaceholder,
  emptySelection,
  formatAnswer,
  maxLengthFor,
  validateRevision,
} from "../utils/discoveryAnswers";
import { describeDiscoveryFailure } from "../utils/discoveryErrors";
import "../styles/DynamicProjectDiscovery.css";

const WAIT_LABELS = {
  answer: "جاري تحليل إجابتك وتجهيز السؤال التالي",
  revision: "جاري فهم التعديل وتحديث المتطلبات",
  resume: "جاري متابعة المحادثة",
};
const SLOW_HINT_AFTER_MS = 15000;
const NEAR_BOTTOM_PX = 80;
const DEFAULT_COMPLETION =
  "شكرًا لك! أصبح لدينا ما يكفي لإعداد مسودة المقترح. المسودة أولية ويمكنك مراجعتها وتعديلها قبل الاعتماد.";

// تفاصيل الفشل (الحالة، الرمز، معرّف الطلب، تشخيص الخادم في وضع debug) تظهر في وحدة التحكم
// أثناء التطوير فقط؛ المؤسسة ترى رسالة عربية آمنة
const describeFailure = (failure) => {
  const info = describeDiscoveryFailure(failure);
  if (import.meta.env.DEV) {
    console.warn("[discovery] request failed", {
      status: failure?.status,
      kind: failure?.kind,
      code: info.code,
      requestId: info.requestId,
      answerSaved: info.answerSaved,
      debug: failure?.data?.debug,
    });
  }
  return info;
};

const alertFrom = (info) => ({
  message: info.message,
  action: info.action,
  persistent: info.persistent,
  requestId: info.requestId,
});

const hasSelection = (selection) =>
  Array.isArray(selection) ? selection.length > 0 : selection !== null && selection !== "";

function AssistantBubble({ children, className = "" }) {
  return (
    <div className={`dc-msg dc-msg-assistant ${className}`}>
      <span className="dc-msg-author">
        <Bot size={12} aria-hidden="true" /> المساعد
      </span>
      {children}
    </div>
  );
}

function UserBubble({ text, status, onRetry, disabled }) {
  return (
    <div className={`dc-msg dc-msg-user ${status === "failed" ? "dc-msg-failed" : ""}`}>
      <span className="dc-msg-author">أنت</span>
      <p className="dc-msg-text" dir="auto">
        {text}
      </p>
      {status === "sending" && <span className="dc-msg-status">جارٍ الإرسال...</span>}
      {status === "failed" && (
        <span className="dc-msg-status">
          لم يكتمل الإرسال.
          <button type="button" className="dc-inline-retry" onClick={onRetry} disabled={disabled}>
            <RotateCcw size={12} aria-hidden="true" /> إعادة الإرسال
          </button>
        </span>
      )}
    </div>
  );
}

function Suggestions({ question, selection, onSelect, disabled }) {
  if (question.type === "date") {
    return (
      <label className="dc-date">
        <span>اختر تاريخًا:</span>
        <input
          type="date"
          value={selection || ""}
          onChange={(event) => onSelect(event.target.value || null)}
          disabled={disabled}
        />
      </label>
    );
  }

  const options = question.type === "yes_no" ? YES_NO_OPTIONS : question.options;
  if (!CHOICE_TYPES.includes(question.type) && question.type !== "yes_no") return null;
  if (!options?.length) return null;

  const selected = Array.isArray(selection) ? selection : [selection];

  return (
    <div
      className="dc-chips"
      role="group"
      aria-label={question.type === "multi_choice" ? "اقتراحات (يمكن اختيار أكثر من واحد)" : "اقتراحات"}
    >
      {options.map((option) => {
        const active = selected.includes(option.value);
        return (
          <button
            key={String(option.value)}
            type="button"
            className={`dc-chip ${active ? "dc-chip-active" : ""}`}
            aria-pressed={active}
            onClick={() => onSelect(option.value)}
            disabled={disabled}
          >
            {active && <Check size={13} aria-hidden="true" />}
            {option.label_ar}
          </button>
        );
      })}
    </div>
  );
}

function TypingIndicator({ label, slow }) {
  return (
    <li className="dc-turn">
      <AssistantBubble className="dc-typing">
        <span className="dc-typing-row" role="status">
          <span className="dc-dots" aria-hidden="true">
            <i />
            <i />
            <i />
          </span>
          {label}...
        </span>
        {slow && <span className="dc-slow">قد يستغرق ذلك حتى دقيقة. لا داعي لإعادة الإرسال.</span>}
      </AssistantBubble>
    </li>
  );
}

function DynamicProjectDiscovery() {
  const { id: projectId } = useParams();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { logout } = useAuth();
  const reviseRequested = searchParams.get("revise") === "1";

  const [state, setState] = useState(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(null);
  const [waiting, setWaiting] = useState(null);
  const [slow, setSlow] = useState(false);
  const [pending, setPending] = useState(null);
  const [error, setError] = useState(null);
  const [draft, setDraft] = useState("");
  const [selection, setSelection] = useState(null);
  const [validationError, setValidationError] = useState("");
  const [proposalBusy, setProposalBusy] = useState(false);
  const [proposalError, setProposalError] = useState("");
  const [showFindings, setShowFindings] = useState(false);
  const [atBottom, setAtBottom] = useState(true);
  const [cooldown, setCooldown] = useState(0);
  const lockRef = useRef(false);
  const atBottomRef = useRef(true);
  const questionIdRef = useRef(null);
  const threadRef = useRef(null);
  const composerRef = useRef(null);

  const question = state?.status === "question" ? state.question : null;
  const history = state?.history || [];
  const requirements = state?.requirements;
  const complete = state?.status === "complete";
  const hasProposal = Boolean(state?.has_proposal);
  const mode = question ? "answer" : complete && hasProposal ? "revision" : null;
  const busy = waiting !== null || proposalBusy;
  const answeredCount = history.filter((item) => item.answered_at).length;

  const applyState = useCallback((nextState) => {
    const nextQuestionId = nextState.status === "question" ? nextState.question?.id || null : null;
    // المسودة تُمسح فقط عند الانتقال إلى سؤال مختلف
    if (questionIdRef.current !== nextQuestionId) {
      setDraft("");
      setSelection(emptySelection(nextState.question?.type));
      setValidationError("");
    }
    questionIdRef.current = nextQuestionId;
    setState(nextState);
    setError(null);
  }, []);

  // يعرض الفشل مع مهلة إعادة المحاولة التي يحددها الخادم (مثل حد الطلبات) إن وُجدت
  const showFailure = useCallback((info) => {
    setError(alertFrom(info));
    setCooldown(info.retryAfter || 0);
  }, []);

  useEffect(() => {
    if (cooldown <= 0) return undefined;
    const timer = setTimeout(() => setCooldown((seconds) => seconds - 1), 1000);
    return () => clearTimeout(timer);
  }, [cooldown]);

  // قفل واحد يمنع أي طلبين متزامنين (إرسال/متابعة/إعداد المقترح)
  const runExclusive = useCallback(async (task) => {
    if (lockRef.current) return;
    lockRef.current = true;
    try {
      await task();
    } finally {
      lockRef.current = false;
    }
  }, []);

  useEffect(() => {
    let active = true;
    lockRef.current = true;

    getNextDiscoveryQuestion(projectId)
      .then((result) => active && applyState(result))
      .catch((failure) => {
        if (!active) return;
        const info = describeFailure(failure);
        // الخادم يرسل المحادثة المحفوظة مع الفشل، فنعرضها مع التنبيه بدل صفحة خطأ فارغة
        if (info.snapshot) {
          applyState(info.snapshot);
          showFailure(info);
        } else {
          setLoadError(alertFrom(info));
        }
      })
      .finally(() => {
        lockRef.current = false;
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, [applyState, projectId, showFailure]);

  // تلميح عند تأخر الرد، دون مؤشر لا ينتهي: الطلب نفسه له مهلة في طبقة الخدمة
  useEffect(() => {
    if (!waiting) return undefined;
    const timer = setTimeout(() => setSlow(true), SLOW_HINT_AFTER_MS);
    return () => {
      clearTimeout(timer);
      setSlow(false);
    };
  }, [waiting]);

  const scrollToBottom = useCallback((smooth = true) => {
    const thread = threadRef.current;
    if (!thread) return;
    thread.scrollTo({ top: thread.scrollHeight, behavior: smooth ? "smooth" : "auto" });
    atBottomRef.current = true;
    setAtBottom(true);
  }, []);

  // ننزل لآخر رسالة فقط إذا كان المستخدم أصلًا في الأسفل، حتى لا نقاطع قراءته
  useLayoutEffect(() => {
    if (atBottomRef.current) scrollToBottom(false);
  }, [history.length, pending, waiting, state?.status, scrollToBottom]);

  const handleThreadScroll = (event) => {
    const thread = event.currentTarget;
    const near = thread.scrollHeight - thread.scrollTop - thread.clientHeight < NEAR_BOTTOM_PX;
    atBottomRef.current = near;
    setAtBottom(near);
  };

  // التركيز على مربع الكتابة عند سؤال جديد أو عند القدوم من صفحة المقترح للتعديل
  useEffect(() => {
    if (!loading && mode && !busy) composerRef.current?.focus({ preventScroll: true });
  }, [loading, mode, busy, question?.id, reviseRequested]);

  // تكبير مربع الكتابة تلقائيًا مع النص
  useLayoutEffect(() => {
    const input = composerRef.current;
    if (!input) return;
    input.style.height = "auto";
    input.style.height = `${Math.min(input.scrollHeight, 180)}px`;
  }, [draft, mode]);

  const resume = () =>
    runExclusive(async () => {
      setError(null);
      setWaiting("resume");
      try {
        applyState(await getNextDiscoveryQuestion(projectId));
        setLoadError(null);
      } catch (failure) {
        const info = describeFailure(failure);
        if (info.snapshot) applyState(info.snapshot);
        if (state || info.snapshot) showFailure(info);
        else setLoadError(alertFrom(info));
      } finally {
        setWaiting(null);
      }
    });

  const submitAnswer = (built, { retry = false } = {}) =>
    runExclusive(async () => {
      const savedDraft = draft;
      const savedSelection = selection;
      setValidationError("");
      setError(null);
      setPending({ kind: "answer", text: built.display, payload: built.payload, status: "sending" });
      if (!retry) setDraft("");
      atBottomRef.current = true;
      setWaiting("answer");

      try {
        const next = await submitDiscoveryAnswer(projectId, built.payload);
        setPending(null);
        applyState(next);
      } catch (failure) {
        if (failure?.status === 422) {
          // خطأ في الإجابة نفسها: نعيدها إلى مربع الكتابة ليصححها المستخدم
          setPending(null);
          if (!retry) {
            setDraft(savedDraft);
            setSelection(savedSelection);
          }
          setValidationError(
            failure.errors?.custom_answer?.[0] ||
              failure.errors?.selected_answer?.[0] ||
              failure.message,
          );
        } else if (failure?.status === 409) {
          // السؤال لم يعد الحالي (مثلًا أُجيب من تبويب آخر): نعرض الحالة المحفوظة
          setPending(null);
          try {
            applyState(await getNextDiscoveryQuestion(projectId));
          } catch {
            // يبقى التنبيه ظاهرًا
          }
          setError({ message: failure.message, action: null });
        } else {
          const info = describeFailure(failure);
          if (info.answerSaved && info.snapshot) {
            // الإجابة محفوظة وتظهر في السجل؛ إعادة المحاولة تتابع المحادثة دون إرسالها مجددًا
            applyState(info.snapshot);
            setPending(null);
          } else {
            // لم يؤكد الخادم الحفظ: تبقى الرسالة هنا، وإعادة إرسالها نفسها آمنة ولا تكرر الحفظ
            setPending((current) => current && { ...current, status: "failed" });
          }
          showFailure(info);
        }
      } finally {
        setWaiting(null);
      }
    });

  const submitRevision = (note, { posted = false } = {}) =>
    runExclusive(async () => {
      let alreadyPosted = posted;
      setValidationError("");
      setError(null);
      setPending({ kind: "revision", text: note, status: "sending", posted: alreadyPosted });
      setDraft("");
      atBottomRef.current = true;
      setWaiting("revision");

      try {
        if (!alreadyPosted) {
          await requestRevision(projectId, { note });
          alreadyPosted = true;
          setPending((current) => current && { ...current, posted: true });
        }
        const next = await getNextDiscoveryQuestion(projectId);
        setPending(null);
        applyState(next);
      } catch (failure) {
        if (!alreadyPosted && failure?.status === 422) {
          setPending(null);
          setDraft(note);
          setValidationError(failure.errors?.note?.[0] || failure.message);
        } else if (!alreadyPosted && failure?.status === 409) {
          setPending(null);
          setDraft(note);
          try {
            applyState(await getNextDiscoveryQuestion(projectId));
          } catch {
            // يبقى التنبيه ظاهرًا
          }
          setError({ message: failure.message, action: null });
        } else {
          const info = describeFailure(failure);
          if (alreadyPosted && info.snapshot) {
            // طلب التعديل محفوظ ويظهر في المحادثة؛ إعادة المحاولة تكمل معالجته فقط
            applyState(info.snapshot);
            setPending(null);
          } else {
            // إن حُفظ طلب التعديل نكتفي عند إعادة المحاولة بمتابعة المحادثة دون تكراره
            setPending((current) => current && { ...current, status: "failed", posted: alreadyPosted });
          }
          showFailure(info);
        }
      } finally {
        setWaiting(null);
      }
    });

  const retryPending = () => {
    if (!pending) return resume();
    if (pending.kind === "revision") return submitRevision(pending.text, { posted: pending.posted });
    return submitAnswer({ payload: pending.payload, display: pending.text }, { retry: true });
  };

  const handleSubmit = (event) => {
    event.preventDefault();
    if (busy || lockRef.current || pending) return;

    if (mode === "answer") {
      const built = buildAnswer(question, selection, draft);
      if (built.error) {
        setValidationError(built.error);
        return;
      }
      submitAnswer(built);
    } else if (mode === "revision") {
      const checked = validateRevision(draft);
      if (checked.error) {
        setValidationError(checked.error);
        return;
      }
      submitRevision(checked.note);
    }
  };

  const handleKeyDown = (event) => {
    // Enter للإرسال وShift+Enter لسطر جديد؛ لا نرسل أثناء كتابة IME
    if (event.key === "Enter" && !event.shiftKey && !event.nativeEvent.isComposing) {
      event.preventDefault();
      event.currentTarget.form?.requestSubmit();
    }
  };

  const handleSelect = (value) => {
    setValidationError("");
    if (question.type === "multi_choice") {
      setSelection((current) => {
        const values = Array.isArray(current) ? current : [];
        return values.includes(value) ? values.filter((item) => item !== value) : [...values, value];
      });
      return;
    }
    if (question.type === "date") {
      setSelection(value);
      return;
    }
    setSelection((current) => (current === value ? null : value));
  };

  const generateProposal = () =>
    runExclusive(async () => {
      setProposalBusy(true);
      setProposalError("");
      try {
        await analyzeProjectRequest(projectId);
        navigate(`/organization/requests/${projectId}/proposal`);
      } catch (failure) {
        setProposalError(
          failure?.message || "تعذر إعداد المقترح حاليًا. إجاباتك محفوظة، ويمكنك المحاولة مرة أخرى.",
        );
      } finally {
        setProposalBusy(false);
      }
    });

  const relogin = async () => {
    await logout();
    navigate("/login", { replace: true, state: { from: `/organization/requests/${projectId}/intake` } });
  };

  const canSend =
    mode === "answer"
      ? draft.trim() !== "" || hasSelection(selection)
      : mode === "revision" && draft.trim() !== "";
  const proposalActionLabel = hasProposal ? "تحديث المقترح" : "إعداد مسودة المقترح";
  const counter = requirements?.tracked
    ? `${requirements.covered_count} من ${requirements.total} محاور مفهومة`
    : complete
      ? "اكتملت المحادثة"
      : question
        ? `السؤال ${answeredCount + 1}`
        : null;

  const renderTurn = (item) => {
    if (item.kind === "revision") {
      return (
        <li className="dc-turn" key={`${item.sequence}-${item.question?.id}`}>
          <p className="dc-divider">
            <span>طلب تعديل على المقترح</span>
          </p>
          {item.answered_at && <UserBubble text={formatAnswer(item)} />}
        </li>
      );
    }

    const current = Boolean(question) && !item.answered_at && item.question?.id === question.id;
    return (
      <li className="dc-turn" key={`${item.sequence}-${item.question?.id}`}>
        <AssistantBubble>
          {item.assistant_reply && (
            <p className="dc-reply" dir="auto">
              {item.assistant_reply}
            </p>
          )}
          <p className="dc-question" dir="auto">
            {item.question?.text_ar}
          </p>
          {item.question?.why_ar && <p className="dc-why">{item.question.why_ar}</p>}
          {current && (
            <Suggestions
              question={question}
              selection={selection}
              onSelect={handleSelect}
              disabled={busy || Boolean(pending)}
            />
          )}
        </AssistantBubble>
        {item.answered_at ? (
          <UserBubble text={formatAnswer(item)} />
        ) : item.skipped ? (
          <p className="dc-skipped">تم تجاوز هذا السؤال عند إعداد المقترح.</p>
        ) : null}
      </li>
    );
  };

  return (
    <div className="dc" dir="rtl">
      <ProjectFlowStepper current={1} />

      <section className="dc-card" aria-busy={loading || busy}>
        <header className="dc-header">
          <h1>
            Traino <span>مساعد GoTrainee</span>
          </h1>
          {counter && <span className="dc-counter">{counter}</span>}
        </header>

        {loading ? (
          <SkeletonGroup label="نجهّز جلسة الأسئلة">
            <div className="dc-body">
              <div className="dc-sk-thread">
                <Skeleton className="dc-sk-bubble" width="62%" height={78} radius={10} />
                <Skeleton className="dc-sk-bubble dc-sk-user" width="30%" height={54} radius={10} />
                <Skeleton className="dc-sk-bubble" width="55%" height={64} radius={10} />
              </div>
              <div className="dc-topics">
                <Skeleton width="70%" height={16} className="dc-sk-center" />
                {[0, 1, 2, 3, 4].map((row) => (
                  <Skeleton key={row} width={`${85 - row * 8}%`} height={13} className="dc-sk-topic" />
                ))}
              </div>
            </div>
            <div className="dc-footer">
              <div className="dc-composer">
                <Skeleton height={42} radius={8} />
                <Skeleton width={80} height={42} radius={6} />
              </div>
            </div>
          </SkeletonGroup>
        ) : !state ? (
          <div className="dc-state" role="alert">
            <p>{loadError?.message || "تعذر بدء جلسة الاكتشاف حاليًا."}</p>
            <p className="dc-muted">إجاباتك المحفوظة لن تضيع.</p>
            {loadError?.action === "login" ? (
              <button className="dc-send" type="button" onClick={relogin}>
                تسجيل الدخول مجددًا
              </button>
            ) : (
              <button className="dc-send" type="button" onClick={resume} disabled={busy}>
                {busy ? (
                  <LoaderCircle className="dc-spin" size={15} aria-hidden="true" />
                ) : (
                  <RotateCcw size={15} aria-hidden="true" />
                )}
                إعادة المحاولة
              </button>
            )}
          </div>
        ) : (
          <>
            {question && requirements?.ready_for_proposal && (
              <div className="dc-ready" role="note">
                <p>
                  لدينا ما يكفي لإعداد {hasProposal ? "مقترح محدّث" : "مسودة أولية"}. يمكنك متابعة الإجابة
                  لتحسينها، أو المتابعة الآن وستُذكر النقاط غير المحسومة في المقترح.
                </p>
                <div className="dc-ready-actions">
                  <button
                    type="button"
                    className="dc-secondary"
                    onClick={() => setShowFindings((open) => !open)}
                    aria-expanded={showFindings}
                  >
                    {showFindings ? "إخفاء الملخص" : "مراجعة ما فهمناه"}
                  </button>
                  <button type="button" className="dc-send" onClick={generateProposal} disabled={busy || Boolean(pending)}>
                    {proposalBusy && <LoaderCircle className="dc-spin" size={15} aria-hidden="true" />}
                    {proposalBusy ? "جارٍ الإعداد..." : `${proposalActionLabel} الآن`}
                  </button>
                </div>
                {showFindings && <FindingsSummary requirements={requirements} />}
                {proposalError && (
                  <p className="dc-validation" role="alert">
                    {proposalError}
                  </p>
                )}
              </div>
            )}

            <div className="dc-body">
              <div className="dc-thread-wrap">
                <ol
                  className="dc-thread"
                  ref={threadRef}
                  onScroll={handleThreadScroll}
                  role="log"
                  aria-live="polite"
                  aria-relevant="additions"
                  aria-label="المحادثة مع المساعد"
                  tabIndex={0}
                >
                  {history.length === 0 && !pending && !complete && (
                    <li className="dc-empty">لا توجد رسائل بعد.</li>
                  )}

                  {history.map(renderTurn)}

                  {complete && !pending && (
                    <li className="dc-turn">
                      <AssistantBubble>
                        <p className="dc-reply" dir="auto">
                          {state.completion_message || DEFAULT_COMPLETION}
                        </p>
                      </AssistantBubble>
                    </li>
                  )}

                  {pending && (
                    <li className="dc-turn">
                      {pending.kind === "revision" && (
                        <p className="dc-divider">
                          <span>طلب تعديل على المقترح</span>
                        </p>
                      )}
                      <UserBubble
                        text={pending.text}
                        status={pending.status}
                        onRetry={retryPending}
                        disabled={busy}
                      />
                    </li>
                  )}

                  {waiting && <TypingIndicator label={WAIT_LABELS[waiting]} slow={slow} />}
                </ol>

                {!atBottom && (
                  <button type="button" className="dc-jump" onClick={() => scrollToBottom()}>
                    <ArrowDown size={14} aria-hidden="true" /> أحدث الرسائل
                  </button>
                )}
              </div>

              <RequirementsPanel requirements={requirements} currentArea={question?.area} />
            </div>

            {error && (
              <div className="dc-alert">
                {/* الرسالة وحدها منطقة إعلان، حتى لا يُعاد إعلان العدّ التنازلي كل ثانية */}
                <p role="alert">
                  {error.message}
                  {pending?.status === "failed" ? " رسالتك محفوظة هنا ويمكنك إعادة إرسالها." : ""}
                </p>
                <div className="dc-alert-actions">
                  {error.action === "retry" && (
                    <button type="button" onClick={retryPending} disabled={busy || cooldown > 0}>
                      <RotateCcw size={14} aria-hidden="true" />
                      {cooldown > 0 ? `إعادة المحاولة بعد ${cooldown} ثانية` : "إعادة المحاولة"}
                    </button>
                  )}
                  {error.action === "login" && (
                    <button type="button" onClick={relogin}>
                      تسجيل الدخول مجددًا
                    </button>
                  )}
                  {error.persistent && <Link to="/organization/requests">العودة إلى طلباتي</Link>}
                </div>
                {error.persistent && error.requestId && (
                  <p className="dc-alert-ref">
                    رمز المتابعة للدعم: <bdi dir="ltr">{error.requestId}</bdi>
                  </p>
                )}
              </div>
            )}

            {complete && (
              <div className="dc-complete">
                {!hasProposal && <FindingsSummary requirements={requirements} />}
                {proposalError && !question && (
                  <p className="dc-validation" role="alert">
                    {proposalError}
                  </p>
                )}
                <div className="dc-complete-actions">
                  {hasProposal && state.project_status === "proposal_ready" ? (
                    <Link className="dc-send" to={`/organization/requests/${projectId}/proposal`}>
                      <FileText size={15} aria-hidden="true" /> عرض المقترح الحالي
                    </Link>
                  ) : (
                    <button
                      className="dc-send"
                      type="button"
                      onClick={generateProposal}
                      disabled={busy || Boolean(pending)}
                    >
                      {proposalBusy && <LoaderCircle className="dc-spin" size={15} aria-hidden="true" />}
                      {proposalBusy
                        ? "جارٍ إعداد المقترح..."
                        : hasProposal
                          ? "تحديث المقترح بناءً على التعديلات"
                          : "إعداد مسودة المقترح"}
                    </button>
                  )}
                  <button
                    className="dc-secondary"
                    type="button"
                    onClick={() => navigate("/organization/dashboard")}
                    disabled={proposalBusy}
                  >
                    العودة لاحقًا
                  </button>
                </div>
              </div>
            )}

            {mode && (
              <form className="dc-footer" onSubmit={handleSubmit} noValidate>
                {mode === "revision" && (
                  <p className="dc-mode-hint">
                    اكتب ما تريد تعديله أو توضيحه في المقترح بكلماتك، وسيحدّث المساعد المتطلبات ويسألك فقط
                    إذا احتاج توضيحًا.
                  </p>
                )}
                <div className="dc-composer">
                  <label htmlFor="dc-composer-input" className="dc-visually-hidden">
                    {mode === "revision" ? "التعديل المطلوب على المقترح" : "إجابتك"}
                  </label>
                  <textarea
                    id="dc-composer-input"
                    ref={composerRef}
                    className="dc-input"
                    rows={1}
                    value={draft}
                    onChange={(event) => {
                      setDraft(event.target.value);
                      setValidationError("");
                    }}
                    onKeyDown={handleKeyDown}
                    placeholder={composerPlaceholder(mode, question)}
                    maxLength={mode === "revision" ? REVISION_MAX_LENGTH : maxLengthFor(question?.type)}
                    disabled={busy || Boolean(pending)}
                    aria-invalid={Boolean(validationError)}
                    aria-describedby={validationError ? "dc-composer-error dc-composer-help" : "dc-composer-help"}
                    dir="auto"
                  />
                  <button
                    className="dc-send"
                    type="submit"
                    disabled={busy || Boolean(pending) || !canSend}
                    aria-label="إرسال"
                  >
                    {waiting === "answer" || waiting === "revision" ? (
                      <LoaderCircle className="dc-spin" size={16} aria-hidden="true" />
                    ) : (
                      <Send size={16} aria-hidden="true" className="dc-send-icon" />
                    )}
                    <span>إرسال</span>
                  </button>
                </div>
                {validationError && (
                  <p className="dc-validation" role="alert" id="dc-composer-error">
                    {validationError}
                  </p>
                )}
                <p className="dc-hint" id="dc-composer-help">
                  Enter للإرسال وShift+Enter لسطر جديد. المحادثة تُحفظ تلقائيًا ويمكنك العودة لاحقًا.
                </p>
              </form>
            )}
          </>
        )}
      </section>
    </div>
  );
}

export default DynamicProjectDiscovery;
