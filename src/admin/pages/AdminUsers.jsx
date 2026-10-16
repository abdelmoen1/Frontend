import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { ArrowRight } from "lucide-react";
import { getAdminUsers, setUserActive } from "../../shared/services/workflowService";
import { formatDate } from "../../shared/utils/workflow";
import { useAuth } from "../../shared/auth/useAuth";
import "../../shared/styles/Workflow.css";

const ROLES = { student: "طالب/خريج", organization: "مؤسسة", admin: "مدير منصة" };

export default function AdminUsers() {
  const { user: me } = useAuth();
  const [users, setUsers] = useState([]);
  const [role, setRole] = useState("");
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [busyId, setBusyId] = useState(null);

  const load = useCallback(async (params) => {
    setLoading(true);
    setError("");
    try {
      setUsers((await getAdminUsers(params)).data || []);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    let active = true;
    getAdminUsers({ role })
      .then((result) => active && setUsers(result.data || []))
      .catch((err) => active && setError(err.message))
      .finally(() => active && setLoading(false));
    return () => {
      active = false;
    };
  }, [role]);

  const toggle = async (target) => {
    setBusyId(target.id);
    try {
      const result = await setUserActive(target.id, !target.is_active);
      setUsers((list) => list.map((u) => (u.id === target.id ? { ...u, is_active: result.is_active } : u)));
    } catch (err) {
      setError(err.message);
    } finally {
      setBusyId(null);
    }
  };

  return (
    <main className="wf-page">
      <Link className="wf-back" to="/admin/dashboard"><ArrowRight size={16} aria-hidden="true" /> لوحة الإدارة</Link>
      <h1>إدارة الحسابات</h1>
      <p className="wf-muted">إيقاف الحساب ينهي جلساته فورًا ويمنع الدخول حتى إعادة تفعيله.</p>

      <section className="wf-card">
        <form className="wf-row" onSubmit={(e) => { e.preventDefault(); load({ role, search }); }} role="search">
          <input className="wf-input" type="search" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="ابحث بالاسم أو البريد" aria-label="بحث في الحسابات" />
          <button type="submit" className="wf-btn wf-btn-light">بحث</button>
        </form>
        <div className="wf-tabs" role="group" aria-label="تصفية حسب الدور">
          {[["", "الكل"], ...Object.entries(ROLES)].map(([key, label]) => (
            <button key={key || "all"} type="button" className="wf-tab" aria-pressed={role === key} onClick={() => { setLoading(true); setRole(key); }}>{label}</button>
          ))}
        </div>
        {error && <p className="wf-alert wf-alert-danger" role="alert">{error}</p>}
        {loading ? (
          <div className="wf-skeleton" />
        ) : users.length === 0 ? (
          <p className="wf-empty">لا توجد حسابات مطابقة.</p>
        ) : (
          <ul className="wf-list">
            {users.map((u) => (
              <li key={u.id}>
                <div className="wf-list-main">
                  <b>{u.name}</b>
                  <span className="wf-muted wf-small">{u.email} · {ROLES[u.role] || u.role} · منذ {formatDate(u.created_at)}</span>
                </div>
                <div className="wf-actions">
                  <span className={`wf-pill ${u.is_active ? "wf-pill-success" : "wf-pill-danger"}`}>{u.is_active ? "نشط" : "موقوف"}</span>
                  {u.id !== me?.id && (
                    <button type="button" className={`wf-btn wf-btn-sm ${u.is_active ? "wf-btn-danger" : ""}`} disabled={busyId === u.id} onClick={() => toggle(u)}>
                      {u.is_active ? "إيقاف" : "تفعيل"}
                    </button>
                  )}
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>
    </main>
  );
}
