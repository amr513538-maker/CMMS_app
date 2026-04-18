import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import PageCard from "../components/PageCard";
import { api } from "../api/client";

export default function NewRequestPage() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [labs, setLabs] = useState([]);
  const [devices, setDevices] = useState([]);
  const [selectedLabId, setSelectedLabId] = useState("");
  const [technicians, setTechnicians] = useState([]);
  const navigate = useNavigate();

  useEffect(() => {
    // Fetch labs for dropdown
    api("/api/labs").then(r => r.ok ? r.json() : []).then(setLabs).catch(() => {});
    // Fetch IT Support staff for assignment
    api("/api/users/it-support").then(r => r.ok ? r.json() : []).then(setTechnicians).catch(() => {});
  }, []);

  useEffect(() => {
    if (selectedLabId) {
      api(`/api/devices/${selectedLabId}`).then(r => r.ok ? r.json() : []).then(setDevices).catch(() => setDevices([]));
    } else {
      setDevices([]);
    }
  }, [selectedLabId]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    const formData = new FormData(e.currentTarget);
    try {
      const res = await api("/api/maintenance-requests", { method: "POST", body: formData });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "فشل إرسال الطلب");
      navigate(`/track/${data.request_code}`);
    } catch (err) {
      setError(err.message);
      setLoading(false);
    }
  };

  return (
    <PageCard title="طلب صيانة جديد 🛠️">
      <form className="form" onSubmit={handleSubmit}>

        <div style={{ display: "flex", gap: "16px", flexWrap: "wrap" }}>
          <div style={{ flex: 1, minWidth: "200px" }}>
            <label>المعمل (Lab)</label>
            <select name="lab_id" value={selectedLabId} onChange={e => setSelectedLabId(e.target.value)}>
              <option value="">-- اختر المعمل --</option>
              {labs.map(l => <option key={l.id} value={l.id}>{l.name}</option>)}
            </select>
          </div>
          <div style={{ flex: 1, minWidth: "200px" }}>
            <label>الجهاز (Device)</label>
            <select name="device_id" disabled={!selectedLabId}>
              <option value="">-- اختر الجهاز --</option>
              {devices.map(d => <option key={d.id} value={d.id}>{d.name} ({d.type || "-"})</option>)}
            </select>
          </div>
        </div>

        <div style={{ display: "flex", gap: "16px", flexWrap: "wrap" }}>
          <div style={{ flex: 1, minWidth: "200px" }}>
            <label>اسم الجهاز (يدوي - اختياري)</label>
            <input type="text" name="deviceName" placeholder="إذا لم يكن الجهاز مسجلاً" />
          </div>
          <div style={{ flex: 1, minWidth: "200px" }}>
            <label>الموقع / المنطقة</label>
            <input type="text" name="location" placeholder="مثال: مبنى A, الطابق 2" />
          </div>
        </div>

        <label>وصف المشكلة (مطلوب) 🔥</label>
        <textarea name="issueDescription" rows="5" placeholder="اشرح المشكلة بالتفصيل..." required style={{ fontSize: "16px", borderColor: "var(--primary)" }}></textarea>
        
        <div style={{ display: "flex", gap: "16px", flexWrap: "wrap", marginTop: "16px" }}>
          <div style={{ flex: 1, minWidth: "200px" }}>
            <label>الأولوية (Priority)</label>
            <select name="priority" defaultValue="Medium">
              <option value="Low">منخفضة (Low)</option>
              <option value="Medium">متوسطة (Medium)</option>
              <option value="High">عالية (High)</option>
              <option value="Critical">حرجة 🔴 (Critical)</option>
            </select>
          </div>
          <div style={{ flex: 1, minWidth: "200px" }}>
            <label>الفني القائم بالمهمة (IT Support User)</label>
            <select name="assigned_to">
              <option value="">-- اختياري: تكليف فني --</option>
              {technicians.map(t => <option key={t.id} value={t.id}>{t.full_name}</option>)}
            </select>
          </div>
          <div style={{ flex: 1, minWidth: "200px" }}>
            <label>صورة مرفقة (Attachment) 📸</label>
            <input type="file" name="image" accept="image/png, image/jpeg" />
          </div>
        </div>

        <button className="btn btn--primary" type="submit" disabled={loading} style={{ marginTop: "16px", width: "100%", fontSize: "16px", padding: "12px" }}>
          {loading ? "جاري الإرسال..." : "إرسال الطلب والحصول على كود التتبع"}
        </button>
      </form>
      {error && <div className="error" style={{ marginTop: "16px" }}>{error}</div>}
    </PageCard>
  );
}
