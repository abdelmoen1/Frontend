import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { AlertTriangle, RefreshCw } from "lucide-react";
import { getAdminOverview, getAdminProjects } from "../../shared/services/workflowService";
import { PROJECT_STAGES, PUBLICATION_STATUSES, formatDate } from "../../shared/utils/workflow";
import "../../shared/styles/Workflow.css";

const FILTERS = [
  { key: "pending_review", label: "بانتظار المراجعة" },
  { key: "published", label: "منشورة" },
  { key: "changes_requested", label: "مطلوب تعديل" },
  { key: "", label: "الكل" },
];

export default function AdminDashboard() {
  const [overview, setOverview] = useState(null);
  const [projects, setProjects] = useState([]);
  const [filter, setFilter] = useState("pending_review");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const [stats, list] = await Promise.all([getAdminOverview(), getAdminProjects({ status: filter })]);
      setOverview(stats);
      setProjects(list.data || []);
    } catch (err) {
      setError(err.message || "تعذر تحميل لوحة الإدارة.");
    } finally {
      setLoading(false);
    }
  }, [filter]);

  useEffect(() => {
    let active = true;
    Promise.all([getAdminOverview(), getAdminProjects({ status: filter })])
      .then(([stats, list]) => {
        if (!active) return;
        setOverview(stats);
        setProjects(list.data || []);
      })
      .catch((err) => active && setError(err.message || "تعذر تحميل لوحة الإدارة."))
      .finally(() => active && setLoading(false));
    return () => {
      active = false;
    };
  }, [filter]);

  return (
    <main className="wf-page">
      <div className="wf-head">
        <div>
          <h1>لوحة إدارة المنصة</h1>
          <p className="wf-muted">راجع طلبات المؤسسات، عيّن قادة الفرق، وتابع حالة المنصة.</p>
        </div>
        <div className="wf-actions">
          <Link className="wf-btn wf-btn-light" to="/admin/users">إدارة الحسابات</Link>
          <button type="button" className="wf-btn wf-btn-light" onClick={load} disabled={loading}>
            <RefreshCw size={16} aria-hidden="true" /> تحديث
          </button>
        </div>
      </div>

      {error && (
        <div className="wf-alert wf-alert-danger" role="alert">
          <AlertTriangle size={18} aria-hidden="true" /> {error}
        </div>
      )}

      {overview && (
        <section className="wf-stats" aria-label="إحصاءات المنصة">
          <div className="wf-stat"><span>بانتظار المراجعة</span><b>{overview.projects.pending_review}</b></div>
          <div className="wf-stat"><span>مشاريع منشورة بلا قائد</span><b>{overview.projects.without_leader}</b></div>
          <div className="wf-stat"><span>الطلاب</span><b>{overview.users.students}</b></div>
          <div className="wf-stat"><span>المؤسسات</span><b>{overview.users.organizations}</b></div>
          <div className="wf-stat"><span>طلبات الانضمام</span><b>{overview.applications}</b></div>
          <div className="wf-stat"><span>الفرق</span><b>{overview.teams}</b></div>
        </section>
      )}

      <section className="wf-card" aria-labelledby="queue-title">
        <h2 id="queue-title">المشاريع</h2>
        <div className="wf-tabs" role="group" aria-label="تصفية المشاريع">
          {FILTERS.map((item) => (
            <button key={item.key || "all"} type="button" className="wf-tab" aria-pressed={filter === item.key} onClick={() => { setLoading(true); setFilter(item.key); }}>
              {item.label}
            </button>
          ))}
        </div>

        {loading ? (
          <div className="wf-skeleton" aria-label="جارٍ التحميل" />
        ) : projects.length === 0 ? (
          <p className="wf-empty">لا توجد مشاريع في هذه القائمة.</p>
        ) : (
          <ul className="wf-list">
            {projects.map((project) => {
              const status = PUBLICATION_STATUSES[project.status] || { label: project.status, tone: "neutral" };
              return (
                <li key={project.id}>
                  <div className="wf-list-main">
                    <b>{project.title}</b>
                    <span className="wf-muted wf-small">
                      {project.organization?.name} · النسخة {project.version}
                      {project.submitted_for_review_at ? ` · قُدّم ${formatDate(project.submitted_for_review_at)}` : ""}
                    </span>
                  </div>
                  <div className="wf-actions">
                    <span className={`wf-pill wf-pill-${status.tone}`}>{status.label}</span>
                    {project.status === "published" && (
                      <span className="wf-pill">{PROJECT_STAGES[project.project_status] || project.project_status}</span>
                    )}
                    {project.status === "published" && !project.leader && <span className="wf-pill wf-pill-warning">بلا قائد</span>}
                    <Link className="wf-btn wf-btn-sm" to={`/admin/projects/${project.id}`}>مراجعة</Link>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </section>

      {overview?.recent_activity?.length > 0 && (
        <section className="wf-card" aria-labelledby="activity-title">
          <h2 id="activity-title">آخر الإجراءات المسجلة</h2>
          <ul className="wf-list">
            {overview.recent_activity.map((entry) => (
              <li key={entry.id}>
                <span className="wf-hash">{entry.action}</span>
                <span className="wf-muted wf-small">{entry.actor || "النظام"} · {formatDate(entry.created_at)}</span>
              </li>
            ))}
          </ul>
        </section>
      )}
    </main>
  );
}
