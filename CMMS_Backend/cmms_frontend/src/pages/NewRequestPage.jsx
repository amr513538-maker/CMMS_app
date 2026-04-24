import React, { useState, useEffect } from "react";
import { useNavigate, Navigate } from "react-router-dom";
import PageCard from "../components/PageCard";
import { api } from "../api/client";
import { useAuth } from "../context/AuthContext";

export default function NewRequestPage() {
  const { isTech, isAdmin } = useAuth();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [labs, setLabs] = useState([]);
  const [devices, setDevices] = useState([]);
  const [selectedLabId, setSelectedLabId] = useState("");
  const [selectedBuilding, setSelectedBuilding] = useState("");
  const [technicians, setTechnicians] = useState([]);
  
  const [title, setTitle] = useState("");
  const [desc, setDesc] = useState("");
  const [titleError, setTitleError] = useState("");
  const [descError, setDescError] = useState("");
  
  const navigate = useNavigate();

  if (isTech()) {
    return <Navigate to="/dashboard" replace />;
  }

  const [buildings, setBuildings] = useState([]);

  useEffect(() => {
    api("/api/buildings").then(r => r.ok ? r.json() : []).then(setBuildings).catch(() => {});
    api("/api/labs").then(r => r.ok ? r.json() : []).then(setLabs).catch(() => {});
    api("/api/users/it-support").then(r => r.ok ? r.json() : []).then(setTechnicians).catch(() => {});
  }, []);

  useEffect(() => {
    if (selectedLabId) {
      api(`/api/devices/${selectedLabId}`).then(r => r.ok ? r.json() : []).then(setDevices).catch(() => setDevices([]));
    } else {
      setDevices([]);
    }
  }, [selectedLabId]);

  const filteredLabs = selectedBuilding ? labs.filter(l => l.building === selectedBuilding) : [];

  const handleTitleBlur = () => {
    if (!title.trim()) setTitleError("عنوان الطلب مطلوب");
    else if (title.trim().length < 4) setTitleError("يجب أن لا يقل العنوان عن 4 أحرف");
    else setTitleError("");
  };

  const handleDescBlur = () => {
    if (!desc.trim()) setDescError("وصف المشكلة مطلوب");
    else if (desc.trim().length < 8) setDescError("يجب أن لا يقل الوصف عن 8 أحرف");
    else setDescError("");
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    handleTitleBlur();
    handleDescBlur();
    if (title.trim().length < 4 || desc.trim().length < 8) return;

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
    <div className="max-w-4xl mx-auto space-y-8 animate-fade-up">
      <div className="flex flex-col gap-2">
        <h1 className="text-3xl font-black text-slate-900 dark:text-white tracking-tight">إنشاء طلب صيانة جديد 🛠️</h1>
        <p className="text-slate-500 dark:text-slate-400 font-medium">يرجى ملء النموذج أدناه بدقة لضمان سرعة معالجة الطلب.</p>
      </div>

      <PageCard>
        <form className="space-y-8" onSubmit={handleSubmit} autoComplete="off">
          
          {/* Building, Lab & Device Selection */}
          <div className="space-y-6 p-6 bg-slate-50 dark:bg-slate-800/50 rounded-2xl border border-slate-100 dark:border-slate-800">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <div className="space-y-2">
                <label className="text-xs font-black text-slate-500 dark:text-slate-400 uppercase tracking-widest block mr-1">المبنى (Building)</label>
                <select 
                  required 
                  value={selectedBuilding} 
                  onChange={e => { setSelectedBuilding(e.target.value); setSelectedLabId(""); }}
                  className="w-full px-4 py-3 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-4 focus:ring-blue-500/10 focus:border-blue-600 outline-none transition-all font-bold text-slate-900 dark:text-white appearance-none bg-[url('data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIGZpbGw9Im5vbmUiIHZpZXdCb3g9IjAgMCAyNCAyNCIgc3Ryb2tlPSIjOWE5YmE3IiBzdHJva2Utd2lkdGg9IjIiPjxwYXRoIHN0cm9rZS1saW5lY2FwPSJyb3VuZCIgc3Ryb2tlLWpvaW5lcj0icm91bmQiIGQ9Ik0xOSA5bC03IDctNy03IiAvPjwvc3ZnPg==')] bg-no-repeat bg-[position:left_1rem_center] bg-[length:1.25rem]"
                >
                  <option value="">-- اختر المبنى --</option>
                  {buildings.map(b => <option key={b.id} value={b.name}>{b.name}</option>)}
                </select>
              </div>
              <div className="space-y-2">
                <label className="text-xs font-black text-slate-500 dark:text-slate-400 uppercase tracking-widest block mr-1">المعمل (Target Lab)</label>
                <select 
                  name="lab_id" 
                  required 
                  disabled={!selectedBuilding}
                  value={selectedLabId} 
                  onChange={e => setSelectedLabId(e.target.value)}
                  className="w-full px-4 py-3 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-4 focus:ring-blue-500/10 focus:border-blue-600 outline-none transition-all font-bold text-slate-900 dark:text-white appearance-none bg-[url('data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIGZpbGw9Im5vbmUiIHZpZXdCb3g9IjAgMCAyNCAyNCIgc3Ryb2tlPSIjOWE5YmE3IiBzdHJva2Utd2lkdGg9IjIiPjxwYXRoIHN0cm9rZS1saW5lY2FwPSJyb3VuZCIgc3Ryb2tlLWpvaW5lcj0icm91bmQiIGQ9Ik0xOSA5bC03IDctNy03IiAvPjwvc3ZnPg==')] bg-no-repeat bg-[position:left_1rem_center] bg-[length:1.25rem] disabled:opacity-50"
                >
                  <option value="">-- اختر المعمل --</option>
                  {filteredLabs.map(l => <option key={l.id} value={l.id}>{l.name}</option>)}
                </select>
              </div>
            </div>
            <div className="space-y-2">
              <label className="text-xs font-black text-slate-500 dark:text-slate-400 uppercase tracking-widest block mr-1">الجهاز (Fixed Asset)</label>
              <select 
                name="device_id" 
                disabled={!selectedLabId}
                required
                className="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl focus:ring-4 focus:ring-blue-500/10 focus:border-blue-600 outline-none transition-all font-bold text-slate-900 disabled:opacity-50 appearance-none bg-[url('data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIGZpbGw9Im5vbmUiIHZpZXdCb3g9IjAgMCAyNCAyNCIgc3Ryb2tlPSIjOWE5YmE3IiBzdHJva2Utd2lkdGg9IjIiPjxwYXRoIHN0cm9rZS1saW5lY2FwPSJyb3VuZCIgc3Ryb2tlLWpvaW5lcj0icm91bmQiIGQ9Ik0xOSA5bC03IDctNy03IiAvPjwvc3ZnPg==')] bg-no-repeat bg-[position:left_1rem_center] bg-[length:1.25rem]"
              >
                <option value="">-- اختر الجهاز --</option>
                {devices.map(d => <option key={d.id} value={d.id}>{d.name} ({d.type || "-"})</option>)}
              </select>
            </div>
          </div>



          <div className="space-y-2">
            <label className="text-xs font-black text-slate-500 dark:text-slate-400 uppercase tracking-widest block mr-1">عنوان الطلب / المشكلة الرئيسية</label>
            <input 
              type="text" 
              name="title" 
              required 
              minLength={4}
              maxLength={60}
              value={title}
              onChange={(e) => {
                setTitle(e.target.value.replace(/[.,،]/g, ''));
                if (titleError) setTitleError("");
              }}
              onBlur={handleTitleBlur}
              placeholder="مثال: تعطل الشاشة (بدون نقاط أو فواصل)" 
              className={`w-full px-4 py-3 bg-white dark:bg-slate-800 border rounded-xl focus:ring-4 outline-none transition-all font-bold text-slate-900 dark:text-white ${
                titleError 
                  ? "border-red-500 focus:ring-red-500/10 focus:border-red-600" 
                  : "border-slate-200 dark:border-slate-700 focus:ring-blue-500/10 focus:border-blue-600"
              }`} 
            />
            {titleError && <p className="text-red-500 text-xs font-bold mt-1">{titleError}</p>}
          </div>

          <div className="space-y-2">
            <label className="text-xs font-black text-slate-500 dark:text-slate-400 uppercase tracking-widest block mr-1">وصف المشكلة بالتفصيل 🔥</label>
            <textarea 
              name="issueDescription" 
              rows="4" 
              minLength={8}
              maxLength={400}
              value={desc}
              onChange={(e) => {
                setDesc(e.target.value.replace(/[.,،]/g, ''));
                if (descError) setDescError("");
              }}
              onBlur={handleDescBlur}
              placeholder="اشرح العطل بالتفصيل لمساعدة الفني (أقصى حد 400 حرف وبدون نقاط أو فواصل)..." 
              required 
              className={`w-full px-4 py-3 bg-white dark:bg-slate-800 border rounded-xl focus:ring-4 outline-none transition-all font-bold text-slate-900 dark:text-white resize-none ${
                descError 
                  ? "border-red-500 focus:ring-red-500/10 focus:border-red-600" 
                  : "border-slate-200 dark:border-slate-700 focus:ring-blue-500/10 focus:border-blue-600"
              }`}
            ></textarea>
            {descError && <p className="text-red-500 text-xs font-bold mt-1">{descError}</p>}
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8 items-end border-t border-slate-100 dark:border-slate-800 pt-8">
            <div className="space-y-2">
              <label className="text-xs font-black text-slate-500 dark:text-slate-400 uppercase tracking-widest block mr-1">الأولوية (Priority)</label>
              <select 
                name="priority" 
                defaultValue="Medium"
                className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-4 focus:ring-blue-500/10 focus:border-blue-600 outline-none transition-all font-bold text-slate-900 dark:text-white appearance-none bg-[url('data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIGZpbGw9Im5vbmUiIHZpZXdCb3g9IjAgMCAyNCAyNCIgc3Ryb2tlPSIjOWE5YmE3IiBzdHJva2Utd2lkdGg9IjIiPjxwYXRoIHN0cm9rZS1saW5lY2FwPSJyb3VuZCIgc3Ryb2tlLWpvaW5lcj0icm91bmQiIGQ9Ik0xOSA5bC03IDctNy03IiAvPjwvc3ZnPg==')] bg-no-repeat bg-[position:left_1rem_center] bg-[length:1.25rem]"
              >
                <option value="Low">منخفضة (Low)</option>
                <option value="Medium">متوسطة (Medium)</option>
                <option value="High">عالية (High)</option>
                <option value="Critical">حرجة 🔴 (Critical)</option>
              </select>
            </div>
            
            <div className="space-y-4 col-span-3">
               <label className="text-xs font-black text-slate-500 dark:text-slate-400 uppercase tracking-widest block mr-1">صورة مرفقة / لقطة للعطل 📸</label>
               <div className="relative border-2 border-dashed border-slate-200 dark:border-slate-700 rounded-xl p-4 hover:border-blue-400 transition-colors flex items-center justify-center bg-slate-50/50 dark:bg-slate-800/50">
                 <input type="file" name="image" accept="image/*" className="absolute inset-0 opacity-0 cursor-pointer" />
                 <div className="text-center">
                    <svg className="w-8 h-8 mx-auto text-slate-400 mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"/></svg>
                    <span className="text-sm font-bold text-slate-500 dark:text-slate-400">انقر لرفع صورة أو اسحبها هنا</span>
                 </div>
               </div>
            </div>
          </div>

          <div className="pt-4">
            <button 
              className="w-full py-4 bg-blue-600 text-white font-black rounded-2xl shadow-xl shadow-blue-500/20 hover:bg-blue-700 active:scale-[0.98] transition-all text-base disabled:opacity-50" 
              type="submit" 
              disabled={loading}
            >
              {loading ? (
                <span className="flex items-center justify-center gap-3">
                  <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                  جاري معالجة الطلب...
                </span>
              ) : "إرسال طلب الصيانة"}
            </button>
          </div>
        </form>
        {error && <div className="mt-8 p-4 bg-red-50 dark:bg-red-900/30 border border-red-100 dark:border-red-800 rounded-2xl text-red-600 dark:text-red-400 font-bold text-center">{error}</div>}
      </PageCard>
    </div>
  );
}
