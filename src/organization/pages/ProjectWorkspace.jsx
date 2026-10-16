import { useCallback, useEffect, useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import {
  AlertTriangle,
  ArrowRight,
  BadgeCheck,
  CheckCircle2,
  Circle,
  Clock3,
  Crown,
  ExternalLink,
  Info,
  Lock,
  RotateCcw,
  UserMinus,
  UserPlus,
  Users,
  X,
} from "lucide-react";

import {
  confirmProjectTeam,
  getProjectMatches,
  reviewApplication,
  saveProjectTeam,
  updateProject,
} from "../services/organizationService";
import {
  APPLICATION_LABELS,
  FACTOR_TONES,
  PROJECT_STAGES,
  SCORE_BANDS,
  TEAM_STATUSES,
  defaultRoleFor,
  initials,
  membersPayload,
  rankedCandidates,
  roleIsFull,
  sameSelection,
  selectionFromTeam,
  selectionSummary,
} from "../utils/projectTeam";
import { showAlert } from "../../shared/utils/alerts";
import { resolveMediaUrl } from "../../shared/utils/resolveMediaUrl";
import "../styles/ProjectWorkspace.css";

const formatDate = (value) => {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return new Intl.DateTimeFormat("ar", { day: "numeric", month: "long" }).format(date);
};

function Pill({ tone = "neutral", children, icon: Icon }) {
  return (
    <span className={`pw-pill pw-tone-${tone}`}>
      {Icon && <Icon size={13} aria-hidden="true" />}
      {children}
    </span>
  );
}

/** حلقة درجة التوافق (0–100). الدرجة مؤشر ترتيب وليست نسبة نجاح أو ضمانًا للاختيار. */
function ScoreRing({ score, band }) {
  const size = 64;
  const stroke = 6;
  const radius = (size - stroke) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (Math.max(0, Math.min(100, score)) / 100) * circumference;
  return (
    <div className={`pw-ring pw-ring-${band}`} role="img" aria-label={`درجة التوافق ${score} من 100`}>
      <svg width={size} height={size} aria-hidden="true">
        <circle cx={size / 2} cy={size / 2} r={radius} className="pw-ring-track" strokeWidth={stroke} fill="none" />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          className="pw-ring-value"
          strokeWidth={stroke}
          fill="none"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          strokeLinecap="round"
          transform={`rotate(-90 ${size / 2} ${size / 2})`}
        />
      </svg>
      <span className="pw-ring-label">
        <b>{score}</b>
        <small>/100</small>
      </span>
    </div>
  );
}

function Avatar({ student }) {
  const image = student?.image_url ? resolveMediaUrl(student.image_url) : "";
  return image ? (
    <img className="pw-avatar" src={image} alt="" />
  ) : (
    <span className="pw-avatar" aria-hidden="true">
      {initials(student?.name)}
    </span>
  );
}

function FactorList({ factors }) {
  return (
    <ul className="pw-factors" aria-label="عوامل التوافق">
      {factors.map((factor) => {
        const applicable = factor.status !== "not_applicable";
        const tone = FACTOR_TONES[factor.status] || "neutral";
        return (
          <li key={factor.key} className={applicable ? "" : "pw-factor-na"}>
            <div className="pw-factor-head">
              <span>{factor.label}</span>
              <span className="pw-factor-points">{applicable ? `${factor.points}/${factor.max}` : "لا ينطبق"}</span>
            </div>
            {applicable && (
              <span
                className="pw-bar"
                role="meter"
                aria-valuemin={0}
                aria-valuemax={factor.max}
                aria-valuenow={factor.points}
                aria-label={factor.label}
              >
                <i className={`pw-bar-fill pw-fill-${tone}`} style={{ width: `${(factor.points / factor.max) * 100}%` }} />
              </span>
            )}
            <small>{factor.detail}</small>
          </li>
        );
      })}
    </ul>
  );
}

function SkillComparison({ skills }) {
  if (!skills?.length) return null;
  return (
    <details className="pw-details">
      <summary>مقارنة المهارات بالمتطلبات</summary>
      <div className="pw-table-wrap">
        <table className="pw-table">
          <thead>
            <tr>
              <th scope="col">المهارة</th>
              <th scope="col">المطلوب</th>
              <th scope="col">مثبت بالتقييم</th>
              <th scope="col">معلن في الملف</th>
            </tr>
          </thead>
          <tbody>
            {skills.map((skill) => (
              <tr key={skill.name} className={skill.met ? "pw-row-met" : ""}>
                <th scope="row">
                  <bdi>{skill.name}</bdi>
                  {skill.importance === "desirable" && <small className="pw-muted"> · مرغوبة</small>}
                </th>
                <td>{skill.required_level_label || "—"}</td>
                <td>
                  {skill.verified_level_label || <span className="pw-muted">غير مثبت</span>}
                  {skill.met && <BadgeCheck size={14} className="pw-met" aria-label="مستوفى" />}
                </td>
                <td>{skill.declared_level_label || <span className="pw-muted">—</span>}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </details>
  );
}

function CandidateCard({ entry, roles, roleFilter, selection, locked, busy, onToggle, onRoleChange, onReview }) {
  const { candidate, rank, score } = entry;
  const { student, application } = candidate;
  const selectedRole = selection[application.id];
  const selected = selectedRole !== undefined;
  const status = APPLICATION_LABELS[application.status] || APPLICATION_LABELS.pending;
  const eligibleRoles = roles.filter((role) => candidate.roles.some((item) => item.role_id === role.id));
  const targetRole = selected ? selectedRole : defaultRoleFor(candidate, roleFilter);
  const full = !selected && roleIsFull(selection, roles, targetRole, application.id);
  const rejected = application.status === "rejected";
  const band = SCORE_BANDS[score?.band] || SCORE_BANDS.fair;
  const roleTitle = roles.find((role) => role.id === score?.role_id)?.title;
  const hours = student.weekly_availability_hours;

  return (
    <article className={`pw-candidate ${selected ? "pw-candidate-selected" : ""}`} aria-labelledby={`pw-c-${application.id}`}>
      <div className="pw-candidate-head">
        <span className="pw-rank" aria-label={`الترتيب ${rank}`}>
          {rank}
        </span>
        <Avatar student={student} />
        <div className="pw-candidate-id">
          <h3 id={`pw-c-${application.id}`}>{student.name || "طالب"}</h3>
          <p className="pw-muted">
            {[student.academic_major, student.university].filter(Boolean).join(" · ") || "لا توجد بيانات أكاديمية"}
          </p>
          <div className="pw-chips">
            <Pill tone={status.tone}>{status.label}</Pill>
            {student.specialization && <Pill>{student.specialization}</Pill>}
            <Pill tone={hours ? "neutral" : "warning"} icon={Clock3}>
              {hours ? `${hours} ساعة/أسبوع` : "التفرغ غير محدد"}
            </Pill>
            {student.other_active_teams > 0 && (
              <Pill tone="warning" icon={AlertTriangle}>
                في فريق مشروع آخر
              </Pill>
            )}
          </div>
        </div>
        {score && (
          <div className="pw-score">
            <ScoreRing score={score.score} band={score.band} />
            <span className={`pw-band pw-text-${band.tone}`}>{band.label}</span>
            {roleTitle && <small className="pw-muted">لدور {roleTitle}</small>}
          </div>
        )}
      </div>

      {application.note && <blockquote className="pw-note">“{application.note}”</blockquote>}

      {score && <FactorList factors={score.factors} />}
      {score && <SkillComparison skills={score.skills} />}

      <footer className="pw-candidate-foot">
        <span className="pw-muted pw-small">
          قدّم في {formatDate(application.applied_at)}
          {student.github_url && (
            <>
              {" · "}
              <a href={student.github_url} target="_blank" rel="noreferrer noopener">
                GitHub <ExternalLink size={12} aria-hidden="true" />
              </a>
            </>
          )}
          {student.linkedin_url && (
            <>
              {" · "}
              <a href={student.linkedin_url} target="_blank" rel="noreferrer noopener">
                LinkedIn <ExternalLink size={12} aria-hidden="true" />
              </a>
            </>
          )}
        </span>
        <div className="pw-actions">
          {!locked && eligibleRoles.length > 1 && !rejected && (
            <label className="pw-select">
              <span className="pw-sr">الدور في الفريق</span>
              <select
                value={targetRole ?? ""}
                onChange={(event) => onRoleChange(application.id, Number(event.target.value))}
                disabled={!selected}
              >
                {eligibleRoles.map((role) => (
                  <option key={role.id} value={role.id}>
                    {role.title}
                  </option>
                ))}
              </select>
            </label>
          )}
          {!locked && application.status === "pending" && (
            <button type="button" className="pw-btn pw-btn-ghost" disabled={busy} onClick={() => onReview(candidate, "reviewed")}>
              تمت المراجعة
            </button>
          )}
          {!locked && !selected && (
            <button
              type="button"
              className="pw-btn pw-btn-ghost pw-btn-danger"
              disabled={busy}
              onClick={() => onReview(candidate, rejected ? "reviewed" : "rejected")}
            >
              {rejected ? "إلغاء الرفض" : "رفض"}
            </button>
          )}
          {!locked && !rejected && (
            <button
              type="button"
              className={selected ? "pw-btn pw-btn-light" : "pw-btn"}
              disabled={busy || (!selected && (full || targetRole == null))}
              title={full ? "اكتمل العدد المطلوب لهذا الدور" : undefined}
              onClick={() => onToggle(candidate, targetRole)}
            >
              {selected ? <UserMinus size={15} aria-hidden="true" /> : <UserPlus size={15} aria-hidden="true" />}
              {selected ? "إزالة من الفريق" : full ? "الدور مكتمل" : "إضافة للفريق"}
            </button>
          )}
        </div>
      </footer>
    </article>
  );
}

function SelectionTray({ summary, selection, candidates, locked, changed, saving, onRemove, onSave, onReset, hasTeam }) {
  const byApplication = new Map(candidates.map((candidate) => [candidate.application.id, candidate]));
  return (
    <aside className="pw-card pw-tray" aria-labelledby="pw-tray-title">
      <div className="pw-tray-head">
        <h2 id="pw-tray-title">
          <Users size={18} aria-hidden="true" /> الفريق المقترح
        </h2>
        <span className={`pw-size ${summary.complete ? "pw-text-success" : ""}`}>
          {summary.total}/{summary.required}
        </span>
      </div>
      <span className="pw-bar pw-bar-lg" role="meter" aria-valuemin={0} aria-valuemax={summary.required} aria-valuenow={summary.total} aria-label="حجم الفريق">
        <i
          className={`pw-bar-fill ${summary.errors.length ? "pw-fill-danger" : "pw-fill-success"}`}
          style={{ width: `${Math.min(100, (summary.total / Math.max(1, summary.required)) * 100)}%` }}
        />
      </span>

      <ul className="pw-tray-roles">
        {summary.perRole.map((role) => {
          const members = Object.entries(selection)
            .filter(([, roleId]) => roleId === role.id)
            .map(([applicationId]) => byApplication.get(Number(applicationId)))
            .filter(Boolean);
          return (
            <li key={role.id}>
              <div className="pw-tray-role">
                <b>{role.title}</b>
                <span className={role.over ? "pw-text-danger" : role.filled === role.headcount ? "pw-text-success" : "pw-muted"}>
                  {role.filled}/{role.headcount}
                </span>
              </div>
              {members.length === 0 ? (
                <p className="pw-muted pw-small">لم يُختر أحد بعد</p>
              ) : (
                <ul className="pw-tray-members">
                  {members.map((member) => (
                    <li key={member.application.id}>
                      <Avatar student={member.student} />
                      <span>{member.student.name}</span>
                      {!locked && (
                        <button
                          type="button"
                          className="pw-icon-btn"
                          aria-label={`إزالة ${member.student.name} من الفريق`}
                          onClick={() => onRemove(member.application.id)}
                        >
                          <X size={14} aria-hidden="true" />
                        </button>
                      )}
                    </li>
                  ))}
                </ul>
              )}
            </li>
          );
        })}
      </ul>

      {summary.errors.map((message) => (
        <p key={message} className="pw-inline pw-tone-danger" role="alert">
          {message}
        </p>
      ))}

      {locked ? (
        <p className="pw-inline pw-tone-neutral">
          <Lock size={14} aria-hidden="true" /> تم تأكيد الفريق، لذلك لا يمكن تعديل أعضائه.
        </p>
      ) : (
        <>
          <button type="button" className="pw-btn pw-btn-block" disabled={!changed || !summary.valid || saving} onClick={onSave}>
            {saving ? "جارٍ الحفظ..." : hasTeam ? "حفظ تعديلات الفريق" : "تكوين الفريق"}
          </button>
          {changed && (
            <button type="button" className="pw-btn pw-btn-ghost pw-btn-block" disabled={saving} onClick={onReset}>
              <RotateCcw size={14} aria-hidden="true" /> تراجع عن التغييرات
            </button>
          )}
          <p className="pw-muted pw-small">
            {hasTeam
              ? "يمكنك تعديل الأعضاء حتى تأكيد الفريق."
              : "تكوين الفريق يغلق التقديم على المشروع وينقله إلى مرحلة تكوين الفريق."}
          </p>
        </>
      )}
    </aside>
  );
}

function TeamPanel({ team, required, busy, onConfirm, onGoToCandidates }) {
  if (!team) {
    return (
      <div className="pw-empty">
        <Users size={30} aria-hidden="true" />
        <h2>لم يُكوَّن الفريق بعد</h2>
        <p>اختر أعضاء الفريق من المرشحين المؤهلين، ثم أكّد الفريق.</p>
        <button type="button" className="pw-btn" onClick={onGoToCandidates}>
          اختيار المرشحين
        </button>
      </div>
    );
  }

  const status = TEAM_STATUSES[team.status] || TEAM_STATUSES.forming;
  const forming = team.status === "forming";
  const steps = [
    { done: team.members.length > 0, label: `أعضاء الفريق (${team.members.length}/${required})` },
    { done: Boolean(team.leader), label: team.leader ? `القائد: ${team.leader.name}` : "قائد الفريق (يعيّنه مدير المنصة)" },
    { done: !forming, label: forming ? "تأكيد الفريق" : "تم تأكيد الفريق" },
  ];

  return (
    <div className="pw-team">
      <section className="pw-card" aria-labelledby="pw-team-title">
        <div className="pw-team-head">
          <div>
            <h2 id="pw-team-title">فريق المشروع</h2>
            <p className="pw-muted pw-small">تكوّن في {formatDate(team.created_at)}</p>
          </div>
          <Pill tone={status.tone}>{status.label}</Pill>
        </div>
        <ol className="pw-steps">
          {steps.map((step) => (
            <li key={step.label} className={step.done ? "pw-step-done" : ""}>
              {step.done ? <CheckCircle2 size={18} aria-hidden="true" /> : <Circle size={18} aria-hidden="true" />}
              <span>{step.label}</span>
              <span className="pw-sr">{step.done ? "مكتمل" : "غير مكتمل"}</span>
            </li>
          ))}
        </ol>
        {forming && (
          <button
            type="button"
            className="pw-btn"
            disabled={busy || team.members.length === 0}
            onClick={onConfirm}
          >
            <BadgeCheck size={16} aria-hidden="true" /> تأكيد الفريق
          </button>
        )}
      </section>

      <section className="pw-card" aria-labelledby="pw-members-title">
        <h2 id="pw-members-title">أعضاء الفريق</h2>
        <ul className="pw-members">
          {team.members.map((member) => (
            <li key={member.id} className={member.is_leader ? "pw-member-leader" : ""}>
              <Avatar student={member} />
              <div className="pw-member-id">
                <b>
                  {member.name}
                  {member.is_leader && (
                    <span className="pw-leader-badge">
                      <Crown size={13} aria-hidden="true" /> القائد
                    </span>
                  )}
                </b>
                <span className="pw-muted pw-small">
                  {member.role?.title}
                  {member.academic_major ? ` · ${member.academic_major}` : ""}
                </span>
              </div>
            </li>
          ))}
        </ul>
        {team.leader?.assigned_at && (
          <p className="pw-muted pw-small">
            قائد الفريق يعيّنه مدير المنصة لهذا المشروع، وهو مسؤول عن اختيار الأعضاء وخطة التنفيذ مع المؤسسة.
          </p>
        )}
      </section>
    </div>
  );
}

export default function ProjectWorkspace() {
  const { projectId } = useParams();
  const validId = /^\d+$/.test(projectId || "");
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(validId);
  const [loadError, setLoadError] = useState(validId ? "" : "المشروع غير موجود.");
  const [tab, setTab] = useState("candidates");
  const [roleFilter, setRoleFilter] = useState("all");
  const [sort, setSort] = useState("score");
  const [showRejected, setShowRejected] = useState(false);
  const [selection, setSelection] = useState({});
  const [busy, setBusy] = useState(false);
  const [flash, setFlash] = useState(null);
  const [hours, setHours] = useState("");

  const apply = useCallback((result) => {
    setData(result);
    setSelection(selectionFromTeam(result.team));
    setHours(result.project?.min_weekly_hours ?? "");
  }, []);

  useEffect(() => {
    if (!validId) return undefined;
    let active = true;
    getProjectMatches(projectId)
      .then((result) => active && apply(result))
      .catch(
        (error) =>
          active &&
          setLoadError(
            error?.status === 404
              ? "المشروع غير موجود أو لا تملك صلاحية إدارته."
              : error?.message || "تعذر تحميل المشروع.",
          ),
      )
      .finally(() => active && setLoading(false));
    return () => {
      active = false;
    };
  }, [apply, projectId, validId]);

  // تنفيذ إجراء ثم إعادة تحميل كل البيانات من الخادم، مع رسالة النتيجة
  const run = async (action, success) => {
    setBusy(true);
    setFlash(null);
    try {
      await action();
      apply(await getProjectMatches(projectId));
      if (success) setFlash({ tone: "success", text: success });
      return true;
    } catch (error) {
      setFlash({ tone: "danger", text: error?.message || "تعذر إكمال العملية. حاول مرة أخرى." });
      return false;
    } finally {
      setBusy(false);
    }
  };

  const roles = useMemo(() => data?.roles || [], [data]);
  const candidates = useMemo(() => data?.candidates || [], [data]);
  const savedSelection = useMemo(() => selectionFromTeam(data?.team), [data]);
  const summary = selectionSummary(selection, roles);
  const changed = !sameSelection(selection, savedSelection);
  const team = data?.team || null;
  const locked = Boolean(team && team.status !== "forming");
  const entries = rankedCandidates(data, { roleId: roleFilter, sort, showRejected });
  const rejectedCount = candidates.filter((candidate) => candidate.application.status === "rejected").length;

  if (!validId || (!loading && loadError && !data)) {
    return (
      <main className="pw-page" dir="rtl">
        <div className="pw-empty" role="alert">
          <h2>{loadError || "المشروع غير موجود."}</h2>
          <Link className="pw-btn" to="/student/leading">
            العودة إلى المشاريع
          </Link>
        </div>
      </main>
    );
  }

  if (loading || !data) {
    return (
      <main className="pw-page" dir="rtl" aria-busy="true" aria-label="جارٍ تحميل المشروع">
        <div className="pw-skeleton pw-skeleton-head" />
        <div className="pw-stats">
          {[0, 1, 2, 3].map((index) => (
            <div className="pw-skeleton pw-skeleton-stat" key={index} />
          ))}
        </div>
        <div className="pw-skeleton pw-skeleton-body" />
      </main>
    );
  }

  const { project, summary: stats } = data;
  const stage = PROJECT_STAGES[project.project_status] || PROJECT_STAGES.open;
  const teamStatus = team ? TEAM_STATUSES[team.status] : null;
  const selectedRole = roles.find((role) => role.id === roleFilter);

  const toggle = (candidate, roleId) => {
    const id = candidate.application.id;
    setSelection((current) => {
      const next = { ...current };
      if (next[id] !== undefined) delete next[id];
      else if (roleId != null) next[id] = roleId;
      return next;
    });
  };

  const saveTeam = async () => {
    const names = Object.keys(selection)
      .map((id) => candidates.find((candidate) => candidate.application.id === Number(id))?.student.name)
      .filter(Boolean);
    const confirmation = await showAlert({
      icon: "question",
      title: team ? "حفظ تعديلات الفريق؟" : "تكوين فريق المشروع؟",
      text: `الأعضاء (${names.length}): ${names.join("، ")}.${team ? "" : " سيُغلق التقديم على المشروع."}`,
      showCancelButton: true,
      confirmButtonText: team ? "حفظ" : "تكوين الفريق",
      cancelButtonText: "تراجع",
    });
    if (!confirmation.isConfirmed) return;
    const ok = await run(() => saveProjectTeam(project.id, membersPayload(selection)), team ? "تم حفظ تعديلات الفريق." : "تم تكوين الفريق. عيّن قائدًا ثم أكّد الفريق.");
    if (ok && !team) setTab("team");
  };

  const review = async (candidate, status) => {
    if (status === "rejected") {
      const confirmation = await showAlert({
        tone: "danger",
        icon: "warning",
        title: "رفض الطلب؟",
        text: `سيظهر لـ ${candidate.student.name} أنه لم يتم اختياره. يمكنك التراجع عن الرفض لاحقًا ما دام الفريق غير مؤكد.`,
        showCancelButton: true,
        confirmButtonText: "رفض الطلب",
        cancelButtonText: "إلغاء",
        focusCancel: true,
      });
      if (!confirmation.isConfirmed) return;
    }
    await run(() => reviewApplication(project.id, candidate.application.id, status), status === "rejected" ? "تم رفض الطلب." : "تم تحديث حالة الطلب.");
  };

  const confirmTeam = async () => {
    const confirmation = await showAlert({
      icon: "question",
      title: "تأكيد الفريق؟",
      text: "بعد التأكيد يصبح الفريق جاهزًا للتنفيذ ولا يمكن تعديل أعضائه. يبدأ التنفيذ بعد اتفاقك مع المؤسسة على خطة التنفيذ.",
      showCancelButton: true,
      confirmButtonText: "تأكيد الفريق",
      cancelButtonText: "تراجع",
    });
    if (!confirmation.isConfirmed) return;
    await run(() => confirmProjectTeam(team.id), "تم تأكيد الفريق وأصبح جاهزًا للتنفيذ.");
  };

  const changeStage = async (next) => {
    const closing = next === "matching";
    const confirmation = await showAlert({
      icon: "question",
      title: closing ? "إغلاق التقديم؟" : "إعادة فتح التقديم؟",
      text: closing
        ? "لن يتمكن طلاب جدد من التقديم، ويبقى المتقدمون الحاليون ضمن المرشحين."
        : "سيظهر المشروع مجددًا في فرص الطلاب ويمكنهم التقديم عليه.",
      showCancelButton: true,
      confirmButtonText: closing ? "إغلاق التقديم" : "إعادة الفتح",
      cancelButtonText: "إلغاء",
    });
    if (!confirmation.isConfirmed) return;
    await run(() => updateProject(project.id, { project_status: next }), closing ? "تم إغلاق التقديم." : "تمت إعادة فتح التقديم.");
  };

  const saveHours = async (event) => {
    event.preventDefault();
    const value = hours === "" ? null : Number(hours);
    await run(() => updateProject(project.id, { min_weekly_hours: value }), "تم تحديث التفرغ المطلوب وإعادة حساب التوافق.");
  };

  return (
    <main className="pw-page" dir="rtl">
      <div className="pw-back-row">
        <Link className="pw-back" to="/student/leading">
          <ArrowRight size={16} aria-hidden="true" /> المشاريع التي أقودها
        </Link>
        <Link className="pw-btn pw-btn-light" to={`/projects/${project.id}/plan`}>
          خطة التنفيذ والاتفاق
        </Link>
      </div>

      <header className="pw-card pw-head">
        <div className="pw-head-main">
          <div className="pw-chips">
            <Pill tone={stage.tone}>{stage.label}</Pill>
            {project.status !== "published" && <Pill tone="danger">النشر موقوف من إدارة المنصة</Pill>}
            {teamStatus && <Pill tone={teamStatus.tone} icon={Users}>الفريق: {teamStatus.label}</Pill>}
          </div>
          <h1>{project.title}</h1>
          {project.summary && <p className="pw-summary">{project.summary}</p>}
          <ul className="pw-meta">
            {project.estimated_duration && (
              <li>
                <Clock3 size={14} aria-hidden="true" /> {project.estimated_duration}
              </li>
            )}
            <li>
              <Users size={14} aria-hidden="true" /> فريق من {project.team_size}
            </li>
            <li>النسخة المعتمدة رقم {project.version}</li>
          </ul>
        </div>
        <div className="pw-head-side">
          {project.allowed_transitions.map((next) => (
            <button key={next} type="button" className="pw-btn pw-btn-light" disabled={busy} onClick={() => changeStage(next)}>
              {next === "matching" ? "إغلاق التقديم" : "إعادة فتح التقديم"}
            </button>
          ))}
          <form className="pw-hours" onSubmit={saveHours}>
            <label htmlFor="pw-hours-input">الحد الأدنى للتفرغ (ساعة/أسبوع)</label>
            <div>
              <input
                id="pw-hours-input"
                type="number"
                min={1}
                max={60}
                inputMode="numeric"
                value={hours}
                placeholder="غير محدد"
                onChange={(event) => setHours(event.target.value)}
              />
              <button type="submit" className="pw-btn pw-btn-ghost" disabled={busy || String(hours) === String(project.min_weekly_hours ?? "")}>
                حفظ
              </button>
            </div>
          </form>
        </div>
      </header>

      <section className="pw-stats" aria-label="ملخص المشروع">
        <div className="pw-stat">
          <span>الطلبات القائمة</span>
          <b>{stats.active_applications}</b>
        </div>
        <div className="pw-stat">
          <span>مرشحون مؤهلون</span>
          <b>{stats.eligible_applicants}</b>
        </div>
        <div className="pw-stat">
          <span>أعضاء الفريق</span>
          <b>
            {team ? team.members.length : 0}
            <small>/{stats.required_team_size}</small>
          </b>
        </div>
        <div className="pw-stat">
          <span>قائد الفريق</span>
          <b className="pw-stat-text">{team?.leader?.name || "لم يُعيَّن"}</b>
        </div>
      </section>

      {flash && (
        <p className={`pw-inline pw-flash pw-tone-${flash.tone}`} role={flash.tone === "danger" ? "alert" : "status"}>
          {flash.tone === "success" ? <CheckCircle2 size={16} aria-hidden="true" /> : <AlertTriangle size={16} aria-hidden="true" />}
          {flash.text}
          <button type="button" className="pw-icon-btn" aria-label="إغلاق الرسالة" onClick={() => setFlash(null)}>
            <X size={14} aria-hidden="true" />
          </button>
        </p>
      )}

      {stats.insufficient && !locked && (
        <div className="pw-inline pw-tone-warning" role="note">
          <AlertTriangle size={16} aria-hidden="true" />
          <div>
            <b>المرشحون المؤهلون غير كافين لكل الأدوار بعد</b>
            <p>
              الأدوار التي ينقصها مرشحون: {stats.short_roles.join("، ")}.{" "}
              {project.accepting_applications
                ? "التقديم ما زال مفتوحًا؛ تظهر الطلبات الجديدة هنا تلقائيًا."
                : "يمكنك إعادة فتح التقديم لاستقبال طلبات جديدة، أو تكوين فريق جزئي الآن."}
            </p>
          </div>
        </div>
      )}

      <div className="pw-tabs" role="tablist" aria-label="أقسام إدارة المشروع">
        <button
          type="button"
          role="tab"
          aria-selected={tab === "candidates"}
          className={tab === "candidates" ? "pw-tab pw-tab-active" : "pw-tab"}
          onClick={() => setTab("candidates")}
        >
          المرشحون <span className="pw-tab-count">{candidates.length}</span>
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={tab === "team"}
          className={tab === "team" ? "pw-tab pw-tab-active" : "pw-tab"}
          onClick={() => setTab("team")}
        >
          الفريق {teamStatus && <span className={`pw-dot pw-dot-${teamStatus.tone}`} aria-hidden="true" />}
        </button>
      </div>

      {tab === "team" ? (
        <TeamPanel
          team={team}
          required={stats.required_team_size}
          busy={busy}
          onConfirm={confirmTeam}
          onGoToCandidates={() => setTab("candidates")}
        />
      ) : (
        <div className="pw-layout">
          <div className="pw-main">
            <div className="pw-filters">
              <div className="pw-role-filter" role="group" aria-label="تصفية حسب الدور">
                <button
                  type="button"
                  aria-pressed={roleFilter === "all"}
                  className={roleFilter === "all" ? "pw-chip-btn pw-chip-active" : "pw-chip-btn"}
                  onClick={() => setRoleFilter("all")}
                >
                  كل الأدوار
                </button>
                {roles.map((role) => (
                  <button
                    key={role.id}
                    type="button"
                    aria-pressed={roleFilter === role.id}
                    className={roleFilter === role.id ? "pw-chip-btn pw-chip-active" : "pw-chip-btn"}
                    onClick={() => setRoleFilter(role.id)}
                  >
                    {role.title}
                    <span className={role.insufficient ? "pw-chip-count pw-text-warning" : "pw-chip-count"}>
                      {role.eligible_applicants}/{role.headcount}
                    </span>
                  </button>
                ))}
              </div>
              <div className="pw-filter-row">
                <label className="pw-select">
                  <span>الترتيب</span>
                  <select value={sort} onChange={(event) => setSort(event.target.value)}>
                    <option value="score">الأعلى توافقًا</option>
                    <option value="applied">الأقدم تقديمًا</option>
                  </select>
                </label>
                {rejectedCount > 0 && (
                  <label className="pw-check">
                    <input type="checkbox" checked={showRejected} onChange={(event) => setShowRejected(event.target.checked)} />
                    إظهار المرفوضين ({rejectedCount})
                  </label>
                )}
              </div>
            </div>

            {selectedRole && (
              <div className="pw-card pw-role-brief">
                <div>
                  <b>{selectedRole.title}</b>
                  <span className="pw-muted pw-small"> · {selectedRole.category_label} · مطلوب {selectedRole.headcount}</span>
                </div>
                <div className="pw-chips">
                  {selectedRole.mandatory.map((skill) => (
                    <Pill key={skill.name} tone="info">
                      <bdi>{skill.name}</bdi> · {skill.min_level_label}
                    </Pill>
                  ))}
                  {selectedRole.desirable.map((skill) => (
                    <Pill key={skill}>
                      <bdi>{skill}</bdi> · مرغوبة
                    </Pill>
                  ))}
                </div>
                <p className="pw-muted pw-small">
                  {selectedRole.eligible_students} طالب على المنصة يستوفون هذا الدور، قدّم منهم {selectedRole.eligible_applicants}.
                </p>
              </div>
            )}

            <p className="pw-disclaimer">
              <Info size={15} aria-hidden="true" />
              الترتيب مؤشر يحسبه النظام من التقييمات المثبتة والمستوى المعلن والمهارات المرغوبة وأدلة الأعمال والتوفر، وليس
              ضمانًا للاختيار. القرار للمؤسسة.
            </p>

            {entries.length === 0 ? (
              <div className="pw-empty">
                <Users size={30} aria-hidden="true" />
                <h2>{candidates.length === 0 ? "لا يوجد مرشحون مؤهلون بعد" : "لا يوجد مرشحون لهذا الدور"}</h2>
                <p>
                  {stats.applications === 0
                    ? "لم يقدّم أي طالب على المشروع حتى الآن. يظهر هنا كل متقدم يستوفي متطلبات دور واحد على الأقل، مرتبًا حسب التوافق."
                    : "المتقدمون الحاليون لا يستوفون متطلبات هذا الدور بالمستوى المطلوب."}
                </p>
              </div>
            ) : (
              <div className="pw-candidates">
                {entries.map((entry) => (
                  <CandidateCard
                    key={entry.candidate.application.id}
                    entry={entry}
                    roles={roles}
                    roleFilter={roleFilter}
                    selection={selection}
                    locked={locked}
                    busy={busy}
                    onToggle={toggle}
                    onRoleChange={(applicationId, roleId) => setSelection((current) => ({ ...current, [applicationId]: roleId }))}
                    onReview={review}
                  />
                ))}
              </div>
            )}

            {data.ineligible.length > 0 && (
              <details className="pw-card pw-ineligible">
                <summary>
                  متقدمون لا يستوفون المتطلبات حاليًا <span className="pw-tab-count">{data.ineligible.length}</span>
                </summary>
                <p className="pw-muted pw-small">لا يمكن ضمهم إلى الفريق حتى يثبتوا المهارات المطلوبة بالمستوى المحدد.</p>
                <ul>
                  {data.ineligible.map((item) => (
                    <li key={item.application.id}>
                      <Avatar student={item.student} />
                      <div>
                        <b>{item.student.name}</b>
                        <span className="pw-muted pw-small">
                          {item.eligibility.role_title ? `الأقرب: ${item.eligibility.role_title} · ` : ""}
                          {item.eligibility.missing_skills.length
                            ? `ينقصه: ${item.eligibility.missing_skills
                                .map((skill) => `${skill.name} (${skill.required_level_label})`)
                                .join("، ")}`
                            : "لا يتوافق مساره المهني مع أدوار المشروع"}
                        </span>
                      </div>
                    </li>
                  ))}
                </ul>
              </details>
            )}
          </div>

          <SelectionTray
            summary={summary}
            selection={selection}
            candidates={candidates}
            locked={locked}
            changed={changed}
            saving={busy}
            hasTeam={Boolean(team)}
            onRemove={(applicationId) =>
              setSelection((current) => {
                const next = { ...current };
                delete next[applicationId];
                return next;
              })
            }
            onSave={saveTeam}
            onReset={() => setSelection(savedSelection)}
          />
        </div>
      )}
    </main>
  );
}
