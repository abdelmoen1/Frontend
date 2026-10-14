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
  return <Icon size={size} aria-hidden="true" />;
}

// عنوان القسم: سطر تمهيدي صغير، عنوان، وفقرة اختيارية
export function SectionHeading({ id, eyebrow, title, lead, align = "start" }) {
  return (
    <header className={`lp-heading lp-heading-${align}`}>
      {eyebrow && <span className="lp-eyebrow">{eyebrow}</span>}
      <h2 id={id}>{title}</h2>
      {lead && <p className="lp-lead">{lead}</p>}
    </header>
  );
}

// زر أو رابط: to لمسار داخل التطبيق، href لرابط داخل الصفحة
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
