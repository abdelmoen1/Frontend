import { useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";

import { useAuth } from "../auth/useAuth";
import { getUserDestination } from "../auth/destination";
import { exchangeGoogleCode } from "../services/authService";
import { ApiError } from "../utils/apiErrors";
import "../styles/AuthForm.css";

// يستقبل رمز التبادل لمرة واحدة من الخادم بعد Google ويحوّله إلى جلسة
function GoogleCallback() {
  const navigate = useNavigate();
  const { setAuthenticatedUser } = useAuth();
  const startedRef = useRef(false);

  useEffect(() => {
    // الرمز صالح لمرة واحدة، فنمنع التنفيذ المزدوج في StrictMode
    if (startedRef.current) return;
    startedRef.current = true;

    const code = new URLSearchParams(window.location.search).get("code");
    // نزيل الرمز من الرابط وسجل المتصفح فورًا
    window.history.replaceState(null, "", window.location.pathname);

    if (!code) {
      navigate("/login?oauth_error=exchange_failed", { replace: true });
      return;
    }

    exchangeGoogleCode(code)
      .then((result) => {
        setAuthenticatedUser(result.user);
        navigate(getUserDestination(result.user), { replace: true });
      })
      .catch((error) => {
        const reason =
          error instanceof ApiError && error.kind === "network" ? "network" : "exchange_failed";
        navigate(`/login?oauth_error=${reason}`, { replace: true });
      });
  }, [navigate, setAuthenticatedUser]);

  return (
    <main className="oauth-callback" dir="rtl" role="status" aria-live="polite">
      <span className="auth-spinner auth-spinner-dark" aria-hidden="true" />
      <p>جارٍ إكمال تسجيل الدخول عبر Google...</p>
    </main>
  );
}

export default GoogleCallback;
