import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { ArrowLeft, BriefcaseBusiness, Trash2 } from "lucide-react";
import { showAlert, Swal } from "../../shared/utils/alerts";
import {
  deleteProjectRequest,
  getDashboardData,
} from "../services/organizationService";
import { PROJECT_REQUEST_STATUS_LABELS } from "../constants/projectRequestOptions";
import "../styles/OrganizationProjects.css";
import "../styles/OrganizationDashboard.css";
const STATUS = {
  draft: "مسودة",
  intake_in_progress: "استكمال المتطلبات",
  analyzing: "قيد المراجعة",
  proposal_ready: "المقترح جاهز",
  revision_requested: "تعديل مطلوب",
  approved: "معتمد",
  rejected: "مرفوض",
  converted_to_opportunity: "معتمد ومنشور",
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

  const handleDelete = async (project) => {
    const result = await showAlert({
      tone: "danger",
      icon: "warning",
      title: "هل أنت متأكد من أنك تريد حذف المشروع؟",
      // نستخدم text بدل html حتى لا يُفسَّر عنوان المشروع كـ HTML
      text: `سيتم حذف "${project.title || "طلب بلا عنوان"}" وكل إجاباته ومقترحه نهائيًا، ولا يمكن التراجع عن ذلك.`,
      showCancelButton: true,
      confirmButtonText: "نعم، احذف المشروع",
      cancelButtonText: "إلغاء",
      focusCancel: true,
      showLoaderOnConfirm: true,
      allowOutsideClick: () => !Swal.isLoading(),
      preConfirm: async () => {
        try {
          await deleteProjectRequest(project.id);
          return true;
        } catch (error) {
          Swal.showValidationMessage(error.message || "تعذر حذف المشروع، حاول مرة أخرى.");
          return false;
        }
      },
    });

    if (!result.isConfirmed) return;

    setRequests((current) => current.filter((item) => item.id !== project.id));
    showAlert({
      icon: "success",
      title: "تم حذف المشروع",
      timer: 1800,
      showConfirmButton: false,
    });
  };

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
              <span>عنوان الطلب</span>
              <span>التاريخ</span>
              <span>التقدّم</span>
              <span>الحالة</span>
              <span />
            </div>

            {requests.map((request) => {
              const progress = PROGRESS[request.status];
              const action = getAction(request);

              return (
                <article className="od-cols od-tr" key={request.id}>
                  <span className="t">{request.title || "طلب بلا عنوان"}</span>

                  <time className="m" dateTime={request.deadline || undefined}>
                    {request.deadline
                      ? formatDate(request.deadline)
                      : "لم يحدد"}
                  </time>
                  <div className="f-1">
                    <small>{progress ?? 0}%</small>
                    <div className="od-pb">
                      <i style={{ width: `${progress ?? 0}%` }} />
                    </div>
                  </div>

                  <span className={`op-status op-status-${request.status}`}>
                    {STATUS[request.status] ||
                      PROJECT_REQUEST_STATUS_LABELS[request.status] ||
                      request.status}
                  </span>

                  <div className="op-row-actions">
                    <Link className="od-link" to={action.path}>
                      {action.label} <ArrowLeft size={15} aria-hidden="true" />
                    </Link>
                    {/* المشروع المنشور (ولو كان قيد التعديل) لا يُحذف؛ الخادم يرفض ذلك أيضًا */}
                    {request.status !== "converted_to_opportunity" && !request.publication && (
                      <button
                        className="op-delete"
                        type="button"
                        onClick={() => handleDelete(request)}
                        aria-label={`حذف ${request.title || "الطلب"}`}
                      >
                        <Trash2 size={15} aria-hidden="true" />
                        <span>حذف</span>
                      </button>
                    )}
                  </div>
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
