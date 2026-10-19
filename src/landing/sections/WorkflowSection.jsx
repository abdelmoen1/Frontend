import { useRef } from "react";
import { ArrowLeft, CircleHelp, FileText, MessageSquareText, Sparkles } from "lucide-react";
import { useScroll } from "motion/react";
import * as m from "motion/react-m";
import { workflow } from "../content";
import { CtaLink, SectionHeading } from "../components/shared";
import { Reveal } from "../components/Reveal";
import { ChatArt, ProposalArt, QuestionArt } from "../components/Illustrations";
import { DURATION, EASE_OUT, trackPointer } from "../motion";

// المفتاح art في content.js يختار الأيقونة
const STEP_ICONS = { chat: MessageSquareText, question: CircleHelp, document: FileText };
const STEP_ART = { chat: ChatArt, question: QuestionArt, document: ProposalArt };

const STEP = {
  hidden: { opacity: 0, y: 28 },
  shown: { opacity: 1, y: 0 },
};

const NODE = {
  hidden: { scale: 0.4, opacity: 0.3 },
  shown: { scale: 1, opacity: 1 },
};

function Step({ step }) {
  const Icon = STEP_ICONS[step.art] || Sparkles;
  const Art = STEP_ART[step.art];
  return (
    <m.li
      className="lp-step"
      variants={STEP}
      initial="hidden"
      whileInView="shown"
      viewport={{ once: true, amount: 0.45 }}
      transition={{ duration: DURATION.base, ease: EASE_OUT }}
    >
      <m.span className="lp-step-node" variants={NODE} transition={{ duration: 0.5, ease: EASE_OUT, delay: 0.15 }} />
      <article className="lp-step-card lp-glow" onPointerMove={trackPointer}>
        <div className="lp-step-top">
          <span className="lp-icon-tile">
            <Icon size={20} strokeWidth={1.75} aria-hidden="true" />
          </span>
          <span className="lp-step-num" dir="ltr" aria-hidden="true">
            {step.number}
          </span>
        </div>
        <h3>{step.title}</h3>
        <p>{step.text}</p>
        <span className="lp-note-chip">{step.note}</span>
        {Art && (
          <div className="lp-step-art">
            <Art />
          </div>
        )}
      </article>
    </m.li>
  );
}

// العنوان ثابت في عمود البداية، والخطوات تتوالى في العمود المقابل على خط يُرسم مع التمرير
export default function WorkflowSection() {
  const listRef = useRef(null);
  const { scrollYProgress } = useScroll({ target: listRef, offset: ["start 75%", "end 60%"] });

  return (
    <section className="lp-section lp-workflow" id={workflow.id} aria-labelledby="lp-workflow-title">
      <div className="lp-container lp-workflow-layout">
        <div className="lp-sticky">
          <SectionHeading id="lp-workflow-title" eyebrow={workflow.eyebrow} title={workflow.title} lead={workflow.lead} />
          <Reveal delay={0.1} className="lp-workflow-cta">
            <CtaLink to={workflow.cta.to} className="lp-btn-lg">
              {workflow.cta.label}
              <ArrowLeft size={18} aria-hidden="true" />
            </CtaLink>
          </Reveal>
        </div>

        <div className="lp-steps-wrap">
          <span className="lp-steps-line" aria-hidden="true">
            <m.span className="lp-steps-progress" style={{ scaleY: scrollYProgress }} />
          </span>
          <ol className="lp-steps" ref={listRef}>
            {workflow.steps.map((step) => (
              <Step key={step.number} step={step} />
            ))}
          </ol>
        </div>
      </div>
    </section>
  );
}
