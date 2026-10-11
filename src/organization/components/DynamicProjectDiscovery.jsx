import { useCallback, useEffect, useRef, useState } from "react";
import { Bot, Check, LoaderCircle, RotateCcw } from "lucide-react";
import { useNavigate, useParams } from "react-router-dom";

import ProjectFlowStepper from "./ProjectFlowStepper";
import { Skeleton, SkeletonGroup } from "./Skeleton";
import {
  analyzeProjectRequest,
  getNextDiscoveryQuestion,
  submitDiscoveryAnswer,
} from "../services/organizationService";
import "../styles/DynamicProjectDiscovery.css";

const CHOICE_TYPES = ["single_choice", "multi_choice"];
const YES_NO_OPTIONS = [
  { value: true, label_ar: "نعم" },
  { value: false, label_ar: "لا" },
];

const isEmptyAnswer = (answer) =>
  answer === "" || (Array.isArray(answer) && answer.length === 0);

// يحوّل الإجابة المحفوظة إلى نص مقروء بنفس تسميات الخيارات
const formatAnswer = (item) => {
  const values = Array.isArray(item.selected_answer)
    ? item.selected_answer
    : [item.selected_answer];
  const labels = new Map(
    (item.question?.options || []).map((option) => [option.value, option.label_ar]),
  );
  const text = values
    .map((value) => {
      if (value === true) return "نعم";
      if (value === false) return "لا";
      return labels.get(value) || value;
    })
    .filter((value) => value !== null && value !== "")
    .join("، ");

  return item.custom_answer ? `${text} — ${item.custom_answer}` : text;
};

function ChatMessage({ role, children }) {
  return (
    <li className={`dc-msg dc-msg-${role}`}>
      <span className="dc-msg-author">
        {role === "assistant" ? (
          <>
            <Bot size={12} aria-hidden="true" /> المساعد
          </>
        ) : (
          "أنت"
        )}
      </span>
      <div className="dc-msg-text">{children}</div>
    </li>
  );
}

