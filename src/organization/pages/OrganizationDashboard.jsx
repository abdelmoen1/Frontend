import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import {
  ArrowLeft,
  ArrowUpLeft,
  BriefcaseBusiness,
  CalendarDays,
  CheckCircle2,
  ClipboardList,
  FileText,
  Lightbulb,
  MessageCircleQuestion,
  Plus,
  Rocket,
  Sparkles,
  UsersRound,
} from "lucide-react";
import { useAuth } from "../../shared/auth/useAuth";
import {
  getOrganizationProfile,
  getProjectRequests,
} from "../services/organizationService";
import { PROJECT_REQUEST_STATUS_LABELS } from "../constants/projectRequestOptions";
import "../styles/OrganizationDashboard.css";

const FILTERS = [
  { id: "all", label: "الكل" },
  { id: "review", label: "بانتظار المراجعة" },
  { id: "active", label: "قيد التنفيذ" },
  { id: "complete", label: "مكتملة" },
];

const filterRequest = (request, filter) => {
  if (filter === "review") {
    return ["proposal_ready", "revision_requested", "analyzing"].includes(
      request.status,
    );
  }
  if (filter === "active") return request.status === "approved";
  if (filter === "complete") {
    return request.status === "converted_to_opportunity";
  }
  return true;
};

