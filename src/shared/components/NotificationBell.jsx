import { useCallback, useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { FaBell } from "react-icons/fa";
import { getNotifications, markAllNotificationsRead, markNotificationRead } from "../services/workflowService";
import { formatDate } from "../utils/workflow";

const POLL_MS = 60000;

/** جرس الإشعارات الداخلية (FR-33): عدد غير المقروء، وقائمة منسدلة تفتح رابط الإشعار وتعلّمه مقروءًا. */
export default function NotificationBell() {
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState([]);
  const [unread, setUnread] = useState(0);
  const [failed, setFailed] = useState(false);
  const panelRef = useRef(null);

  const apply = useCallback((response) => {
    setItems(response.data || []);
    setUnread(response.unread_count || 0);
    setFailed(false);
  }, []);

  const load = useCallback(() => getNotifications().then(apply).catch(() => setFailed(true)), [apply]);

  useEffect(() => {
    let active = true;
    const refresh = () => getNotifications().then((response) => active && apply(response)).catch(() => active && setFailed(true));
    refresh();
    const timer = setInterval(() => {
      if (document.visibilityState === "visible") refresh();
    }, POLL_MS);
    return () => {
      active = false;
      clearInterval(timer);
    };
  }, [apply]);

  useEffect(() => {
    if (!open) return undefined;
    const close = (event) => {
      if (event.type === "keydown" ? event.key === "Escape" : !panelRef.current?.contains(event.target)) setOpen(false);
    };
    document.addEventListener("mousedown", close);
    document.addEventListener("keydown", close);
    return () => {
      document.removeEventListener("mousedown", close);
      document.removeEventListener("keydown", close);
    };
  }, [open]);

  const openItem = async (item) => {
    setOpen(false);
    if (!item.read_at) {
      setItems((list) => list.map((n) => (n.id === item.id ? { ...n, read_at: new Date().toISOString() } : n)));
      setUnread((count) => Math.max(0, count - 1));
      markNotificationRead(item.id).catch(() => {});
    }
    if (item.link) navigate(item.link);
  };

  const readAll = async () => {
    try {
      await markAllNotificationsRead();
      await load();
    } catch {
      setFailed(true);
    }
  };

  return (
    <div className="notif" ref={panelRef}>
      <button
        type="button"
        className="topbar-bell"
        aria-label={unread ? `الإشعارات، ${unread} غير مقروء` : "الإشعارات"}
        aria-expanded={open}
        aria-haspopup="true"
        onClick={() => {
          setOpen((value) => !value);
          if (!open) load();
        }}
      >
        <FaBell />
        {unread > 0 && <span className="notif-badge" aria-hidden="true">{unread > 9 ? "9+" : unread}</span>}
      </button>
      {open && (
        <div className="notif-panel" role="dialog" aria-label="الإشعارات">
          <div className="notif-head">
            <b>الإشعارات</b>
            {unread > 0 && <button type="button" className="notif-readall" onClick={readAll}>تعليم الكل كمقروء</button>}
          </div>
          {failed && <p className="notif-empty" role="alert">تعذر تحميل الإشعارات.</p>}
          {!failed && items.length === 0 && <p className="notif-empty">لا توجد إشعارات بعد.</p>}
          <ul className="notif-list">
            {items.map((item) => (
              <li key={item.id}>
                <button type="button" className={`notif-item ${item.read_at ? "" : "notif-unread"}`} onClick={() => openItem(item)}>
                  <b>{item.title}</b>
                  <span>{item.body}</span>
                  <small>{formatDate(item.created_at)}</small>
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
