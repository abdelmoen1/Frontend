import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import {
  ArrowLeft,
  CheckCircle2,
  ClipboardList,
  FileText,
  Plus,
  Rocket,
} from "lucide-react";

import { useAuth } from "../../shared/auth/useAuth";
import { getDashboardData } from "../services/organizationService";
import { PROJECT_REQUEST_STATUS_LABELS } from "../constants/projectRequestOptions";
import "../styles/OrganizationDashboard.css"; // الأنماط المشتركة (project-*) تبقى كما هي
import "../styles/OrganizationDashboard.css";

const STATUS_LABELS = {
  draft: "مسودة",
  intake_in_progress: "استكمال المتطلبات",
  analyzing: "جارٍ تحليل الطلب",
  proposal_ready: "المقترح جاهز للمراجعة",
  revision_requested: "بانتظار تعديل المقترح",
  approved: "تم اعتماد المقترح",
  rejected: "مرفوض",
  converted_to_opportunity: "تحوّل إلى فرصة",
};

const PROGRESS = {
  draft: 10,
  intake_in_progress: 30,
  analyzing: 50,
  revision_requested: 60,
  proposal_ready: 70,
  approved: 85,
  converted_to_opportunity: 100,
  rejected: 0,
};

const IN_PROGRESS = [
  "draft",
  "intake_in_progress",
  "analyzing",
  "revision_requested",
];

const MATCH = {
  all: () => true,
  needs_review: (s) => s === "proposal_ready",
  in_progress: (s) => IN_PROGRESS.includes(s),
  approved: (s) => s === "approved",
  converted: (s) => s === "converted_to_opportunity",
  rejected: (s) => s === "rejected",
};

const statusLabel = (s) =>
  STATUS_LABELS[s] || PROJECT_REQUEST_STATUS_LABELS[s] || "حالة غير محددة";

const formatDate = (v) => {
  const d = v ? new Date(v) : null;
  return d && !Number.isNaN(d.getTime())
    ? new Intl.DateTimeFormat("ar", {
        year: "numeric",
        month: "short",
        day: "numeric",
      }).format(d)
    : "—";
};

const actionPath = (s, id) =>
  ["proposal_ready", "revision_requested"].includes(s)
    ? `/organization/requests/${id}/review`
    : ["approved", "rejected", "converted_to_opportunity"].includes(s)
      ? `/organization/requests/${id}`
      : `/organization/requests/${id}/intake`;

const actionLabel = (s) =>
  ({
    proposal_ready: "مراجعة المقترح",
    revision_requested: "متابعة التعديل",
    approved: "عرض الطلب",
    rejected: "عرض التفاصيل",
    converted_to_opportunity: "عرض التفاصيل",
    analyzing: "متابعة الطلب",
  })[s] || "استكمال الطلب";

const Mountains = () => (
  <svg width="431" height="207" viewBox="-1 88 431 207" aria-hidden="true">
    <defs>
      <linearGradient id="odg0" x1="0" y1="0" x2="0" y2="1">
        <stop stopColor="#256DB4" />
        <stop offset="1" stopColor="#13385E" />
      </linearGradient>
      <linearGradient id="odg1" x1="0" y1="0" x2="0" y2="1">
        <stop stopColor="#1D5C9C" />
        <stop offset="1" stopColor="#0E2A4A" />
      </linearGradient>
      <linearGradient id="odg2" x1="0" y1="0" x2="0" y2="1">
        <stop stopColor="#164E83" />
        <stop offset="1" stopColor="#0C2340" />
      </linearGradient>
      <linearGradient id="odg3" x1="0" y1="0" x2="1" y2="1">
        <stop stopColor="#FBBF24" />
        <stop offset="1" stopColor="#F59E0B" />
      </linearGradient>
    </defs>
    <path
      opacity=".6"
      d="M108.3 395.6L292.3 165.6L418.8 395.6Z"
      fill="url(#odg0)"
    />
    <path
      opacity=".8"
      d="M-56.9 390.6L132.8 172.1L311.1 390.6Z"
      fill="url(#odg1)"
    />
    <path d="M190.9 373L328.9 194.7L478.4 373Z" fill="url(#odg2)" />
    <path opacity=".55" d="M331.3 194.7L480.8 373H285.3Z" fill="#091B32" />
    <path d="M37.5 362.9L221.5 207.7L382.5 362.9Z" fill="#1B528A" />
    <path opacity=".75" d="M226.3 207.7L387.3 362.9H249.3Z" fill="#0C2543" />
    <circle cx="295.7" cy="212.4" r="55.2" fill="url(#odg3)" />
  </svg>
);

