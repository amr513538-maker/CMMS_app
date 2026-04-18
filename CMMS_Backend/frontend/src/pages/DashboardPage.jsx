import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import PageCard from "../components/PageCard";
import { useAuth } from "../context/AuthContext";
import { api } from "../api/client";
import { Doughnut } from "react-chartjs-2";
import { Chart as ChartJS, ArcElement, Tooltip, Legend } from 'chart.js';

ChartJS.register(ArcElement, Tooltip, Legend);

function AdminDashboard({ user, requestData }) {
  const [adminStats, setAdminStats] = useState(null);
  useEffect(() => {
    api("/api/dashboard/admin-stats").then(r => r.json()).then(setAdminStats).catch(() => {});
  }, []);

  return (
    <>
      <div className="dashboard-grid">
        <div className="stat-card"><div className="stat-card__title">إجمالي الأجهزة</div><div className="stat-card__value text-primary">{adminStats?.totalDevices ?? "..."}</div></div>
        <div className="stat-card"><div className="stat-card__title">إجمالي المعامل</div><div className="stat-card__value text-success">{adminStats?.totalLabs ?? "..."}</div></div>
        <div className="stat-card"><div className="stat-card__title">إجمالي المستخدمين</div><div className="stat-card__value text-warning">{adminStats?.totalUsers ?? "..."}</div></div>
        <div className="stat-card"><div className="stat-card__title">إجمالي الطلبات</div><div className="stat-card__value">{requestData?.kpis.total ?? 0}</div></div>
      </div>
      <SharedWidgets requestData={requestData} />
      {adminStats?.labs?.length > 0 && (
        <div style={{ marginTop: "30px" }}>
          <h3>المعامل والأجهزة</h3>
          <div className="dashboard-grid">
            {adminStats.labs.map(l => (
              <div key={l.id} className="stat-card">
                <div className="stat-card__title">{l.name}</div>
                <div className="stat-card__value text-primary">{l.device_count} جهاز</div>
              </div>
            ))}
          </div>
        </div>
      )}
    </>
  );
}

function UserDashboard({ user, requestData }) {
  return (
    <>
      <div className="dashboard-grid">
        <div className="stat-card"><div className="stat-card__title">طلباتي الكلية</div><div className="stat-card__value">{requestData?.kpis.total ?? 0}</div></div>
        <div className="stat-card"><div className="stat-card__title">مفتوحة</div><div className="stat-card__value text-warning">{requestData?.kpis.open ?? 0}</div></div>
        <div className="stat-card"><div className="stat-card__title">قيد التنفيذ</div><div className="stat-card__value text-primary">{requestData?.kpis.inProgress ?? 0}</div></div>
        <div className="stat-card"><div className="stat-card__title">مكتملة</div><div className="stat-card__value text-success">{requestData?.kpis.done ?? 0}</div></div>
      </div>
      <SharedWidgets requestData={requestData} />
    </>
  );
}

function TechDashboard({ user, requestData }) {
  return (
    <>
      <div className="dashboard-grid">
        <div className="stat-card"><div className="stat-card__title">المكلف بها</div><div className="stat-card__value">{requestData?.kpis.total ?? 0}</div></div>
        <div className="stat-card"><div className="stat-card__title">معلقة / جديدة</div><div className="stat-card__value text-warning">{requestData?.kpis.open ?? 0}</div></div>
        <div className="stat-card"><div className="stat-card__title">قيد العمل</div><div className="stat-card__value text-primary">{requestData?.kpis.inProgress ?? 0}</div></div>
        <div className="stat-card"><div className="stat-card__title">منجزة</div><div className="stat-card__value text-success">{requestData?.kpis.done ?? 0}</div></div>
      </div>
      <SharedWidgets requestData={requestData} />
    </>
  );
}

function SharedWidgets({ requestData }) {
  if (!requestData) return null;
  let chartData = null;
  if (requestData.statusChart?.length > 0) {
    chartData = {
      labels: requestData.statusChart.map(s => s.status),
      datasets: [{ data: requestData.statusChart.map(s => s.count), backgroundColor: ['#4f6ef7','#f59e0b','#22c55e','#ef4444','#8b8fa4'], borderWidth: 0 }]
    };
  }
  return (
    <div className="widgets-grid">
      <section className="card">
        <div className="card__header"><h3 className="card__title">توزيع الحالات</h3></div>
        <div className="card__body" style={{ height: "250px" }}>
          {chartData ? <Doughnut data={chartData} options={{ responsive: true, maintainAspectRatio: false, plugins: { legend: { position: 'right', labels: {color:'#e4e5ea'} } } }} /> : <p className="muted">لا توجد بيانات</p>}
        </div>
      </section>
      <section className="card">
        <div className="card__header"><h3 className="card__title">آخر النشاطات</h3></div>
        <div className="card__body">
          {requestData.recentRequests?.length > 0 ? (
            <div className="tableWrap"><table className="table"><thead><tr><th>الكود</th><th>الجهاز</th><th>الحالة</th><th>التاريخ</th></tr></thead><tbody>
              {requestData.recentRequests.map(r => (
                <tr key={r.id}><td><Link to={`/track/${r.request_code}`} style={{color:"var(--primary)", fontWeight:"bold"}}>{r.request_code}</Link></td><td>{r.asset_name||"-"}</td><td><span className={`pill ${r.status === 'New' ? 'text-danger' : r.status === 'Done' ? 'text-success' : 'pill--soft'}`} style={r.status === 'New' ? { fontWeight: 'bold' } : {}}>{r.status}</span></td><td className="muted">{new Date(r.requested_at).toLocaleDateString()}</td></tr>
              ))}
            </tbody></table></div>
          ) : <p className="muted">لا توجد طلبات حديثة</p>}
        </div>
      </section>
    </div>
  );
}

export default function DashboardPage() {
  const { user, isAdmin, isTech, isUser } = useAuth();
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    api("/api/dashboard/stats").then(r => r.json()).then(setData).catch(() => setError("فشل تحميل البيانات"));
  }, []);

  const roleLabel = isAdmin() ? "مدير النظام" : isTech() ? "الدعم الفني" : "مقدم طلب";

  if (error) return <PageCard title="Dashboard"><p className="error text-danger">{error}</p></PageCard>;
  if (!data) return <PageCard title={`Dashboard — ${user?.full_name}`}><div className="muted"><span className="spinner"></span> جاري التحميل...</div></PageCard>;

  return (
    <PageCard title={`Dashboard — <span class="pill">${roleLabel}</span>`}>
      {isAdmin() && <AdminDashboard user={user} requestData={data} />}
      {isTech() && <TechDashboard user={user} requestData={data} />}
      {isUser() && <UserDashboard user={user} requestData={data} />}
    </PageCard>
  );
}
