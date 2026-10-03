import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import {
  FaBookOpen,
  FaBriefcase,
  FaGraduationCap,
  FaRegLightbulb,
  FaRegStar,
} from "react-icons/fa";
import { IoMdArrowDropleft } from "react-icons/io";
import {
  getStudentProfile,
  getStudentSkills,
} from "../services/studentService";
import { useAuth } from "../../shared/auth/useAuth";
import CircularProgress from "../../shared/components/CircularProgress";
import welcomeImg from "../assets/welcome.png";
import "../styles/Dashboard.css";

const PROFILE_FIELDS = [
  "university",
  "academic_major",
  "specific_major",
  "graduation_year",
  "phone",
];

function calcCompletion(profile, skillsCount) {
  if (!profile) return 0;

  const filledFields = PROFILE_FIELDS.filter((field) =>
    Boolean(profile[field]),
  ).length;
  const totalCriteria = PROFILE_FIELDS.length + 1;

  return Math.round(
    ((filledFields + (skillsCount > 0 ? 1 : 0)) / totalCriteria) * 100,
  );
}

function Dashboard() {
  const { user } = useAuth();
  const [profile, setProfile] = useState(null);
  const [skills, setSkills] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [profileError, setProfileError] = useState("");
  const [skillsError, setSkillsError] = useState("");

  const firstName = (profile?.name || user?.name || "").trim().split(" ")[0];

  useEffect(() => {
    let isMounted = true;

    const loadData = async () => {
      const [profileResult, skillsResult] = await Promise.allSettled([
        getStudentProfile(),
        getStudentSkills(),
      ]);

      if (!isMounted) return;

      if (profileResult.status === "fulfilled") {
        setProfile(profileResult.value);
      } else {
        console.error("تعذر جلب بيانات الملف الشخصي", profileResult.reason);
        setProfileError("تعذر تحميل بيانات الملف الشخصي. حاول تحديث الصفحة.");
      }

      if (skillsResult.status === "fulfilled") {
        setSkills(Array.isArray(skillsResult.value) ? skillsResult.value : []);
      } else {
        console.error("تعذر جلب مهارات الطالب", skillsResult.reason);
        setSkillsError("تعذر تحميل المهارات. حاول تحديث الصفحة.");
      }

      setIsLoading(false);
    };

    loadData();

    return () => {
      isMounted = false;
    };
  }, []);

  const completion = calcCompletion(profile, skills.length);
  const stats = [
    {
      label: "المهارات المسجلة",
      value: isLoading ? "—" : skills.length,
      detail: "في ملفك الشخصي",
      icon: <FaBookOpen />,
    },
    {
      label: "اكتمال الملف الشخصي",
      value: isLoading ? "—" : `${completion}%`,
      detail: "من بياناتك المسجلة",
      icon: <FaRegLightbulb />,
    },
    {
      label: "سنة التخرج",
      value: isLoading ? "—" : profile?.graduation_year || "—",
      detail: "حسب ملفك الشخصي",
      icon: <FaGraduationCap />,
    },
  ];

  return (
    <div className="student-dashboard" dir="rtl">
      <section className="dashboard-banner">
        <img
          src={welcomeImg}
          alt=""
          className="dashboard-banner-illustration"
        />

        <div className="dashboard-banner-content">
          <h1 className="dashboard-banner-title">
            مرحبًا بك في GoTrainee{firstName ? `، يا ${firstName}` : ""}!
          </h1>
          <p className="dashboard-banner-subtitle">
            ابدأ رحلتك التدريبية الآن واكتشف أفضل المسارات العملية والمشاريع
            المطروحة.
          </p>

          <div className="dashboard-banner-actions">
            <Link
              to="/student/assessment"
              className="dashboard-banner-btn dashboard-banner-btn-primary"
            >
              <span>اختبار المهارات</span>
              <span className="btn-arrow-badge" aria-hidden="true">
                <IoMdArrowDropleft />
              </span>
            </Link>
            <Link
              to="/student/profile"
              className="dashboard-banner-btn dashboard-banner-btn-light"
            >
              <span>إكمال الملف الشخصي</span>
              <CircularProgress percent={completion} size={26} />
            </Link>
          </div>
        </div>
      </section>

      <section className="dashboard-section" aria-labelledby="overview-title">
        <div className="dashboard-section-header">
          <h2 className="dashboard-section-title" id="overview-title">
            نظرة عامة
          </h2>
        </div>

        <div className="stats-grid">
          {stats.map((stat) => (
            <article className="stat-card" key={stat.label}>
              <div className="stat-card-top">
                <span className="stat-detail">{stat.detail}</span>
                <span className="stat-icon" aria-hidden="true">
                  {stat.icon}
                </span>
              </div>
              <span className="stat-value">{stat.value}</span>
              <span className="stat-label">{stat.label}</span>
            </article>
          ))}
        </div>
        {(profileError || skillsError) && (
          <p className="dashboard-data-error" role="alert">
            {[profileError, skillsError].filter(Boolean).join(" ")}
          </p>
        )}
      </section>

      <section className="dashboard-section" aria-labelledby="paths-title">
        <div className="dashboard-section-header">
          <h2 className="dashboard-section-title" id="paths-title">
            مسارات تدريبية موصى بها لبدء رحلتك
          </h2>
          <Link to="/trainings" className="dashboard-section-link">
            عرض الكل ←
          </Link>
        </div>

        <div className="dashboard-empty-card">
          <span className="dashboard-empty-icon" aria-hidden="true">
            <FaBriefcase />
          </span>
          <p>
            لا توجد مسارات تدريبية متاحة حاليًا. ستظهر توصياتك هنا عند توفرها.
          </p>
        </div>
      </section>

      <section className="dashboard-section" aria-labelledby="activity-title">
        <div className="dashboard-section-header">
          <h2 className="dashboard-section-title" id="activity-title">
            آخر نشاطاتك
          </h2>
          <span className="dashboard-section-caption">سجل التقدم الأخير</span>
        </div>

        <div className="dashboard-empty-card dashboard-empty-card-compact">
          <span className="dashboard-empty-icon" aria-hidden="true">
            <FaRegStar />
          </span>
          <p>
            لا توجد نشاطات لعرضها حاليًا. سيظهر تقدمك هنا عند بدء استخدام
            المنصة.
          </p>
        </div>
      </section>
    </div>
  );
}

export default Dashboard;
