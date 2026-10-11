import { useRef, useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { login } from "../services/authService";
import { useAuth } from "../auth/useAuth";
import { getUserDestination } from "../auth/destination";
import { useOAuthError } from "../auth/useOAuthError";
import { normalizeAuthError } from "../utils/apiErrors";
import { MdOutlineMail } from "react-icons/md";
import { CiLock } from "react-icons/ci";
import HeroAuthForm from "../components/HeroAuthForm";
import InputFileds from "../components/InputFileds";
import GoogleAuthButton from "../components/GoogleAuthButton";
import "../styles/AuthForm.css";

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const validate = ({ email, password }) => {
  const errors = {};
  if (!email.trim()) errors.email = "البريد الإلكتروني مطلوب.";
  else if (!EMAIL_PATTERN.test(email.trim())) errors.email = "صيغة البريد الإلكتروني غير صحيحة.";
  if (!password) errors.password = "كلمة المرور مطلوبة.";
  return errors;
};

const focusField = (name) => document.getElementById(name)?.focus();

function Login() {
  const navigate = useNavigate();
  const { setAuthenticatedUser } = useAuth();
  const oauthError = useOAuthError();

  const [formData, setFormData] = useState({
    email: "",
    password: "",
    rememberMe: false,
  });

  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState({});
  const [generalError, setGeneralError] = useState(oauthError);
  const submittingRef = useRef(false);

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: type === "checkbox" ? checked : value,
    }));
    setErrorMsg((prev) => (prev[name] ? { ...prev, [name]: undefined } : prev));
    setGeneralError("");
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (submittingRef.current) return;

    const newErrors = validate(formData);
    setErrorMsg(newErrors);
    setGeneralError("");
    if (Object.keys(newErrors).length > 0) {
      focusField(Object.keys(newErrors)[0]);
      return;
    }

    submittingRef.current = true;
    setLoading(true);
    try {
      const result = await login({ ...formData, email: formData.email.trim() });
      setAuthenticatedUser(result.user);
      navigate(getUserDestination(result.user), { replace: true });
    } catch (error) {
      const { general, fields } = normalizeAuthError(error, { operation: "login" });
      setErrorMsg(fields);
      setGeneralError(general);
      if (Object.keys(fields).length) focusField(Object.keys(fields)[0]);
    } finally {
      submittingRef.current = false;
      setLoading(false);
    }
  };

  return (
    <>
      <div className="background-image"></div>
      <main className="signin-page">
        <section className="signin-section">
          <div className="signin-container">
            <div className="signin-content">
              <h1 className="animate-element delay-100 login-h1">
                مرحبًا بك في GoTraniee
              </h1>

              <p className="description animate-element delay-200">
                أنشئ حسابك كطالب أو باحث عن تدريب واستكشف أفضل الفرص المعتمدة
              </p>

              <form
                id="signinForm"
                className="signin-form"
                onSubmit={handleSubmit}
                noValidate
                aria-busy={loading}
              >
                {generalError && (
                  <p className="auth-alert" role="alert">
                    {generalError}
                  </p>
                )}
                <InputFileds
                  label={"البريد الإلكتروني"}
                  icon={<MdOutlineMail className="input-icon" />}
                  type={"email"}
                  placeholder={"student@university.edu.sa"}
                  name={"email"}
                  value={formData.email}
                  onChange={handleChange}
                  error={errorMsg.email}
                  autoComplete="email"
                />
                <InputFileds
                  label={"كلمة المرور"}
                  icon={<CiLock className="input-icon" />}
                  type={"password"}
                  placeholder={"أدخل كلمة المرور"}
                  name={"password"}
                  value={formData.password}
                  onChange={handleChange}
                  error={errorMsg.password}
                  ifPassword={showPassword}
                  setPassword={setShowPassword}
                  autoComplete="current-password"
                />
                <div className="form-options animate-element delay-500">
                  <label className="remember-label">
                    <input
                      id="rememberMe"
                      name="rememberMe"
                      type="checkbox"
                      checked={formData.rememberMe}
                      onChange={handleChange}
                    />
                    <span>تذكرني</span>
                  </label>
                  <a href="#" id="resetPassword" className="action-link">
                    نسيت كلمة المرور؟
                  </a>
                </div>

                <button
                  className="signin-button animate-element delay-600"
                  type="submit"
                  disabled={loading}
                  aria-busy={loading}
                >
                  {loading && <span className="auth-spinner" aria-hidden="true" />}
                  {loading ? "يتم الآن تسجيل الدخول..." : "تسجيل الدخول"}
                </button>
              </form>

              <div className="divider animate-element delay-700">
                <span className="divider-line"></span>
                <span className="divider-text">أو</span>
                <span className="divider-line"></span>
              </div>

              <GoogleAuthButton
                intent="login"
                label="تسجيل الدخول عبر Google"
                disabled={loading}
              />

              <p className="create-account animate-element delay-900">
                مستخدم جديد؟{" "}
                <Link
                  to="/register"
                  id="createAccount"
                  className="action-link create-link"
                >
                  أنشئ حساب جديد
                </Link>
              </p>
            </div>
          </div>
        </section>
        <HeroAuthForm isLogin={true} />
      </main>
    </>
  );
}

export default Login;
