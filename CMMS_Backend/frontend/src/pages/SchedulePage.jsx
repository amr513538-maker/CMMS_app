import React, { useEffect, useState } from "react";
import PageCard from "../components/PageCard";
import { api } from "../api/client";
import { useAuth } from "../context/AuthContext";

export default function SchedulePage() {
  const { isAdmin } = useAuth();
  const [plans, setPlans] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingPlan, setEditingPlan] = useState(null);
  const [tasksInput, setTasksInput] = useState("");

  const fetchPlans = async () => {
    setLoading(true);
    try { const res = await api("/api/schedule"); setPlans(await res.json()); } catch {} finally { setLoading(false); }
  };

  useEffect(() => { fetchPlans(); }, []);

  const handleSave = async (e) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const payload = Object.fromEntries(formData);
    payload.tasks = tasksInput.split("\n").map(t => t.trim()).filter(t => t);

    try {
      if (editingPlan) {
        await api(`/api/schedule/${editingPlan.id}`, { method: "PUT", body: JSON.stringify(payload) });
      } else {
        await api("/api/schedule", { method: "POST", body: JSON.stringify(payload) });
      }
      setShowModal(false);
      setTasksInput("");
      fetchPlans();
    } catch { alert("خطأ أثناء الحفظ"); }
  };

  const handleDelete = async (id) => {
    if (!window.confirm("حذف خطة الصيانة؟")) return;
    await api(`/api/schedule/${id}`, { method: "DELETE" });
    fetchPlans();
  };

  const freqLabel = (type, val) => {
    const labels = { days: "يوم", weeks: "أسبوع", months: "شهر", meter: "قراءة عداد" };
    return `كل ${val} ${labels[type] || type}`;
  };

  if (loading) return <PageCard title="جدولة الصيانة 📅"><div className="muted"><span className="spinner"></span> جاري التحميل...</div></PageCard>;

  return (
    <PageCard title="جدولة الصيانة الدورية 📅">
      {isAdmin() && (
        <button className="btn btn--primary" onClick={() => { setEditingPlan(null); setTasksInput(""); setShowModal(true); }} style={{ marginBottom: "16px" }}>
          + خطة صيانة جديدة
        </button>
      )}

      {plans.length === 0 ? (
        <p className="muted" style={{ textAlign: "center", padding: "40px" }}>لا توجد خطط صيانة دورية مسجلة</p>
      ) : (
        <div className="widgets-grid" style={{ gridTemplateColumns: "repeat(auto-fill, minmax(320px, 1fr))" }}>
          {plans.map(p => (
            <div key={p.id} className="card" style={{ padding: "20px" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <h3 style={{ margin: 0, color: "var(--primary)" }}>{p.name}</h3>
                <span className={`pill ${p.is_active ? "text-success" : "text-danger"}`}>{p.is_active ? "نشط" : "متوقف"}</span>
              </div>
              {p.description && <p className="muted" style={{ marginTop: "8px" }}>{p.description}</p>}
              <div style={{ marginTop: "12px", padding: "10px", background: "var(--bg-elevated)", borderRadius: "8px" }}>
                <strong>التكرار:</strong> {freqLabel(p.frequency_type, p.frequency_value)}
              </div>
              {p.tasks?.length > 0 && (
                <div style={{ marginTop: "10px" }}>
                  <strong style={{ fontSize: "13px" }}>المهام:</strong>
                  <ul style={{ paddingLeft: "16px", margin: "6px 0 0 0" }}>
                    {p.tasks.map((t, i) => <li key={i} style={{ fontSize: "13px" }}>{t}</li>)}
                  </ul>
                </div>
              )}
              {isAdmin() && (
                <div style={{ display: "flex", gap: "8px", marginTop: "14px" }}>
                  <button className="btn" style={{ flex: 1 }} onClick={() => { setEditingPlan(p); setTasksInput(p.tasks?.join("\n") || ""); setShowModal(true); }}>تعديل</button>
                  <button className="btn btn--danger" onClick={() => handleDelete(p.id)}>حذف</button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {showModal && (
        <div className="modal-overlay active">
          <div className="modal">
            <h3>{editingPlan ? "تعديل خطة" : "خطة صيانة جديدة"}</h3>
            <form className="form" onSubmit={handleSave}>
              <label>اسم الخطة *</label>
              <input type="text" name="name" defaultValue={editingPlan?.name || ""} required />
              <label>الوصف</label>
              <textarea name="description" defaultValue={editingPlan?.description || ""} rows="2"></textarea>
              <div style={{ display: "flex", gap: "10px" }}>
                <div style={{ flex: 1 }}>
                  <label>نوع التكرار</label>
                  <select name="frequency_type" defaultValue={editingPlan?.frequency_type || "months"}>
                    <option value="days">أيام</option><option value="weeks">أسابيع</option>
                    <option value="months">أشهر</option><option value="meter">قراءة عداد</option>
                  </select>
                </div>
                <div style={{ flex: 1 }}>
                  <label>القيمة</label>
                  <input type="number" name="frequency_value" defaultValue={editingPlan?.frequency_value || 1} min="1" required />
                </div>
              </div>
              <label>المهام (سطر لكل مهمة)</label>
              <textarea value={tasksInput} onChange={e => setTasksInput(e.target.value)} rows="4" placeholder="فحص الأسلاك&#10;تنظيف الفلاتر&#10;اختبار الأداء"></textarea>
              <div className="modal-actions" style={{ marginTop: "16px" }}>
                <button type="button" className="btn" onClick={() => setShowModal(false)} style={{ background: "var(--bg-input)" }}>إلغاء</button>
                <button type="submit" className="btn btn--primary">حفظ</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </PageCard>
  );
}
