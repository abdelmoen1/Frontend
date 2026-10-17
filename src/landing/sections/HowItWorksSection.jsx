import { useRef } from "react";
import { Building2, GraduationCap, Route } from "lucide-react";
import { useScroll } from "motion/react";
import * as m from "motion/react-m";
import { how } from "../content";
import { SectionHeading } from "../components/shared";
import { Reveal, RevealItem, RevealList } from "../components/Reveal";
import { trackPointer } from "../motion";

// From the centre of each track (start side = organization) down into the meeting point.
const MERGE = {
  organization: "M750 0 C 750 70, 500 50, 500 120",
  student: "M250 0 C 250 70, 500 50, 500 120",
};

function Track({ track, icon: Icon, tone, delay }) {
  return (
    <Reveal delay={delay} className={`lp-track lp-track-${tone} lp-glow`} onPointerMove={trackPointer}>
      <h3 className="lp-track-label">
        <span className="lp-icon-tile">
          <Icon size={18} strokeWidth={1.75} aria-hidden="true" />
        </span>
        {track.label}
      </h3>
      <RevealList as="ol" delay={0.2}>
        {track.steps.map((step, index) => (
          <RevealItem key={step}>
            <span className="lp-step-number" dir="ltr" aria-hidden="true">
              {String(index + 1).padStart(2, "0")}
            </span>
            <span>{step}</span>
          </RevealItem>
        ))}
      </RevealList>
    </Reveal>
  );
}

// مساران (المؤسسة والطالب) يندمجان مع التمرير في الفرصة المنشورة أسفلهما
export default function HowItWorksSection() {
  const mergeRef = useRef(null);
  const { scrollYProgress } = useScroll({ target: mergeRef, offset: ["start 90%", "end 60%"] });

  return (
    <section className="lp-section lp-how" id={how.id} aria-labelledby="lp-how-title">
      <div className="lp-container">
        <SectionHeading id="lp-how-title" eyebrow={how.eyebrow} title={how.title} lead={how.lead} align="center" />
        <div className="lp-flow">
          <Track track={how.organizationTrack} icon={Building2} tone="org" delay={0} />
          <Track track={how.studentTrack} icon={GraduationCap} tone="student" delay={0.12} />
        </div>
        <div className="lp-merge" ref={mergeRef} aria-hidden="true">
          <svg viewBox="0 0 1000 120" preserveAspectRatio="none">
            {Object.entries(MERGE).map(([key, d]) => (
              <g key={key}>
                <path d={d} className="lp-merge-track" />
                <m.path d={d} className="lp-merge-progress" style={{ pathLength: scrollYProgress }} />
              </g>
            ))}
          </svg>
        </div>
        <Reveal className="lp-meeting lp-beam">
          <span className="lp-meeting-icon">
            <Route size={22} strokeWidth={1.75} aria-hidden="true" />
          </span>
          <div>
            <strong>{how.meeting.title}</strong>
            <p>{how.meeting.text}</p>
          </div>
        </Reveal>
      </div>
    </section>
  );
}
