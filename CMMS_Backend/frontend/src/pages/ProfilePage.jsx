import React, { useState, useRef } from "react";
import PageCard from "../components/PageCard";
import { useAuth } from "../context/AuthContext";
import { api } from "../api/client";

export default function ProfilePage() {
  const { user, login, token, isAdmin } = useAuth();
  const [editing, setEditing] = useState(false);
  const [msg, setMsg] = useState(null);
  const [err, setErr] = useState(null);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef(null);

  const handleSave = async (e) => {
    e.preventDefault();
    setMsg(null); setErr(null);
    const payload = Object.fromEntries(new FormData(e.currentTarget));
    try {
      const res = await api("/api/auth/profile", { method: "PUT", body: JSON.stringify(payload) });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      login(token, data);
      setMsg("تم تحديث الملف الشخصي بنجاح");
      setEditing(false);
    } catch (err) { setErr(err.message); }
  };

  const handleImageUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    setMsg(null); setErr(null);
    setUploading(true);
    
    const formData = new FormData();
    formData.append("image", file);

    try {
      // Use standard fetch here because api client might stringify body
      const res = await fetch("/api/auth/profile/image", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${token}`
        },
        body: formData
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to upload");
      
      login(token, data); // update context with new user data (including avatar_url)
      setMsg("تم تحديث صورة الملف الشخصي");
    } catch (err) {
      setErr(err.message);
    } finally {
      setUploading(false);
    }
  };

  const getInitials = (name) => {
    if (!name) return "U";
    return name.split(" ").map(n => n[0]).join("").substring(0, 2).toUpperCase();
  };

  const ProfileField = ({ label, value, icon }) => (
    <div style={{ marginBottom: "20px" }}>
      <label style={{ 
        display: "flex", 
        alignItems: "center", 
        gap: "6px", 
        fontSize: "12px", 
        color: "var(--text-muted)", 
        fontWeight: "700", 
        textTransform: "uppercase",
        marginBottom: "6px"
      }}>
        <span>{icon}</span> {label}
      </label>
      <div style={{ 
        fontSize: "16px", 
        fontWeight: "600", 
        color: "var(--text-heading)",
        background: "var(--bg-input)",
        padding: "12px 16px",
        borderRadius: "10px",
        border: "1px solid var(--border)"
      }}>
        {value || "-"}
      </div>
    </div>
  );

  return (
    <div className="profile-container" style={{ maxWidth: "900px", margin: "0 auto" }}>
      <PageCard title="إدارة الملف الشخصي 👤">
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))", gap: "32px" }}>
          
          {/* Left Column: Avatar and Summary */}
          <div style={{ textAlign: "center", padding: "32px", background: "var(--bg-elevated)", borderRadius: "16px", border: "1px solid var(--border)" }}>
            <div 
              onClick={() => fileInputRef.current?.click()}
              style={{ 
                width: "120px", 
                height: "120px", 
                borderRadius: "50%", 
                background: "linear-gradient(135deg, var(--primary), #7c3aed)", 
                color: "#fff", 
                display: "flex", 
                alignItems: "center", 
                justifyContent: "center", 
                fontSize: "40px", 
                fontWeight: "800",
                margin: "0 auto 20px",
                boxShadow: "0 8px 24px var(--primary-glow)",
                cursor: "pointer",
                position: "relative",
                overflow: "hidden"
              }}
              title="Click to change picture"
            >
              {user?.avatar_url ? (
                <img src={user.avatar_url} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
              ) : (
                getInitials(user?.full_name)
              )}
              <div style={{
                position: "absolute",
                bottom: 0,
                width: "100%",
                background: "rgba(0,0,0,0.5)",
                color: "#fff",
                fontSize: "10px",
                padding: "4px 0",
                opacity: uploading ? 1 : 0,
                transition: "opacity 0.2s"
              }}>
                {uploading ? "..." : "تغيير"}
              </div>
            </div>
            
            <input 
              type="file" 
              ref={fileInputRef} 
              style={{ display: "none" }} 
              accept="image/*" 
              onChange={handleImageUpload} 
            />

            <h2 style={{ margin: "0 0 8px", fontSize: "24px", color: "var(--text-heading)" }}>{user?.full_name}</h2>
            <div style={{ marginBottom: "16px" }}>
              <span className="pill" style={{ padding: "6px 16px", fontSize: "14px", background: "var(--accent-bg)", color: "var(--accent)" }}>
                {user?.role === 'admin' ? '🛡️ Administrator' : user?.role === 'IT Support' ? '🛠️ IT Support' : '👤 User'}
              </span>
            </div>
            
            <button 
              className="btn" 
              onClick={() => fileInputRef.current?.click()}
              style={{ width: "100%", marginBottom: "12px", background: "var(--bg-input)" }}
              disabled={uploading}
            >
              📷 {uploading ? "جاري الرفع..." : "تغيير الصورة"}
            </button>

            {!editing && isAdmin() && (
              <button 
                className="btn btn--primary" 
                onClick={() => setEditing(true)} 
                style={{ width: "100%" }}
              >
                ✏️ تعديل البيانات
              </button>
            )}
            
            <p style={{ color: "var(--text-muted)", fontSize: "12px", marginTop: "16px" }}>
              عضو منذ {new Date(user?.created_at || Date.now()).toLocaleDateString()}
            </p>
          </div>

          {/* Right Column: Details or Form */}
          <div style={{ padding: "8px" }}>
            {editing && isAdmin() ? (
              <form className="form" onSubmit={handleSave}>
                <h3 style={{ marginBottom: "24px", color: "var(--primary)" }}>تعديل المعلومات</h3>
                
                <div>
                  <label>👤 الاسم الكامل</label>
                  <input type="text" name="full_name" defaultValue={user?.full_name} required />
                </div>
                
                <div>
                  <label>📞 رقم الهاتف</label>
                  <input type="text" name="phone" defaultValue={user?.phone || ""} />
                </div>
                
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px" }}>
                  <div>
                    <label>🏢 القسم</label>
                    <input type="text" name="department" defaultValue={user?.department || ""} />
                  </div>
                  <div>
                    <label>💼 المسمى الوظيفي</label>
                    <input type="text" name="job_title" defaultValue={user?.job_title || ""} />
                  </div>
                </div>

                <div style={{ display: "flex", gap: "12px", marginTop: "24px" }}>
                  <button type="submit" className="btn btn--primary" style={{ flex: 1 }}>حفظ التعديلات</button>
                  <button type="button" className="btn" onClick={() => setEditing(false)} style={{ flex: 1, background: "var(--bg-input)" }}>إلغاء</button>
                </div>
              </form>
            ) : (
              <div style={{ display: "grid", gridTemplateColumns: "1fr", gap: "12px" }}>
                <h3 style={{ marginBottom: "12px", color: "var(--text-heading)", borderBottom: "2px solid var(--primary)", display: "inline-block", width: "fit-content", paddingBottom: "4px" }}>
                  التفاصيل المهنية
                </h3>
                <ProfileField label="البريد الإلكتروني" value={user?.email} icon="📧" />
                <ProfileField label="القسم الإداري" value={user?.department} icon="🏢" />
                <ProfileField label="المسمى الوظيفي" value={user?.job_title} icon="💼" />
                <ProfileField label="رقم التواصل" value={user?.phone} icon="📞" />
                
                {!isAdmin() && (
                  <div style={{ marginTop: "20px", padding: "12px", background: "var(--bg-input)", borderRadius: "8px", fontSize: "13px", color: "var(--text-muted)" }}>
                    💡 لتعديل بياناتك الوظيفية، يرجى التواصل مع إدارة النظام.
                  </div>
                )}
              </div>
            )}
            
            {msg && <div className="success" style={{ marginTop: "20px", display: "flex", alignItems: "center", gap: "8px" }}>✅ {msg}</div>}
            {err && <div className="error" style={{ marginTop: "20px", display: "flex", alignItems: "center", gap: "8px" }}>❌ {err}</div>}
          </div>

        </div>
      </PageCard>
    </div>
  );
}
