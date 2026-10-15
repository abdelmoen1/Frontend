import { useCallback, useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { ArrowRight, BadgeCheck, CircleAlert, Clock3, FileCheck2, Lock, Send, Users } from "lucide-react";

import EligibilityBox from "../components/EligibilityBox";
import { applyToOpportunity, getOpportunity, withdrawApplication } from "../services/studentService";
import { applicationErrorMessage, applyPanelState, formatDate } from "../utils/applications";
import { opportunityCard, opportunityLoadError } from "../utils/opportunities";
import { showAlert } from "../../shared/utils/alerts";
import "../styles/Opportunities.css";

const NOTE_LIMIT = 500;

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

/** لوحة التقديم: حالتها من الخادم فقط (طلب سابق، تقديم مغلق، عدم أهلية، أو أهلية لدور أو أكثر). */
function ApplyPanel({ data, card, onChanged, flash }) {
  const state = applyPanelState(data);
  const [roleId, setRoleId] = useState(state.defaultRoleId ?? null);
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  // بعد أي تغيير يُعاد تحميل الفرصة من الخادم فتُبنى اللوحة من جديد؛ رسالة النتيجة تُمرَّر للأب لتبقى ظاهرة
  const submit = async () => {
    const role = state.eligibleRoles.find((item) => item.id === roleId);
    const confirmation = await showAlert({
      icon: "question",
      title: "تأكيد التقديم",
      text: `ستقدّم على "${card.title}"${role ? ` بدور ${role.title}` : ""}. ستطّلع المؤسسة على ملفك ومهاراتك المثبتة. يمكنك سحب الطلب لاحقًا، لكن لا يمكن التقديم مرة أخرى على الفرصة نفسها.`,
      showCancelButton: true,
      confirmButtonText: "إرسال الطلب",
      cancelButtonText: "تراجع",
    });
    if (!confirmation.isConfirmed) return;

    setBusy(true);
    setError("");
    try {
      await applyToOpportunity(card.id, { preferredRoleId: roleId, note });
      await onChanged({
        tone: "success",
        text: "تم إرسال طلبك بنجاح. ستراجع المؤسسة المتقدمين، وستجد حالة طلبك هنا وفي صفحة طلباتي.",
      });
    } catch (applyError) {
      // طلب سابق أو تغير حالة الفرصة: نحدّث العرض ليطابق الخادم
      if (applyError?.status === 409) {
        await onChanged({ tone: "danger", text: applicationErrorMessage(applyError) });
      } else {
        setError(applicationErrorMessage(applyError));
      }
    }
    setBusy(false);
  };

  const withdraw = async () => {
    const confirmation = await showAlert({
      tone: "danger",
      icon: "warning",
      title: "سحب الطلب؟",
      text: "بعد السحب لن تُعرض بياناتك على المؤسسة لهذا المشروع، ولا يمكن التقديم عليه مرة أخرى.",
      showCancelButton: true,
      confirmButtonText: "نعم، اسحب الطلب",
      cancelButtonText: "إلغاء",
      focusCancel: true,
    });
    if (!confirmation.isConfirmed) return;

    setBusy(true);
    setError("");
    try {
      await withdrawApplication(state.application.id);
      await onChanged({ tone: "neutral", text: "تم سحب طلبك." });
    } catch (withdrawError) {
      setError(applicationErrorMessage(withdrawError));
    }
    setBusy(false);
  };

  return (
    <section className="opp-card opp-apply" aria-labelledby="opp-apply-title" aria-busy={busy}>
      <h2 id="opp-apply-title">التقديم على المشروع</h2>

      {flash && !error && (
        <p
          className={`opp-banner opp-tone-${flash.tone}`}
          role={flash.tone === "danger" ? "alert" : "status"}
        >
          {flash.tone === "success" ? (
            <BadgeCheck size={16} aria-hidden="true" />
          ) : (
            <CircleAlert size={16} aria-hidden="true" />
          )}{" "}
          {flash.text}
        </p>
      )}
      {error && (
        <p className="opp-banner opp-tone-danger" role="alert">
          <CircleAlert size={16} aria-hidden="true" /> {error}
        </p>
      )}

      {state.kind === "applied" && (
        <>
          <div className="opp-apply-status">
            <span className={`opp-pill opp-tone-${state.application.tone}`}>
              <FileCheck2 size={14} aria-hidden="true" /> {state.application.label}
            </span>
            {data.application?.applied_at && (
              <span className="opp-muted">قدّمت في {formatDate(data.application.applied_at)}</span>
            )}
          </div>
          <p className="opp-muted">{state.application.hint}</p>
          <div className="opp-apply-actions">
            <Link className="opp-btn opp-btn-light" to="/student/applications">
              كل طلباتي
            </Link>
            {state.application.canWithdraw && (
              <button type="button" className="opp-btn opp-btn-danger" onClick={withdraw} disabled={busy}>
                {busy ? "جارٍ السحب..." : "سحب الطلب"}
              </button>
            )}
          </div>
        </>
      )}

      {state.kind === "closed" && (
        <div className="opp-apply-locked">
          <Lock size={18} aria-hidden="true" />
          <p>أغلقت المؤسسة التقديم على هذا المشروع وهي تراجع المتقدمين حاليًا.</p>
        </div>
      )}

      {state.kind === "ineligible" && (
        <div className="opp-apply-locked">
          <Lock size={18} aria-hidden="true" />
          <div>
            <p>
              <b>التقديم متاح عندما تستوفي متطلبات دور واحد على الأقل.</b>
            </p>
            <p className="opp-muted">{card.eligibility.message || "راجع ما ينقصك في الأدوار أدناه."}</p>
            {card.eligibility.action && (
              <Link className="opp-btn opp-btn-light" to={card.eligibility.action.to}>
                {card.eligibility.action.label}
              </Link>
            )}
          </div>
        </div>
      )}

      {state.kind === "eligible" && (
        <form
          className="opp-apply-form"
          onSubmit={(event) => {
            event.preventDefault();
            if (!busy) submit();
          }}
        >
          <fieldset>
            <legend>{state.eligibleRoles.length > 1 ? "اختر الدور الذي تفضّله" : "الدور الذي تستوفيه"}</legend>
            {state.eligibleRoles.map((role) => (
              <label key={role.id} className={roleId === role.id ? "opp-radio opp-radio-active" : "opp-radio"}>
                <input
                  type="radio"
                  name="preferred-role"
                  value={role.id}
                  checked={roleId === role.id}
                  onChange={() => setRoleId(role.id)}
                />
                <span>
                  <b>{role.title}</b>
                  {role.label && <small>{role.label}</small>}
                </span>
              </label>
            ))}
          </fieldset>
          <label className="opp-field">
            <span>
              رسالة قصيرة للمؤسسة <small>(اختياري)</small>
            </span>
            <textarea
              rows={3}
              value={note}
              maxLength={NOTE_LIMIT}
              onChange={(event) => setNote(event.target.value)}
              placeholder="لماذا يهمك هذا المشروع، أو خبرة ذات صلة"
            />
            <small className="opp-counter">
              {note.length}/{NOTE_LIMIT}
            </small>
          </label>
          <button type="submit" className="opp-btn opp-btn-block" disabled={busy || roleId === null}>
            <Send size={16} aria-hidden="true" /> {busy ? "جارٍ الإرسال..." : "تقديم الطلب"}
          </button>
          <p className="opp-muted opp-small">التوافق لا يعني الاختيار؛ المؤسسة تختار الفريق من بين المتقدمين.</p>
        </form>
      )}
    </section>
  );
}

export default function StudentOpportunityDetails() {
  const { id } = useParams();
  const validId = /^\d+$/.test(id || "");
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(validId);
  const [error, setError] = useState(validId ? null : opportunityLoadError({ status: 404 }));
  const [flash, setFlash] = useState(null);

  const refresh = useCallback(
    async (message = null) => {
      try {
        const result = await getOpportunity(id);
        setFlash(message);
        setData(result);
      } catch (loadError) {
        setError(opportunityLoadError(loadError));
      }
    },
    [id],
  );

  // الخادم يرفض الفرصة غير المنشورة حتى عند فتح الرابط مباشرة؛ عدم الأهلية لا يخفيها
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
        <div className="opp-detail-layout" aria-busy="true" aria-label="جارٍ تحميل الفرصة">
          <div className="opp-card opp-card-skeleton" />
          <div className="opp-card opp-card-skeleton" />
        </div>
      ) : error ? (
        <div className="opp-state" role="alert">
          <p>{error.message}</p>
          <Link className="opp-btn" to="/student/opportunities">
            العودة إلى الفرص
          </Link>
        </div>
      ) : (
        <div className="opp-detail-layout">
          <div className="opp-detail-main">
            <header className="opp-card opp-detail-head">
              <span className="opp-org">
                {card.organization || "مؤسسة"}
                {card.industry ? ` · ${card.industry}` : ""}
              </span>
              <h1>{card.title}</h1>
              {card.summary && <p className="opp-summary">{card.summary}</p>}
              <ul className="opp-meta" aria-label="معلومات المشروع">
                {card.duration && (
                  <li>
                    <Clock3 size={14} aria-hidden="true" /> المدة التقديرية: {card.duration}
                  </li>
                )}
                <li>
                  <Users size={14} aria-hidden="true" /> فريق من {card.teamSize} ({card.roles.length}{" "}
                  {card.roles.length === 1 ? "دور" : "أدوار"})
                </li>
                {card.minWeeklyHours && <li>التفرغ المطلوب: {card.minWeeklyHours} ساعة أسبوعيًا على الأقل</li>}
              </ul>
              <EligibilityBox
                eligibility={card.eligibility}
                roleTitle={card.eligibility.eligible ? card.eligibleRoles.join("، ") : card.closestRole}
              />
            </header>

            <section className="opp-card" aria-labelledby="opp-roles-title">
              <h2 id="opp-roles-title">الأدوار المطلوبة</h2>
              <div className="opp-roles opp-roles-detail">
                {card.roles.map((role) => (
                  <article className={`opp-role ${role.matched ? "opp-role-matched" : ""}`} key={role.id}>
                    <span className="opp-role-title">
                      {role.title}
                      <span className={`opp-tag opp-tone-${role.eligibility.tone}`}>{role.eligibility.label}</span>
                    </span>
                    <span className="opp-muted">
                      {role.label}
                      {role.headcount > 1 ? ` · ${role.headcount} أشخاص` : ""}
                    </span>
                    {role.responsibilities && <p>{role.responsibilities}</p>}
                    <table className="opp-skill-table">
                      <caption className="opp-sr">مقارنة مهاراتك بمتطلبات دور {role.title}</caption>
                      <thead>
                        <tr>
                          <th scope="col">مهارة إلزامية</th>
                          <th scope="col">المطلوب</th>
                          <th scope="col">مستواك المثبت</th>
                        </tr>
                      </thead>
                      <tbody>
                        {role.requirements.map((skill) => (
                          <tr key={skill.name} className={skill.met ? "opp-row-met" : ""}>
                            <th scope="row">
                              <bdi>{skill.name}</bdi>
                            </th>
                            <td>{skill.requiredLabel}</td>
                            <td>
                              {skill.verifiedLabel || <span className="opp-muted">غير مثبت</span>}
                              {skill.met && <BadgeCheck size={14} aria-label="مستوفى" className="opp-met-icon" />}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                    {role.eligibility.eligible ? (
                      <p className="opp-muted">{role.eligibility.message}</p>
                    ) : (
                      <ul className="opp-reasons" aria-label={`لماذا لا تستوفي دور ${role.title} بعد`}>
                        {role.reasons.map((reason, index) => (
                          <li key={index}>
                            {reason.message}
                            {reason.action && <Link to={reason.action.to}>{reason.action.label}</Link>}
                          </li>
                        ))}
                      </ul>
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

            <section className="opp-card" aria-labelledby="opp-scope-title">
              <h2 id="opp-scope-title">نطاق المشروع المعتمد</h2>
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
              <section className="opp-card" aria-labelledby="opp-milestones-title">
                <h2 id="opp-milestones-title">مراحل التنفيذ</h2>
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
          </div>

          <aside className="opp-detail-aside">
            <ApplyPanel
              key={`${data.id}-${data.application?.status || "none"}-${data.accepting_applications}`}
              data={data}
              card={card}
              onChanged={refresh}
              flash={flash}
            />
          </aside>
        </div>
      )}
    </div>
  );
}
