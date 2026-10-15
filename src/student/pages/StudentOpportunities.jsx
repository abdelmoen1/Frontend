import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import {
  BadgeCheck,
  Briefcase,
  ChevronLeft,
  ChevronRight,
  CircleAlert,
  Clock3,
  FileCheck2,
  RotateCcw,
  Search,
  Users,
} from "lucide-react";

import { getOpportunities } from "../services/studentService";
import { specializationNotice } from "../utils/assessments";
import { emptyOpportunitiesMessage, opportunityCard, opportunityLoadError } from "../utils/opportunities";
import "../styles/Opportunities.css";

const FILTERS = [
  { key: "all", label: "كل الفرص" },
  { key: "eligible", label: "أستوفي متطلباتها" },
];

function OpportunityCard({ item }) {
  const card = opportunityCard(item);
  const FitIcon = card.eligibility.eligible ? BadgeCheck : CircleAlert;
  const fitRoles = card.eligibility.eligible ? card.eligibleRoles.join("، ") : card.closestRole;

  return (
    <article className="opp-card opp-card-item" aria-labelledby={`opp-title-${card.id}`}>
      <div className="opp-card-top">
        <span className="opp-org">
          {card.organization || "مؤسسة"}
          {card.industry ? ` · ${card.industry}` : ""}
        </span>
        {card.application && (
          <span className={`opp-pill opp-tone-${card.application.tone}`}>
            <FileCheck2 size={13} aria-hidden="true" /> {card.application.label}
          </span>
        )}
      </div>

      <h2 id={`opp-title-${card.id}`}>{card.title}</h2>
      {card.summary && <p className="opp-summary opp-clamp">{card.summary}</p>}

      <ul className="opp-meta" aria-label="معلومات المشروع">
        {card.duration && (
          <li>
            <Clock3 size={14} aria-hidden="true" /> {card.duration}
          </li>
        )}
        <li>
          <Users size={14} aria-hidden="true" /> فريق من {card.teamSize}
        </li>
        {card.minWeeklyHours && <li>{card.minWeeklyHours} ساعة أسبوعيًا على الأقل</li>}
      </ul>

      <div className={`opp-fit opp-tone-${card.eligibility.tone}`}>
        <FitIcon size={16} aria-hidden="true" />
        <span>
          <b>{card.eligibility.label}</b>
          {fitRoles ? ` · ${fitRoles}` : ""}
        </span>
      </div>

      <ul className="opp-role-list" aria-label="الأدوار المطلوبة">
        {card.roles.map((role) => (
          <li key={role.id}>
            <span className={`opp-dot opp-dot-${role.eligibility.tone}`} aria-hidden="true" />
            <span className="opp-role-name">{role.title}</span>
            <span className="opp-role-skills">
              {role.requirements.map((skill) => (
                <bdi key={skill.name} className={skill.met ? "opp-chip opp-chip-met" : "opp-chip"}>
                  {skill.name}
                </bdi>
              ))}
            </span>
          </li>
        ))}
      </ul>

      <footer className="opp-card-foot">
        <Link className="opp-btn" to={`/student/opportunities/${card.id}`}>
          {card.eligibility.eligible && !card.application ? "التفاصيل والتقديم" : "عرض التفاصيل"}
          <ChevronLeft size={16} aria-hidden="true" />
        </Link>
      </footer>
    </article>
  );
}

