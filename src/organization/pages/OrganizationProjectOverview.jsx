import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { ArrowRight, Crown, Users } from "lucide-react";
import { getOrganizationProject } from "../../shared/services/workflowService";
import { PLAN_STATUSES, PROJECT_STAGES, PUBLICATION_STATUSES, TEAM_STATUSES, formatDate } from "../../shared/utils/workflow";
import "../../shared/styles/Workflow.css";

/** عرض المشروع للمؤسسة للقراءة فقط: القائد والفريق (الاسم والدور) وحالة الخطة؛ دون ترتيب المرشحين أو نتائجهم. */
export default function OrganizationProjectOverview() {
  const { projectId } = useParams();
  const [project, setProject] = useState(null);
  const [error, setError] = useState("");

  useEffect(() => {
    getOrganizationProject(projectId)
      .then(setProject)
      .catch((err) => setError(err.status === 404 ? "المشروع غير موجود." : err.message));
  }, [projectId]);

  if (error) {
    return (
      <main className="wf-page">
        <p className="wf-alert wf-alert-danger" role="alert">{error}</p>
        <Link className="wf-btn wf-btn-light" to="/organization/requests">العودة إلى المشاريع</Link>
      </main>
    );
  }
  if (!project) return <main className="wf-page"><div className="wf-skeleton" /><div className="wf-skeleton" /></main>;

  const publication = PUBLICATION_STATUSES[project.status] || { label: project.status, tone: "neutral" };
  const plan = project.plan.latest_status ? PLAN_STATUSES[project.plan.latest_status] : null;

  return (
    <main className="wf-page">
      <Link className="wf-back" to={`/organization/requests/${project.project_request_id}`}><ArrowRight size={16} aria-hidden="true" /> تفاصيل الطلب والمقترح</Link>
      <header className="wf-card">
        <div className="wf-actions" style={{ marginBottom: 8 }}>
          <span className={`wf-pill wf-pill-${publication.tone}`}>{publication.label}</span>
          {project.status === "published" && <span className="wf-pill wf-pill-info">{PROJECT_STAGES[project.project_status]}</span>}
        </div>
        <h1>{project.title}</h1>
        {project.summary && <p className="wf-muted">{project.summary}</p>}
        {project.review_note && project.status !== "published" && <p className="wf-alert wf-alert-warning">ملاحظة إدارة المنصة: {project.review_note}</p>}
      </header>

      {project.status === "pending_review" && (
        <p className="wf-alert wf-alert-info">مشروعك بانتظار مراجعة إدارة المنصة. بعد القبول يُنشر للطلاب ويُعيَّن له قائد فريق.</p>
      )}

      <div className="wf-grid">
        <section className="wf-card" aria-labelledby="leader-title">
          <h2 id="leader-title"><Crown size={18} aria-hidden="true" /> قائد الفريق</h2>
          <p>{project.leader ? <b>{project.leader.name}</b> : <span className="wf-muted">لم تُعيّن إدارة المنصة قائدًا بعد.</span>}</p>
          <p className="wf-muted wf-small">تعيّن إدارة المنصة القائد، ويختار القائد أعضاء الفريق من المتقدمين المؤهلين ({project.applications_count} طلب نشط).</p>
        </section>

        <section className="wf-card" aria-labelledby="plan-title">
          <h2 id="plan-title">خطة التنفيذ والاتفاق</h2>
          {plan ? (
            <p>
              النسخة {project.plan.latest_version}: <span className={`wf-pill wf-pill-${plan.tone}`}>{plan.label}</span>
              {project.plan.agreed_at && <span className="wf-muted wf-small"> · اتُّفق عليها في {formatDate(project.plan.agreed_at)}</span>}
            </p>
          ) : (
            <p className="wf-muted">لم يقدّم قائد الفريق خطة بعد.</p>
          )}
          {project.leader && <Link className="wf-btn" to={`/projects/${project.id}/plan`}>فتح مساحة الخطة</Link>}
        </section>
      </div>

      <section className="wf-card" aria-labelledby="team-title">
        <h2 id="team-title"><Users size={18} aria-hidden="true" /> الفريق</h2>
        {project.team ? (
          <>
            <p className="wf-muted wf-small">حالة الفريق: {TEAM_STATUSES[project.team.status] || project.team.status}</p>
            <ul className="wf-list">
              {project.team.members.map((member, index) => (
                <li key={index}><b>{member.name}</b><span className="wf-muted">{member.role}</span></li>
              ))}
            </ul>
          </>
        ) : (
          <p className="wf-muted">لم يُكوَّن الفريق بعد.</p>
        )}
        {project.execution_started_at && <p className="wf-alert wf-alert-success">بدأ التنفيذ في {formatDate(project.execution_started_at)} وفق الخطة المتفق عليها.</p>}
      </section>
    </main>
  );
}
