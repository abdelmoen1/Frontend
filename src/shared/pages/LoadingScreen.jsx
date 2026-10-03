import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../auth/useAuth";
import logo from "../assets/logo.svg";
import "../styles/LoadingScreen.css";

function LoadingScreen() {
  const navigate = useNavigate();
  const { user } = useAuth();

  useEffect(() => {
    const dashboard =
      user?.role === "organization"
        ? "/organization/dashboard"
        : "/student/dashboard";
    const timer = setTimeout(() => {
      navigate(dashboard, { replace: true });
    }, 3000);

    return () => clearTimeout(timer);
  }, [navigate, user?.role]);

  return (
    <div className="matching-page">
      <img src={logo} alt="GoTrainee Logo" className="matching-logo" />

      <main className="matching-content">
        <h1 className="matching-title">
          مرحبًا بك في <span>GoTrainee</span>!
        </h1>

        <p className="matching-description">
          ابنِ خبرتك العملية، طوّر مهاراتك بثقة، وانطلق نحو فرص التدريب
          والمحاكاة المهنية التي تستحقها.
        </p>

        <div
          className="matching-progress"
          role="progressbar"
          aria-label="جاري التحميل"
          aria-valuemin="0"
          aria-valuemax="100"
        >
          <div className="matching-progress-bar" />
        </div>

        <p className="matching-status">
          <span className="matching-status-dot" />
          جاري البحث عن الفرص التدريبية المناسبة...
        </p>
      </main>

      <div className="matching-landscape" aria-hidden="true">
        <svg
          className="matching-waves"
          viewBox="0 0 1440 260"
          preserveAspectRatio="none"
        >
          <path
            className="matching-wave matching-wave-back"
            d="M0 90 C180 75 285 115 470 98 C670 80 740 25 930 35 C1120 45 1250 90 1440 58 L1440 260 L0 260 Z"
          />
          <path
            className="matching-wave matching-wave-middle"
            d="M0 125 C190 145 340 105 520 115 C720 125 860 78 1040 82 C1200 86 1320 120 1440 102 L1440 260 L0 260 Z"
          />
          <path
            className="matching-wave matching-wave-front"
            d="M0 162 C190 140 330 165 520 150 C720 135 860 160 1030 125 C1190 92 1310 115 1440 112 L1440 260 L0 260 Z"
          />
        </svg>

        <span className="matching-star matching-star-diamond matching-star-one" />
        <span className="matching-star matching-star-diamond matching-star-two" />
        <span className="matching-star matching-star-diamond matching-star-three" />
        <span className="matching-star matching-star-diamond matching-star-four" />
        <span className="matching-star matching-star-diamond matching-star-five" />
        <span className="matching-star matching-star-dot matching-star-six" />
        <span className="matching-star matching-star-dot matching-star-seven" />
        <span className="matching-star matching-star-dot matching-star-eight" />
        <span className="matching-star matching-star-diamond matching-star-nine" />
      </div>
    </div>
  );
}

export default LoadingScreen;
