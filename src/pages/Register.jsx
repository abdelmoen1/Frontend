import { Link } from "react-router-dom";
import HeroAuthForm from "../components/common/HeroAuthForm";
import "../AuthForm.css";
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { MdOutlineMail } from "react-icons/md";
import { CiLock, CiUser } from "react-icons/ci";
import { FaRegBuilding } from "react-icons/fa";
import InputFileds from "../components/common/InputFileds";
import { register } from "../services/authService";

function Register() {
  const navigate = useNavigate();

  const [formData, setFormData] = useState({
    name: "",
    orgName: "",
    email: "",
    role: "student",
    password: "",
    password_confirmation: "",
    rememberMe: false,
  });
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState({});
  const [selectedRole, setSelectedRole] = useState("student");

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: type === "checkbox" ? checked : value,
    }));
  };

  const handleRoleChange = (e) => {
    setSelectedRole(e.target.value);
    setFormData((prev) => ({ ...prev, role: e.target.value }));
  };

  const organizationFormData = [
    {
      id: 1,
      label: "اسم المؤسسة أو الشركة الرسمي",
      name: "orgName",
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
    const newErrors = {};

    const isStudent = selectedRole === "student";
    const nameValue = isStudent ? formData.name : formData.orgName;

    if (!nameValue) {
      newErrors[isStudent ? "name" : "orgName"] = isStudent
        ? "الرجاء إدخال الاسم الكامل"
        : "الرجاء إدخال اسم المؤسسة";
    }
    if (!formData.email) {
      newErrors.email = "البريد الإلكتروني مطلوب";
    }
    if (!formData.password) {
      newErrors.password = "كلمة المرور مطلوبة";
    } else if (formData.password.length < 8) {
      newErrors.password = "كلمة المرور يجب أن تكون 8 أحرف على الأقل";
    }
    if (formData.password !== formData.password_confirmation) {
      newErrors.password_confirmation = "كلمة المرور لا تطابق";
    }

    setErrorMsg(newErrors);
    if (Object.keys(newErrors).length > 0) return;

    setLoading(true);
    try {
      const payload = {
        ...formData,
        role: selectedRole === "orga" ? "organization" : "student",
      };
      const result = await register(payload);
      console.log(result);
      navigate(
        selectedRole === "student" ? "/student/profile" : "/organization/profile"
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
              >
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
                >
                  {loading ? "يتم إنشاء الحساب...." : "إنشاء الحساب"}
                </button>
              </form>

              <button
                id="googleSignIn"
                className="google-button animate-element delay-800"
                type="button"
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="25" height="25" viewBox="0 0 48 48">
                  <path fill="#FFC107" d="M43.611 20.083H42V20H24v8h11.303c-1.649 4.657-6.08 8-11.303 8c-6.627 0-12-5.373-12-12s5.373-12 12-12c3.059 0 5.842 1.154 7.961 3.039l5.657-5.657C34.046 6.053 29.268 4 24 4C12.955 4 4 12.955 4 24s8.955 20 20 20s20-8.955 20-20c0-1.341-.138-2.65-.389-3.917" />
                  <path fill="#FF3D00" d="m6.306 14.691l6.571 4.819C14.655 15.108 18.961 12 24 12c3.059 0 5.842 1.154 7.961 3.039l5.657-5.657C34.046 6.053 29.268 4 24 4C16.318 4 9.656 8.337 6.306 14.691" />
                  <path fill="#4CAF50" d="M24 44c5.166 0 9.86-1.977 13.409-5.192l-6.19-5.238A11.9 11.9 0 0 1 24 36c-5.202 0-9.619-3.317-11.283-7.946l-6.522 5.025C9.505 39.556 16.227 44 24 44" />
                  <path fill="#1976D2" d="M43.611 20.083H42V20H24v8h11.303a12.04 12.04 0 0 1-4.087 5.571l.003-.002l6.19 5.238C36.971 39.205 44 34 44 24c0-1.341-.138-2.65-.389-3.917" />
                </svg>
                <span>المتابعة بواسطة حساب جوجل</span>
              </button>

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