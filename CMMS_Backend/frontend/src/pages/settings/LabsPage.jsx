import React, { useState, useEffect } from "react";
import { api } from "../../api/client";
import DevicesView from "./DevicesView";

export default function LabsPage() {
  const [labs, setLabs] = useState([]);
  const [loading, setLoading] = useState(true);
  
  const [showModal, setShowModal] = useState(false);
  const [editingLab, setEditingLab] = useState(null);
  
  const [selectedLab, setSelectedLab] = useState(null); // to show devices mapped to it

  const fetchLabs = async () => {
    setLoading(true);
    try {
      const res = await api("/api/labs");
      setLabs(await res.json());
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLabs();
  }, []);

  const handleSave = async (e) => {
    e.preventDefault();
    const payload = Object.fromEntries(new FormData(e.currentTarget));
    try {
      if (editingLab) {
        await api(`/api/labs/${editingLab.id}`, { method: "PUT", body: JSON.stringify(payload) });
      } else {
        await api(`/api/labs`, { method: "POST", body: JSON.stringify(payload) });
      }
      setShowModal(false);
      fetchLabs();
    } catch(err) {
      alert("Error saving lab");
    }
  };

  const handleDelete = async (id) => {
    if(!window.confirm("حذف المعمل سيحذف جميع الأجهزة المرتبطة به. متأكد؟")) return;
    try {
      await api(`/api/labs/${id}`, { method: "DELETE" });
      if (selectedLab?.id === id) setSelectedLab(null);
      fetchLabs();
    } catch(err) {
      alert("Error deleting lab");
    }
  };

  if (selectedLab) {
    return (
      <div>
        <button className="btn" onClick={() => setSelectedLab(null)} style={{ marginBottom: "16px", background: "var(--bg-input)" }}>
           🔙 العودة لقائمة المعامل
        </button>
        <div style={{ padding: "16px", background: "var(--bg-elevated)", borderRadius: "var(--radius)", marginBottom: "20px" }}>
          <h2 style={{ margin: "0 0 8px 0", color: "var(--primary)" }}>{selectedLab.name}</h2>
          <div className="muted">📍 {selectedLab.location} — {selectedLab.description}</div>
        </div>
        <DevicesView labId={selectedLab.id} />
      </div>
    );
  }

  if (loading) return <div className="muted"><span className="spinner"></span> جاري التحميل...</div>;

  return (
    <div>
      <button className="btn btn--primary" onClick={() => { setEditingLab(null); setShowModal(true); }} style={{ marginBottom: "16px" }}>
        + معمل جديد
      </button>

      <div className="widgets-grid" style={{ gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))" }}>
        {labs.map(lab => (
          <div key={lab.id} className="card" style={{ padding: "20px", display: "flex", flexDirection: "column", gap: "10px" }}>
            <h3 style={{ margin: 0, color: "var(--primary)" }}>{lab.name}</h3>
            <p className="muted" style={{ fontSize: "14px", margin: 0 }}>📍 {lab.location || "لا يوجد موقع"}</p>
            <p style={{ fontSize: "14px", flex: 1 }}>{lab.description}</p>
            <div style={{ display: "flex", gap: "10px", marginTop: "10px" }}>
              <button className="btn btn--primary" style={{ flex: 1 }} onClick={() => setSelectedLab(lab)}>استعراض الأجهزة (Devices)</button>
              <button className="btn" onClick={() => { setEditingLab(lab); setShowModal(true); }}>تعديل</button>
              <button className="btn btn--danger" onClick={() => handleDelete(lab.id)}>حذف</button>
            </div>
          </div>
        ))}
      </div>

      {showModal && (
        <div className="modal-overlay active">
          <div className="modal">
            <h3>{editingLab ? "تعديل المعمل" : "إضافة معمل جديد"}</h3>
            <form className="form" onSubmit={handleSave}>
              <label>اسم المعمل *</label>
              <input type="text" name="name" defaultValue={editingLab?.name || ""} required />
              
              <label>الموقع (Location)</label>
              <input type="text" name="location" defaultValue={editingLab?.location || ""} />
              
              <label>الوصف (Description)</label>
              <textarea name="description" defaultValue={editingLab?.description || ""} rows="3"></textarea>
              
              <div className="modal-actions" style={{ marginTop: "16px" }}>
                <button type="button" className="btn" onClick={() => setShowModal(false)} style={{ background: "var(--bg-input)" }}>إلغاء</button>
                <button type="submit" className="btn btn--primary">حفظ</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
