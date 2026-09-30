import { useEffect, useRef, useState } from "react";
import { IoClose } from "react-icons/io5";
import { getAvailableSkills } from "../../services/studentService";

function SkillsSelect({ label, selectedSkills, onChange, error }) {
  const [allSkills, setAllSkills] = useState([]);
  const [searchText, setSearchText] = useState("");
  const [isOpen, setIsOpen] = useState(false);
  const wrapperRef = useRef(null);

  useEffect(() => {
    const fetchSkills = async () => {
      try {
        const data = await getAvailableSkills();
        setAllSkills(data || []);
      } catch (err) {
        console.log("تعذر جلب قائمة المهارات:", err);
      }
    };

    fetchSkills();
  }, []);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target)) {
        setIsOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const selectedIds = selectedSkills.map((s) => s.id);

  const filteredSkills = allSkills.filter(
    (skill) =>
      !selectedIds.includes(skill.id) &&
      skill.name.toLowerCase().includes(searchText.toLowerCase())
  );

  const handleSelectSkill = (skill) => {
    onChange([...selectedSkills, skill]);
    setSearchText("");
  };

  const handleRemoveSkill = (skillId) => {
    onChange(selectedSkills.filter((s) => s.id !== skillId));
  };

  return (
    <div className="form-group animate-element delay-300 skills-field" ref={wrapperRef}>
      <label>{label}</label>

      <div
        className={`glass-input-wrapper skills-wrapper ${
          error ? "has-error" : ""
        }`}
        onClick={() => setIsOpen(true)}
      >
        <div className="skills-tags">
          {selectedSkills.map((skill) => (
            <span className="skill-tag" key={skill.id}>
              {skill.name}
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  handleRemoveSkill(skill.id);
                }}
                aria-label={`إزالة ${skill.name}`}
              >
                <IoClose />
              </button>
            </span>
          ))}

          <input
            type="text"
            value={searchText}
            onChange={(e) => setSearchText(e.target.value)}
            onFocus={() => setIsOpen(true)}
            placeholder={selectedSkills.length === 0 ? "ابحث عن مهاراتك وأضفها" : ""}
          />
        </div>
      </div>

      {isOpen && (
        <ul className="skills-dropdown">
          {filteredSkills.length > 0 ? (
            filteredSkills.map((skill) => (
              <li key={skill.id} onClick={() => handleSelectSkill(skill)}>
                {skill.name}
              </li>
            ))
          ) : (
            <li className="skills-dropdown-empty">لا توجد نتائج مطابقة</li>
          )}
        </ul>
      )}

      {error && <span className="error-message">{error}</span>}
    </div>
  );
}

export default SkillsSelect;