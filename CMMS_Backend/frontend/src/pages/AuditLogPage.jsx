import React, { useEffect, useState } from "react";
import PageCard from "../components/PageCard";
import { api } from "../api/client";

export default function AuditLogPage() {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api("/api/audit-logs").then(r => r.json()).then(setLogs).catch(() => {}).finally(() => setLoading(false));
  }, []);

  if (loading) return <PageCard title="سجل المراجعة 📋"><div className="muted"><span className="spinner"></span> جاري التحميل...</div></PageCard>;

  return (
    <PageCard title="سجل المراجعة (Audit Log) 📋">
      {logs.length === 0 ? (
        <p className="muted" style={{ textAlign: "center", padding: "40px" }}>لا توجد سجلات مراجعة بعد</p>
      ) : (
        <div className="tableWrap">
          <table className="table">
            <thead><tr><th>المستخدم</th><th>الإجراء</th><th>النوع</th><th>المعرف</th><th>التاريخ</th></tr></thead>
            <tbody>
              {logs.map(l => (
                <tr key={l.id}>
                  <td><strong>{l.actor_name || "النظام"}</strong></td>
                  <td>{l.action}</td>
                  <td className="muted">{l.entity_type || "-"}</td>
                  <td className="muted">{l.entity_id || "-"}</td>
                  <td className="muted">{new Date(l.created_at).toLocaleString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </PageCard>
  );
}
