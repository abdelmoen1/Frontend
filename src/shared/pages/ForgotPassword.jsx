import { useState } from "react";
import { Link } from "react-router-dom";
import { MdOutlineMail } from "react-icons/md";
import AuthShell from "../components/AuthShell";
import InputFileds from "../components/InputFileds";
import { requestPasswordReset } from "../services/authService";
import { normalizeAuthError } from "../utils/apiErrors";

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/** AUTH-03: طلب رابط إعادة تعيين كلمة المرور (FR-ACC-05). الرسالة واحدة سواء كان البريد مسجلًا أم لا. */
export default function ForgotPassword() {
  const [email, setEmail] = useState("");
  const [error, setError] = useState("");
  const [sent, setSent] = useState("");
  const [loading, setLoading] = useState(false);

  const submit = async (event) => {
    event.preventDefault();
    const value = email.trim();
    if (!EMAIL_PATTERN.test(value)) {
      setError("أدخل بريدًا إلكترونيًا صحيحًا.");
      return;
    }
    setLoading(true);
    setError("");
    try {
      const response = await requestPasswordReset(value);
      setSent(response.message);
    } catch (err) {
      const { general, fields } = normalizeAuthError(err, { operation: "reset" });
      setError(fields.email || general);
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthShell title="نسيت كلمة المرور؟" description="أدخل بريدك المسجل وسنرسل لك رابطًا لتعيين كلمة مرور جديدة. صلاحية الرابط ساعة واحدة.">
      {sent ? (
        <div className="signin-form">
          <p className="auth-notice" role="status">{sent}</p>
          <p className="create-account">لم تصلك الرسالة؟ تحقق من مجلد الرسائل غير المرغوب فيها، أو <button type="button" className="action-link link-button" onClick={() => setSent("")}>أعد المحاولة</button>.</p>
        </div>
      ) : (
        <form className="signin-form" onSubmit={submit} noValidate aria-busy={loading}>
          <InputFileds
            label="البريد الإلكتروني"
            icon={<MdOutlineMail className="input-icon" />}
            type="email"
            placeholder="name@example.com"
            name="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            error={error}
            autoComplete="email"
          />
          <button className="signin-button" type="submit" disabled={loading} aria-busy={loading}>
            {loading && <span className="auth-spinner" aria-hidden="true" />}
            {loading ? "جارٍ الإرسال..." : "إرسال رابط إعادة التعيين"}
          </button>
        </form>
      )}
      <p className="create-account">
        تذكرت كلمة المرور؟ <Link to="/login" className="action-link create-link">العودة لتسجيل الدخول</Link>
      </p>
    </AuthShell>
  );
}
