import { useEffect, useRef, useState } from "react";
import { getAvailableSkills } from "../services/studentService";
import "../styles/SkillsSelect.css";

function SkillsSelect({ label, selectedSkills, onChange, error }) {
  const [skills, setSkills] = useState([]);
  const [loading, setLoading] = useState(true);
  const [fetchError, setFetchError] = useState("");
  const [isOpen, setIsOpen] = useState(false);

  const containerRef = useRef(null);

  useEffect(() => {
    const fetchSkills = async () => {
      try {
        setLoading(true);
        setFetchError("");

        const data = await getAvailableSkills();

        setSkills(data);
      } catch (error) {
        console.error("Failed to load skills:", error);
        setFetchError(error.message || "فشل تحميل المهارات");
      } finally {
        setLoading(false);
      }
    };

    fetchSkills();
  }, []);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (
        containerRef.current &&
        !containerRef.current.contains(event.target)
      ) {
        setIsOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  const handleSelectSkill = (skill) => {
    const alreadySelected = selectedSkills.some((item) => item.id === skill.id);

    if (alreadySelected) {
      onChange(selectedSkills.filter((item) => item.id !== skill.id));
    } else {
      onChange([...selectedSkills, skill]);
    }
  };

  const handleRemoveSkill = (skillId) => {
    onChange(selectedSkills.filter((item) => item.id !== skillId));
  };

  const availableSkills = skills.filter(
    (skill) => !selectedSkills.some((selected) => selected.id === skill.id),
  );

  return (
    <div className="skills-select-wrapper" ref={containerRef}>
      <label className="skills-select-label">
        {label}
        <span className="required-mark">*</span>
      </label>

      <div
        className={`skills-select ${isOpen ? "is-open" : ""} ${error ? "has-error" : ""}`}
      >
        <button
          type="button"
          className="skills-select-control"
          onClick={() => setIsOpen((prev) => !prev)}
          aria-expanded={isOpen}
        >
          <div className="skills-select-content">
            {selectedSkills.length === 0 ? (
              <span className="skills-placeholder">اختر مهاراتك</span>
            ) : (
              <div className="selected-skills">
                {selectedSkills.map((skill) => (
                  <span key={skill.id} className="skill-tag">
                    <span className="skill-tag-name">{skill.name}</span>

                    <span
                      className="skill-tag-remove"
                      onClick={(event) => {
                        event.stopPropagation();
                        handleRemoveSkill(skill.id);
                      }}
                      role="button"
                      tabIndex={0}
                      aria-label={`إزالة ${skill.name}`}
                      onKeyDown={(event) => {
                        if (event.key === "Enter" || event.key === " ") {
                          event.preventDefault();
                          event.stopPropagation();
                          handleRemoveSkill(skill.id);
                        }
                      }}
                    >
                      ×
                    </span>
                  </span>
                ))}
              </div>
            )}
          </div>

          <span className={`skills-arrow ${isOpen ? "rotate" : ""}`}>⌄</span>
        </button>

        {isOpen && (
          <div className="skills-dropdown">
            {loading && (
              <div className="skills-dropdown-message">
                جاري تحميل المهارات...
              </div>
            )}

            {!loading && fetchError && (
              <div className="skills-dropdown-message skills-error">
                {fetchError}
              </div>
            )}

            {!loading && !fetchError && availableSkills.length === 0 && (
              <div className="skills-dropdown-message">
                تم اختيار جميع المهارات المتاحة
              </div>
            )}

            {!loading &&
              !fetchError &&
              availableSkills.length > 0 &&
              availableSkills.map((skill) => (
                <button
                  key={skill.id}
                  type="button"
                  className="skill-option"
                  onClick={() => handleSelectSkill(skill)}
                >
                  <span>{skill.name}</span>
                  <span className="skill-option-plus">+</span>
                </button>
              ))}
          </div>
        )}
      </div>

      {error && <span className="skills-error-message">{error}</span>}
    </div>
  );
}

export default SkillsSelect;
