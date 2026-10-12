import { useEffect, useRef } from "react";
import { ClipboardCheck, Clock3, ListChecks, RotateCcw, Target, TriangleAlert, X } from "lucide-react";
import { IoMdArrowDropleft } from "react-icons/io";

import { levelLabel } from "../utils/assessments";

// قيمة من إعدادات الخادم أو "—" إن لم تصل
const shown = (value) => value ?? "—";

/**
 * نافذة التعليمات قبل بدء التقييم: تحذير، ملخص الجلسة كما يعيده الخادم، المهارات ومستوياتها، وتأكيد القراءة.
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
      aria-describedby="pre-dialog-warning"
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
          <button type="button" className="pre-dialog-close" onClick={requestClose} disabled={starting} aria-label="إغلاق">
            <X size={20} aria-hidden="true" />
          </button>

          <header className="pre-dialog-head">
            <span className="pre-tile" aria-hidden="true">
              <ClipboardCheck size={24} />
            </span>
            <div>
              <h2 id="pre-dialog-title">تعليمات التقييم</h2>
              <p>اقرأ التعليمات بعناية قبل البدء.</p>
            </div>
          </header>

          <div className="pre-dialog-warning" id="pre-dialog-warning" role="note">
            <TriangleAlert size={20} aria-hidden="true" />
            <div>
              <b>تنبيه قبل البدء</b>
              <ul>
                <li>يبدأ المؤقت فور إعداد الأسئلة ولا يمكن إيقافه، ومدة التقييم {shown(rules.minutes)} دقيقة.</li>
                <li>تظهر الأسئلة واحدًا تلو الآخر، ولا يمكن الرجوع إلى سؤال سابق أو تعديل إجابة بعد إرسالها.</li>
                <li>إذا انتهى الوقت تُصحَّح الإجابات المحفوظة فقط، وتُحتسب الأسئلة دون إجابة ضعيفة.</li>
              </ul>
            </div>
          </div>

          <ul className="pre-dialog-stats" aria-label="ملخص التقييم">
            <li>
              <ListChecks size={20} aria-hidden="true" />
              <span>عدد الأسئلة</span>
              <b>{shown(rules.questions)}</b>
            </li>
            <li>
              <Clock3 size={20} aria-hidden="true" />
              <span>المدة</span>
              <b>
                {shown(rules.minutes)} <small>دقيقة</small>
              </b>
            </li>
            <li>
              <Target size={20} aria-hidden="true" />
              <span>التوزيع</span>
              <b>
                {shown(rules.practical)} + {shown(rules.written)} <small>عملي + مقال</small>
              </b>
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
            <p>
              الأسئلة العملية كتابة كود للمهارات البرمجية، ومهام أو سيناريوهات تطبيقية لغيرها. المستوى الذي اخترته يحدد
              صعوبة أسئلة كل مهارة فقط، ولا يُعد إثباتًا لمستواك.
            </p>
          </section>

          <label className="pre-check">
            <input
              type="checkbox"
              checked={confirmed}
              onChange={(event) => onConfirm(event.target.checked)}
              disabled={starting}
            />
            <span>قرأت تعليمات التقييم وفهمتها، وأنا مستعد للبدء الآن.</span>
          </label>

          {starting && (
            <div className="asmt-working" role="status" aria-live="polite">
              <span className="asmt-spinner" aria-hidden="true" />
              <span>يُعد الذكاء الاصطناعي أسئلة جديدة لمهاراتك ومستوياتها ويتحقق منها. قد يستغرق ذلك حتى دقيقة.</span>
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

          <div className="pre-dialog-actions">
            <button
              type="button"
              className="pre-btn pre-btn-primary"
              onClick={onStart}
              disabled={!canStart || starting}
              aria-busy={starting}
            >
              {starting ? "جارٍ إعداد الأسئلة..." : "ابدأ التقييم"}
              <IoMdArrowDropleft aria-hidden="true" />
            </button>
            <button type="button" className="pre-btn pre-btn-outline" onClick={requestClose} disabled={starting}>
              إلغاء
            </button>
          </div>
        </div>
      )}
    </dialog>
  );
}