function AnswerSuggestions({ question, answer, onToggle, disabled }) {
  const options = question.type === "yes_no" ? YES_NO_OPTIONS : question.options;
  if (!options?.length) return null;

  const selected = Array.isArray(answer) ? answer : [answer];

  return (
    <div
      className="dc-chips"
      role="group"
      aria-label={question.type === "multi_choice" ? "اختر إجابة أو أكثر" : "اختر إجابة"}
    >
      {options.map((option) => {
        const active = selected.includes(option.value);
        return (
          <button
            key={String(option.value)}
            type="button"
            className={`dc-chip ${active ? "dc-chip-active" : ""}`}
            aria-pressed={active}
            onClick={() => onToggle(option)}
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

function DynamicProjectDiscovery() {
  const { id: projectId } = useParams();
  const navigate = useNavigate();

  const [state, setState] = useState(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [validationError, setValidationError] = useState("");
  const [answer, setAnswer] = useState("");
  const [customAnswer, setCustomAnswer] = useState("");
  const [proposalError, setProposalError] = useState("");
  const lockRef = useRef(false);
  const questionIdRef = useRef(null);
  const threadRef = useRef(null);

  const question = state?.status === "question" ? state.question : null;
  const history = state?.history || [];
  const answeredCount = history.filter((item) => item.answered_at).length;
  const customOption = question?.options?.find((option) => option.allows_custom_text);
  const isChoice = CHOICE_TYPES.includes(question?.type);

  const applyState = useCallback((nextState) => {
    // لا نمسح المسودة إلا عند الانتقال إلى سؤال مختلف
    if (questionIdRef.current !== (nextState.question?.id || null)) {
      setAnswer("");
      setCustomAnswer("");
      setValidationError("");
    }
    questionIdRef.current = nextState.question?.id || null;
    setState(nextState);
    setError("");
  }, []);

  // قفل واحد يمنع طلبات متزامنة (جلب سؤال/إرسال إجابة/إعداد مقترح)
  const runExclusive = useCallback(async (task) => {
    if (lockRef.current) return;
    lockRef.current = true;
    setBusy(true);
    try {
      await task();
    } finally {
      lockRef.current = false;
      setBusy(false);
    }
  }, []);

  const refresh = useCallback(
    () =>
      runExclusive(async () => {
        try {
          applyState(await getNextDiscoveryQuestion(projectId));
        } catch (loadError) {
          setError(loadError.message || "تعذر تحميل السؤال التالي حاليًا.");
        }
      }),
    [applyState, projectId, runExclusive],
  );

  useEffect(() => {
    let active = true;
    lockRef.current = true;

    getNextDiscoveryQuestion(projectId)
      .then((result) => active && applyState(result))
      .catch(
        (loadError) =>
          active && setError(loadError.message || "تعذر بدء جلسة الاكتشاف حاليًا."),
      )
      .finally(() => {
        lockRef.current = false;
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, [applyState, projectId]);

  useEffect(() => {
    const thread = threadRef.current;
    if (thread) thread.scrollTop = thread.scrollHeight;
  }, [history.length, busy, state?.status]);

  const toggleOption = (option) => {
    setValidationError("");
    if (question.type !== "multi_choice") {
      const next = answer === option.value ? "" : option.value;
      setAnswer(next);
      if (!option.allows_custom_text || next === "") setCustomAnswer("");
      return;
    }

    const current = Array.isArray(answer) ? answer : [];
    const next = current.includes(option.value)
      ? current.filter((value) => value !== option.value)
      : [...current, option.value];
    setAnswer(next);
    if (customOption && !next.includes(customOption.value)) setCustomAnswer("");
  };

  // الكتابة في سؤال اختيار تعني اختيار "أخرى" وإضافة توضيح لها
  const handleCustomText = (value) => {
    setValidationError("");
    setCustomAnswer(value);
    if (!customOption || !value.trim()) return;
    if (question.type === "multi_choice") {
      const current = Array.isArray(answer) ? answer : [];
      if (!current.includes(customOption.value)) setAnswer([...current, customOption.value]);
    } else if (answer !== customOption.value) {
      setAnswer(customOption.value);
    }
  };

  const submit = (event) => {
    event.preventDefault();
    if (!question || lockRef.current) return;

    if (isEmptyAnswer(answer)) {
      setValidationError("أكمل إجابتك للمتابعة.");
      return;
    }
    const customSelected =
      customOption &&
      (Array.isArray(answer) ? answer.includes(customOption.value) : answer === customOption.value);
    if (customSelected && !customAnswer.trim()) {
      setValidationError("أخبرنا بالمزيد عن اختيارك.");
      return;
    }

    const payload = {
      question_id: question.id,
      selected_answer:
        question.type === "number" ? Number(answer) : typeof answer === "string" ? answer.trim() : answer,
      ...(customSelected ? { custom_answer: customAnswer.trim() } : {}),
    };

    runExclusive(async () => {
      try {
        applyState(await submitDiscoveryAnswer(projectId, payload));
      } catch (submitError) {
        if (submitError.status === 422) {
          const fieldErrors = submitError.errors || {};
          setValidationError(
            fieldErrors.custom_answer?.[0] ||
              fieldErrors.selected_answer?.[0] ||
              submitError.message ||
              "تحقق من إجابتك وحاول مرة أخرى.",
          );
          return;
        }
        // الإجابة قد تكون حُفظت قبل فشل توليد السؤال التالي، فنُبقيها في الحقل
        // لأن إعادة إرسالها نفسها آمنة، ونعرض خيار إعادة المحاولة
        setError(submitError.message || "تعذر حفظ إجابتك حاليًا.");
        if (submitError.status === 409) {
          try {
            applyState(await getNextDiscoveryQuestion(projectId));
          } catch {
            // يبقى الخطأ ظاهرًا مع زر إعادة المحاولة
          }
        }
      }
    });
  };

  const generateProposal = () =>
    runExclusive(async () => {
      setProposalError("");
      try {
        await analyzeProjectRequest(projectId);
        navigate(`/organization/requests/${projectId}/proposal`);
      } catch (analyzeError) {
        setProposalError(
          analyzeError.message ||
            "تعذر إعداد المقترح حاليًا. إجاباتك محفوظة، ويمكنك المحاولة مرة أخرى.",
        );
      }
    });

  const renderComposerField = () => {
    const common = {
      className: "dc-input",
      disabled: busy,
      "aria-label": question.text_ar,
    };

    if (isChoice) {
      return (
        <input
          {...common}
          type="text"
          maxLength={2000}
          value={customAnswer}
          onChange={(event) => handleCustomText(event.target.value)}
          disabled={busy || !customOption}
          placeholder={
            customOption ? "اكتب إجابتك أو اختر اقتراحًا..." : "اختر اقتراحًا من الأعلى"
          }
        />
      );
    }
    if (question.type === "yes_no") {
      return <input {...common} type="text" disabled placeholder="اختر نعم أو لا" />;
    }

    const change = (event) => {
      setValidationError("");
      setAnswer(event.target.value);
    };

    if (question.type === "long_text") {
      return (
        <textarea
          {...common}
          rows={3}
          maxLength={10000}
          value={answer}
          onChange={change}
          placeholder="اكتب إجابتك..."
        />
      );
    }

    const type = { number: "number", date: "date" }[question.type] || "text";
    return (
      <input
        {...common}
        type={type}
        min={type === "number" ? "0" : undefined}
        step={type === "number" ? "any" : undefined}
        maxLength={type === "text" ? 2000 : undefined}
        value={answer}
        onChange={change}
        placeholder={type === "number" ? "أدخل رقمًا" : "اكتب إجابتك..."}
      />
    );
  };

  const counter =
    state?.status === "complete"
      ? "اكتملت الأسئلة"
      : question
        ? `السؤال ${answeredCount + 1}`
        : null;

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
              <div className="dc-chips">
                {[0, 1, 2].map((chip) => (
                  <Skeleton key={chip} width={96} height={30} radius={999} />
                ))}
              </div>
              <div className="dc-composer">
                <Skeleton height={42} radius={8} />
                <Skeleton width={80} height={42} radius={6} />
              </div>
            </div>
          </SkeletonGroup>
        ) : !state ? (
          <div className="dc-state" role="alert">
            <p>{error || "تعذر بدء جلسة الاكتشاف حاليًا."}</p>
            <button className="dc-send" type="button" onClick={refresh} disabled={busy}>
              <RotateCcw size={15} aria-hidden="true" /> إعادة المحاولة
            </button>
          </div>
        ) : (
          <>
            <div className="dc-body">
              <ol className="dc-thread" ref={threadRef} aria-live="polite">
                {history.length === 0 && state.status !== "complete" && (
                  <li className="dc-empty">لا توجد أسئلة بعد.</li>
                )}

                {history.map((item) => (
                  <li className="dc-turn" key={`${item.sequence}-${item.question?.id}`}>
                    <ol>
                      <ChatMessage role="assistant">{item.question?.text_ar}</ChatMessage>
                      {item.answered_at && (
                        <ChatMessage role="user">{formatAnswer(item)}</ChatMessage>
                      )}
                    </ol>
                  </li>
                ))}

                {state.status === "complete" && (
                  <ChatMessage role="assistant">
                    شكرًا لك! اكتملت الأسئلة وأصبح لدينا ما يكفي لإعداد مسودة المقترح.
                    المسودة أولية ويمكنك مراجعتها وتعديلها قبل الاعتماد.
                  </ChatMessage>
                )}

                {busy && state.status !== "complete" && (
                  <li className="dc-msg dc-msg-assistant dc-typing" role="status">
                    <span className="dc-msg-author">
                      <Bot size={12} aria-hidden="true" /> المساعد
                    </span>
                    <div className="dc-msg-text">
                      <LoaderCircle className="dc-spin" size={14} aria-hidden="true" />
                      نحفظ إجابتك ونجهّز السؤال التالي...
                    </div>
                  </li>
                )}
              </ol>

              <aside className="dc-topics" aria-label="محاور الفهم">
                <h2>محاور الفهم</h2>
                {history.length === 0 ? (
                  <p className="dc-topics-empty">ستظهر هنا المحاور التي نناقشها.</p>
                ) : (
                  <ul>
                    {history.map((item) => {
                      const current = !item.answered_at && item.question?.id === question?.id;
                      return (
                        <li
                          key={`${item.sequence}-${item.question?.id}`}
                          className={
                            item.answered_at ? "dc-topic-done" : current ? "dc-topic-current" : ""
                          }
                          title={item.question?.text_ar}
                        >
                          <span className="dc-topic-mark" aria-hidden="true">
                            {item.answered_at ? <Check size={13} strokeWidth={3} /> : null}
                          </span>
                          <span className="dc-topic-text">{item.question?.text_ar}</span>
                        </li>
                      );
                    })}
                  </ul>
                )}
              </aside>
            </div>

            {error && (
              <div className="dc-alert" role="alert">
                <p>{error} إجاباتك المحفوظة لن تضيع.</p>
                <button type="button" onClick={refresh} disabled={busy}>
                  <RotateCcw size={14} aria-hidden="true" /> إعادة المحاولة
                </button>
              </div>
            )}

            {state.status === "complete" ? (
              <footer className="dc-footer">
                {proposalError && (
                  <p className="dc-validation" role="alert">
                    {proposalError}
                  </p>
                )}
                <div className="dc-complete-actions">
                  <button className="dc-send" type="button" onClick={generateProposal} disabled={busy}>
                    {busy ? "جارٍ إعداد مسودة المقترح..." : "إعداد مسودة المقترح"}
                  </button>
                  <button
                    className="dc-secondary"
                    type="button"
                    onClick={() => navigate("/organization/dashboard")}
                    disabled={busy}
                  >
                    العودة لاحقًا
                  </button>
                </div>
              </footer>
            ) : question ? (
              <form className="dc-footer" onSubmit={submit}>
                <AnswerSuggestions
                  question={question}
                  answer={answer}
                  onToggle={toggleOption}
                  disabled={busy}
                />
                <div className="dc-composer">
                  {renderComposerField()}
                  <button className="dc-send" type="submit" disabled={busy}>
                    {busy ? <LoaderCircle className="dc-spin" size={16} aria-hidden="true" /> : null}
                    إرسال
                  </button>
                </div>
                {validationError && (
                  <p className="dc-validation" role="alert">
                    {validationError}
                  </p>
                )}
                <p className="dc-hint">يمكنك الخروج والعودة لاحقًا، المحادثة تحفظ تلقائيًا.</p>
              </form>
            ) : null}
          </>
        )}
      </section>
    </div>
  );
}

export default DynamicProjectDiscovery;
