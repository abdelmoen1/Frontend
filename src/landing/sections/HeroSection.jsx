import { ArrowLeft } from "lucide-react";
// صورة البطل المعتمدة (مكتب مفتوح). النسخة الحالية 577×321 فقط؛ استبدلها بالأصل عالي الدقة بالاسم نفسه
import heroImage from "../assets/hero-office.webp";
import { BRAND, hero } from "../content";
import { CtaLink } from "../components/shared";

// بطل بعرض الشاشة فوق صورة المكتب (من أصول التطبيق) مع طبقة كحلية؛ الترويسة الشفافة تعلوه
export default function HeroSection() {
  return (
    <section className="lp-hero" id={hero.id} aria-labelledby="lp-hero-title">
      <img className="lp-hero-bg" src={heroImage} alt="" width="577" height="321" fetchPriority="high" />
      <div className="lp-container lp-hero-content">
        <span className="lp-hero-eyebrow">{hero.eyebrow}</span>
        <h1 id="lp-hero-title">{hero.title}</h1>
        <p className="lp-hero-lead">
          <strong dir="ltr">{BRAND.name}</strong> {hero.lead}
        </p>
        <div className="lp-hero-actions">
          <CtaLink to={hero.primary.to} variant="sky" className="lp-btn-lg lp-btn-pill">
            {hero.primary.label}
            <ArrowLeft size={18} aria-hidden="true" />
          </CtaLink>
          <CtaLink href={hero.secondary.href} variant="outline-light" className="lp-btn-lg lp-btn-pill">
            {hero.secondary.label}
          </CtaLink>
        </div>
      </div>
    </section>
  );
}
