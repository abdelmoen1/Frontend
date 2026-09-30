import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { login } from "../services/authService";
import { MdOutlineMail } from "react-icons/md";
import { CiLock } from "react-icons/ci";
import HeroAuthForm from "../components/common/HeroAuthForm";
import InputFileds from "../components/common/InputFileds";
import "../AuthForm.css";

function Login() {
  const navigate = useNavigate();

  const [formData, setFormData] = useState({
    email: "",
    password: "",
    rememberMe: false,
  });

  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState({});

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: type === "checkbox" ? checked : value,
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const newErrors = {};

    if (!formData.email) {
      newErrors.email = "البريد الإلكتروني مطلوب";
    }
    if (!formData.password) {
      newErrors.password = "كلمة المرور مطلوبة";
    }

    setErrorMsg(newErrors);
    if (Object.keys(newErrors).length > 0) return;

    setLoading(true);
    try {
      const result = await login(formData);
      const role = result.user?.role;
      navigate(
        role === "student" ? "/student/profile" : "/organization/profile",
      );
    } catch (error) {
      console.log(error);
    } finally {
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
              >
                <InputFileds
                  label={"البريد الإلكتروني"}
                  icon={<MdOutlineMail className="input-icon" />}
                  type={"email"}
                  placeholder={"student@university.edu.sa"}
                  name={"email"}
                  value={formData.email}
                  onChange={handleChange}
                  error={errorMsg.email}
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
                >
                  {loading ? "يتم الآن تسجيل الدخول..." : "تسجيل الدخول"}
                </button>
              </form>

              <div className="divider animate-element delay-700">
                <span className="divider-line"></span>
                <span className="divider-text">أو</span>
                <span className="divider-line"></span>
              </div>

              <button
                id="googleSignIn"
                className="google-button animate-element delay-800"
                type="button"
              >
                <svg
                  className="google-icon"
                  xmlns="http://www.w3.org/2000/svg"
                  viewBox="0 0 48 48"
                  aria-hidden="true"
                >
                  <path
                    fill="#FFC107"
                    d="M43.611 20.083H42V20H24v8h11.303c-1.649 4.657-6.08 8-11.303 8-6.627 0-12-5.373-12-12s5.373-12 12-12c3.059 0 5.842 1.154 7.961 3.039l5.657-5.657C34.046 6.053 29.268 4 24 4 12.955 4 4 12.955 4 24s8.955 20 20 20 20-8.955 20-20c0-2.641-.21-5.236-.611-7.743z"
                  />
                  <path
                    fill="#FF3D00"
                    d="M6.306 14.691l6.571 4.819C14.655 15.108 18.961 12 24 12c3.059 0 5.842 1.154 7.961 3.039l5.657-5.657C34.046 6.053 29.268 4 24 4 16.318 4 9.656 8.337 6.306 14.691z"
                  />
                  <path
                    fill="#4CAF50"
                    d="M24 44c5.166 0 9.86-1.977 13.409-5.192l-6.19-5.238C29.211 35.091 26.715 36 24 36c-5.202 0-9.619-3.317-11.283-7.946l-6.522 5.025C9.505 39.556 16.227 44 24 44z"
                  />
                  <path
                    fill="#1976D2"
                    d="M43.611 20.083H42V20H24v8h11.303c-.792 2.237-2.231 4.166-4.087 5.571l6.19 5.238C42.022 35.026 44 30.038 44 24c0-2.641-.21-5.236-.611-7.743z"
                  />
                </svg>
                <span>التسجيل عبر Google</span>
              </button>

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