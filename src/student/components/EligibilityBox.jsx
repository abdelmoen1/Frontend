import { Link } from "react-router-dom";
import { BadgeCheck, CircleAlert } from "lucide-react";

// حالة الأهلية كما حسبها الخادم (eligibilityView): النص يشرح السبب، والرابط هو الخطوة التالية المقترحة
export default function EligibilityBox({ eligibility, roleTitle }) {
  const Icon = eligibility.eligible ? BadgeCheck : CircleAlert;
  return (
    <div className={`opp-match opp-tone-${eligibility.tone}`} role="note">
      <Icon size={16} aria-hidden="true" />
      <div>
        <p>
          <b>{eligibility.label}</b>
          {roleTitle ? ` · ${roleTitle}` : ""}
        </p>
        {eligibility.message && <p>{eligibility.message}</p>}
        {eligibility.action && (
          <p>
            <Link to={eligibility.action.to}>{eligibility.action.label}</Link>
          </p>
        )}
      </div>
    </div>
  );
}
