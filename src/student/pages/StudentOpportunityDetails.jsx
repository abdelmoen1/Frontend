import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { ArrowRight, BadgeCheck, Clock3 } from "lucide-react";

import { getOpportunity } from "../services/studentService";
import { opportunityCard, opportunityLoadError } from "../utils/opportunities";
import "../styles/Opportunities.css";

const list = (value) =>
  Array.isArray(value) ? value.filter((item) => typeof item === "string" && item.trim()) : [];

function Bullets({ items }) {
  if (!items.length) return null;
  return (
    <ul className="opp-bullets">
      {items.map((item, index) => (
        <li key={index}>{item}</li>
      ))}
    </ul>
  );
}

export default function StudentOpportunityDetails() {
  const { id } = useParams();
  const validId = /^\d+$/.test(id || "");
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(validId);
  const [error, setError] = useState(validId ? null : opportunityLoadError({ status: 404 }));

  // الخادم يرفض الفرصة غير المنشورة أو غير المطابقة حتى عند فتح الرابط مباشرة
  useEffect(() => {
    if (!validId) return undefined;
    let active = true;
    getOpportunity(id)
      .then((result) => active && setData(result))
      .catch((loadError) => active && setError(opportunityLoadError(loadError)))
      .finally(() => active && setLoading(false));
    return () => {
      active = false;
    };
  }, [id, validId]);

  const card = data ? opportunityCard(data) : null;
  const scope = data?.scope || {};
  const functionalScope = Array.isArray(scope.functional_scope) ? scope.functional_scope : [];
  const milestones = Array.isArray(scope.milestones) ? scope.milestones : [];

  return (
    <div className="opp-page" dir="rtl">
      <Link className="opp-back" to="/student/opportunities">
        <ArrowRight size={16} aria-hidden="true" /> فرص المشاريع
      </Link>

      {loading ? (
        <div className="opp-card opp-card-skeleton" aria-busy="true" aria-label="جارٍ تحميل الفرصة" />
      ) : error ? (
        <div className="opp-state" role="alert">
          <p>{error.message}</p>
          <Link className="opp-btn" to="/student/opportunities">
            العودة إلى الفرص
          </Link>
        </div>
      ) : (
        <>
          <header className="opp-card opp-detail-head">
            <h1>{card.title}</h1>
            {card.organization && (
              <span className="opp-org">
                {card.organization}
                {card.industry ? ` · ${card.industry}` : ""}
              </span>
            )}
            {card.summary && <p className="opp-summary">{card.summary}</p>}
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
            {card.duration && (
              <span className="opp-duration">
                <Clock3 size={14} aria-hidden="true" /> المدة التقديرية: {card.duration}
              </span>
            )}
          </header>

          <section className="opp-card">
            <h2>الأدوار المطلوبة</h2>
            <div className="opp-roles opp-roles-detail">
              {card.roles.map((role) => (
                <article className={`opp-role ${role.matched ? "opp-role-matched" : ""}`} key={role.id}>
                  <span className="opp-role-title">
                    {role.title}
                    {role.matched && <span className="opp-tag">يطابق مهاراتك</span>}
                  </span>
                  {role.label && <span className="opp-muted">{role.label}</span>}
                  {role.responsibilities && <p>{role.responsibilities}</p>}
                  <span className="opp-muted">مهارات إلزامية</span>
                  <ul className="opp-skills opp-skills-mandatory">
                    {role.mandatory.map((skill) => (
                      <li key={skill}>{skill}</li>
                    ))}
                  </ul>
                  {!role.matched && !role.specializationCompatible && (
                    <p className="opp-muted">لا يتوافق هذا الدور مع مسارك المهني.</p>
                  )}
                  {!role.matched && role.specializationCompatible && role.missing.length > 0 && (
                    <p className="opp-muted">
                      مهارات إلزامية غير متحقق منها لديك: {role.missing.join("، ")}.{" "}
                      <Link to="/student/assessment">تقييم المهارات</Link>
                    </p>
                  )}
                  {role.desirable.length > 0 && (
                    <>
                      <span className="opp-muted">مهارات مرغوبة</span>
                      <ul className="opp-skills opp-skills-desirable">
                        {role.desirable.map((skill) => (
                          <li key={skill}>{skill}</li>
                        ))}
                      </ul>
                    </>
                  )}
                </article>
              ))}
            </div>
          </section>

          <section className="opp-card">
            <h2>نطاق المشروع المعتمد</h2>
            {scope.proposed_solution && <p>{scope.proposed_solution}</p>}
            {list(scope.objectives).length > 0 && (
              <>
                <h3>الأهداف</h3>
                <Bullets items={list(scope.objectives)} />
              </>
            )}
            {functionalScope.map((group, index) => (
              <div key={index}>
                <h3>{group?.group || "متطلبات"}</h3>
                <Bullets items={list(group?.requirements)} />
              </div>
            ))}
            {list(scope.out_of_scope).length > 0 && (
              <>
                <h3>خارج النطاق</h3>
                <Bullets items={list(scope.out_of_scope)} />
              </>
            )}
          </section>

          {milestones.length > 0 && (
            <section className="opp-card">
              <h2>مراحل التنفيذ</h2>
              <ol className="opp-milestones">
                {milestones.map((milestone, index) => (
                  <li key={index}>
                    <b>{milestone.title}</b>
                    {milestone.duration && <span className="opp-muted"> · {milestone.duration}</span>}
                    {milestone.description && <p>{milestone.description}</p>}
                  </li>
                ))}
              </ol>
            </section>
          )}

          {/* لا يوجد مسار تقديم أو تكوين فريق في التطبيق بعد؛ لا نعرض زرًا لا يعمل */}
          <p className="opp-note">
            التقديم على المشاريع وتكوين الفرق غير متاحين في المنصة بعد. ظهور المشروع لك يعني أنك
            تستوفي متطلبات أحد أدواره، ولا يعني اختيارك تلقائيًا.
          </p>
        </>
      )}
    </div>
  );
}
