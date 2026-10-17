import { useEffect, useState } from "react";
import { Link, Navigate, useNavigate } from "react-router-dom";
import AuthShell from "../components/AuthShell";
import { useAuth } from "../auth/useAuth";
import { getUserDestination } from "../auth/destination";
import { resendVerificationEmail } from "../services/authService";
import { maskEmail } from "../utils/accountEmail";

const COOLDOWN_SECONDS = 60;

/** AUTH-02: شرح سبب التأكيد (FR-ACC-08) وإعادة إرسال الرابط مع مهلة بين المحاولات. */
export default function VerifyEmailNotice() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [message, setMessage] = useState(null);
  const [cooldown, setCooldown] = useState(0);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (cooldown <= 0) return undefined;
    const timer = setTimeout(() => setCooldown((s) => s - 1), 1000);
    return () => clearTimeout(timer);
  }, [cooldown]);

  if (user?.email_verified) return <Navigate to={getUserDestination(user)} replace />;

  const resend = async () => {
    setLoading(true);
    setMessage(null);
    try {
      const response = await resendVerificationEmail();
      setMessage({ tone: "notice", text: response.message });
      setCooldown(COOLDOWN_SECONDS);
    } catch (err) {
      setMessage({ tone: "alert", text: err?.status === 429 ? "طلبت روابط كثيرة. انتظر دقيقة ثم أعد المحاولة." : err.message });
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthShell
      title="أكّد بريدك الإلكتروني"
      description={<>أرسلنا رابط تأكيد إلى <bdi dir="ltr">{maskEmail(user?.email)}</bdi>. تأكيد البريد مطلوب قبل إرسال طلب مشروع أو طلب باقة أو التقديم على فرصة.</>}
    >
      {message && <p className={message.tone === "alert" ? "auth-alert" : "auth-notice"} role={message.tone === "alert" ? "alert" : "status"}>{message.text}</p>}
      <button type="button" className="signin-button" onClick={resend} disabled={loading || cooldown > 0} aria-busy={loading}>
        {loading ? "جارٍ الإرسال..." : cooldown > 0 ? `يمكنك الإرسال مجددًا بعد ${cooldown} ث` : "إرسال الرابط مرة أخرى"}
      </button>
      <p className="create-account">
        <Link to={getUserDestination(user)} className="action-link">المتابعة لاحقًا</Link>
        {" · "}
        <button type="button" className="action-link link-button" onClick={async () => { await logout(); navigate("/login", { replace: true }); }}>
          تسجيل الدخول بحساب آخر
        </button>
      </p>
    </AuthShell>
  );
}
