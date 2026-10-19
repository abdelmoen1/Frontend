import { Link } from "react-router-dom";
import { ArrowRight } from "lucide-react";

// Back-to-landing link pinned to the top of the auth form column (login / register).
export default function AuthHomeLink() {
  return (
    <div className="auth-home-bar animate-element">
      <Link to="/" className="auth-home-link">
        <span className="auth-home-link-icon" aria-hidden="true">
          <ArrowRight size={16} strokeWidth={2.25} />
        </span>
        <span>العودة إلى الرئيسية</span>
      </Link>
    </div>
  );
}
