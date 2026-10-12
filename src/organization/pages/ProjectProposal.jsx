import { useCallback, useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import {
  BadgeCheck,
  CalendarClock,
  ClipboardList,
  FileText,
  ListChecks,
  LoaderCircle,
  MessageSquare,
  PencilLine,
  RotateCcw,
  Send,
  Users,
  Wallet,
} from "lucide-react";

import ProjectFlowStepper from "../components/ProjectFlowStepper";
import { Skeleton, SkeletonGroup } from "../components/Skeleton";
import { PROJECT_REQUEST_STATUS_LABELS } from "../constants/projectRequestOptions";
import {
  analyzeProjectRequest,
  approveProposal,
  getProjectRequest,
} from "../services/organizationService";
import {
  PUBLICATION_STATUS_LABELS,
  keyRequirements,
  matchingSummary,
  reviewState,
  staffingRoles,
  stripListNumbering,
} from "../utils/proposalReview";
import "../styles/ProjectProposal.css";

// أدوات قراءة آمنة: نعرض فقط ما ولّده المقترح فعلًا
const text = (value) => (typeof value === "string" ? value.trim() : "");
// عناصر القوائم تُعرض دون الترقيم اليدوي الذي يكتبه النموذج أحيانًا
const strings = (value) =>
  Array.isArray(value) ? value.map(stripListNumbering).filter(Boolean) : [];
const rows = (value, keys) =>
  Array.isArray(value)
    ? value.filter((row) => row && keys.some((key) => text(row[key])))
    : [];

const formatDate = (value) =>
  value
    ? new Date(value).toLocaleDateString("ar", { year: "numeric", month: "long", day: "numeric" })
    : "";

const LOAD_ERRORS = {
  403: "لا تملك صلاحية عرض هذا الطلب.",
  404: "لم نعثر على هذا الطلب أو لا تملك صلاحية الوصول إليه.",
};

function Section({ id, icon: Icon, title, children }) {
  return (
    <section className="prp-section" id={id} aria-labelledby={`${id}-title`}>
      <h2 id={`${id}-title`}>
        <span className="prp-section-icon" aria-hidden="true">
          <Icon size={20} />
        </span>
        {title}
      </h2>
      {children}
    </section>
  );
}

function Block({ title, children, wide = false }) {
  return (
    <article className={`prp-block ${wide ? "prp-block-wide" : ""}`}>
      <h3>{title}</h3>
      {children}
    </article>
  );
}

function BulletList({ items }) {
  return (
    <ul className="prp-list">
      {items.map((item, index) => (
        <li key={index}>{item}</li>
      ))}
    </ul>
  );
}

function DataTable({ columns, data }) {
  return (
    <div className="prp-table-wrap">
      <table className="prp-table">
        <thead>
          <tr>
            {columns.map((column) => (
              <th key={column.key} scope="col">
                {column.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {data.map((row, index) => (
            <tr key={index}>
              {columns.map((column) => (
                <td key={column.key}>{text(row[column.key]) || "—"}</td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function SkillChips({ skills, kind }) {
  if (!skills.length) return null;
  return (
    <ul className={`prp-chips prp-chips-${kind}`}>
      {skills.map((skill) => (
        <li
          key={skill.name}
          className={skill.matchable ? "" : "prp-chip-unmapped"}
          title={skill.matchable ? undefined : "ليست ضمن قائمة مهارات المنصة؛ لن تُستخدم في مطابقة الطلاب"}
        >
          {skill.name}
          {!skill.matchable && <span className="prp-visually-hidden"> (لن تُستخدم في المطابقة)</span>}
        </li>
      ))}
    </ul>
  );
}

// الأدوار المنظمة هي ما يُعتمد ويُستخدم في مطابقة الطلاب
function StaffingBlock({ staffing }) {
  const roles = staffingRoles(staffing);
  if (!roles.length) return null;
  const unmapped = Array.isArray(staffing?.unmapped_skills) ? staffing.unmapped_skills : [];

  return (
    <Block title="الأدوار والمهارات المطلوبة" wide>
      <div className="prp-roles">
        {roles.map((role, index) => (
          <article className="prp-role" key={`${role.title}-${index}`}>
            <header className="prp-role-head">
              <h4>{role.title}</h4>
              <span className="prp-pill">
                {role.categoryLabel}
                {role.headcount > 1 ? ` · ${role.headcount} طلاب` : ""}
              </span>
            </header>
            {role.responsibilities && <p>{role.responsibilities}</p>}
            {role.rationale && (
              <p className="prp-muted">
                <b>لماذا هذا الدور: </b>
                {role.rationale}
              </p>
            )}
            <div className="prp-role-skills">
              <span>مهارات إلزامية</span>
              <SkillChips skills={role.mandatory} kind="mandatory" />
            </div>
            {role.desirable.length > 0 && (
              <div className="prp-role-skills">
                <span>مهارات مرغوبة</span>
                <SkillChips skills={role.desirable} kind="desirable" />
              </div>
            )}
            {!role.matchable && (
              <p className="prp-warning">لا يمكن مطابقة الطلاب مع هذا الدور لأن مهاراته الإلزامية ليست ضمن قائمة المنصة.</p>
            )}
            {role.matchable && role.untested.length > 0 && (
              <p className="prp-warning">
                مهارات عملية لا يكفي التقييم المكتوب لإثباتها: {role.untested.join("، ")}. لن يستوفي طالب هذا الدور إلا
                بعد تحقق عملي تسجله إدارة المنصة (مثل مراجعة أعمال سابقة).
              </p>
            )}
          </article>
        ))}
      </div>
      {unmapped.length > 0 && (
        <p className="prp-muted">
          المهارات ذات الإطار المتقطع ليست ضمن قائمة مهارات المنصة ولن تُستخدم في المطابقة: {unmapped.join("، ")}.
        </p>
      )}
    </Block>
  );
}

function KeyRequirementsBlock({ proposal }) {
  const items = keyRequirements(proposal);
  if (!items.length) return null;
  return (
    <Block title="أساس المتطلبات الرئيسية" wide>
      <ul className="prp-basis-list">
        {items.map((item, index) => (
          <li key={index}>
            <span className={`prp-basis prp-basis-${item.basis}`}>{item.basisLabel}</span>
            <span>
              {item.requirement}
              {item.note && <span className="prp-muted"> — {item.note}</span>}
            </span>
          </li>
        ))}
      </ul>
    </Block>
  );
}

// الاعتماد: مراجعة صريحة للأدوار والمهارات ثم النشر للطلاب المؤهلين
function ApprovalPanel({ state, onApprove, approving, approveError }) {
  const [confirmed, setConfirmed] = useState(false);
  const pendingChanges = state.mode === "pending_changes";

  return (
    <section className="prp-card prp-approval" aria-labelledby="prp-approval-title">
      <h2 id="prp-approval-title">
        <BadgeCheck size={20} aria-hidden="true" />
        {pendingChanges ? "اعتماد النسخة المعدلة" : "اعتماد المقترح ونشره"}
      </h2>
      <p>
        {pendingChanges
          ? `الطلاب يرون حاليًا النسخة المعتمدة رقم ${state.publication.version}. لن تُستبدل إلا بعد اعتمادك لهذه النسخة.`
          : "بعد الاعتماد يُحفظ المقترح كنسخة معتمدة ويظهر المشروع للطلاب الذين يطابقون أحد الأدوار بمهارات متحقق منها."}
      </p>
      {state.blockedReason ? (
        <p className="prp-warning" role="note">
          {state.blockedReason}
        </p>
      ) : (
        <>
          <label className="prp-confirm">
            <input
              type="checkbox"
              checked={confirmed}
              onChange={(event) => setConfirmed(event.target.checked)}
              disabled={approving}
            />
            <span>راجعت النطاق والأدوار والمهارات المطلوبة وأؤكد أنها تعبر عن احتياج المؤسسة.</span>
          </label>
          {approveError && (
            <p className="prp-error" role="alert">
              {approveError}
            </p>
          )}
          <button
            type="button"
            className="prp-btn prp-btn-primary"
            onClick={onApprove}
            disabled={!confirmed || approving}
            aria-busy={approving}
          >
            {approving ? (
              <LoaderCircle className="prp-spin" size={16} aria-hidden="true" />
            ) : (
              <Send size={16} aria-hidden="true" />
            )}
            {approving ? "جارٍ الاعتماد..." : pendingChanges ? "اعتماد النسخة المعدلة" : "اعتماد المقترح ونشره"}
          </button>
        </>
      )}
    </section>
  );
}

function PublicationPanel({ publication, justApproved }) {
  const summary = matchingSummary(publication);
  return (
    <section className="prp-card prp-publication" aria-labelledby="prp-publication-title">
      <h2 id="prp-publication-title">
        <ListChecks size={20} aria-hidden="true" />
        حالة النشر
      </h2>
      {justApproved && (
        <p className="prp-success" role="status">
          تم اعتماد المقترح ونشره للطلاب المؤهلين.
        </p>
      )}
      <dl className="prp-specs">
        <div>
          <dt>الحالة</dt>
          <dd>{PUBLICATION_STATUS_LABELS[publication.status] || publication.status}</dd>
        </div>
        <div>
          <dt>النسخة المعتمدة</dt>
          <dd>رقم {publication.version}</dd>
        </div>
        {publication.published_at && (
          <div>
            <dt>تاريخ النشر</dt>
            <dd>{formatDate(publication.published_at)}</dd>
          </div>
        )}
      </dl>
      {summary.roles.length > 0 && (
        <div className="prp-table-wrap">
          <table className="prp-table">
            <thead>
              <tr>
                <th scope="col">الدور</th>
                <th scope="col">المهارات الإلزامية</th>
                <th scope="col">طلاب مؤهلون حاليًا</th>
              </tr>
            </thead>
            <tbody>
              {summary.roles.map((role) => (
                <tr key={role.title}>
                  <td>{role.title}</td>
                  <td>{role.mandatory.join("، ") || "—"}</td>
                  <td>{role.eligible}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      {!summary.hasEligible && summary.roles.length > 0 && (
        <p className="prp-muted">
          لا يوجد حاليًا طلاب يطابقون الأدوار بمهارات متحقق منها، لذلك لا يظهر المشروع لأي طالب بعد.
          سيظهر تلقائيًا لكل طالب يستوفي متطلبات أحد الأدوار.
        </p>
      )}
    </section>
  );
}

function ProposalContent({ proposal, staffing }) {
  const overview = proposal.project_overview || {};
  const problem = proposal.business_problem || {};
  const tech = proposal.technical_recommendation || {};
  const srs = proposal.srs_summary || {};

  const summary = text(overview.executive_summary);
  const problemStatement = text(overview.business_problem);
  const solution = text(proposal.proposed_solution) || text(overview.proposed_solution);
  const situation = text(problem.current_situation);
  const painPoints = strings(problem.pain_points);
  const impact = text(problem.impact);
  const objectives = strings(proposal.objectives);
  const targetUsers = rows(proposal.target_users, ["user", "role", "interaction"]);
  const successCriteria = strings(proposal.success_criteria);

  const scopeGroups = Array.isArray(proposal.functional_scope)
    ? proposal.functional_scope.filter((group) => strings(group?.requirements).length)
    : [];
  const functional = strings(srs.functional_requirements);
  const nonFunctional = strings(srs.non_functional_considerations);
  const outOfScope = strings(proposal.out_of_scope);
  const assumptions = strings(proposal.assumptions);
  const needsConfirmation = strings(proposal.needs_confirmation);
  const techRows = [
    ["نوع التطبيق", text(tech.application_type)],
    ["الواجهة الأمامية", text(tech.frontend)],
    ["الخادم", text(tech.backend)],
    ["قاعدة البيانات", text(tech.database)],
  ].filter(([, value]) => value);
  const integrations = strings(tech.integrations);
  const rationale = text(tech.rationale);

  const milestones = rows(proposal.milestones, ["title", "description"]);
  const duration = text(proposal.estimated_duration);
  const cost = text(proposal.estimated_cost);
  const team = rows(proposal.proposed_team, ["role", "responsibilities"]);
  const skills = strings(proposal.required_skills);
  const operational = rows(proposal.operational_cost, ["item", "estimate"]);

  const hasOverview =
    summary || problemStatement || solution || situation || painPoints.length ||
    impact || objectives.length || targetUsers.length || successCriteria.length;
  // أقسام اختيارية: لا تظهر إلا إذا ولّدها المقترح فعلًا
  const risks = strings(proposal.risks);
  const paymentSchedule = rows(proposal.payment_schedule, ["milestone", "share"]);

  const hasSrs =
    scopeGroups.length || functional.length || nonFunctional.length || outOfScope.length ||
    assumptions.length || needsConfirmation.length || risks.length || techRows.length ||
    integrations.length;
  const hasStaffing = staffingRoles(staffing).length > 0;
  const hasTeam = hasStaffing || team.length || skills.length || operational.length;

  return (
    <>
      {(duration || cost || milestones.length > 0) && (
        <div className="prp-stats">
          {duration && (
            <div className="prp-stat">
              <span>المدة التقديرية</span>
              <strong>{duration}</strong>
            </div>
          )}
          {milestones.length > 0 && (
            <div className="prp-stat">
              <span>عدد مراحل التنفيذ</span>
              <strong>{milestones.length}</strong>
            </div>
          )}
          {cost && (
            <div className="prp-stat prp-stat-cost">
              <span>التكلفة التقديرية</span>
              <strong>{cost}</strong>
            </div>
          )}
        </div>
      )}

      {hasOverview ? (
        <Section id="overview" icon={FileText} title="نظرة عامة على المشروع">
          <div className="prp-grid">
            {summary && (
              <Block title="الملخص التنفيذي" wide>
                <p>{summary}</p>
              </Block>
            )}
            {(problemStatement || situation || impact) && (
              <Block title="المشكلة">
                {problemStatement && <p>{problemStatement}</p>}
                {situation && (
                  <p>
                    <b>الوضع الحالي: </b>
                    {situation}
                  </p>
                )}
                {impact && (
                  <p>
                    <b>الأثر: </b>
                    {impact}
                  </p>
                )}
              </Block>
            )}
            {solution && (
              <Block title="الحل المقترح">
                <p>{solution}</p>
              </Block>
            )}
            {painPoints.length > 0 && (
              <Block title="نقاط الألم">
                <BulletList items={painPoints} />
              </Block>
            )}
            {objectives.length > 0 && (
              <Block title="أهداف العمل">
                <BulletList items={objectives} />
              </Block>
            )}
            {successCriteria.length > 0 && (
              <Block title="معايير النجاح">
                <BulletList items={successCriteria} />
              </Block>
            )}
            {targetUsers.length > 0 && (
              <Block title="المستخدمون المستهدفون" wide>
                <DataTable
                  columns={[
                    { key: "user", label: "المستخدم" },
                    { key: "role", label: "الدور" },
                    { key: "interaction", label: "طريقة الاستخدام" },
                  ]}
                  data={targetUsers}
                />
              </Block>
            )}
          </div>
        </Section>
      ) : null}

      {hasSrs ? (
        <Section id="srs" icon={ClipboardList} title="وثيقة متطلبات البرمجيات (SRS)">
          <div className="prp-grid">
            {scopeGroups.map((group, index) => (
              <Block key={index} title={text(group.group) || "نطاق وظيفي"}>
                <BulletList items={strings(group.requirements)} />
              </Block>
            ))}
            {functional.length > 0 && (
              <Block title="المتطلبات الوظيفية">
                <BulletList items={functional} />
              </Block>
            )}
            {nonFunctional.length > 0 && (
              <Block title="المتطلبات غير الوظيفية">
                <BulletList items={nonFunctional} />
              </Block>
            )}
            {outOfScope.length > 0 && (
              <Block title="خارج النطاق">
                <BulletList items={outOfScope} />
              </Block>
            )}
            {assumptions.length > 0 && (
              <Block title="الافتراضات">
                <BulletList items={assumptions} />
              </Block>
            )}
            {needsConfirmation.length > 0 && (
              <Block title="نقاط تحتاج إلى تأكيد">
                <BulletList items={needsConfirmation} />
              </Block>
            )}
            {risks.length > 0 && (
              <Block title="المخاطر والاعتماديات">
                <BulletList items={risks} />
              </Block>
            )}
            <KeyRequirementsBlock proposal={proposal} />
            {(techRows.length > 0 || integrations.length > 0 || rationale) && (
              <Block title="التوصية التقنية (مبدئية بانتظار التأكيد)" wide>
                {techRows.length > 0 && (
                  <dl className="prp-specs">
                    {techRows.map(([label, value]) => (
                      <div key={label}>
                        <dt>{label}</dt>
                        <dd>{value}</dd>
                      </div>
                    ))}
                  </dl>
                )}
                {integrations.length > 0 && (
                  <p>
                    <b>التكاملات: </b>
                    {integrations.join("، ")}
                  </p>
                )}
                {rationale && <p className="prp-muted">{rationale}</p>}
              </Block>
            )}
          </div>
        </Section>
      ) : null}

      {(milestones.length > 0 || duration) && (
        <Section id="plan" icon={CalendarClock} title="خطة التنفيذ (SDLC)">
          {duration && (
            <p className="prp-lead">
              <b>المدة الإجمالية التقديرية: </b>
              {duration}
            </p>
          )}
          {milestones.length > 0 && (
            <ol className="prp-timeline">
              {milestones.map((milestone, index) => (
                <li key={index}>
                  <span className="prp-step-num" aria-hidden="true">
                    {index + 1}
                  </span>
                  <div className="prp-step-body">
                    <div className="prp-step-head">
                      <h3>{text(milestone.title) || `المرحلة ${index + 1}`}</h3>
                      {text(milestone.duration) && (
                        <span className="prp-pill">{text(milestone.duration)}</span>
                      )}
                    </div>
                    {text(milestone.description) && <p>{text(milestone.description)}</p>}
                  </div>
                </li>
              ))}
            </ol>
          )}
        </Section>
      )}

      {cost && (
        <Section id="cost" icon={Wallet} title="التكلفة التقديرية">
          <div className="prp-cost">
            <strong>{cost}</strong>
            <p>
              هذا تقدير أولي مبني على المعلومات المتاحة وليس سعرًا مؤكدًا، وقد يتغير بعد
              مراجعة النطاق.
            </p>
          </div>
          {paymentSchedule.length > 0 && (
            <div className="prp-payment">
              <h3>جدول دفعات مقترح</h3>
              <DataTable
                columns={[
                  { key: "milestone", label: "المرحلة" },
                  { key: "share", label: "الحصة" },
                  { key: "notes", label: "ملاحظات" },
                ]}
                data={paymentSchedule}
              />
              <p className="prp-muted">اقتراح مرتبط بالمراحل وليس التزامًا، ويُتفق عليه لاحقًا.</p>
            </div>
          )}
        </Section>
      )}

      {hasTeam ? (
        <Section id="team" icon={Users} title="الفريق والتكاليف التشغيلية">
          <div className="prp-grid">
            <StaffingBlock staffing={staffing} />
            {!hasStaffing && team.length > 0 && (
              <Block title="الأدوار المطلوبة" wide>
                <DataTable
                  columns={[
                    { key: "role", label: "الدور" },
                    { key: "responsibilities", label: "المسؤوليات" },
                  ]}
                  data={team}
                />
              </Block>
            )}
            {!hasStaffing && skills.length > 0 && (
              <Block title="المهارات المطلوبة" wide>
                <ul className="prp-chips">
                  {skills.map((skill, index) => (
                    <li key={index}>{skill}</li>
                  ))}
                </ul>
              </Block>
            )}
            {operational.length > 0 && (
              <Block title="التكاليف التشغيلية التقديرية" wide>
                <DataTable
                  columns={[
                    { key: "item", label: "البند" },
                    { key: "estimate", label: "التقدير" },
                    { key: "notes", label: "ملاحظات" },
                  ]}
                  data={operational}
                />
                <p className="prp-muted">جميع الأرقام تقديرية وغير مؤكدة.</p>
              </Block>
            )}
          </div>
        </Section>
      ) : null}
    </>
  );
}

export default function ProjectProposal() {
  const { id } = useParams();
  const validId = /^\d+$/.test(id || "");

  const [record, setRecord] = useState(null);
  const [loading, setLoading] = useState(validId);
  const [error, setError] = useState(validId ? null : { message: "رقم الطلب غير صالح." });
  const [generating, setGenerating] = useState(false);
  const [generateError, setGenerateError] = useState("");
  const [approving, setApproving] = useState(false);
  const [approveError, setApproveError] = useState("");
  const [justApproved, setJustApproved] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      setRecord(await getProjectRequest(id));
    } catch (loadError) {
      setError({
        message:
          LOAD_ERRORS[loadError.status] ||
          loadError.message ||
          "تعذر تحميل المقترح حاليًا.",
        retryable: !LOAD_ERRORS[loadError.status],
      });
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    if (!validId) return undefined;
    let active = true;

    getProjectRequest(id)
      .then((result) => active && setRecord(result))
      .catch(
        (loadError) =>
          active &&
          setError({
            message:
              LOAD_ERRORS[loadError.status] ||
              loadError.message ||
              "تعذر تحميل المقترح حاليًا.",
            retryable: !LOAD_ERRORS[loadError.status],
          }),
      )
      .finally(() => active && setLoading(false));

    return () => {
      active = false;
    };
  }, [id, validId]);

  // يتبع نفس مسار الإنشاء الحالي، ولا يُستدعى إلا بطلب صريح من المستخدم
  const generate = async () => {
    if (generating) return;
    setGenerating(true);
    setGenerateError("");
    try {
      setRecord(await analyzeProjectRequest(id));
    } catch (analyzeError) {
      setGenerateError(
        analyzeError.message || "تعذر إعداد المقترح حاليًا. إجاباتك محفوظة.",
      );
    } finally {
      setGenerating(false);
    }
  };

  // الخادم يقفل الطلب ويعيد نفس النسخة عند التكرار؛ الزر يُعطَّل أيضًا لمنع النقرات المتكررة
  const approve = async () => {
    if (approving) return;
    setApproving(true);
    setApproveError("");
    try {
      setRecord(await approveProposal(id));
      setJustApproved(true);
    } catch (approvalError) {
      setApproveError(
        approvalError.message || "تعذر اعتماد المقترح حاليًا. لم يُنشر أي شيء، ويمكنك المحاولة مرة أخرى.",
      );
    } finally {
      setApproving(false);
    }
  };

  const proposal =
    record?.proposal && typeof record.proposal === "object" ? record.proposal : null;
  const review = reviewState(record);
  const chatLink = `/organization/requests/${id}/intake`;
  const projectName = text(proposal?.project_overview?.project_name) || record?.title;
  const generatedAt = formatDate(record?.proposal_generated_at);
  const published = review.mode === "published";

  return (
    <div className="prp" dir="rtl">
      <ProjectFlowStepper current={published ? 3 : 2} />

      {loading ? (
        <SkeletonGroup label="نحمّل مسودة المقترح">
          <div className="prp-card prp-hero">
            <div className="prp-sk-stack">
              <Skeleton width={140} height={14} />
              <Skeleton width={320} height={30} />
              <Skeleton width={220} height={16} />
            </div>
            <Skeleton width={170} height={40} radius={999} />
          </div>
          <Skeleton className="prp-sk-notice" height={44} radius={10} />
          <div className="prp-stats">
            {[0, 1, 2].map((stat) => (
              <div className="prp-stat" key={stat}>
                <Skeleton width="45%" height={14} />
                <Skeleton width="70%" height={22} />
              </div>
            ))}
          </div>
          {[0, 1].map((section) => (
            <div className="prp-section" key={section}>
              <div className="prp-sk-heading">
                <Skeleton width={36} height={36} radius={10} />
                <Skeleton width={240} height={22} />
              </div>
              <div className="prp-grid">
                {[0, 1, 2, 3].map((block) => (
                  <div className="prp-block prp-sk-stack" key={block}>
                    <Skeleton width="40%" height={16} />
                    <Skeleton height={13} />
                    <Skeleton width="85%" height={13} />
                    <Skeleton width="60%" height={13} />
                  </div>
                ))}
              </div>
            </div>
          ))}
        </SkeletonGroup>
      ) : error ? (
        <div className="prp-card prp-state" role="alert">
          <p>{error.message}</p>
          <div className="prp-actions">
            {error.retryable && (
              <button className="prp-btn prp-btn-primary" type="button" onClick={load}>
                <RotateCcw size={16} aria-hidden="true" /> إعادة المحاولة
              </button>
            )}
            <Link className="prp-btn" to="/organization/requests">
              طلباتي
            </Link>
          </div>
        </div>
      ) : !proposal ? (
        <div className="prp-card prp-state">
          <h1>لم تُجهَّز مسودة المقترح بعد</h1>
          {record?.status === "analyzing" ? (
            <p>اكتملت أسئلة الاكتشاف. يمكنك الآن إعداد مسودة المقترح من إجاباتك المحفوظة.</p>
          ) : (
            <p>أكمل أسئلة المساعد أولًا، ثم نجهّز لك مسودة المقترح.</p>
          )}
          {generateError && (
            <p className="prp-error" role="alert">
              {generateError}
            </p>
          )}
          <div className="prp-actions">
            {record?.status === "analyzing" && (
              <button
                className="prp-btn prp-btn-primary"
                type="button"
                onClick={generate}
                disabled={generating}
                aria-busy={generating}
              >
                {generating && <LoaderCircle className="prp-spin" size={16} aria-hidden="true" />}
                {generating ? "جارٍ إعداد المسودة..." : "إعداد مسودة المقترح"}
              </button>
            )}
            <Link className="prp-btn" to={chatLink}>
              <MessageSquare size={16} aria-hidden="true" /> العودة إلى المحادثة
            </Link>
          </div>
        </div>
      ) : (
        <>
          <header className="prp-card prp-hero">
            <div>
              <span className="prp-eyebrow">
                {published ? "المقترح المعتمد" : "مسودة مقترح المشروع"}
              </span>
              <h1>{projectName}</h1>
              {text(record.intake_data?.short_title) && (
                <p className="prp-subtitle">{text(record.intake_data.short_title)}</p>
              )}
              <p className="prp-meta">
                <span className="prp-status">
                  {PROJECT_REQUEST_STATUS_LABELS[record.status] || record.status}
                </span>
                {generatedAt && <span>أُعدّت في {generatedAt}</span>}
              </p>
            </div>
            <div className="prp-hero-actions">
              {/* التعديل يكمل نفس المحادثة المرتبطة بهذا الطلب، والنسخة المنشورة تبقى حتى إعادة الاعتماد */}
              {review.canEdit && review.mode !== "revising" && (
                <Link className="prp-btn prp-btn-primary" to={`${chatLink}?revise=1`}>
                  <PencilLine size={16} aria-hidden="true" /> تعديل أو توضيح المقترح
                </Link>
              )}
              <Link className="prp-btn" to={chatLink}>
                <MessageSquare size={16} aria-hidden="true" /> عرض المحادثة
              </Link>
            </div>
          </header>

          {review.mode === "revising" && (
            <p className="prp-revision" role="status">
              <b>التعديلات قيد المعالجة: </b>
              هذه هي النسخة السابقة من المقترح. أكمل المحادثة ثم حدّث المقترح لتظهر التغييرات.
              {review.publication
                ? ` يرى الطلاب حتى ذلك الحين النسخة المعتمدة رقم ${review.publication.version}.`
                : ""}{" "}
              <Link to={chatLink}>متابعة المحادثة</Link>
            </p>
          )}

          <p className="prp-notice">
            {published
              ? "هذه النسخة المعتمدة والمنشورة. المدد والتكاليف تقديرية، ويمكنك طلب تعديل في أي وقت دون أن يتغير ما يراه الطلاب قبل اعتمادك للنسخة الجديدة."
              : "هذه مسودة أولية أعدّها المساعد من إجاباتك، وكل المدد والتكاليف فيها تقديرية وتحتاج إلى مراجعتك قبل الاعتماد."}
          </p>

          {review.publication && (
            <PublicationPanel publication={review.publication} justApproved={justApproved && published} />
          )}

          {(review.mode === "draft" || review.mode === "pending_changes") && (
            <ApprovalPanel
              state={review}
              onApprove={approve}
              approving={approving}
              approveError={approveError}
            />
          )}

          {text(record.revision_note) && (
            <p className="prp-revision">
              <b>ملاحظة التعديل المطلوبة: </b>
              {text(record.revision_note)}
            </p>
          )}

          <ProposalContent proposal={proposal} staffing={record.staffing} />
        </>
      )}
    </div>
  );
}
