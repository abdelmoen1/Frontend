import { BadgeCheck, Building2, Check, GraduationCap } from "lucide-react";

// معاينة توضيحية لمسار المشروع (تحدي المؤسسة ← مقترح ← أهلية الطالب). نصوصها في hero.preview بملف content.js
export default function HeroPreview({ preview }) {
  const { request, proposal, student } = preview;

  return (
    <figure className="lp-preview" aria-label={preview.label}>
      <svg className="lp-preview-path" viewBox="0 0 400 420" preserveAspectRatio="none" aria-hidden="true">
        <path d="M330 70 C 330 150, 200 130, 200 210 S 70 280, 70 360" />
      </svg>

      <div className="lp-card lp-preview-request">
        <span className="lp-preview-icon">
          <Building2 size={18} aria-hidden="true" />
        </span>
        <div>
          <span className="lp-preview-tag">{request.tag}</span>
          <p>{request.text}</p>
        </div>
      </div>

      <div className="lp-card lp-preview-proposal">
        <div className="lp-preview-window" aria-hidden="true">
          <i />
          <i />
          <i />
        </div>
        <span className="lp-preview-tag">{proposal.tag}</span>
        <strong className="lp-preview-title">{proposal.title}</strong>
        <span className="lp-preview-meta">{proposal.meta}</span>
        <span className="lp-preview-phases" aria-hidden="true">
          <i className="is-done" />
          <i className="is-done" />
          <i />
          <i />
        </span>
        <span className="lp-preview-subtitle">{proposal.rolesLabel}</span>
        <ul className="lp-preview-roles">
          {proposal.roles.map((item) => (
            <li key={item.role}>
              <span>{item.role}</span>
              <span className="lp-chip" dir="ltr">
                {item.skill}
              </span>
              <span className="lp-chip lp-chip-level">{item.level}</span>
            </li>
          ))}
        </ul>
      </div>

      <div className="lp-card lp-preview-student">
        <span className="lp-preview-icon lp-preview-icon-student">
          <GraduationCap size={18} aria-hidden="true" />
        </span>
        <div>
          <span className="lp-preview-tag">{student.tag}</span>
          <p>
            <bdi dir="ltr">{student.skill}</bdi> ·{" "}
            <span className="lp-preview-level">
              <BadgeCheck size={14} aria-hidden="true" />
              {student.level}
            </span>
          </p>
          <span className="lp-status">
            <Check size={13} aria-hidden="true" />
            {student.status}
          </span>
        </div>
      </div>

      <figcaption>{preview.caption}</figcaption>
    </figure>
  );
}
