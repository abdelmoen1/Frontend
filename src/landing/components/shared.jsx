import { Link } from "react-router-dom";
import {
  BadgeCheck,
  Code2,
  Compass,
  FileText,
  Layers,
  MessageSquareText,
  ShieldCheck,
  Sparkles,
  Target,
  UserRound,
} from "lucide-react";
import { Reveal } from "./Reveal";

// مفاتيح الأيقونات المستخدمة في content.js (icon: "code" ...). أضف مفتاحًا هنا لأيقونة جديدة من lucide-react.
const ICONS = {
  badge: BadgeCheck,
  code: Code2,
  compass: Compass,
  file: FileText,
  layers: Layers,
  message: MessageSquareText,
  shield: ShieldCheck,
  sparkles: Sparkles,
  target: Target,
  user: UserRound,
};

export function LandingIcon({ name, size = 20 }) {
  const Icon = ICONS[name] || Sparkles;
  return <Icon size={size} strokeWidth={1.75} aria-hidden="true" />;
}

// عنوان القسم: سطر تمهيدي صغير، عنوان، وفقرة اختيارية. split يضع الفقرة في عمود مقابل للعنوان (تخطيط غير متماثل).
export function SectionHeading({ id, eyebrow, title, lead, align = "start", split = false }) {
  return (
    <Reveal className={`lp-heading lp-heading-${align} ${split ? "lp-heading-split" : ""}`.trim()}>
      <div>
        {eyebrow && <span className="lp-eyebrow">{eyebrow}</span>}
        <h2 id={id}>{title}</h2>
      </div>
      {lead && <p className="lp-lead">{lead}</p>}
    </Reveal>
  );
}

// زر أو رابط: to لمسار داخل التطبيق، href لرابط داخل الصفحة. variant: primary | ghost | quiet
export function CtaLink({ to, href, variant = "primary", className = "", children, ...rest }) {
  const classes = `lp-btn lp-btn-${variant} ${className}`.trim();
  if (to) {
    return (
      <Link to={to} className={classes} {...rest}>
        {children}
      </Link>
    );
  }
  return (
    <a href={href} className={classes} {...rest}>
      {children}
    </a>
  );
}

// الشعار على لوحة فاتحة: حروف الشعار الكحلية لا تُقرأ على الخلفية الداكنة، ولا يُعاد تلوينه
export function LogoMark({ logo }) {
  return (
    <>
      <span className="lp-logo-plate">
        <img src={logo} alt="" width="130" height="91" />
      </span>
      <span className="lp-wordmark" dir="ltr">
        <span className="lp-wordmark-go">Go</span>Trainee
      </span>
    </>
  );
}
