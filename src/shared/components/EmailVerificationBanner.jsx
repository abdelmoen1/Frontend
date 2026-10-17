import { Link } from "react-router-dom";
import { MailWarning } from "lucide-react";
import { useAuth } from "../auth/useAuth";

/** تنبيه دائم للحسابات التي لم تؤكد بريدها بعد (FR-ACC-08). يختفي تلقائيًا بعد التأكيد. */
export default function EmailVerificationBanner() {
  const { user } = useAuth();
  if (!user || user.email_verified !== false) return null;

  return (
    <div className="verify-banner" role="status">
      <MailWarning size={18} aria-hidden="true" />
      <span>أكّد بريدك الإلكتروني لتتمكن من إرسال الطلبات والتقديم على الفرص.</span>
      <Link to="/verify-email" className="verify-banner-link">تأكيد البريد</Link>
    </div>
  );
}
