import HeroAuthForm from "./HeroAuthForm";
import "../styles/AuthForm.css";

/** تخطيط صفحات الحساب الصغيرة (نسيت كلمة المرور، إعادة التعيين، تأكيد البريد) بنفس شكل صفحة الدخول. */
export default function AuthShell({ title, description, children }) {
  return (
    <>
      <div className="background-image"></div>
      <main className="signin-page">
        <section className="signin-section">
          <div className="signin-container">
            <div className="signin-content">
              <h1 className="animate-element delay-100 login-h1">{title}</h1>
              {description && <p className="description animate-element delay-200">{description}</p>}
              {children}
            </div>
          </div>
        </section>
        <HeroAuthForm isLogin={true} />
      </main>
    </>
  );
}
