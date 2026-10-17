import { LazyMotion, MotionConfig } from "motion/react";
import { header, SECTIONS } from "./content";
import LandingHeader from "./components/LandingHeader";
import LandingFooter from "./components/LandingFooter";
import HeroSection from "./sections/HeroSection";
import ProblemSection from "./sections/ProblemSection";
import WorkflowSection from "./sections/WorkflowSection";
import AudiencesSection from "./sections/AudiencesSection";
import HowItWorksSection from "./sections/HowItWorksSection";
import CapabilitiesSection from "./sections/CapabilitiesSection";
import OutcomesSection from "./sections/OutcomesSection";
import ProofSection from "./sections/ProofSection";
import ClosingSection from "./sections/ClosingSection";
import FaqSection from "./sections/FaqSection";
import "./landing.css";

/**
 * الصفحة الرئيسية العامة (/). ترتيب الأقسام وإظهارها من SECTIONS في content.js، والنصوص كلها هناك.
 * لإضافة قسم جديد: أنشئ مكوّنه في sections/، وأضفه هنا مع معرّفات الروابط التي يحتويها، ثم إلى SECTIONS.
 *
 * الحركة: مكتبة motion بحزمة domAnimation تُحمَّل في ملف منفصل عند الحاجة (مكوّنات m.* داخل LazyMotion strict).
 * MotionConfig reducedMotion="user" يوقف الحركة الانتقالية لمن فعّل "تقليل الحركة"، وlanding.css يوقف الحلقات المستمرة.
 */
const loadMotionFeatures = () => import("./motionFeatures").then((module) => module.default);

const SECTION_COMPONENTS = {
  hero: { Component: HeroSection, anchors: ["top"] },
  problem: { Component: ProblemSection, anchors: ["problem"] },
  workflow: { Component: WorkflowSection, anchors: ["workflow"] },
  audiences: { Component: AudiencesSection, anchors: ["roles", "students", "organizations"] },
  how: { Component: HowItWorksSection, anchors: ["how"] },
  capabilities: { Component: CapabilitiesSection, anchors: ["capabilities"] },
  outcomes: { Component: OutcomesSection, anchors: ["outcomes"] },
  proof: { Component: ProofSection, anchors: ["proof"] },
  closing: { Component: ClosingSection, anchors: ["start"] },
  faq: { Component: FaqSection, anchors: ["faq"] },
};

// عنوان الصفحة ووصفها في index.html (مصدر واحد لكل الصفحات)
export default function LandingPage() {
  const sections = SECTIONS.filter((section) => section.enabled && SECTION_COMPONENTS[section.id]);
  const anchors = sections.flatMap((section) => SECTION_COMPONENTS[section.id].anchors);
  // روابط القائمة لأقسام ظاهرة فقط
  const navItems = header.nav.filter((item) => anchors.includes(item.href.slice(1)));

  return (
    <LazyMotion features={loadMotionFeatures} strict>
      <MotionConfig reducedMotion="user">
        <div className="lp" dir="rtl" lang="ar">
          <a className="lp-skip" href="#lp-main">
            تخطَّ إلى المحتوى
          </a>
          <LandingHeader navItems={navItems} />
          <main id="lp-main">
            {sections.map(({ id }) => {
              const { Component } = SECTION_COMPONENTS[id];
              return <Component key={id} />;
            })}
          </main>
          <LandingFooter sectionIds={anchors} />
        </div>
      </MotionConfig>
    </LazyMotion>
  );
}
