import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import logo from "../assets/logo.svg";
import "../AuthForm.css";

function MatchingLoading() {
  const navigate = useNavigate();

  useEffect(() => {
    // حنستبدله ب api حقيقي للفرص
    const timer = setTimeout(() => {
      navigate("/");
    }, 3000);

    return () => clearTimeout(timer);
  }, [navigate]);

  return (
    <div className="matching-page">
      <img src={logo} alt="GoTrainee Logo" className="matching-logo" />

      <h1 className="matching-title">مرحبًا بك في GoTrainee!</h1>

      <p className="matching-description">
        ابن خبرتك العملية، طوّر مهاراتك بثقة، وانطلق نحو فرص التدريب والمحاكاة
        المهنية التي تستحقها.
      </p>

      <div className="matching-progress">
        <div className="matching-progress-bar"></div>
      </div>

      <p className="matching-status">
        <span className="matching-status-dot"></span>
    جاري البحث عن الفرص التدريبية المناسبة  ...
      </p>
    </div>
  );
}

export default MatchingLoading;