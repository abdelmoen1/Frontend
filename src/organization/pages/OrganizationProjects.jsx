import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { ArrowLeft, BriefcaseBusiness } from "lucide-react";
import { getDashboardData } from "../services/organizationService";
import { PROJECT_REQUEST_STATUS_LABELS } from "../constants/projectRequestOptions";
import "../styles/OrganizationProjects.css";

const STATUS = {
  draft: "مسودة",
  intake_in_progress: "استكمال المتطلبات",
  analyzing: "قيد المراجعة",
  proposal_ready: "المقترح جاهز",
  revision_requested: "تعديل مطلوب",
  approved: "معتمد",
  rejected: "مرفوض",
  converted_to_opportunity: "محوّل إلى فرصة",
};

// مؤشر مرحلة الطلب، وليس نسبة إنجاز تنفيذ المشروع.
const PROGRESS = {
  draft: null,
  intake_in_progress: 30,
  analyzing: 50,
  revision_requested: 60,
  proposal_ready: 70,
  approved: 85,
  rejected: null,
  converted_to_opportunity: 100,
};

const formatDate = (value) => {
  if (!value) return "غير محدد";

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "غير محدد";

  return new Intl.DateTimeFormat("ar", {
    day: "numeric",
    month: "long",
  }).format(date);
};

const getAction = (request) => {
  const { id, status } = request;

  if (["proposal_ready", "revision_requested"].includes(status)) {
    return {
      label: "مراجعة المقترح",
      path: `/organization/requests/${id}/review`,
    };
  }

  if (["approved", "rejected", "converted_to_opportunity"].includes(status)) {
    return {
      label: "عرض التفاصيل",
      path: `/organization/requests/${id}`,
    };
  }

  return {
    label: status === "analyzing" ? "متابعة الطلب" : "استكمال الطلب",
    path: `/organization/requests/${id}/intake`,
  };
};

export default function OrganizationProjects() {
  const [requests, setRequests] = useState([]);
  const [errors, setErrors] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;

    const loadProjects = async () => {
      try {
        const result = await getDashboardData();

        if (!mounted) return;

        setRequests(Array.isArray(result?.requests) ? result.requests : []);
        setErrors(Array.isArray(result?.errors) ? result.errors : []);
      } catch (error) {
        console.error("تعذر تحميل طلبات المؤسسة:", error);

        if (mounted) {
          setErrors(["تعذر تحميل المشاريع. تحقق من الاتصال بالباك إند."]);
        }
      } finally {
        if (mounted) setLoading(false);
      }
    };

    loadProjects();

    return () => {
      mounted = false;
    };
  }, []);

  return (
    <main className="organization-projects-page" dir="rtl">
      <header className="organization-projects-heading">
        <h1>مشاريعي وطلباتي</h1>
      </header>

      {errors.map((error, index) => (
        <p className="op-error" role="alert" key={`${error}-${index}`}>
          {error}
        </p>
      ))}

      {loading ? (
        <div className="op-loading" aria-busy="true">
          {Array.from({ length: 5 }, (_, i) => (
            <div className="op-skeleton" key={i} />
          ))}
        </div>
      ) : requests.length > 0 ? (
        <div className="op-table-wrap">
          <div className="op-table">
            <div className="op-table-header">
              <span>المشروع</span>
              <span>الموعد</span>
              <span>التقدم</span>
              <span>الحالة</span>
              <span>الإجراء</span>
            </div>

            {requests.map((request) => {
              const progress = PROGRESS[request.status];
              const action = getAction(request);

              return (
                <article className="op-table-row" key={request.id}>
                  <div className="op-project-title">
                    <span className="op-project-icon">
                      <BriefcaseBusiness size={16} />
                    </span>
                    <span>{request.title || "طلب بلا عنوان"}</span>
                  </div>

                  <span className="op-date">
                    {request.deadline
                      ? formatDate(request.deadline)
                      : "لم يحدد"}
                  </span>

                  <div className="op-progress">
                    {progress == null ? (
                      <span className="op-no-progress">—</span>
                    ) : (
                      <>
                        <span className="op-progress-track">
                          <i style={{ width: `${progress}%` }} />
                        </span>
                        <small>{progress}%</small>
                      </>
                    )}
                  </div>

                  <span className={`op-status op-status-${request.status}`}>
                    {STATUS[request.status] ||
                      PROJECT_REQUEST_STATUS_LABELS[request.status] ||
                      request.status}
                  </span>

                  <Link className="op-action" to={action.path}>
                    {action.label}
                    <ArrowLeft size={14} aria-hidden="true" />
                  </Link>
                </article>
              );
            })}
          </div>
        </div>
      ) : (
        <section className="op-empty">
          <BriefcaseBusiness size={32} aria-hidden="true" />
          <h2>لا توجد مشاريع حتى الآن</h2>
          <p>
            ابدأ بإضافة طلب مشروع جديد، وتابع جميع طلبات مؤسستك من هذه الصفحة.
          </p>
          <Link to="/organization/requests/new">إنشاء مشروع جديد</Link>
        </section>
      )}
    </main>
  );
}