function OrganizationDashboard({ showAll = false }) {
  const { user } = useAuth();
  const [profile, setProfile] = useState(null);
  const [requests, setRequests] = useState([]);
  const [errors, setErrors] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  // واجهة التصفية أُزيلت؛ القائمة تعرض كل الطلبات
  const filter = "all";

  useEffect(() => {
    let alive = true;
    getDashboardData().then(({ profile, requests, errors }) => {
      if (!alive) return;
      setProfile(profile);
      setRequests(requests);
      setErrors(errors);
      setIsLoading(false);
    });
    return () => {
      alive = false;
    };
  }, []);

  const total = requests.length;
  const count = (s) => requests.filter((r) => r.status === s).length;

  const stats = useMemo(
    () => [
      { label: "إجمالي طلبات المشاريع", value: total, icon: ClipboardList },
      {
        label: "مقترحات بانتظار مراجعتك",
        value: count("proposal_ready"),
        icon: FileText,
      },
      { label: "مقترحات معتمدة", value: count("approved"), icon: Rocket },
      {
        label: "طلبات تحولت إلى فرص",
        value: count("converted_to_opportunity"),
        icon: CheckCircle2,
      },
    ],
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [requests],
  );

  const filtered = useMemo(
    () => requests.filter((r) => MATCH[filter](r.status)),
    [requests, filter],
  );
  const visible = showAll ? filtered : filtered.slice(0, 5);

  const fields = profile
    ? [
        profile.organization_name,
        profile.organization_type,
        profile.industry,
        profile.description,
        profile.location,
      ]
    : [];
  const completion = profile
    ? Math.round(
        (fields.filter((v) => String(v || "").trim()).length / fields.length) *
          100,
      )
    : null;

  const name = profile?.organization_name || user?.name || "مؤسستك";
  const loadFailed = errors.some((e) => e.includes("طلبات"));

  if (isLoading) {
    return (
      <main
        className="od"
        dir="rtl"
        aria-busy="true"
        aria-label="جارٍ تحميل لوحة المؤسسة"
      >
        <div className="sk-hero">
          <span className="sk-d" style={{ width: "42%", height: 30 }} />
          <span className="sk-d" style={{ width: "62%", height: 14 }} />
          <div className="sk-btns">
            <span className="sk-d sk-btn" />
            <span className="sk-d sk-btn" />
          </div>
        </div>

        <div className="od-row">
          <div className="sk-card">
            <span className="sk" style={{ width: "50%", height: 14 }} />
            <span className="sk" style={{ width: 90, height: 42 }} />
            <span className="sk" style={{ height: 6 }} />
          </div>
          <div className="sk-card">
            <span className="sk" style={{ width: "55%", height: 26 }} />
            <span className="sk" style={{ width: "90%", height: 14 }} />
            <span className="sk" style={{ width: "70%", height: 14 }} />
          </div>
        </div>

        <span
          className="sk"
          style={{
            display: "block",
            width: 160,
            height: 26,
            margin: "44px 0 20px",
          }}
        />
        <div className="od-stats">
          {[0, 1, 2, 3].map((i) => (
            <div className="sk-card sk-stat" key={i}>
              <span className="sk sk-ic" />
              <span className="sk" style={{ width: 70, height: 40 }} />
              <span className="sk" style={{ height: 6 }} />
            </div>
          ))}
        </div>

        <span className="sk sk-th" />
        {[0, 1, 2, 3, 4].map((i) => (
          <span className="sk sk-tr" key={i} />
        ))}
      </main>
    );
  }

  return (
    <main className="od">
      <section className="od-hero">
        <Mountains />
        <div className="od-hero-text">
          <h1>مرحباً بك في GoTrainee،{name} 👋</h1>
          <p>
            حول احتياج مؤسستك الى مشروع رقمي واضح و قابل للتنفيذ بكل سهولة و
            بدون تعقيدات تقنية،
          </p>
        </div>
        <div className="od-hero-actions">
          <Link className="od-btn ghost" to="/organization/profile">
            <div
              className="od-big"
              style={{
                // نحول النسبة مثل 75 إلى 0.75 لتستخدم في الشفافية، أو نحتفظ بها كـ string مثل "75%"
                "--p": completion !== null ? completion / 100 : 1,
              }}
            >
              {completion === null ? "—" : `${completion}%`}
            </div>
            إكمال الملف الشخصي
          </Link>
          <Link className="od-btn main" to="/organization/requests/new">
            <Plus size={18} aria-hidden="true" />
            إنشاء مشروع جديد
          </Link>
        </div>
      </section>

      {errors.map((e) => (
        <p
          className="project-alert project-alert-error"
          role="alert"
          key={e}
          style={{ marginTop: 16 }}
        >
          {e}
        </p>
      ))}

      <div className="od-row">
        <article className="od-card wide">
          <h2>أخبرنا عن الفكرة التي تريد تنفيذها</h2>
          <p>
            لا تحتاج إلى أي معرفة تقنية. أخبرنا عن التحدي اليومي الذي تواجهه
            مؤسستك، <br />
            وسنساعدك خطوة بخطوة على تحويله إلى مشروع تقني واضح وقابل للتنفيذ
            بأيدي طلاب متميزين.{" "}
          </p>
        </article>
        <article className="od-card">
          <ul>
            <li>إشراف أكاديمي وفني متواصل</li>
            <li>بدون متطلبات برمجية معقدة</li>
            <li>يستغرق فقط ٤ إلى ٦ دقائق</li>
          </ul>
        </article>
      </div>

      <h2 className="od-sec">نظرة عامة</h2>
      <section className="od-stats" aria-label="ملخص طلبات المشاريع">
        {stats.map(({ label, value, icon: Icon }) => (
          <article className="od-stat" key={label}>
            <div className="od-stat-top">
              <span className="od-ic">
                <Icon size={18} aria-hidden="true" />
              </span>
              {label}
            </div>
            <div className="od-num">{value}</div>
            <div className="od-bar">
              <i style={{ width: `${total ? (value / total) * 100 : 0}%` }} />
            </div>
          </article>
        ))}
      </section>

      <section style={{ marginTop: 40 }}>
        <div className="od-head">
          <h3>{showAll ? "طلبات المشاريع" : "آخر الطلبات والمشاريع"}</h3>
        </div>

        {visible.length > 0 ? (
          <>
            <div className="od-cols od-th">
              <span>عنوان الطلب</span>
              <span>التاريخ</span>
              <span>التقدّم</span>
              <span>الحالة</span>
              <span />
            </div>
            {visible.map((r) => (
              <article className="od-cols od-tr" key={r.id}>
                <span className="t">{r.title}</span>
                <time className="m" dateTime={r.created_at || undefined}>
                  {formatDate(r.created_at)}
                </time>
                <div className="f-1">
                  <small>{PROGRESS[r.status] ?? 0}%</small>
                  <div className="od-pb">
                    <i style={{ width: `${PROGRESS[r.status] ?? 0}%` }} />
                  </div>
                </div>
                <span className={`op-status op-status-${r.status}`}>
                  {statusLabel(r.status)}
                </span>
                <Link className="od-link" to={actionPath(r.status, r.id)}>
                  {actionLabel(r.status)}{" "}
                  <ArrowLeft size={15} aria-hidden="true" />
                </Link>
              </article>
            ))}
            {!showAll && filtered.length > 5 && (
              <div className="od-more">
                <Link className="od-link" to="/organization/requests">
                  عرض جميع الطلبات <ArrowLeft size={15} aria-hidden="true" />
                </Link>
              </div>
            )}
          </>
        ) : (
          <div className="od-empty">
            <h4>
              {loadFailed
                ? "تعذر تحميل الطلبات"
                : total
                  ? "لا توجد طلبات ضمن هذا التصنيف"
                  : "ابدأ أول مشروع لمؤسستك"}
            </h4>
            <p>
              {loadFailed
                ? "تحقق من اتصالك بالإنترنت ثم حدّث الصفحة."
                : total
                  ? "جرّب تصنيفًا آخر لعرض طلباتك."
                  : "أخبرنا عن تحدٍ تواجهه، وسنساعدك على تحويله إلى مشروع رقمي واضح."}
            </p>
            {!total && !loadFailed && (
              <Link
                className="od-link"
                to="/organization/requests/new"
                style={{ marginTop: 12 }}
              >
                <Plus size={15} aria-hidden="true" /> إنشاء أول مشروع
              </Link>
            )}
          </div>
        )}
      </section>
    </main>
  );
}

export default OrganizationDashboard;
