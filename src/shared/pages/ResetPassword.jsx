import { useState } from "react";
import { Link, useParams, useSearchParams } from "react-router-dom";
import { CiLock } from "react-icons/ci";
import AuthShell from "../components/AuthShell";
import InputFileds from "../components/InputFileds";
import { resetPassword } from "../services/authService";
import { normalizeAuthError } from "../utils/apiErrors";
import { passwordProblems } from "../utils/accountEmail";

/** AUTH-03: تعيين كلمة مرور جديدة من الرابط /reset-password/:token?email= (FR-ACC-05). */
export default function ResetPassword() {
  const { token } = useParams();
  const [params] = useSearchParams();
  const email = params.get("email") || "";
  const [form, setForm] = useState({ password: "", passwordConfirmation: "" });
  const [show, setShow] = useState(false);
  const [errors, setErrors] = useState({});
  const [general, setGeneral] = useState("");
  const [done, setDone] = useState("");
  const [expired, setExpired] = useState(false);
  const [loading, setLoading] = useState(false);

  const set = (key) => (e) => setForm((f) => ({ ...f, [key]: e.target.value }));

  const submit = async (event) => {
    event.preventDefault();
    const problems = passwordProblems(form.password, form.passwordConfirmation);
    setErrors({ password: problems.password, passwordConfirmation: problems.password_confirmation });
    if (Object.keys(problems).length) return;
    setLoading(true);
    setGeneral("");
    try {
      const response = await resetPassword({ token, email, ...form });
      setDone(response.message);
    } catch (err) {
      if (err?.data?.reason === "invalid_token") {
        setExpired(true);
        return;
      }
      const { general: message, fields } = normalizeAuthError(err, { operation: "reset", fieldMap: { password_confirmation: "passwordConfirmation", token: null, email: null } });
      setErrors(fields);
      setGeneral(message);
    } finally {
      setLoading(false);
    }
  };

  if (!token || !email) {
    return (
      <AuthShell title="رابط غير مكتمل" description="افتح الرابط كما وصلك في البريد، أو اطلب رابطًا جديدًا.">
        <Link to="/forgot-password" className="signin-button as-link">طلب رابط جديد</Link>
      </AuthShell>
    );
  }

  if (expired) {
    return (
      <AuthShell title="انتهت صلاحية الرابط" description="رابط إعادة التعيين غير صالح أو استُخدم أو مرّت عليه أكثر من ساعة.">
        <Link to="/forgot-password" className="signin-button as-link">طلب رابط جديد</Link>
      </AuthShell>
    );
  }

  if (done) {
    return (
      <AuthShell title="تم تغيير كلمة المرور" description={done}>
        <p className="auth-notice" role="status">لأمان حسابك أُنهيت جميع الجلسات السابقة.</p>
        <Link to="/login" className="signin-button as-link">تسجيل الدخول</Link>
      </AuthShell>
    );
  }

  return (
    <AuthShell title="تعيين كلمة مرور جديدة" description={<>للحساب <bdi dir="ltr">{email}</bdi></>}>
      <form className="signin-form" onSubmit={submit} noValidate aria-busy={loading}>
        {general && <p className="auth-alert" role="alert">{general}</p>}
        <InputFileds
          label="كلمة المرور الجديدة"
          icon={<CiLock className="input-icon" />}
          type="password"
          placeholder="8 أحرف على الأقل، حرف ورقم"
          name="password"
          value={form.password}
          onChange={set("password")}
          error={errors.password}
          ifPassword={show}
          setPassword={setShow}
          autoComplete="new-password"
        />
        <InputFileds
          label="تأكيد كلمة المرور"
          icon={<CiLock className="input-icon" />}
          type="password"
          placeholder="أعد كتابة كلمة المرور"
          name="passwordConfirmation"
          value={form.passwordConfirmation}
          onChange={set("passwordConfirmation")}
          error={errors.passwordConfirmation}
          ifPassword={show}
          setPassword={setShow}
          autoComplete="new-password"
        />
        <button className="signin-button" type="submit" disabled={loading} aria-busy={loading}>
          {loading && <span className="auth-spinner" aria-hidden="true" />}
          {loading ? "جارٍ الحفظ..." : "حفظ كلمة المرور"}
        </button>
      </form>
    </AuthShell>
  );
}
