import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { BadgeCheck, Briefcase, Clock3, RotateCcw } from "lucide-react";

import { getOpportunities } from "../services/studentService";
import { emptyOpportunitiesMessage, opportunityCard, opportunityLoadError } from "../utils/opportunities";
import "../styles/Opportunities.css";

function SkillList({ skills, variant }) {
  if (!skills.length) return null;
  return (
    <ul className={`opp-skills opp-skills-${variant}`}>
      {skills.map((skill) => (
        <li key={skill}>{skill}</li>
      ))}
    </ul>
  );
}

function OpportunityCard({ item }) {
  const card = opportunityCard(item);
  return (
    <article className="opp-card">
      <header className="opp-card-head">
        <h2>{card.title}</h2>
        {card.organization && (
          <span className="opp-org">
            {card.organization}
            {card.industry ? ` · ${card.industry}` : ""}
          </span>
        )}
      </header>
      {card.summary && <p className="opp-summary">{card.summary}</p>}

      {/* سبب ظهور المشروع: أدوار طابقها الطالب بمهارات متحقق منها فقط */}
      <div className="opp-match">
        <BadgeCheck size={16} aria-hidden="true" />
        <div>
          <p>
            <b>الدور المطابق: </b>
            {card.matchedRoles.join("، ")}
          </p>
          <p>
            <b>مهاراتك المتحقق منها: </b>
            {card.verifiedSkills.join("، ")}
          </p>
        </div>
      </div>

      <div className="opp-roles">
        {card.roles.map((role) => (
          <div className={`opp-role ${role.matched ? "opp-role-matched" : ""}`} key={role.id}>
            <span className="opp-role-title">
              {role.title}
              {role.matched && <span className="opp-tag">يطابق مهاراتك</span>}
            </span>
            <SkillList skills={role.mandatory} variant="mandatory" />
          </div>
        ))}
      </div>

      <footer className="opp-card-foot">
        {card.duration && (
          <span className="opp-duration">
            <Clock3 size={14} aria-hidden="true" /> {card.duration}
          </span>
        )}
        <Link className="opp-btn" to={`/student/opportunities/${card.id}`}>
          عرض التفاصيل
        </Link>
      </footer>
    </article>
  );
}

export default function StudentOpportunities() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      setData(await getOpportunities());
    } catch (loadError) {
      setError(opportunityLoadError(loadError));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    let active = true;
    getOpportunities()
      .then((result) => active && setData(result))
      .catch((loadError) => active && setError(opportunityLoadError(loadError)))
      .finally(() => active && setLoading(false));
    return () => {
      active = false;
    };
  }, []);

  const opportunities = Array.isArray(data?.opportunities) ? data.opportunities : [];
  const empty = emptyOpportunitiesMessage(data?.verified_skills, data?.specialization);

  return (
    <div className="opp-page" dir="rtl">
      <header className="opp-page-head">
        <h1>
          <Briefcase size={22} aria-hidden="true" /> فرص المشاريع
        </h1>
        <p>
          مشاريع حقيقية من المؤسسات، تظهر لك عندما يتوافق مسارك المهني مع أحد أدوارها وتكون مهاراته الإلزامية متحققًا منها
          لديك عبر تقييمات المنصة.
        </p>
      </header>

      {loading ? (
        <div className="opp-grid" aria-busy="true" aria-label="جارٍ تحميل الفرص">
          {[0, 1].map((index) => (
            <div className="opp-card opp-card-skeleton" key={index} />
          ))}
        </div>
      ) : error ? (
        <div className="opp-state" role="alert">
          <p>{error.message}</p>
          {error.retryable && (
            <button type="button" className="opp-btn" onClick={load}>
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
        <div className="opp-state">
          <h2>{empty.title}</h2>
          <p>{empty.body}</p>
          <Link className="opp-btn" to="/student/assessment">
            {empty.action === "assessment" ? "تقييم المهارات" : "اختيار المسار المهني"}
          </Link>
          <Link className="opp-btn opp-btn-light" to="/student/profile">
            مراجعة مهاراتي
          </Link>
        </div>
      ) : (
        <div className="opp-grid">
          {opportunities.map((item) => (
            <OpportunityCard item={item} key={item.id} />
          ))}
        </div>
      )}

      <p className="opp-note">
        ظهور المشروع يعني أنك تستوفي متطلبات أحد أدواره، ولا يعني اختيارك تلقائيًا للفريق.
      </p>
    </div>
  );
}
