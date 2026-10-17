import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { FolderKanban } from "lucide-react";
import { getStudentProjects } from "../../shared/services/workflowService";
import { PROJECT_STAGES, TEAM_STATUSES } from "../../shared/utils/workflow";
import "../../shared/styles/Workflow.css";

/** المشاريع التي الطالب عضو في فريقها، مع عدد مهامه المفتوحة والمنجزة. */
export default function StudentProjects() {
  const [projects, setProjects] = useState(null);
  const [error, setError] = useState("");

  useEffect(() => {
    getStudentProjects().then(setProjects).catch((err) => setError(err.message));
  }, []);

  return (
    <main className="wf-page">
      <h1><FolderKanban size={22} aria-hidden="true" /> مشاريعي</h1>
      <p className="wf-muted">المشاريع التي انضممت إلى فريقها. افتح المشروع لرؤية مهامك وتسليمها.</p>
      {error && <p className="wf-alert wf-alert-danger" role="alert">{error}</p>}
      {!projects && !error && <div className="wf-skeleton" aria-label="جارٍ التحميل" />}
      {projects && projects.length === 0 && (
        <div className="wf-card wf-empty">
          لم تنضم إلى فريق مشروع بعد. <Link to="/student/opportunities">تصفح الفرص المتاحة</Link>.
        </div>
      )}
      {projects?.map((project) => {
        const started = ["in_progress", "completed"].includes(project.project_status);
        return (
          <section key={project.id} className="wf-card">
            <div className="wf-head" style={{ marginBottom: 8 }}>
              <div className="wf-list-main">
                <h2 style={{ marginBottom: 4 }}>{project.title}</h2>
                <span className="wf-muted wf-small">{project.organization_name} · دورك: {project.role}</span>
              </div>
              <div className="wf-actions">
                <span className={`wf-pill ${project.project_status === "completed" ? "wf-pill-success" : "wf-pill-info"}`}>{PROJECT_STAGES[project.project_status] || project.project_status}</span>
                <span className="wf-pill">الفريق: {TEAM_STATUSES[project.team_status] || project.team_status}</span>
              </div>
            </div>
            {started ? (
              <>
                <p className="wf-small">مهامي المفتوحة: <b>{project.open_tasks}</b> · المنجزة: <b>{project.done_tasks}</b></p>
                <Link className="wf-btn" to={`/student/projects/${project.id}`}>المهام والتسليمات</Link>
              </>
            ) : (
              <p className="wf-muted wf-small">ستظهر مهامك هنا عندما يبدأ قائد الفريق التنفيذ بعد الاتفاق على الخطة مع المؤسسة.</p>
            )}
          </section>
        );
      })}
    </main>
  );
}
