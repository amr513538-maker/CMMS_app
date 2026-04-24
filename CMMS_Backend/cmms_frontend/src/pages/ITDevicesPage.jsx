import React, { useEffect, useState } from "react";
import PageCard from "../components/PageCard";
import { api } from "../api/client";

export default function ITDevicesPage() {
  const [devices, setDevices] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchDevices = async () => {
    setLoading(true);
    try { 
      const res = await api("/api/devices/all"); 
      setDevices(await res.json()); 
    } catch {} finally { 
      setLoading(false); 
    }
  };

  useEffect(() => { fetchDevices(); }, []);

  const handleStatusChange = async (id, newStatus) => {
    try {
      await api(`/api/devices/${id}/status`, { method: "PUT", body: JSON.stringify({ status: newStatus }) });
      fetchDevices();
    } catch { alert("فشل تحديث الحالة"); }
  };

  if (loading) return <div className="container"><PageCard title="إدارة الأجهزة 🖥️"><div className="muted" style={{textAlign:'center', padding:'40px'}}><span className="spinner"></span> جاري التحميل...</div></PageCard></div>;

  return (
    <div className="container">
      <PageCard title="إدارة الأجهزة وسجل العتاد 🖥️">
        <div className="tableWrap" style={{ animation: 'fadeUp 0.6s ease-out' }}>
          <table className="table">
            <thead>
              <tr>
                <th>ID</th>
                <th>اسم الجهاز</th>
                <th>النوع</th>
                <th>المعمل</th>
                <th>الحالة الحالية</th>
                <th>تغيير الحالة</th>
              </tr>
            </thead>
            <tbody>
              {devices.map(d => (
                <tr key={d.id}>
                  <td className="muted">#{d.id}</td>
                  <td><strong style={{ color: 'var(--text-heading)' }}>{d.name}</strong></td>
                  <td className="muted" style={{ fontSize: '13px' }}>{d.type || "-"}</td>
                  <td><span style={{ fontWeight: '600' }}>{d.lab_name || "-"}</span></td>
                  <td>
                    <span className={`pill ${d.status === 'Active' ? 'text-success' : d.status === 'Maintenance' ? 'text-warning' : 'text-danger'}`}
                          style={{ background: 'rgba(255,255,255,0.05)', fontWeight: '800' }}>
                      {d.status}
                    </span>
                  </td>
                  <td>
                    <select
                      className="form"
                      value={d.status}
                      onChange={e => handleStatusChange(d.id, e.target.value)}
                      style={{ padding: "8px 12px", fontSize: "12px", width: 'auto', minWidth: '140px' }}
                    >
                      <option value="Active">نشط (Active)</option>
                      <option value="Inactive">معطل (Inactive)</option>
                      <option value="Maintenance">في الصيانة (Maintenance)</option>
                      <option value="Retired">مكهن (Retired)</option>
                    </select>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </PageCard>
    </div>
  );
}
