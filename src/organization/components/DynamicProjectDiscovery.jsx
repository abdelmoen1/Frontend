import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Check, ChevronLeft, LoaderCircle, Sparkles } from "lucide-react";
import { useNavigate } from "react-router-dom";
import {
  analyzeProjectRequest,
  getNextDiscoveryQuestion,
  submitDiscoveryAnswer,
} from "../services/organizationService";

const INITIAL_ANSWER = "";

function DiscoveryQuestionInput({
  question,
  answer,
  setAnswer,
  customAnswer,
  setCustomAnswer,
}) {
  const choiceTypes = ["single_choice", "multi_choice"];
  const isChoice = choiceTypes.includes(question.type);
  const selectedValues = Array.isArray(answer)
    ? answer
    : answer === ""
      ? []
      : [answer];
  const customOptionSelected = isChoice
    && question.options.some(
      (option) => option.allows_custom_text && selectedValues.includes(option.value),
    );

  const toggleOption = (option) => {
    if (question.type === "single_choice") {
      setAnswer(selectedValues.includes(option.value) ? "" : option.value);
      if (!option.allows_custom_text) setCustomAnswer("");
      return;
    }

    const nextValues = selectedValues.includes(option.value)
      ? selectedValues.filter((value) => value !== option.value)
      : [...selectedValues, option.value];
    setAnswer(nextValues);
    if (!nextValues.some((value) =>
      question.options.some((item) => item.value === value && item.allows_custom_text)
    )) {
      setCustomAnswer("");
    }
  };

  if (question.type === "yes_no") {
    return (
      <div className="discovery-answer-options">
        {[
          { value: true, label: "نعم" },
          { value: false, label: "لا" },
        ].map((option) => (
          <button
            aria-pressed={answer === option.value}
            className={`project-option-card ${answer === option.value ? "selected" : ""}`}
            key={option.label}
            onClick={() => setAnswer(option.value)}
            type="button"
          >
            <span className="project-option-check">
              {answer === option.value ? <Check size={16} aria-hidden="true" /> : null}
            </span>
            {option.label}
          </button>
        ))}
      </div>
    );
  }

  if (isChoice) {
    return (
      <>
        <div className="project-option-grid">
          {question.options.map((option) => (
            <button
              aria-pressed={selectedValues.includes(option.value)}
              className={`project-option-card ${selectedValues.includes(option.value) ? "selected" : ""}`}
              key={option.value}
              onClick={() => toggleOption(option)}
              type="button"
            >
              <span className="project-option-check">
                {selectedValues.includes(option.value) ? (
                  <Check size={16} aria-hidden="true" />
                ) : null}
              </span>
              {option.label_ar}
            </button>
          ))}
        </div>
        {customOptionSelected && (
          <label className="project-field discovery-custom-answer">
            <span>أخبرنا بالمزيد</span>
            <textarea
              autoFocus
              maxLength={2000}
              onChange={(event) => setCustomAnswer(event.target.value)}
              placeholder="اكتب ما يناسب مؤسستك"
              rows={3}
              value={customAnswer}
            />
          </label>
        )}
      </>
    );
  }

  const inputProps = {
    autoFocus: true,
    maxLength: question.type === "short_text" ? 2000 : 10000,
    onChange: (event) => setAnswer(event.target.value),
    placeholder: "اكتب إجابتك هنا",
    value: answer,
  };

  if (question.type === "long_text") {
    return (
      <textarea
        {...inputProps}
        aria-label={question.text_ar}
        className="discovery-text-input"
        rows={5}
      />
    );
  }

  return (
    <input
      {...inputProps}
      aria-label={question.text_ar}
      className="discovery-text-input"
      maxLength={question.type === "date" || question.type === "number" ? undefined : inputProps.maxLength}
      min={question.type === "number" ? "0" : undefined}
      placeholder={question.type === "number" ? "أدخل رقمًا" : inputProps.placeholder}
      type={
        question.type === "number"
          ? "number"
          : question.type === "date"
            ? "date"
            : "text"
      }
    />
  );
}

function HistoryItem({ item }) {
  const selectedValues = Array.isArray(item.selected_answer)
    ? item.selected_answer
    : [item.selected_answer];
  const labelsByValue = new Map(
    (item.question?.options || []).map((option) => [option.value, option.label_ar]),
  );
  const displayedAnswer = selectedValues
    .map((value) => {
      if (value === true) return "نعم";
      if (value === false) return "لا";
      return labelsByValue.get(value) || value;
    })
    .filter(Boolean)
    .join("، ");

  return (
    <li className="discovery-history-item">
      <strong>{item.question?.text_ar}</strong>
      {item.answered_at ? (
        <p>
          {displayedAnswer}
          {item.custom_answer ? ` — ${item.custom_answer}` : ""}
        </p>
      ) : (
        <p className="project-muted">بانتظار إجابتك</p>
      )}
    </li>
  );
}

