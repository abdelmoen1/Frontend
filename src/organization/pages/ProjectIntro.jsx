import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, ArrowRight, Check, Loader2 } from "lucide-react";

import { createProjectRequest } from "../services/organizationService";
import "../styles/ProjectIntro.css";

const STEPS = [
  {
    number: "01",
    title: "اشرح تحدياتك اليومية",
    description:
      "شاركنا كيف تسير أعمالك اليوم وما المشكلة التي ترغب في حلها داخل مؤسستك.",
    illustration: (
      <div className="pi-art pi-art-3" aria-hidden="true">
        <div className="pi-bubble pi-bubble-primary">
          <i />
          <i />
          <i />
        </div>

        <div className="pi-bubble pi-bubble-secondary">
          <i />
        </div>
      </div>
    ),
  },
  {
    number: "02",
    title: "احصل على مقترح واضح",
    description:
      "نرتب احتياجك في تصور عملي يساعدك على فهم نطاق الحل والخطوات المقترحة.",
    illustration: (
      <div className="pi-art pi-art-2" aria-hidden="true">
        <div className="pi-orb">؟</div>
        <span className="pi-star pi-star-1" />
        <span className="pi-star pi-star-2" />
      </div>
    ),
  },
  {
    number: "03",
    title: "انتقل إلى الخطوة التالية",
    description:
      "بعد اعتماد المقترح، تابع حالة طلبك والخطوات المتاحة ضمن المنصة.",
    illustration: (
      <div className="pi-art pi-art-1" aria-hidden="true">
        <div className="pi-doc">
          <i className="pi-tag" />
          <i className="pi-line pi-line-full" />
          <i className="pi-line pi-line-long" />
          <i className="pi-line pi-line-medium" />
        </div>

        <span className="pi-check">
          <Check size={20} strokeWidth={3} />
        </span>
      </div>
    ),
  },
];

export default function ProjectIntro() {
  const navigate = useNavigate();

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleStart = async () => {
    setLoading(true);
    setError("");

    try {
      const draft = await createProjectRequest({});

      navigate(`/organization/requests/${draft.id}/intake`);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "تعذر بدء الطلب، حاول مرة أخرى.",
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="pi-layout" dir="rtl">
      <main className="pi">
        <header className="pi-head">
          <h1>كيف تحوّل GoTrainee فكرتك إلى مشروع ناجح؟</h1>
          <p>مسار العمل المبسط</p>
        </header>

        <section className="pi-grid" aria-label="خطوات إنشاء مشروع">
          {STEPS.map((step) => (
            <article className="pi-card" key={step.number}>
              <span className="pi-num">{step.number}</span>

              <h2>{step.title}</h2>
              <p>{step.description}</p>

              {step.illustration}
            </article>
          ))}
        </section>

        {error && (
          <p className="pi-error" role="alert">
            {error}
          </p>
        )}

        <footer className="pi-bar">
          <button
            className="pi-next"
            type="button"
            onClick={handleStart}
            disabled={loading}
            aria-busy={loading}
          >
            {loading ? (
              <Loader2 className="pi-spin" size={18} aria-hidden="true" />
            ) : null}
            ابدأ الآن
            {!loading && <ArrowLeft size={18} aria-hidden="true" />}
          </button>

          <button
            className="pi-back"
            type="button"
            onClick={() => navigate("/organization")}
            disabled={loading}
          >
            <ArrowRight size={18} aria-hidden="true" />
            رجوع
          </button>
        </footer>
      </main>
    </div>
  );
}
