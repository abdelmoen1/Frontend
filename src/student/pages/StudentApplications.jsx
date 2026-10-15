import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { ChevronLeft, Crown, FileCheck2, RotateCcw } from "lucide-react";

import { getMyApplications, withdrawApplication } from "../services/studentService";
import { applicationErrorMessage, applicationView, formatDate, PROJECT_STAGE_LABELS } from "../utils/applications";
import { opportunityLoadError } from "../utils/opportunities";
import { showAlert } from "../../shared/utils/alerts";
import "../styles/Opportunities.css";

function ApplicationRow({ item, onWithdraw, busy }) {
  const view = applicationView(item);
  if (!view) return null;
  const opportunity = item.opportunity || {};

  return (
    <article className="opp-card opp-application" aria-labelledby={`opp-application-${item.id}`}>
      <div className="opp-application-main">
        <span className="opp-org">{opportunity.organization || "مؤسسة"}</span>
        <h2 id={`opp-application-${item.id}`}>{opportunity.title || "مشروع"}</h2>
        <ul className="opp-meta">
          {item.preferred_role && <li>الدور المفضّل: {item.preferred_role.title}</li>}
          {item.applied_at && <li>قدّمت في {formatDate(item.applied_at)}</li>}
          {opportunity.project_status && <li>{PROJECT_STAGE_LABELS[opportunity.project_status] || ""}</li>}
        </ul>
        <p className="opp-muted">{view.hint}</p>
        {item.team?.is_leader && (
          <span className="opp-pill opp-tone-success">
            <Crown size={13} aria-hidden="true" /> قائد الفريق
          </span>
        )}
      </div>
      <div className="opp-application-side">
        <span className={`opp-pill opp-tone-${view.tone}`}>
          <FileCheck2 size={13} aria-hidden="true" /> {view.label}
        </span>
        <div className="opp-apply-actions">
          {opportunity.available && opportunity.id && (
            <Link className="opp-btn opp-btn-light" to={`/student/opportunities/${opportunity.id}`}>
              الفرصة <ChevronLeft size={15} aria-hidden="true" />
            </Link>
          )}
          {view.canWithdraw && (
            <button type="button" className="opp-btn opp-btn-danger" disabled={busy} onClick={() => onWithdraw(item)}>
              سحب
            </button>
          )}
        </div>
      </div>
    </article>
  );
}

export default function StudentApplications() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [busyId, setBusyId] = useState(null);
  const [message, setMessage] = useState(null);

  const load = useCallback(async () => {
    setError(null);
    try {
      const result = await getMyApplications();
      setItems(Array.isArray(result) ? result : []);
    } catch (loadError) {
      setError(opportunityLoadError(loadError));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    let active = true;
    getMyApplications()
      .then((result) => active && setItems(Array.isArray(result) ? result : []))
      .catch((loadError) => active && setError(opportunityLoadError(loadError)))
      .finally(() => active && setLoading(false));
    return () => {
      active = false;
    };
  }, []);

  const withdraw = async (item) => {
    const confirmation = await showAlert({
      tone: "danger",
      icon: "warning",
      title: "سحب الطلب؟",
      text: `سيُسحب طلبك على "${item.opportunity?.title || "المشروع"}" ولا يمكن التقديم عليه مرة أخرى.`,
      showCancelButton: true,
      confirmButtonText: "نعم، اسحب الطلب",
      cancelButtonText: "إلغاء",
      focusCancel: true,
    });
    if (!confirmation.isConfirmed) return;

    setBusyId(item.id);
    setMessage(null);
    try {
      await withdrawApplication(item.id);
      setMessage({ tone: "neutral", text: "تم سحب طلبك." });
      await load();
    } catch (withdrawError) {
      setMessage({ tone: "danger", text: applicationErrorMessage(withdrawError) });
    } finally {
      setBusyId(null);
    }
  };

  return (
    <div className="opp-page" dir="rtl">
      <header className="opp-page-head">
        <div>
          <h1>
            <FileCheck2 size={22} aria-hidden="true" /> طلباتي
          </h1>
          <p>حالة طلبات انضمامك إلى المشاريع. المؤسسة تراجع المتقدمين وتختار الفريق.</p>
        </div>
        <Link className="opp-btn opp-btn-light" to="/student/opportunities">
          تصفح الفرص
        </Link>
      </header>

      {message && (
        <p className={`opp-banner opp-tone-${message.tone}`} role={message.tone === "danger" ? "alert" : "status"}>
          {message.text}
        </p>
      )}

      {loading ? (
        <div className="opp-list" aria-busy="true" aria-label="جارٍ تحميل الطلبات">
          {[0, 1].map((index) => (
            <div className="opp-card opp-card-skeleton opp-skeleton-short" key={index} />
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
        </div>
      ) : items.length === 0 ? (
        <div className="opp-state">
          <h2>لم تقدّم على أي مشروع بعد</h2>
          <p>تصفح الفرص المفتوحة، وقدّم على المشاريع التي تستوفي متطلبات أحد أدوارها.</p>
          <Link className="opp-btn" to="/student/opportunities">
            تصفح الفرص
          </Link>
        </div>
      ) : (
        <div className="opp-list">
          {items.map((item) => (
            <ApplicationRow key={item.id} item={item} onWithdraw={withdraw} busy={busyId === item.id} />
          ))}
        </div>
      )}
    </div>
  );
}
