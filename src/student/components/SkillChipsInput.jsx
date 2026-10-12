import { useId, useRef, useState } from "react";
import { IoClose } from "react-icons/io5";
import { FiPlus } from "react-icons/fi";

import { filterSkills, highlightParts } from "../utils/onboarding";

// عدد المهارات المقترحة تحت الحقل للإضافة بنقرة
const QUICK_PICKS = 6;

/**
 * حقل مهارات بنظام Chips + Autocomplete: يكتب الطالب ليبحث، ويضيف من القائمة بالنقر أو Enter،
 * ويحذف بزر × أو Backspace. الخيارات مهارات التخصص القادمة من الخادم فقط.
 */
function SkillChipsInput({
  id = "skills",
  label,
  options,
  selected,
  onChange,
  max,
  error,
  disabled = false,
  disabledHint,
  contextLabel,
}) {
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(0);
  const inputRef = useRef(null);
  const fieldRef = useRef(null);
  const listId = `${useId()}-list`;

  const matches = filterSkills(options, selected, query);
  const full = selected.length >= max;
  const activeIndex = matches.length ? Math.min(active, matches.length - 1) : -1;
  const showList = open && !disabled;
  const quickPicks = query || full ? [] : filterSkills(options, selected, "").slice(0, QUICK_PICKS);

  // focus=false للإضافة من المقترحات حتى لا تنفتح القائمة فوقها
  const add = (skill, focus = true) => {
    if (full || !skill) return;
    onChange([...selected, { id: skill.id, name: skill.name }]);
    setQuery("");
    setActive(0);
    if (focus) inputRef.current?.focus();
  };

  const remove = (skillId) => {
    onChange(selected.filter((skill) => skill.id !== skillId));
    inputRef.current?.focus();
  };

  const handleKeyDown = (event) => {
    if (event.key === "ArrowDown" || event.key === "ArrowUp") {
      event.preventDefault();
      setOpen(true);
      if (!matches.length) return;
      const step = event.key === "ArrowDown" ? 1 : -1;
      setActive((activeIndex + step + matches.length) % matches.length);
    } else if (event.key === "Enter") {
      // لا يُرسل النموذج من داخل حقل المهارات
      event.preventDefault();
      if (showList && activeIndex >= 0) add(matches[activeIndex]);
      else setOpen(true);
    } else if (event.key === "Backspace" && query === "" && selected.length) {
      remove(selected[selected.length - 1].id);
    } else if (event.key === "Escape") {
      setOpen(false);
    }
  };

  const handleBlur = (event) => {
    if (!fieldRef.current?.contains(event.relatedTarget)) setOpen(false);
  };

  const emptyMessage = () => {
    if (full) return `وصلت للحد الأقصى (${max} مهارة). احذف مهارة لتضيف غيرها.`;
    if (!options.length) return "لا توجد مهارات لهذا التخصص بعد.";
    if (query.trim()) return `لا توجد مهارة "${query.trim()}" ضمن مهارات ${contextLabel || "تخصصك"}.`;
    return "أضفت كل مهارات هذا التخصص.";
  };

  return (
    <div className="chips-field animate-element delay-300" ref={fieldRef} onBlur={handleBlur}>
      <label className="chips-label" htmlFor={id}>
        {label}
      </label>

      <div
        className={`chips-control ${error ? "has-error" : ""} ${disabled ? "is-disabled" : ""} ${showList ? "is-open" : ""}`}
        onMouseDown={(event) => {
          // النقر في أي مكان من الصندوق يركز على حقل البحث
          if (event.target === event.currentTarget) {
            event.preventDefault();
            inputRef.current?.focus();
          }
        }}
      >
        {selected.map((skill) => (
          <span key={skill.id} className="chip">
            <bdi>{skill.name}</bdi>
            <button
              type="button"
              className="chip-remove"
              onClick={() => remove(skill.id)}
              disabled={disabled}
              aria-label={`إزالة ${skill.name}`}
            >
              <IoClose aria-hidden="true" />
            </button>
          </span>
        ))}

        <input
          ref={inputRef}
          id={id}
          className="chips-input"
          type="text"
          role="combobox"
          autoComplete="off"
          aria-expanded={showList}
          aria-controls={listId}
          aria-autocomplete="list"
          aria-activedescendant={showList && activeIndex >= 0 ? `${listId}-${matches[activeIndex].id}` : undefined}
          aria-invalid={Boolean(error)}
          aria-describedby={`${id}-meta${error ? ` ${id}-error` : ""}`}
          placeholder={disabled ? disabledHint : selected.length ? "أضف مهارة أخرى" : "ابحث عن مهارة، مثل React"}
          value={query}
          disabled={disabled}
          onChange={(event) => {
            setQuery(event.target.value);
            setActive(0);
            setOpen(true);
          }}
          onFocus={() => setOpen(true)}
          onClick={() => setOpen(true)}
          onKeyDown={handleKeyDown}
        />

        {showList && (
          <ul className="chips-dropdown" id={listId} role="listbox" aria-label={label}>
            {!full && matches.length > 0 ? (
              matches.map((skill, index) => (
                <li
                  key={skill.id}
                  id={`${listId}-${skill.id}`}
                  role="option"
                  aria-selected={index === activeIndex}
                  className={`chips-option ${index === activeIndex ? "is-active" : ""}`}
                  onMouseDown={(event) => event.preventDefault()}
                  onMouseEnter={() => setActive(index)}
                  onClick={() => add(skill)}
                >
                  <bdi>
                    {highlightParts(skill.name, query).map((part, partIndex) =>
                      part.match ? <mark key={partIndex}>{part.text}</mark> : <span key={partIndex}>{part.text}</span>,
                    )}
                  </bdi>
                  <FiPlus className="chips-option-add" aria-hidden="true" />
                </li>
              ))
            ) : (
              <li className="chips-empty" role="presentation">
                {emptyMessage()}
              </li>
            )}
          </ul>
        )}
      </div>

      <div className="chips-meta" id={`${id}-meta`}>
        <span>{disabled ? disabledHint : "اكتب للبحث أو اختر من المقترحات."}</span>
        <span className={full ? "is-full" : ""}>
          {selected.length} / {max}
        </span>
      </div>

      {error && (
        <span className="error-message" id={`${id}-error`}>
          {error}
        </span>
      )}

      {!disabled && !showList && quickPicks.length > 0 && (
        <div className="chips-suggestions" aria-label="مهارات مقترحة">
          <span className="chips-suggestions-title">مقترحة:</span>
          {quickPicks.map((skill) => (
            <button key={skill.id} type="button" className="chips-suggestion" onClick={() => add(skill, false)}>
              <FiPlus aria-hidden="true" />
              <bdi>{skill.name}</bdi>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

export default SkillChipsInput;
