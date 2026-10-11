import { useState } from "react";
import { Check, ChevronDown, CircleHelp, Minus } from "lucide-react";

const KIND_LABELS = {
  unknown: "غير محدد بعد",
  assumption: "افتراض",
  open_question: "يحتاج توضيحًا",
  contradiction: "تعارض",
};

const PRIORITY_LABELS = { essential: "أساسي", optional: "اختياري" };

const STATUS_LABELS = {
  sufficient: "مفهوم",
  partial: "مفهوم جزئيًا",
  unknown: "غير محدد بعد",
  not_applicable: "لا ينطبق",
  missing: "لم نناقشه بعد",
};

function StatusMark({ status }) {
  return (
    <span className={`df-mark df-mark-${status}`} aria-hidden="true">
      {status === "sufficient" && <Check size={12} strokeWidth={3} />}
      {status === "unknown" && <CircleHelp size={12} strokeWidth={2.5} />}
      {status === "not_applicable" && <Minus size={12} strokeWidth={3} />}
    </span>
  );
}

function ItemList({ items }) {
  return (
    <ul className="df-items">
      {items.map((item) => (
        <li key={item.id} className={`df-item df-item-${item.kind}`}>
          <span dir="auto">{item.text}</span>
          {(KIND_LABELS[item.kind] || PRIORITY_LABELS[item.priority]) && (
            <span className="df-tags">
              {KIND_LABELS[item.kind] && <em className="df-tag">{KIND_LABELS[item.kind]}</em>}
              {PRIORITY_LABELS[item.priority] && (
                <em className="df-tag df-tag-priority">{PRIORITY_LABELS[item.priority]}</em>
              )}
            </span>
          )}
        </li>
      ))}
    </ul>
  );
}

/** لوحة "محاور الفهم": المحاور الإحدى عشرة بحالتها الحقيقية من المتطلبات المستخرجة. */
export function RequirementsPanel({ requirements, currentArea }) {
  const [openArea, setOpenArea] = useState(null);
  const areas = requirements?.areas || [];

  return (
    <aside className="dc-topics" aria-label="محاور الفهم">
      <h2>محاور الفهم</h2>
      {!requirements?.tracked && (
        <p className="dc-topics-empty">يتحدث هذا الملخص تلقائيًا مع ردود المساعد.</p>
      )}
      <ul>
        {areas.map((area) => {
          const expanded = openArea === area.key;
          const current = area.key === currentArea;
          return (
            <li
              key={area.key}
              className={`df-area df-area-${area.status} ${current ? "df-area-current" : ""}`}
            >
              <button
                type="button"
                className="df-area-toggle"
                aria-expanded={expanded}
                aria-controls={`df-area-${area.key}`}
                onClick={() => setOpenArea(expanded ? null : area.key)}
                disabled={area.items.length === 0}
                title={STATUS_LABELS[area.status]}
              >
                <StatusMark status={area.status} />
                <span className="df-area-label">{area.label}</span>
                <span className="dc-visually-hidden">: {STATUS_LABELS[area.status]}</span>
                {current && <span className="df-now">الآن</span>}
                {area.items.length > 0 && (
                  <ChevronDown
                    size={14}
                    aria-hidden="true"
                    className={`df-chevron ${expanded ? "df-chevron-open" : ""}`}
                  />
                )}
              </button>
              {expanded && (
                <div id={`df-area-${area.key}`}>
                  <ItemList items={area.items} />
                </div>
              )}
            </li>
          );
        })}
      </ul>
    </aside>
  );
}

/** ملخص "ما فهمناه" قبل إعداد المقترح: الحقائق والافتراضات والنقاط غير المحسومة. */
export function FindingsSummary({ requirements }) {
  if (!requirements?.tracked) return null;
  const known = requirements.areas.filter((area) => area.items.length > 0);
  const missing = requirements.areas.filter((area) => area.status === "missing");

  return (
    <section className="df-summary" aria-label="ملخص ما فهمناه">
      <h3>ملخص ما فهمناه حتى الآن</h3>
      {known.length === 0 ? (
        <p className="df-summary-empty">لم تُستخرج متطلبات بعد.</p>
      ) : (
        <dl className="df-summary-list">
          {known.map((area) => (
            <div key={area.key} className="df-summary-area">
              <dt>
                <StatusMark status={area.status} /> {area.label}
              </dt>
              <dd>
                <ItemList items={area.items} />
              </dd>
            </div>
          ))}
        </dl>
      )}
      {missing.length > 0 && (
        <p className="df-summary-missing">
          لم نناقش بعد: {missing.map((area) => area.label).join("، ")}. سيذكرها المقترح كنقاط
          تحتاج إلى تأكيد.
        </p>
      )}
    </section>
  );
}
