import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import PageCard from "../components/PageCard";
import { api } from "../api/client";

export default function NotificationsPage() {
  const [notifs, setNotifs] = useState([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  const fetchNotifs = async () => {
    try {
      const res = await api("/api/notifications");
      setNotifs(await res.json());
    } catch {}
    setLoading(false);
  };

  useEffect(() => { fetchNotifs(); }, []);

  const markRead = async (id) => {
    await api(`/api/notifications/${id}/read`, { method: "PUT" });
    setNotifs(prev => prev.map(n => n.id === id ? { ...n, is_read: true } : n));
  };

  const markAllRead = async () => {
    await api("/api/notifications/read-all", { method: "PUT" });
    setNotifs(prev => prev.map(n => ({ ...n, is_read: true })));
  };

  const handleClick = (n) => {
    if (!n.is_read) markRead(n.id);
    if (n.link) navigate(n.link);
  };

  if (loading) return <PageCard title="الإشعارات 🔔"><div className="muted"><span className="spinner"></span> جاري التحميل...</div></PageCard>;

  const unread = notifs.filter(n => !n.is_read).length;

  return (
    <PageCard title="الإشعارات 🔔">
      {unread > 0 && (
        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "16px", alignItems: "center" }}>
          <span className="text-warning" style={{ fontWeight: "bold" }}>{unread} إشعار غير مقروء</span>
          <button className="btn" onClick={markAllRead} style={{ padding: "6px 14px" }}>تعيين الكل كمقروء</button>
        </div>
      )}
      {notifs.length === 0 ? (
        <p className="muted" style={{ textAlign: "center", padding: "40px" }}>لا توجد إشعارات 🎉</p>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
          {notifs.map(n => (
            <div
              key={n.id}
              onClick={() => handleClick(n)}
              style={{
                padding: "14px 18px",
                background: n.is_read ? "var(--bg-card)" : "var(--bg-elevated)",
                borderRadius: "var(--radius)",
                border: n.is_read ? "1px solid var(--border)" : "1px solid var(--primary)",
                cursor: n.link ? "pointer" : "default",
                transition: "all 0.2s",
                opacity: n.is_read ? 0.7 : 1
              }}
            >
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <strong style={{ color: n.is_read ? "var(--text-muted)" : "var(--primary)" }}>
                  {!n.is_read && "● "}{n.title}
                </strong>
                <span className="muted" style={{ fontSize: "12px" }}>{new Date(n.created_at).toLocaleString()}</span>
              </div>
              {n.message && <p className="muted" style={{ marginTop: "4px", fontSize: "14px" }}>{n.message}</p>}
            </div>
          ))}
        </div>
      )}
    </PageCard>
  );
}
