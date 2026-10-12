import { useEffect, useRef } from "react";
import { Clock3, FileText, RotateCcw, X } from "lucide-react";
import { IoMdArrowRoundBack } from "react-icons/io";

import bannerImg from "../../organization/assets/organization_register.jpg";
import { levelLabel } from "../utils/assessments";

// تمييز العدد بالعربية: 3-10 جمع (أسئلة/دقائق)، وما فوقها مفرد منصوب (سؤالًا/دقيقة)
const counted = (value, few, many) => (value == null ? "—" : `${value} ${value >= 3 && value <= 10 ? few : many}`);

/**
 * نافذة ما قبل الاختبار: تنبيه، الوقت وعدد الأسئلة كما يعيدهما الخادم، المهارات ومستوياتها، وتأكيد القراءة.
 * <dialog> أصلي: يحبس التركيز، ويُغلق بـ Esc أو بالنقر على الخلفية، إلا أثناء إعداد الأسئلة.
 */
export default function PreAssessmentDialog({
  open,
  onClose,
  onStart,
  rules,
  skills,
  levels,
  confirmed,
  onConfirm,
  canStart,
  starting,
  error,
}) {
  const dialogRef = useRef(null);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    if (open && !dialog.open) dialog.showModal();
    if (!open && dialog.open) dialog.close();
  }, [open]);

  const requestClose = () => {
    if (!starting) onClose();
  };

  return (
    <dialog
      ref={dialogRef}
      className="pre-dialog"
      aria-labelledby="pre-dialog-title"
      aria-describedby="pre-dialog-alert"
      // Esc: نغلق عبر الحالة حتى تبقى متزامنة، ولا إغلاق أثناء إعداد الأسئلة
      onCancel={(event) => {
        event.preventDefault();
        requestClose();
      }}
      // النقر على الخلفية (خارج المحتوى) يغلق النافذة
      onClick={(event) => {
        if (event.target === dialogRef.current) requestClose();
      }}
    >
      {open && (
        <div className="pre-dialog-body" dir="rtl">
          <header className="pre-dialog-head">
            <h2 id="pre-dialog-title">اختبار المهارات</h2>
            <button type="button" className="pre-dialog-close" onClick={requestClose} disabled={starting} aria-label="إغلاق">
              <X size={18} aria-hidden="true" />
            </button>
          </header>

          <div className="pre-dialog-banner" id="pre-dialog-alert" style={{ "--pre-banner-img": `url(${bannerImg})` }}>
            <b>تنبيه هام: يبدأ المؤقت فور بدء الاختبار ولا يمكن إيقافه.</b>
            <p>تظهر الأسئلة واحدًا تلو الآخر، ولا يمكن الرجوع إلى سؤال سابق أو تعديل إجابتك بعد إرسالها.</p>
          </div>

          <ul className="pre-dialog-cards" aria-label="ملخص الاختبار">
            <li className="pre-dialog-card">
              <span className="pre-tile" aria-hidden="true">
                <Clock3 size={20} />
              </span>
              <span>
                <small>الوقت المخصص</small>
                <b>{counted(rules.minutes, "دقائق", "دقيقة")}</b>
              </span>
            </li>
            <li className="pre-dialog-card">
              <span className="pre-tile" aria-hidden="true">
                <FileText size={20} />
              </span>
              <span>
                <small>أسئلة الاختبار</small>
                <b>{counted(rules.questions, "أسئلة", "سؤالًا")}</b>
              </span>
            </li>
          </ul>

          <section className="pre-dialog-skills" aria-labelledby="pre-dialog-skills-title">
            <h3 id="pre-dialog-skills-title">المهارات ومستوى التقييم</h3>
            <ul>
              {skills.map((skill) => (
                <li key={skill.id}>
                  <bdi>{skill.name}</bdi>
                  <span>{levelLabel(levels[skill.id]) || "—"}</span>
                </li>
              ))}
            </ul>
          </section>

          <div className="pre-dialog-confirm">
            <label className="pre-check">
              <input
                type="checkbox"
                checked={confirmed}
                onChange={(event) => onConfirm(event.target.checked)}
                disabled={starting}
              />
              <span>أؤكد أنني قرأت وفهمت وأوافق على قواعد الاختبار.</span>
            </label>
            <button
              type="button"
              className="pre-btn pre-btn-primary"
              onClick={onStart}
              disabled={!canStart || starting}
              aria-busy={starting}
            >
              {starting ? "جارٍ إعداد الأسئلة..." : "ابدأ الاختبار الآن"}
              <IoMdArrowRoundBack aria-hidden="true" />
            </button>
          </div>

          {starting && (
            <div className="asmt-working" role="status" aria-live="polite">
              <span className="asmt-spinner" aria-hidden="true" />
              <span>يُعد الذكاء الاصطناعي أسئلة جديدة لمهاراتك ومستوياتها. قد يستغرق ذلك حتى دقيقة.</span>
            </div>
          )}
          {error && (
            <div className="asmt-alert" role="alert">
              <p>{error.message}</p>
              {error.retryable && (
                <button type="button" className="pre-btn pre-btn-outline" onClick={onStart} disabled={starting || !canStart}>
                  <RotateCcw size={15} aria-hidden="true" /> إعادة المحاولة
                </button>
              )}
            </div>
          )}
        </div>
      )}
    </dialog>
  );
}
