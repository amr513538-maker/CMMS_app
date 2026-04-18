import React, { useEffect, useState } from "react";
import PageCard from "../components/PageCard";
import { api } from "../api/client";

export default function ReportsPage() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  // Set initial dates as requested: 2026-04-01 to 2026-04-23
  const [filters, setFilters] = useState({ 
    from: "2026-04-01", 
    to: "2026-04-23", 
    lab_id: "", 
    status: "" 
  });
  const [labs, setLabs] = useState([]);

  useEffect(() => {
    api("/api/labs").then(r => r.ok ? r.json() : []).then(setLabs).catch(() => {});
    fetchReport();
  }, []);

  const fetchReport = async () => {
    setLoading(true);
    const params = new URLSearchParams();
    if (filters.from) params.set("from", filters.from);
    if (filters.to) params.set("to", filters.to);
    if (filters.lab_id) params.set("lab_id", filters.lab_id);
    if (filters.status) params.set("status", filters.status);
    try {
      const res = await api(`/api/reports/summary?${params.toString()}`);
      setData(await res.json());
    } catch (err) {
      console.error("Report Fetch Error:", err);
    } finally { 
      setLoading(false); 
    }
  };

  const exportCSV = () => {
    if (!data?.details) return;
    const headers = ["Code","Title","Device","Lab","Priority","Status","Requester","Technician","Date","Completed"];
    const rows = data.details.map(r => [
      r.request_code, 
      r.title||"", 
      r.device_name||"", 
      r.lab_name||"", 
      r.priority||"", 
      r.status, 
      r.requester||"", 
      r.technician||"", 
      r.requested_at?.split("T")[0]||"", 
      r.completed_at?.split("T")[0]||""
    ]);
    const csv = [headers.join(","), ...rows.map(r => r.map(c => `"${c}"`).join(","))].join("\n");
    const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a"); 
    a.href = url; 
    a.download = `CMMS_Report_${filters.from}_to_${filters.to}.csv`; 
    a.click();
  };

  const exportPDF = () => {
    window.print();
  };

  return (
    <div className="reports-container">
      <style>{`
        @media print {
          .nav, .btn, .filter-section { display: none !important; }
          .container { max-width: 100% !important; padding: 0 !important; }
          .page-card { border: none !important; box-shadow: none !important; }
        }
        .filter-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
          gap: 16px;
          background: var(--bg-card);
          padding: 24px;
          border-radius: 16px;
          border: 1px solid var(--border);
          margin-bottom: 24px;
          box-shadow: 0 4px 12px rgba(0,0,0,0.05);
        }
        .filter-item {
          display: flex;
          flex-direction: column;
          gap: 8px;
        }
        .filter-item label {
          font-size: 0.85rem;
          font-weight: 600;
          color: var(--text-muted);
        }
        .report-stats {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
          gap: 16px;
          margin-bottom: 24px;
        }
        .report-stat-card {
          background: var(--bg-card);
          padding: 24px;
          border-radius: 16px;
          border: 1px solid var(--border);
          text-align: center;
          transition: transform 0.2s;
        }
        .report-stat-card:hover {
          transform: translateY(-4px);
        }
        .report-stat-label {
          color: var(--text-muted);
          font-size: 0.9rem;
          margin-bottom: 8px;
        }
        .report-stat-value {
          font-size: 2rem;
          font-weight: 800;
        }
        .widget-column {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
          gap: 24px;
          margin-bottom: 24px;
        }
      `}</style>

      <PageCard title="التقارير التحليلية 📊">
        <div className="filter-section">
          <div className="filter-grid">
            <div className="filter-item">
              <label>📅 من تاريخ</label>
              <input type="date" value={filters.from} onChange={e => setFilters(p => ({...p, from: e.target.value}))} />
            </div>
            <div className="filter-item">
              <label>📅 إلى تاريخ</label>
              <input type="date" value={filters.to} onChange={e => setFilters(p => ({...p, to: e.target.value}))} />
            </div>
            <div className="filter-item">
              <label>🏫 المعمل</label>
              <select value={filters.lab_id} onChange={e => setFilters(p => ({...p, lab_id: e.target.value}))}>
                <option value="">كل المعامل</option>
                {labs.map(l => <option key={l.id} value={l.id}>{l.name}</option>)}
              </select>
            </div>
            <div className="filter-item">
              <label>🚦 الحالة</label>
              <select value={filters.status} onChange={e => setFilters(p => ({...p, status: e.target.value}))}>
                <option value="">كل الحالات</option>
                <option value="New">New (جديد)</option>
                <option value="Assigned">Assigned (تم التكليف)</option>
                <option value="In Progress">In Progress (قيد التنفيذ)</option>
                <option value="Done">Done (مكتمل)</option>
                <option value="Cancelled">Cancelled (ملغي)</option>
              </select>
            </div>
            <div className="filter-item" style={{ justifyContent: "end" }}>
              <button 
                className="btn btn--primary" 
                onClick={fetchReport} 
                style={{ width: "100%", height: "42px", display: "flex", alignItems: "center", justifyContent: "center", gap: "8px" }}
                disabled={loading}
              >
                {loading ? <span className="spinner"></span> : "🔍 بحث وتحديث"}
              </button>
            </div>
          </div>
        </div>

        {data && (
          <>
            <div className="report-stats">
              <div className="report-stat-card" style={{ borderLeft: "4px solid var(--primary)" }}>
                <div className="report-stat-label">إجمالي الطلبات</div>
                <div className="report-stat-value">{data.summary.total}</div>
              </div>
              <div className="report-stat-card" style={{ borderLeft: "4px solid var(--success)" }}>
                <div className="report-stat-label">الطلبات المكتملة</div>
                <div className="report-stat-value" style={{ color: "var(--success)" }}>{data.summary.completed}</div>
              </div>
              <div className="report-stat-card" style={{ borderLeft: "4px solid var(--warning)" }}>
                <div className="report-stat-label">قيد الانتظار</div>
                <div className="report-stat-value" style={{ color: "var(--warning)" }}>{data.summary.open}</div>
              </div>
              <div className="report-stat-card" style={{ borderLeft: "4px solid #3b82f6" }}>
                <div className="report-stat-label">قيد التنفيذ</div>
                <div className="report-stat-value" style={{ color: "#3b82f6" }}>{data.summary.in_progress}</div>
              </div>
            </div>

            <div className="widget-column">
              <section className="card" style={{ background: "var(--bg-body)" }}>
                <div className="card__header" style={{ background: "transparent" }}>
                  <h3 className="card__title">🔬 توزيع الطلبات حسب المعمل</h3>
                </div>
                <div className="card__body">
                  {data.byLab.length === 0 ? (
                    <div className="muted text-center" style={{ padding: "20px" }}>لا توجد بيانات</div>
                  ) : (
                    data.byLab.map((r, i) => (
                      <div key={i} style={{ display: "flex", justifyContent: "space-between", padding: "12px 16px", borderBottom: "1px solid var(--border)", background: "var(--bg-card)", borderRadius: "8px", marginBottom: "8px" }}>
                        <span style={{ fontWeight: "600" }}>{r.lab_name || "غير محدد"}</span>
                        <span className="pill pill--primary">{r.count} طلب</span>
                      </div>
                    ))
                  )}
                </div>
              </section>

              <section className="card" style={{ background: "var(--bg-body)" }}>
                <div className="card__header" style={{ background: "transparent" }}>
                  <h3 className="card__title">👨‍🔧 أداء الفنيين</h3>
                </div>
                <div className="card__body">
                  {data.byTech.length === 0 ? (
                    <div className="muted text-center" style={{ padding: "20px" }}>لا توجد بيانات</div>
                  ) : (
                    data.byTech.map((r, i) => (
                      <div key={i} style={{ display: "flex", flexDirection: "column", gap: "8px", padding: "12px 16px", borderBottom: "1px solid var(--border)", background: "var(--bg-card)", borderRadius: "8px", marginBottom: "8px" }}>
                        <div style={{ display: "flex", justifyContent: "space-between" }}>
                          <span style={{ fontWeight: "600" }}>{r.technician || "غير معين"}</span>
                          <span style={{ fontSize: "0.85rem" }}>إنجاز: {Math.round((r.completed/r.total) * 100) || 0}%</span>
                        </div>
                        <div style={{ height: "6px", background: "var(--border)", borderRadius: "3px", overflow: "hidden" }}>
                          <div style={{ height: "100%", background: "var(--success)", width: `${(r.completed/r.total) * 100}%` }}></div>
                        </div>
                        <div style={{ fontSize: "0.75rem", color: "var(--text-muted)" }}>
                          مكتمل: {r.completed} | الإجمالي: {r.total}
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </section>
            </div>

            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px", gap: "12px", flexWrap: "wrap" }}>
              <h3 style={{ margin: 0 }}>📋 تفاصيل التقرير</h3>
              <div style={{ display: "flex", gap: "12px" }}>
                <button className="btn btn--primary" onClick={exportCSV} style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                  📥 تصدير Excel
                </button>
                <button className="btn" onClick={exportPDF} style={{ display: "flex", alignItems: "center", gap: "8px", background: "#f3f4f6", border: "1px solid #d1d5db" }}>
                  🖨️ طباعة التقرير
                </button>
              </div>
            </div>

            <div className="tableWrap shadow-sm">
              <table className="table" id="reportTable">
                <thead>
                  <tr>
                    <th>الكود</th>
                    <th>العنوان</th>
                    <th>المعمل</th>
                    <th>الأولوية</th>
                    <th>الحالة</th>
                    <th>التاريخ</th>
                    <th>الفني</th>
                  </tr>
                </thead>
                <tbody>
                  {data.details.length === 0 ? (
                    <tr><td colSpan="7" className="text-center muted" style={{ padding: "40px" }}>لا توجد نتائج مطابقة لهذه الفلاتر</td></tr>
                  ) : (
                    data.details.map(r => (
                      <tr key={r.id}>
                        <td style={{ fontWeight: "700", color: "var(--primary)" }}>{r.request_code}</td>
                        <td style={{ fontWeight: "500" }}>{r.title || "-"}</td>
                        <td>{r.lab_name || "-"}</td>
                        <td>
                          <span className={`pill pill--${r.priority?.toLowerCase() === 'high' ? 'danger' : (r.priority?.toLowerCase() === 'medium' ? 'warning' : 'soft')}`}>
                            {r.priority || "-"}
                          </span>
                        </td>
                        <td>
                          <span className={`pill ${r.status === 'Done' ? 'pill--success' : (r.status === 'New' ? 'pill--danger' : 'pill--soft')}`}>
                            {r.status}
                          </span>
                        </td>
                        <td className="muted">{r.requested_at?.split("T")[0]}</td>
                        <td className="muted">{r.technician || "غير معين"}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </>
        )}
      </PageCard>
    </div>
  );
}
