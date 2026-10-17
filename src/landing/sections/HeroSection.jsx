import { ArrowLeft } from "lucide-react";
import * as m from "motion/react-m";
import { BRAND, hero } from "../content";
import { CtaLink } from "../components/shared";
import { RevealWords } from "../components/Reveal";
import { DURATION, EASE_IN_OUT, EASE_OUT, splitWords, trackPointer } from "../motion";

// Two paths enter from the outer edges (organization on the start side, student on the end side),
// meet in one point under the copy and continue down as one line toward the next section.
const PATHS = {
  organization: "M1200 48 C 930 48, 780 176, 600 176",
  student: "M0 48 C 270 48, 420 176, 600 176",
  joined: "M600 176 L600 240",
};

const rise = (delay) => ({
  initial: { opacity: 0, y: 18 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: DURATION.base, ease: EASE_OUT, delay },
});

const draw = (delay, duration = DURATION.draw) => ({
  initial: { pathLength: 0 },
  animate: { pathLength: 1 },
  transition: { duration, ease: EASE_IN_OUT, delay },
});

// تكوين نصي في الوسط فوق توهج هادئ يتبع المؤشر، وتحته المساران يلتقيان (لا صورة جانبية ولا بطاقة عائمة)
export default function HeroSection() {
  const lastWord = splitWords(hero.title).length - 1;

  return (
    <section className="lp-hero" id={hero.id} aria-labelledby="lp-hero-title" onPointerMove={trackPointer}>
      <div className="lp-aurora" aria-hidden="true">
        <i />
        <i />
        <i />
      </div>
      <div className="lp-hero-grid" aria-hidden="true" />

      <div className="lp-container lp-hero-content">
        <m.span className="lp-pill lp-beam" {...rise(0)}>
          <span className="lp-pill-dot" aria-hidden="true" />
          {hero.eyebrow}
        </m.span>
        <h1 id="lp-hero-title">
          <RevealWords text={hero.title} accent={[lastWord]} delay={0.15} />
        </h1>
        <m.p className="lp-hero-lead" {...rise(0.55)}>
          <strong dir="ltr">{BRAND.name}</strong> {hero.lead}
        </m.p>
        <m.div className="lp-hero-actions" {...rise(0.7)}>
          <CtaLink to={hero.primary.to} className="lp-btn-lg">
            {hero.primary.label}
            <ArrowLeft size={18} aria-hidden="true" />
          </CtaLink>
          <CtaLink href={hero.secondary.href} variant="ghost" className="lp-btn-lg">
            {hero.secondary.label}
          </CtaLink>
        </m.div>
      </div>

      <div className="lp-hero-lines" aria-hidden="true">
        <svg viewBox="0 0 1200 240" preserveAspectRatio="xMidYMid meet">
          {["organization", "student"].map((key, index) => (
            <g key={key}>
              <m.path d={PATHS[key]} className="lp-line-base" {...draw(0.6 + index * 0.12)} />
              <path
                d={PATHS[key]}
                pathLength="1"
                className="lp-line-pulse"
                style={{ animationDelay: `${2.4 + index * 1.1}s` }}
              />
            </g>
          ))}
          <m.path d={PATHS.joined} className="lp-line-base" {...draw(2.2, 0.8)} />
          <circle cx="600" cy="176" r="5" className="lp-line-ring" />
          <m.circle
            cx="600"
            cy="176"
            r="5"
            className="lp-line-node"
            initial={{ opacity: 0, scale: 0 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.5, ease: EASE_OUT, delay: 2.1 }}
          />
        </svg>
        <m.span className="lp-track-chip lp-track-chip-org" {...rise(1.1)}>
          {hero.tracks.organization}
        </m.span>
        <m.span className="lp-track-chip lp-track-chip-student" {...rise(1.25)}>
          {hero.tracks.student}
        </m.span>
      </div>
    </section>
  );
}
