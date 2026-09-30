function HeroAuthForm({ isStudent, isLogin, isProfile, currentStep, mirrored = false }) {
  const getImageClass = () => {
    if (isProfile) {
      return currentStep === 2 ? "profile-image-step2" : "profile-image";
    }
    if (isLogin) return "login-image";
    if (isStudent === "student") return "student-image";
    return "orga-image";
  };

  return (
    <section className="hero-section">
      <div
        className={`hero-image ${getImageClass()} ${mirrored ? "mirrored" : ""}`}
      >
        <div className="hero-overlay"></div>
      </div>
      <div id="testimonials" className="testimonials"></div>
    </section>
  );
}

export default HeroAuthForm;