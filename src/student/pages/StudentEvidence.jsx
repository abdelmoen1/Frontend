import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Award, Star } from "lucide-react";
import { getStudentEvidence } from "../../shared/services/workflowService";
import { EVALUATION_CRITERIA, formatDate } from "../../shared/utils/workflow";
import "../../shared/styles/Workflow.css";

/** سجل أدلة الخبرة (FR-09): مشاريع حقيقية أكملها الطالب مع دوره ومهاراته ومهامه والتقييمات. */
export default function StudentEvidence() {
  const [records, setRecords] = useState(null);
  const [error, setError] = useState("");

  useEffect(() => {
    getStudentEvidence().then(setRecords).catch((err) => setError(err.message));
  }, []);

  return (
    <main className="wf-page">
      <h1><Award size={22} aria-hidden="true" /> سجل أدلة الخبرة</h1>
      <p className="wf-muted">يُبنى هذا السجل تلقائيًا من المشاريع الحقيقية التي أكملتها على المنصة، ويضم دورك والمهارات التي استخدمتها والمهام المقبولة والتقييمات.</p>
      {error && <p className="wf-alert wf-alert-danger" role="alert">{error}</p>}
      {!records && !error && <div className="wf-skeleton" aria-label="جارٍ التحميل" />}
      {records && records.length === 0 && (
        <div className="wf-card wf-empty">
          لا توجد أدلة بعد. تُضاف المشاركة هنا عند اكتمال مشروع شاركت فيه. <Link to="/student/opportunities">ابدأ بالتقديم على فرصة</Link>.
        </div>
      )}
      {records?.map((record) => (
        <article key={record.id} className="wf-card">
          <div className="wf-head" style={{ marginBottom: 8 }}>
            <div className="wf-list-main">
              <h2 style={{ marginBottom: 4 }}>{record.project.title}</h2>
              <span className="wf-muted wf-small">{record.project.organization_name} · {record.role_title} · {formatDate(record.issued_at)}</span>
            </div>
            <div className="wf-actions">
              <span className="wf-pill wf-pill-success">مكتمل</span>
              {record.participation === "leader" && <span className="wf-pill wf-pill-info">قائد الفريق</span>}
            </div>
          </div>
          <p>{record.summary}</p>
          {record.skills_used.length > 0 && (
            <div className="wf-evidence-skills" aria-label="المهارات المستخدمة">
              {record.skills_used.map((skill) => <span key={skill} className="wf-pill">{skill}</span>)}
            </div>
          )}
          {record.completed_tasks.length > 0 && (
            <>
              <h3>المهام المنجزة ({record.completed_tasks_count})</h3>
              <ul className="wf-small">{record.completed_tasks.map((task, i) => <li key={i}>{task}</li>)}</ul>
            </>
          )}
          <div className="wf-grid">
            <div>
              <h3>تقييم قائد الفريق</h3>
              {record.leader_evaluation ? (
                <>
                  <p className="wf-small" style={{ margin: 0 }}><Star size={14} aria-hidden="true" /> <b>{record.leader_evaluation.overall_score} من 5</b></p>
                  <ul className="wf-checks">
                    {Object.entries(record.leader_evaluation.criteria || {}).map(([key, value]) => <li key={key}>{EVALUATION_CRITERIA[key] || key}: {value}/5</li>)}
                  </ul>
                  <p className="wf-small" style={{ whiteSpace: "pre-wrap" }}>{record.leader_evaluation.comments}</p>
                </>
              ) : <p className="wf-muted wf-small">{record.participation === "leader" ? "لا ينطبق على قائد الفريق." : "لم يُسجَّل بعد."}</p>}
            </div>
            <div>
              <h3>رضا المؤسسة عن المشروع</h3>
              {record.client_satisfaction_score
                ? <p className="wf-small"><Star size={14} aria-hidden="true" /> <b>{record.client_satisfaction_score} من 5</b></p>
                : <p className="wf-muted wf-small">لم ترسل المؤسسة تقييمها بعد.</p>}
            </div>
          </div>
        </article>
      ))}
    </main>
  );
}