function OrganizationDashboard({ showAll = false }) {
  const { user } = useAuth();
  const [profile, setProfile] = useState(null);
  const [requests, setRequests] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [errors, setErrors] = useState([]);
  const [selectedFilter, setSelectedFilter] = useState("all");

  useEffect(() => {
    let isMounted = true;

    Promise.allSettled([getOrganizationProfile(), getProjectRequests()])
      .then((results) => {
        if (!isMounted) return;

        const [profileResult, requestsResult] = results;
        const nextErrors = [];

        if (profileResult.status === "fulfilled") {
          setProfile(profileResult.value);
        } else {
          console.error("تعذر تحميل بيانات المؤسسة:", profileResult.reason);
          nextErrors.push("تعذر تحميل بيانات المؤسسة.");
        }

        if (requestsResult.status === "fulfilled") {
          setRequests(requestsResult.value);
        } else {
          console.error("تعذر تحميل طلبات المشاريع:", requestsResult.reason);
          nextErrors.push("تعذر تحميل طلبات المشاريع.");
        }

        setErrors(nextErrors);
      })
      .finally(() => {
        if (isMounted) setIsLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, []);

  const counts = [
    {
      label: "إجمالي الطلبات",
      value: requests.length,
      icon: ClipboardList,
      tone: "blue",
    },
    {
      label: "بانتظار المراجعة",
      value: requests.filter((item) =>
        ["proposal_ready", "revision_requested", "analyzing"].includes(
          item.status,
        ),
      ).length,
      icon: FileText,
      tone: "orange",
    },
    {
      label: "المشاريع النشطة",
      value: requests.filter((item) => item.status === "approved").length,
      icon: Rocket,
      tone: "purple",
    },
    {
      label: "الفرص المكتملة",
      value: requests.filter(
        (item) => item.status === "converted_to_opportunity",
      ).length,
      icon: CheckCircle2,
      tone: "green",
    },
  ];

  const filteredRequests = useMemo(
    () => requests.filter((item) => filterRequest(item, selectedFilter)),
    [requests, selectedFilter],
  );

  const requiredProfileFields = [
    profile?.organization_name,
    profile?.organization_type,
    profile?.industry,
    profile?.description,
    profile?.location,
  ];
  const profileCompletion = Math.round(
    (requiredProfileFields.filter((value) => Boolean(value?.trim?.() || value))
      .length /
      requiredProfileFields.length) *
      100,
  );

  if (isLoading) {
    return (
      <main
        className="organization-dashboard project-dashboard-loading"
        aria-busy="true"
        aria-label="جارٍ تحميل لوحة المؤسسة"
      >
        <div className="project-loading-line wide" />
        <div className="project-summary-grid">
          {counts.map((item) => (
            <div className="project-loading-card" key={item.label} />
          ))}
        </div>
        <div className="project-loading-card project-loading-list" />
      </main>
    );
  }

  const visibleRequests = showAll
    ? filteredRequests
    : filteredRequests.slice(0, 3);
  const organizationName =
    profile?.organization_name || user?.name || "مؤسستك";

  const getActionPath = (status, id) => {
    if (status === "proposal_ready" || status === "revision_requested") {
      return `/organization/requests/${id}/review`;
    }
    if (status === "approved") return `/organization/requests/${id}`;
    return `/organization/requests/${id}/intake`;
  };

  const getActionLabel = (status) => {
    if (status === "proposal_ready" || status === "revision_requested") {
      return "مراجعة المقترح";
    }
    if (status === "approved") return "عرض المشروع";
    return "متابعة الطلب";
  };

  return (
    <main className="organization-dashboard organization-home" dir="rtl">
      <section className="organization-welcome">
        <div className="organization-welcome-copy">
          <span className="organization-welcome-label">
            مساحة مؤسستك <Sparkles size={14} aria-hidden="true" />
          </span>
          <h1>مرحبًا، {organizationName} 👋</h1>
          <p>
            حوّل احتياجات مؤسستك إلى مشاريع رقمية واضحة، وتابع خطوات تطويرها من
            مكان واحد.
          </p>
        </div>
        <div className="organization-welcome-actions">
          <Link className="organization-guide-link" to="/organization/requests">
            <FileText size={16} aria-hidden="true" />
            دليل الطلبات
          </Link>
          <Link
            className="organization-create-button"
            to="/organization/requests/new"
          >
            <Plus size={17} aria-hidden="true" />
            إنشاء مشروع جديد
          </Link>
        </div>
      </section>

      {errors.map((error) => (
        <p className="project-alert project-alert-error" role="alert" key={error}>
          {error}
        </p>
      ))}

      <section className="organization-stat-grid" aria-label="ملخص الطلبات">
        {counts.map(({ label, value, icon: Icon, tone }) => (
          <article className="organization-stat-card" key={label}>
            <span className={`organization-stat-icon ${tone}`}>
              <Icon size={18} aria-hidden="true" />
            </span>
            <span className="organization-stat-label">{label}</span>
            <strong>{value}</strong>
            <span className="organization-stat-caption">
              {value === 1 ? "طلب واحد" : `${value} طلبات`}
            </span>
            <span
              className={`organization-stat-indicator ${tone}`}
              aria-hidden="true"
            />
          </article>
        ))}
      </section>

      <section className="organization-guide" id="project-guide">
        <div className="organization-section-heading">
          <div className="organization-guide-heading-icon">
            <Lightbulb size={18} aria-hidden="true" />
          </div>
          <div>
            <h2>كيف تحوّل GoTrainee فكرتك إلى مشروع رقمي ناجح؟</h2>
            <p>ثلاث خطوات تساعدك على الانتقال من التحدي إلى حل قابل للتنفيذ.</p>
          </div>
        </div>
        <div className="organization-guide-grid">
          <article className="organization-guide-card">
            <span className="organization-guide-number">١</span>
            <span className="organization-guide-icon blue">
              <MessageCircleQuestion size={19} aria-hidden="true" />
            </span>
            <h3>اشرح تحدياتك اليومية</h3>
            <p>
              شاركنا كيف تسير أعمالك اليوم وما المشكلة التي ترغب في حلها داخل
              مؤسستك.
            </p>
          </article>
          <article className="organization-guide-card">
            <span className="organization-guide-number">٢</span>
            <span className="organization-guide-icon orange">
              <Lightbulb size={19} aria-hidden="true" />
            </span>
            <h3>احصل على مقترح واضح</h3>
            <p>
              نرتب احتياجك في تصور عملي يساعدك على فهم نطاق الحل والخطوات
              المقترحة.
            </p>
          </article>
          <article className="organization-guide-card">
            <span className="organization-guide-number">٣</span>
            <span className="organization-guide-icon blue">
              <UsersRound size={19} aria-hidden="true" />
            </span>
            <h3>تواصل مع أصحاب الخبرة</h3>
            <p>
              بعد اعتماد الفكرة، تصبح جاهزًا لربطها بالمهارات المناسبة لتنفيذها.
            </p>
          </article>
        </div>
      </section>

      <section className="organization-requests">
        <div className="organization-requests-heading">
          <div>
            <h2>{showAll ? "طلبات المشاريع" : "آخر الطلبات والمشاريع"}</h2>
            <p>تابع حالة كل طلب وانتقل مباشرة إلى الخطوة التالية.</p>
          </div>
          <div className="organization-request-filters" aria-label="تصفية الطلبات">
            {FILTERS.map((filter) => (
              <button
                className={
                  selectedFilter === filter.id
                    ? "organization-filter active"
                    : "organization-filter"
                }
                key={filter.id}
                type="button"
                aria-pressed={selectedFilter === filter.id}
                onClick={() => setSelectedFilter(filter.id)}
              >
                {filter.label}
              </button>
            ))}
          </div>
        </div>

        {visibleRequests.length > 0 ? (
          <div className="organization-request-list">
            {visibleRequests.map((item) => (
              <article className="organization-request-row" key={item.id}>
                <span className="organization-request-icon">
                  <BriefcaseBusiness size={18} aria-hidden="true" />
                </span>
                <div className="organization-request-info">
                  <h3>{item.title}</h3>
                  <div className="organization-request-meta">
                    <span
                      className={`project-status-badge project-status-${item.status}`}
                    >
                      {PROJECT_REQUEST_STATUS_LABELS[item.status] ||
                        item.status}
                    </span>
                    <span>
                      <CalendarDays size={13} aria-hidden="true" />
                      {new Date(item.created_at).toLocaleDateString("ar")}
                    </span>
                  </div>
                </div>
                <Link
                  className="organization-request-action"
                  to={getActionPath(item.status, item.id)}
                >
                  {getActionLabel(item.status)}
                  <ArrowLeft size={15} aria-hidden="true" />
                </Link>
              </article>
            ))}
            {!showAll && filteredRequests.length > 3 && (
              <Link
                className="organization-view-all"
                to="/organization/requests"
              >
                عرض جميع الطلبات
                <ArrowLeft size={15} aria-hidden="true" />
              </Link>
            )}
          </div>
        ) : (
          <div className="organization-empty-state">
            <span className="organization-empty-icon">
              <BriefcaseBusiness size={24} aria-hidden="true" />
            </span>
            <h3>
              {requests.length
                ? "لا توجد طلبات ضمن هذا التصنيف"
                : "ابدأ أول مشروع لمؤسستك"}
            </h3>
            <p>
              {requests.length
                ? "جرّب تصنيفًا آخر لعرض طلباتك."
                : "أخبرنا عن تحدٍ تواجهه، وسنساعدك على تحويله إلى مشروع رقمي واضح."}
            </p>
            {!requests.length && (
              <Link
                className="organization-create-button"
                to="/organization/requests/new"
              >
                <Plus size={16} aria-hidden="true" />
                إنشاء أول مشروع
              </Link>
            )}
          </div>
        )}
      </section>

      <section className="organization-bottom-grid">
        <article className="organization-profile-progress">
          <div className="organization-bottom-heading">
            <span className="organization-bottom-icon orange">
              <Sparkles size={17} aria-hidden="true" />
            </span>
            <div>
              <h2>اكتمال بيانات المؤسسة</h2>
              <p>البيانات المكتملة تساعد على فهم احتياجاتك بصورة أفضل.</p>
            </div>
            <strong>{profileCompletion}%</strong>
          </div>
          <div
            className="organization-progress-track"
            role="progressbar"
            aria-label="اكتمال بيانات المؤسسة"
            aria-valuemin="0"
            aria-valuemax="100"
            aria-valuenow={profileCompletion}
          >
            <span style={{ width: `${profileCompletion}%` }} />
          </div>
          <p className="organization-progress-note">
            {profileCompletion === 100
              ? "بيانات مؤسستك الأساسية مكتملة."
              : "أكمل بيانات المؤسسة الأساسية لتحسين تجربة إنشاء الطلبات."}
          </p>
        </article>

        <article className="organization-help-card">
          <span className="organization-bottom-icon blue">
            <MessageCircleQuestion size={18} aria-hidden="true" />
          </span>
          <h2>هل لديك فكرة لمشروع؟</h2>
          <p>
            ابدأ بمشاركة التحدي، وسنرشدك خطوة بخطوة لصياغة طلب واضح.
          </p>
          <Link to="/organization/requests/new">
            ابدأ طلب مشروع
            <ArrowUpLeft size={15} aria-hidden="true" />
          </Link>
        </article>
      </section>
    </main>
  );
}

export default OrganizationDashboard;
