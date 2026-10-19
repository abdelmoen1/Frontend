import { useRef } from "react";
import { ArrowLeft } from "lucide-react";
import { useScroll, useTransform } from "motion/react";
import * as m from "motion/react-m";
// صورة البطل المعتمدة (مكتب مفتوح). النسخة الحالية 577×321 فقط؛ استبدلها بالأصل عالي الدقة بالاسم نفسه
import heroImage from "../assets/hero-office.webp";
import { BRAND, hero } from "../content";
import { CtaLink } from "../components/shared";
import { RevealWords } from "../components/Reveal";
import { DURATION, EASE_OUT, splitWords } from "../motion";

const rise = (delay) => ({
  initial: { opacity: 0, y: 18 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: DURATION.base, ease: EASE_OUT, delay },
});

// بطل بعرض الشاشة فوق صورة المكتب مع طبقة كحلية؛ الترويسة الشفافة تعلوه.
// الصورة تقترب ببطء عند التحميل وتتحرك أبطأ من الصفحة عند التمرير (parallax).
export default function HeroSection() {
  const ref = useRef(null);
  const { scrollYProgress } = useScroll({ target: ref, offset: ["start start", "end start"] });
  const imageY = useTransform(scrollYProgress, [0, 1], ["0%", "16%"]);
  const contentY = useTransform(scrollYProgress, [0, 1], ["0%", "-10%"]);
  const lastWord = splitWords(hero.title).length - 1;

  return (
    <section className="lp-hero" id={hero.id} aria-labelledby="lp-hero-title" ref={ref}>
      <m.img
        className="lp-hero-bg"
        src={heroImage}
        alt=""
        width="577"
        height="321"
        fetchPriority="high"
        style={{ y: imageY }}
        initial={{ scale: 1.14 }}
        animate={{ scale: 1.04 }}
        transition={{ duration: 2.6, ease: EASE_OUT }}
      />
      <m.div className="lp-container lp-hero-content" style={{ y: contentY }}>
        <m.span className="lp-hero-eyebrow" {...rise(0.1)}>
          {hero.eyebrow}
        </m.span>
        <h1 id="lp-hero-title">
          <RevealWords text={hero.title} accent={[lastWord]} delay={0.3} stagger={0.1} />
        </h1>
        <m.p className="lp-hero-lead" {...rise(0.75)}>
          <strong dir="ltr">{BRAND.name}</strong> {hero.lead}
        </m.p>
        <m.div className="lp-hero-actions" {...rise(0.9)}>
          <CtaLink to={hero.primary.to} variant="sky" className="lp-btn-lg">
            {hero.primary.label}
            <ArrowLeft size={18} aria-hidden="true" />
          </CtaLink>
          <CtaLink href={hero.secondary.href} variant="on-dark" className="lp-btn-lg">
            {hero.secondary.label}
          </CtaLink>
        </m.div>
      </m.div>
      <m.a className="lp-scroll-cue" href={hero.secondary.href} aria-label={hero.secondary.label} {...rise(1.4)}>
        <span aria-hidden="true" />
      </m.a>
    </section>
  );
}
