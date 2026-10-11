// منطق بناء إجابات محادثة الاكتشاف وعرضها، منفصل عن React لتسهيل اختباره عبر node --test.

export const CHOICE_TYPES = ["single_choice", "multi_choice"];
export const TEXT_TYPES = ["short_text", "long_text"];

export const YES_NO_OPTIONS = [
  { value: true, label_ar: "نعم" },
  { value: false, label_ar: "لا" },
];

export const REVISION_MIN_LENGTH = 5;
export const REVISION_MAX_LENGTH = 5000;

const ARABIC_DIGITS = "٠١٢٣٤٥٦٧٨٩";
const PERSIAN_DIGITS = "۰۱۲۳۴۵۶۷۸۹";

// يحوّل الأرقام العربية/الفارسية إلى لاتينية ويقبل الفاصلة العشرية العربية
export function parseNumber(text) {
  const normalized = String(text ?? "")
    .trim()
    .replace(/[٠-٩]/g, (digit) => String(ARABIC_DIGITS.indexOf(digit)))
    .replace(/[۰-۹]/g, (digit) => String(PERSIAN_DIGITS.indexOf(digit)))
    .replace(/[٫,]/g, ".")
    .replace(/\s+/g, "");
  return /^-?\d+(\.\d+)?$/.test(normalized) ? Number(normalized) : null;
}

export function maxLengthFor(questionType) {
  if (questionType === "long_text") return 10000;
  return 2000;
}

export const emptySelection = (questionType) => (questionType === "multi_choice" ? [] : null);

const optionLabel = (question, value) => {
  if (value === true) return "نعم";
  if (value === false) return "لا";
  const option = (question?.options || []).find((item) => item.value === value);
  return option?.label_ar ?? String(value);
};

const isIsoDate = (value) => typeof value === "string" && /^\d{4}-\d{2}-\d{2}$/.test(value);

export function formatDate(value) {
  if (!isIsoDate(value)) return value;
  const date = new Date(`${value}T00:00:00`);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat("ar", { dateStyle: "long" }).format(date);
}

/** نص الإجابة المحفوظة كما يراه المستخدم في فقاعة المحادثة. */
export function formatAnswer(item) {
  const question = item.question || {};
  const values = Array.isArray(item.selected_answer)
    ? item.selected_answer
    : [item.selected_answer];
  const text = values
    .filter((value) => value !== null && value !== undefined && value !== "")
    .map((value) => (question.type === "date" ? formatDate(value) : optionLabel(question, value)))
    .join("، ");
  const custom = typeof item.custom_answer === "string" ? item.custom_answer.trim() : "";

  if (text && custom) return `${text} — ${custom}`;
  return text || custom;
}

/**
 * يبني طلب الإجابة من النص المكتوب والاختيار الحالي.
 * الكتابة الحرة مسموحة دائمًا: في أسئلة الاختيار تصبح توضيحًا أو إجابة كاملة.
 * @returns {{ payload?: object, display?: string, error?: string }}
 */
export function buildAnswer(question, selection, draft) {
  const text = String(draft ?? "").trim();
  const type = question.type;
  const base = { question_id: question.id };
  const finish = (selectedAnswer, customText) => {
    const payload = {
      ...base,
      selected_answer: selectedAnswer,
      ...(customText ? { custom_answer: customText } : {}),
    };
    return {
      payload,
      display: formatAnswer({ question, selected_answer: selectedAnswer, custom_answer: customText }),
    };
  };

  if (TEXT_TYPES.includes(type)) {
    if (!text) return { error: "اكتب إجابتك للمتابعة." };
    if (text.length > maxLengthFor(type)) return { error: "الإجابة أطول من المسموح." };
    return finish(text, "");
  }

  if (text.length > 2000) return { error: "الإجابة أطول من المسموح (2000 حرف)." };

  if (CHOICE_TYPES.includes(type)) {
    const customOption = (question.options || []).find((option) => option.allows_custom_text);
    let selected =
      type === "multi_choice"
        ? Array.isArray(selection)
          ? selection
          : []
        : selection ?? null;
    const nothingSelected = selected === null || (Array.isArray(selected) && selected.length === 0);

    // كتابة نص دون اختيار مع وجود خيار "أخرى" تعني اختيار "أخرى" مع التوضيح
    if (nothingSelected && text && customOption) {
      selected = type === "multi_choice" ? [customOption.value] : customOption.value;
    }

    const includesCustom =
      customOption &&
      (Array.isArray(selected) ? selected.includes(customOption.value) : selected === customOption.value);
    if (includesCustom && !text) return { error: "أخبرنا بالمزيد عن اختيارك \"أخرى\"." };

    const stillEmpty = selected === null || (Array.isArray(selected) && selected.length === 0);
    if (stillEmpty && !text) return { error: "اختر اقتراحًا أو اكتب إجابتك بكلماتك." };

    return finish(stillEmpty ? null : selected, text);
  }

  if (type === "yes_no") {
    if (selection !== true && selection !== false && !text) {
      return { error: "اختر نعم أو لا، أو اكتب إجابتك بكلماتك." };
    }
    return finish(selection === true || selection === false ? selection : null, text);
  }

  if (type === "number") {
    if (!text) return { error: "اكتب رقمًا أو وصفًا مختصرًا." };
    const number = parseNumber(text);
    return number === null ? finish(null, text) : finish(number, "");
  }

  if (type === "date") {
    if (!selection && !text) return { error: "اختر تاريخًا أو اكتب الموعد بكلماتك." };
    return finish(selection || null, text);
  }

  if (!text) return { error: "اكتب إجابتك للمتابعة." };
  return finish(null, text);
}

export function validateRevision(note) {
  const text = String(note ?? "").trim();
  if (text.length < REVISION_MIN_LENGTH) {
    return { error: "اكتب التعديل المطلوب بتفصيل أكثر (5 أحرف على الأقل)." };
  }
  if (text.length > REVISION_MAX_LENGTH) {
    return { error: "التعديل أطول من المسموح (5000 حرف)." };
  }
  return { note: text };
}

export function composerPlaceholder(mode, question) {
  if (mode === "revision") return "اكتب ما تريد تعديله أو توضيحه في المقترح...";
  if (!question) return "";
  if (CHOICE_TYPES.includes(question.type) || question.type === "yes_no") {
    return "اكتب إجابتك بكلماتك أو اختر من الاقتراحات...";
  }
  if (question.type === "number") return "اكتب رقمًا أو وصفًا مختصرًا...";
  if (question.type === "date") return "اختر تاريخًا من الأعلى أو اكتب الموعد بكلماتك...";
  return "اكتب إجابتك...";
}