function DynamicProjectDiscovery({ projectId, project }) {
  const navigate = useNavigate();
  const [state, setState] = useState(null);
  const questionIdRef = useRef(null);
  const [answer, setAnswer] = useState(INITIAL_ANSWER);
  const [customAnswer, setCustomAnswer] = useState("");
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [retrying, setRetrying] = useState(false);
  const [error, setError] = useState("");
  const [validationError, setValidationError] = useState("");
  const [saved, setSaved] = useState(false);
  const [generatingProposal, setGeneratingProposal] = useState(false);
  const [proposalError, setProposalError] = useState("");

  const fetchDiscovery = useCallback(async () => {
    const result = await getNextDiscoveryQuestion(projectId);
    questionIdRef.current = result.question?.id || null;
    setState(result);
    setError("");
    return result;
  }, [projectId]);

  useEffect(() => {
    let active = true;

    getNextDiscoveryQuestion(projectId)
      .then((result) => {
        if (active) {
          questionIdRef.current = result.question?.id || null;
          setState(result);
        }
      })
      .catch(() => {
        if (active) setError("تعذر إكمال التحليل حاليًا");
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, [projectId]);

  const restoreDiscovery = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const previousQuestionId = questionIdRef.current;
      const result = await fetchDiscovery();
      if (previousQuestionId && result.question?.id !== previousQuestionId) {
        setAnswer(INITIAL_ANSWER);
        setCustomAnswer("");
        setValidationError("");
      }
    } catch {
      setError("تعذر إكمال التحليل حاليًا");
    } finally {
      setLoading(false);
    }
  }, [fetchDiscovery]);

  const question = state?.question;
  const questionNumber = useMemo(
    () => state?.history?.length || 1,
    [state?.history?.length],
  );

  const retry = async () => {
    setRetrying(true);
    await restoreDiscovery();
    setRetrying(false);
  };

  const saveAndReturn = () => {
    navigate("/organization/dashboard");
  };

  const generateProposal = async () => {
    setGeneratingProposal(true);
    setProposalError("");
    try {
      await analyzeProjectRequest(projectId);
      navigate(`/organization/requests/${projectId}/proposal`);
    } catch {
      setProposalError("تعذر إعداد المقترح حاليًا. إجاباتك محفوظة، ويمكنك المحاولة مرة أخرى.");
    } finally {
      setGeneratingProposal(false);
    }
  };

  const submit = async (event) => {
    event.preventDefault();
    setValidationError("");
    if (answer === "" || (Array.isArray(answer) && answer.length === 0)) {
      setValidationError("أكمل إجابتك للمتابعة.");
      return;
    }
    if (
      question.options?.some(
        (option) =>
          option.allows_custom_text
          && (Array.isArray(answer) ? answer.includes(option.value) : answer === option.value),
      )
      && !customAnswer.trim()
    ) {
      setValidationError("أخبرنا بالمزيد عن اختيارك.");
      return;
    }

    setSubmitting(true);
    setSaved(false);
    setError("");
    try {
      const nextState = await submitDiscoveryAnswer(projectId, {
        question_id: question.id,
        selected_answer: answer,
        ...(customAnswer.trim() ? { custom_answer: customAnswer.trim() } : {}),
      });
      questionIdRef.current = nextState.question?.id || null;
      setAnswer(INITIAL_ANSWER);
      setCustomAnswer("");
      setValidationError("");
      setSaved(true);
      setState(nextState);
    } catch (submitError) {
      if (submitError.status === 422) {
        const fieldErrors = submitError.errors || {};
        setValidationError(
          fieldErrors.custom_answer?.[0]
          || fieldErrors.selected_answer?.[0]
          || submitError.message
          || "تحقق من إجابتك وحاول مرة أخرى.",
        );
      } else {
        setError("تعذر إكمال التحليل حاليًا");
      }
    } finally {
      setSubmitting(false);
    }
  };

  if (loading || retrying) {
    return (
      <main aria-busy="true" className="project-flow-page" dir="rtl">
        <section className="project-discovery-card project-loading-card">
          <LoaderCircle aria-hidden="true" className="project-spinner" size={30} />
          <p>{state ? "نحلل إجابتك..." : "نحلل احتياج مؤسستك..."}</p>
        </section>
      </main>
    );
  }

  if (error) {
    return (
      <main className="project-flow-page" dir="rtl">
        <section className="project-discovery-card discovery-error-card" role="alert">
          <span className="project-success-icon"><Sparkles size={23} /></span>
          <h1>تعذر إكمال التحليل حاليًا</h1>
          <p>إجاباتك محفوظة ويمكنك المحاولة مرة أخرى.</p>
          <div className="project-flow-actions">
            <button className="project-primary-button" onClick={retry} type="button">
              إعادة المحاولة
            </button>
            <button className="project-secondary-button" onClick={saveAndReturn} type="button">
              حفظ والعودة لاحقًا
            </button>
          </div>
        </section>
      </main>
    );
  }

  if (state?.status === "complete") {
    return (
      <main className="project-flow-page" dir="rtl">
        <section className="project-discovery-card project-success-card">
          <span className="project-success-icon"><Check size={27} /></span>
          <span className="project-eyebrow">اكتشاف احتياج المؤسسة</span>
          <h1>تم جمع المعلومات الأساسية بنجاح</h1>
          <p>
            اكتمل جمع المعلومات اللازمة عن {project?.title || "مشروعكم"}. يمكنك
            الآن إعداد مسودة مقترح المشروع لمراجعتها.
          </p>
          <p className="proposal-draft-notice">
            هذا المقترح أولي ومبني على المعلومات التي قدمتها المؤسسة، ويمكن مراجعته وتعديله قبل الاعتماد.
          </p>
          {proposalError && <p className="discovery-validation-error" role="alert">{proposalError}</p>}
          <div className="project-flow-actions">
            <button
              className="project-primary-button"
              disabled={generatingProposal}
              onClick={generateProposal}
              type="button"
            >
              {generatingProposal ? "جارٍ إعداد مقترح المشروع..." : "إعداد مقترح المشروع"}
            </button>
            <button className="project-secondary-button" onClick={saveAndReturn} type="button">
              حفظ والعودة لاحقًا
            </button>
          </div>
        </section>
      </main>
    );
  }

  if (!question) {
    return (
      <main className="project-flow-page" dir="rtl">
        <section className="project-discovery-card discovery-error-card" role="alert">
          <h1>تعذر إكمال التحليل حاليًا</h1>
          <p>إجاباتك محفوظة ويمكنك المحاولة مرة أخرى.</p>
          <button className="project-primary-button" onClick={retry} type="button">
            إعادة المحاولة
          </button>
        </section>
      </main>
    );
  }

  return (
    <main className="project-flow-page" dir="rtl">
      <div className="project-flow-narrow discovery-flow">
        <header className="project-flow-heading">
          <span className="project-eyebrow">
            <Sparkles size={16} aria-hidden="true" /> اكتشاف احتياج المؤسسة
          </span>
          <p className="discovery-question-count">السؤال {questionNumber}</p>
          <h1>{project?.title}</h1>
          <p>سؤال واحد في كل مرة، وإجابتك تساعدنا على فهم احتياج مؤسستك بدقة.</p>
        </header>

        <form className="project-discovery-card" onSubmit={submit}>
          <div className="discovery-question-heading">
            <span className="project-eyebrow">نحتاج إلى معرفة المزيد</span>
            <h2>{question.text_ar}</h2>
          </div>
          <div className="discovery-answer-control">
            <DiscoveryQuestionInput
              answer={answer}
              customAnswer={customAnswer}
              question={question}
              setAnswer={setAnswer}
              setCustomAnswer={setCustomAnswer}
            />
          </div>
          {validationError && (
            <p className="discovery-validation-error" role="alert">{validationError}</p>
          )}
          {saved && <p className="discovery-saved-status" role="status">تم حفظ التقدم</p>}
          {submitting && (
            <p aria-live="polite" className="discovery-saving-status">
              جاري حفظ التقدم...
            </p>
          )}
          <footer className="project-flow-actions discovery-actions">
            <button
              className="project-secondary-button"
              disabled={submitting}
              onClick={saveAndReturn}
              type="button"
            >
              حفظ والعودة لاحقًا
            </button>
            <button className="project-primary-button" disabled={submitting} type="submit">
              {submitting ? (
                <>
                  <LoaderCircle className="project-spinner" size={17} aria-hidden="true" />
                  نحلل إجابتك...
                </>
              ) : (
                <>
                  متابعة <ChevronLeft size={17} aria-hidden="true" />
                </>
              )}
            </button>
          </footer>
        </form>

        {state.history?.length > 0 && (
          <details className="discovery-history">
            <summary>مراجعة ما شاركته ({state.history.filter((item) => item.answered_at).length})</summary>
            <ol>
              {state.history.map((item) => (
                <HistoryItem item={item} key={`${item.sequence}-${item.question?.id}`} />
              ))}
            </ol>
          </details>
        )}
      </div>
    </main>
  );
}

export default DynamicProjectDiscovery;
