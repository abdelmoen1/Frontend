import { Building2, GraduationCap, Route } from "lucide-react";
import { how } from "../content";
import { SectionHeading } from "../components/shared";

function Track({ track, icon: Icon, tone }) {
  return (
    <div className={`lp-track lp-track-${tone}`}>
      <h3 className="lp-track-label">
        <Icon size={18} aria-hidden="true" />
        {track.label}
      </h3>
      <ol>
        {track.steps.map((step, index) => (
          <li key={step}>
            <span className="lp-step-number" aria-hidden="true">
              {index + 1}
            </span>
            <span>{step}</span>
          </li>
        ))}
      </ol>
    </div>
  );
}

// مساران (المؤسسة والطالب) يلتقيان عند الفرصة المنشورة في الوسط
export default function HowItWorksSection() {
  return (
    <section className="lp-section lp-section-soft" id={how.id} aria-labelledby="lp-how-title">
      <div className="lp-container">
        <SectionHeading id="lp-how-title" eyebrow={how.eyebrow} title={how.title} lead={how.lead} align="center" />
        <div className="lp-flow">
          <Track track={how.organizationTrack} icon={Building2} tone="org" />
          <div className="lp-meeting">
            <span className="lp-meeting-icon">
              <Route size={22} aria-hidden="true" />
            </span>
            <strong>{how.meeting.title}</strong>
            <p>{how.meeting.text}</p>
          </div>
          <Track track={how.studentTrack} icon={GraduationCap} tone="student" />
        </div>
      </div>
    </section>
  );
}
