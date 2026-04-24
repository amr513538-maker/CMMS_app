import React, { useEffect, useState } from "react";
import PageCard from "../components/PageCard";
import { api } from "../api/client";

export default function AuditLogPage() {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api("/api/audit-logs").then(r => r.json()).then(setLogs).catch(() => {}).finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="container"><PageCard title="سجل المراجعة 📋"><div className="muted" style={{textAlign:'center', padding:'40px'}}><span className="spinner"></span> جاري التحميل...</div></PageCard></div>;

  return (
    <div className="container">
      <PageCard title="سجل المراجعة (Audit Log) 📋">
        {logs.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '60px' }}>
            <div style={{ fontSize: '48px', marginBottom: '16px' }}>📜</div>
            <p className="muted">لا توجد سجلات مراجعة بعد.</p>
          </div>
        ) : (
          <div className="tableWrap" style={{ animation: 'fadeUp 0.6s ease-out' }}>
            <table className="table">
              <thead>
                <tr>
                  <th>المستخدم</th>
                  <th>الإجراء</th>
                  <th>النوع</th>
                  <th>المعرف</th>
                  <th>التاريخ</th>
                </tr>
              </thead>
              <tbody>
                {logs.map(l => (
                  <tr key={l.id}>
                    <td><strong style={{ color: 'var(--text-heading)' }}>{l.actor_name || "النظام"}</strong></td>
                    <td><span className="pill" style={{ background: 'rgba(255,255,255,0.05)', border: 'none', color: 'var(--primary)' }}>{l.action}</span></td>
                    <td className="muted" style={{ fontSize: '13px' }}>{l.entity_type || "-"}</td>
                    <td className="muted" style={{ fontSize: '13px' }}>{l.entity_id || "-"}</td>
                    <td className="muted" style={{ fontSize: '12px' }}>{new Date(l.created_at).toLocaleString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </PageCard>
    </div>
  );
}
