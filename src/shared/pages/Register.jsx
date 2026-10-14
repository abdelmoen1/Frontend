import { Link } from "react-router-dom";
import HeroAuthForm from "../components/HeroAuthForm";
import "../styles/AuthForm.css";
import { useRef, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { MdOutlineMail } from "react-icons/md";
import { CiLock, CiUser } from "react-icons/ci";
import { FaRegBuilding } from "react-icons/fa";
import InputFileds from "../components/InputFileds";
import { register } from "../services/authService";
import { useAuth } from "../auth/useAuth";
import { getUserDestination } from "../auth/destination";
import { useOAuthError } from "../auth/useOAuthError";
import { normalizeAuthError } from "../utils/apiErrors";
import GoogleAuthButton from "../components/GoogleAuthButton";

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// نفس قواعد RegisterRequest في الخادم
const validate = (formData, isStudent) => {
  const errors = {};
  const nameField = isStudent ? "name" : "orgName";
  const nameValue = formData[nameField].trim();
  if (!nameValue) {
    errors[nameField] = isStudent ? "الرجاء إدخال الاسم الكامل." : "الرجاء إدخال اسم المؤسسة.";
  } else if (nameValue.length > 255) {
    errors[nameField] = "الاسم يجب ألا يتجاوز 255 حرفًا.";
  }

  const email = formData.email.trim();
  if (!email) errors.email = "البريد الإلكتروني مطلوب.";
  else if (!EMAIL_PATTERN.test(email)) errors.email = "صيغة البريد الإلكتروني غير صحيحة.";

  const { password, password_confirmation: confirmation } = formData;
  if (!password) errors.password = "كلمة المرور مطلوبة.";
  else if (password.length < 8) errors.password = "كلمة المرور يجب أن تكون 8 أحرف على الأقل.";
  else if (!/\p{L}/u.test(password)) errors.password = "كلمة المرور يجب أن تحتوي على حرف واحد على الأقل.";
  else if (!/\p{N}/u.test(password)) errors.password = "كلمة المرور يجب أن تحتوي على رقم واحد على الأقل.";

  if (!confirmation) errors.password_confirmation = "تأكيد كلمة المرور مطلوب.";
  else if (password !== confirmation) errors.password_confirmation = "تأكيد كلمة المرور غير مطابق.";

  return errors;
};

const focusField = (name) => document.getElementById(name)?.focus();

function Register() {
  const navigate = useNavigate();
  const { setAuthenticatedUser } = useAuth();
  // ?role=organization (من روابط الصفحة الرئيسية) يبدأ النموذج بحساب مؤسسة؛ أي قيمة أخرى = طالب
  const [searchParams] = useSearchParams();
  // قيم زر الاختيار نفسها: "student" أو "orga"
  const initialRole = searchParams.get("role") === "organization" ? "orga" : "student";

  const [formData, setFormData] = useState({
    name: "",
    orgName: "",
    email: "",
    role: initialRole,
    password: "",
    password_confirmation: "",
    rememberMe: false,
  });
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState({});
  const oauthError = useOAuthError();
  const [generalError, setGeneralError] = useState(oauthError);
  const submittingRef = useRef(false);
  const [selectedRole, setSelectedRole] = useState(initialRole);

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: type === "checkbox" ? checked : value,
    }));
    setErrorMsg((prev) => (prev[name] ? { ...prev, [name]: undefined } : prev));
    setGeneralError("");
  };

  const handleRoleChange = (e) => {
    setSelectedRole(e.target.value);
    setFormData((prev) => ({ ...prev, role: e.target.value }));
    setErrorMsg({});
    setGeneralError("");
  };

  const organizationFormData = [
    {
      id: 1,
      label: "اسم المؤسسة أو الشركة الرسمي",
      name: "orgName",
      autoComplete: "organization",
      placeholder: "اسم المنشأة أو المؤسسة",
      type: "text",
      icon: <FaRegBuilding className="input-icon" />,
      onChange: handleChange,
      value: formData.orgName,
      error: errorMsg.orgName,
    },
    {
      id: 2,
      label: "البريد الإلكتروني",
      name: "email",
      autoComplete: "email",
      placeholder: "student@example.com",
      type: "email",
      icon: <MdOutlineMail className="input-icon" />,
      value: formData.email,
      onChange: handleChange,
      error: errorMsg.email,
    },
    {
      id: 3,
      label: "كلمة المرور",
      name: "password",
      autoComplete: "new-password",
      icon: <CiLock className="input-icon" />,
      type: "password",
      placeholder: "••••••••••••",
      value: formData.password,
      onChange: handleChange,
      error: errorMsg.password,
      ifPassword: showPassword,
      setPassword: setShowPassword,
    },
    {
      id: 4,
      label: "تأكيد كلمة المرور",
      name: "password_confirmation",
      autoComplete: "new-password",
      icon: <CiLock className="input-icon" />,
      type: "password",
      placeholder: "••••••••••••",
      value: formData.password_confirmation,
      onChange: handleChange,
      error: errorMsg.password_confirmation,
      ifPassword: showPassword,
      setPassword: setShowPassword,
    },
  ];

  const studentFormData = [
    {
      id: 1,
      label: "الاسم كامل",
      name: "name",
      autoComplete: "name",
      icon: <CiUser className="input-icon" />,
      type: "text",
      placeholder: "أحمد محمد النجار",
      value: formData.name,
      onChange: handleChange,
      error: errorMsg.name,
    },
    {
      id: 2,
      label: "البريد الإلكتروني",
      name: "email",
      autoComplete: "email",
      icon: <MdOutlineMail className="input-icon" />,
      type: "email",
      placeholder: "student@email.com",
      value: formData.email,
      onChange: handleChange,
      error: errorMsg.email,
    },
    {
      id: 3,
      label: "كلمة المرور",
      name: "password",
      autoComplete: "new-password",
      icon: <CiLock className="input-icon" />,
      type: "password",
      placeholder: "••••••••••••",
      value: formData.password,
      onChange: handleChange,
      error: errorMsg.password,
      ifPassword: showPassword,
      setPassword: setShowPassword,
    },
    {
      id: 4,
      label: "تأكيد كلمة المرور",
      name: "password_confirmation",
      autoComplete: "new-password",
      icon: <CiLock className="input-icon" />,
      type: "password",
      placeholder: "••••••••••••",
      value: formData.password_confirmation,
      onChange: handleChange,
      error: errorMsg.password_confirmation,
      ifPassword: showPassword,
      setPassword: setShowPassword,
    },
  ];

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (submittingRef.current) return;

    const isStudent = selectedRole === "student";
    const newErrors = validate(formData, isStudent);
    setErrorMsg(newErrors);
    setGeneralError("");
    if (Object.keys(newErrors).length > 0) {
      focusField(Object.keys(newErrors)[0]);
      return;
    }

    submittingRef.current = true;
    setLoading(true);
    try {
      const result = await register({
        ...formData,
        name: formData.name.trim(),
        orgName: formData.orgName.trim(),
        email: formData.email.trim(),
        role: isStudent ? "student" : "organization",
      });
      setAuthenticatedUser(result.user);
      navigate(getUserDestination(result.user), { replace: true });
    } catch (error) {
      const { general, fields } = normalizeAuthError(error, {
        operation: "register",
        // حقل name في الخادم يقابل اسم الطالب أو اسم المؤسسة حسب نوع الحساب
        fieldMap: { name: isStudent ? "name" : "orgName", role: null },
      });
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
       <HeroAuthForm isStudent={selectedRole} mirrored={true} />
        <section className="signin-section">
          <div className="signin-container">
            <div className="signin-content">
              <h1 className="animate-element delay-100">
                مرحبًا بك في GoTrainee
              </h1>

              <p className="description animate-element delay-200">
                {selectedRole === "student"
                  ? "أنشئ حسابك كطالب أو باحث عن تدريب واستكشف أفضل الفرص المعتمدة"
                  : "سجّل منشأتك وابدأ استقطاب الكفاءات والكوادر الأكاديمية المؤهلة"}
              </p>

              <form
                id="signinForm"
                className="signin-form animate-element delay-100"
                onSubmit={handleSubmit}
                noValidate
                aria-busy={loading}
              >
                {generalError && (
                  <p className="auth-alert" role="alert">
                    {generalError}
                  </p>
                )}
                <div className="role-toggle-container animate-element delay-300">
                  <input
                    type="radio"
                    name="role"
                    value="student"
                    id="student"
                    className="hidden-radio"
                    onChange={handleRoleChange}
                    checked={selectedRole === "student"}
                  />
                  <label htmlFor="student" className="role-label">
                    <CiUser className="role-icon" />
                    حساب طالب أو خريج
                  </label>

                  <input
                    type="radio"
                    name="role"
                    value="orga"
                    id="orga"
                    className="hidden-radio"
                    onChange={handleRoleChange}
                    checked={selectedRole === "orga"}
                  />
                  <label htmlFor="orga" className="role-label">
                    <FaRegBuilding className="role-icon" />
                    حساب مؤسسة
                  </label>
                </div>

                {(selectedRole === "student"
                  ? studentFormData
                  : organizationFormData
                ).map((input) => (
                  <InputFileds
                    key={input.id}
                    name={input.name}
                    icon={input.icon}
                    placeholder={input.placeholder}
                    label={input.label}
                    error={input.error}
                    type={input.type}
                    onChange={input.onChange}
                    value={input.value}
                    ifPassword={input.ifPassword}
                    setPassword={input.setPassword}
                    autoComplete={input.autoComplete}
                  />
                ))}

                <div className="form-options animate-element delay-500">
                  <label className="remember-label">
                    <input
                      id="rememberMe"
                      name="rememberMe"
                      type="checkbox"
                      checked={formData.rememberMe}
                      onChange={handleChange}
                    />
                    <span>
                      أوافق على <a href="#">شروط الاستخدام المعتمدة</a> و{" "}
                      <a href="#">سياسة الخصوصية</a> الخاصة بمنصة GoTrainee.
                    </span>
                  </label>
                </div>

                <button
                  className="signin-button animate-element delay-600"
                  type="submit"
                  disabled={loading}
                  aria-busy={loading}
                >
                  {loading && <span className="auth-spinner" aria-hidden="true" />}
                  {loading ? "يتم إنشاء الحساب..." : "إنشاء الحساب"}
                </button>
              </form>

              <GoogleAuthButton
                intent="register"
                role={selectedRole === "student" ? "student" : "organization"}
                label={
                  selectedRole === "student"
                    ? "إنشاء حساب طالب عبر Google"
                    : "إنشاء حساب مؤسسة عبر Google"
                }
                disabled={loading}
              />

              <p className="create-account animate-element delay-900">
                لديك حساب بالفعل؟{" "}
                <Link to="/login" id="createAccount" className="action-link create-link">
                  تسجيل الدخول
                </Link>
              </p>
            </div>
          </div>
        </section>
      </main>
    </>
  );
}

export default Register;