export default function StudentOpportunities() {
  const [filter, setFilter] = useState("all");
  const [search, setSearch] = useState("");
  const [query, setQuery] = useState("");
  const [page, setPage] = useState(1);
  const [reload, setReload] = useState(0);
  // نتيجة آخر طلب مع مفتاحه؛ التحميل جارٍ ما دام المفتاح الحالي لم تصل نتيجته بعد
  const [result, setResult] = useState({ key: null, data: null, error: null });
  const requestKey = `${page}|${filter}|${query}|${reload}`;
  const loading = result.key !== requestKey;
  const data = result.data;
  const error = loading ? null : result.error;

  // البحث يُرسل بعد توقف الكتابة لتجنب طلب لكل حرف
  useEffect(() => {
    const timer = setTimeout(() => {
      setQuery(search.trim());
      setPage(1);
    }, 350);
    return () => clearTimeout(timer);
  }, [search]);

  useEffect(() => {
    let active = true;
    const key = `${page}|${filter}|${query}|${reload}`;
    getOpportunities({ page, filter, q: query })
      .then((response) => active && setResult({ key, data: response, error: null }))
      .catch(
        (loadError) =>
          active && setResult((current) => ({ key, data: current.data, error: opportunityLoadError(loadError) })),
      );
    return () => {
      active = false;
    };
  }, [page, filter, query, reload]);

  const opportunities = Array.isArray(data?.opportunities) ? data.opportunities : [];
  const meta = data?.meta || {};
  const counts = meta.counts || {};
  const empty = emptyOpportunitiesMessage(data?.specialization);
  const notice = specializationNotice(data?.specialization);
  const filtering = filter !== "all" || query !== "";

  return (
    <div className="opp-page" dir="rtl">
      <header className="opp-page-head">
        <div>
          <h1>
            <Briefcase size={22} aria-hidden="true" /> فرص المشاريع
          </h1>
          <p>مشاريع حقيقية من مؤسسات، مع مدى توافقك مع كل دور كما يحسبه النظام من مهاراتك المثبتة.</p>
        </div>
        <Link className="opp-btn opp-btn-light" to="/student/applications">
          <FileCheck2 size={16} aria-hidden="true" /> طلباتي
        </Link>
      </header>

      <div className="opp-toolbar">
        <div className="opp-tabs" role="tablist" aria-label="تصفية الفرص">
          {FILTERS.map((item) => (
            <button
              key={item.key}
              type="button"
              role="tab"
              aria-selected={filter === item.key}
              className={filter === item.key ? "opp-tab opp-tab-active" : "opp-tab"}
              onClick={() => {
                setFilter(item.key);
                setPage(1);
              }}
            >
              {item.label}
              {Number.isInteger(counts[item.key]) && <span className="opp-tab-count">{counts[item.key]}</span>}
            </button>
          ))}
        </div>
        <label className="opp-search">
          <Search size={16} aria-hidden="true" />
          <span className="opp-sr">البحث في الفرص</span>
          <input
            type="search"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="ابحث بالعنوان أو المؤسسة أو الدور"
            maxLength={100}
          />
        </label>
      </div>

      {notice && !loading && !error && (
        <div className="opp-match opp-tone-warning" role="note">
          <CircleAlert size={16} aria-hidden="true" />
          <div>
            <p>
              <b>{notice.title}</b>
            </p>
            <p>
              {notice.body} <Link to="/student/profile">تعديل الملف الشخصي</Link>
            </p>
          </div>
        </div>
      )}

      {loading ? (
        <div className="opp-grid" aria-busy="true" aria-label="جارٍ تحميل الفرص">
          {[0, 1, 2].map((index) => (
            <div className="opp-card opp-card-skeleton" key={index} />
          ))}
        </div>
      ) : error ? (
        <div className="opp-state" role="alert">
          <p>{error.message}</p>
          {error.retryable && (
            <button type="button" className="opp-btn" onClick={() => setReload((value) => value + 1)}>
              <RotateCcw size={15} aria-hidden="true" /> إعادة المحاولة
            </button>
          )}
          {error.completeProfile && (
            <Link className="opp-btn opp-btn-light" to="/student/profile">
              إكمال الملف الشخصي
            </Link>
          )}
        </div>
      ) : opportunities.length === 0 ? (
        filtering ? (
          <div className="opp-state">
            <h2>لا توجد فرص مطابقة</h2>
            <p>
              {filter === "eligible"
                ? "لا تستوفي حاليًا متطلبات أي فرصة مفتوحة. افتح الفرص لمعرفة ما ينقصك، أو أثبت مهارات جديدة عبر التقييم."
                : "جرّب كلمات بحث أخرى."}
            </p>
            <button
              type="button"
              className="opp-btn opp-btn-light"
              onClick={() => {
                setFilter("all");
                setSearch("");
              }}
            >
              عرض كل الفرص
            </button>
          </div>
        ) : (
          <div className="opp-state">
            <h2>{empty.title}</h2>
            <p>{empty.body}</p>
            <Link className="opp-btn" to="/student/assessment">
              {empty.action === "assessment" ? "تقييم المهارات" : "اختيار المسار المهني"}
            </Link>
          </div>
        )
      ) : (
        <>
          <div className="opp-grid">
            {opportunities.map((item) => (
              <OpportunityCard item={item} key={item.id} />
            ))}
          </div>
          {meta.last_page > 1 && (
            <nav className="opp-pagination" aria-label="صفحات الفرص">
              <button
                type="button"
                className="opp-btn opp-btn-light"
                disabled={page <= 1}
                onClick={() => setPage((value) => value - 1)}
              >
                <ChevronRight size={16} aria-hidden="true" /> السابق
              </button>
              <span aria-live="polite">
                صفحة {meta.current_page} من {meta.last_page}
              </span>
              <button
                type="button"
                className="opp-btn opp-btn-light"
                disabled={page >= meta.last_page}
                onClick={() => setPage((value) => value + 1)}
              >
                التالي <ChevronLeft size={16} aria-hidden="true" />
              </button>
            </nav>
          )}
        </>
      )}

      <p className="opp-note">
        حالة التوافق يحسبها النظام من مهاراتك المثبتة، وهي لا تعني اختيارك للفريق. القرار النهائي للمؤسسة بعد مراجعة
        المتقدمين.
      </p>
    </div>
  );
}
