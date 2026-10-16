import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Crown } from "lucide-react";
import { getLeadingProjects } from "../../shared/services/workflowService";
import { PROJECT_STAGES, TEAM_STATUSES, formatDate } from "../../shared/utils/workflow";
import "../../shared/styles/Workflow.css";

export default function LeadingProjects() {
  const [projects, setProjects] = useState(null);
  const [error, setError] = useState("");

  useEffect(() => {
    getLeadingProjects().then(setProjects).catch((err) => setError(err.message));
  }, []);

  return (
    <main className="wf-page">
      <h1><Crown size={22} aria-hidden="true" /> المشاريع التي أقودها</h1>
      <p className="wf-muted">
        عيّنتك إدارة المنصة قائدًا لهذه المشاريع. راجع المتقدمين وكوّن الفريق، ثم اتفق مع المؤسسة على خطة التنفيذ قبل البدء.
      </p>
      {error && <p className="wf-alert wf-alert-danger" role="alert">{error}</p>}
      {!projects && !error && <div className="wf-skeleton" aria-label="جارٍ التحميل" />}
      {projects && projects.length === 0 && (
        <div className="wf-card wf-empty">لا توجد مشاريع تقودها حاليًا. تُعيَّن القيادة من إدارة المنصة.</div>
      )}
      {projects?.map((project) => (
        <section key={project.id} className="wf-card">
          <div className="wf-head" style={{ marginBottom: 8 }}>
            <div className="wf-list-main">
              <h2 style={{ marginBottom: 4 }}>{project.title}</h2>
              <span className="wf-muted wf-small">{project.organization_name} · قائد منذ {formatDate(project.assigned_at)}</span>
            </div>
            <div className="wf-actions">
              <span className="wf-pill wf-pill-info">{PROJECT_STAGES[project.project_status] || project.project_status}</span>
              {project.team_status && <span className="wf-pill">الفريق: {TEAM_STATUSES[project.team_status]}</span>}
              <span className={`wf-pill ${project.plan_agreed ? "wf-pill-success" : "wf-pill-warning"}`}>{project.plan_agreed ? "الخطة متفق عليها" : "الخطة لم يُتفق عليها"}</span>
            </div>
          </div>
          {project.summary && <p className="wf-muted">{project.summary}</p>}
          <div className="wf-actions">
            <Link className="wf-btn" to={`/student/leading/${project.id}`}>المتقدمون والفريق ({project.applications_count})</Link>
            <Link className="wf-btn wf-btn-light" to={`/projects/${project.id}/plan`}>خطة التنفيذ والاتفاق</Link>
          </div>
        </section>
      ))}
    </main>
  );
}
