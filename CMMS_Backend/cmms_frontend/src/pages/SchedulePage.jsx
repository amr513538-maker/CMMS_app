import React, { useEffect, useState } from "react";
import PageCard from "../components/PageCard";
import { api } from "../api/client";
import { useAuth } from "../context/AuthContext";
import Modal from "../components/Modal";

export default function SchedulePage() {
  const { isAdmin } = useAuth();
  const [plans, setPlans] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingPlan, setEditingPlan] = useState(null);
  const [tasksInput, setTasksInput] = useState("");
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleting, setDeleting] = useState(false);

  const fetchPlans = async () => {
    setLoading(true);
    try { 
      const res = await api("/api/schedule"); 
      setPlans(await res.json()); 
    } catch {} finally { 
      setLoading(false); 
    }
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

  const confirmDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await api(`/api/schedule/${deleteTarget.id}`, { method: "DELETE" });
      fetchPlans();
      setDeleteTarget(null);
    } catch { alert("خطأ أثناء الحذف"); }
    finally { setDeleting(false); }
  };

  const freqLabel = (type, val) => {
    const labels = { days: "يوم", weeks: "أسبوع", months: "شهر", meter: "قراءة عداد" };
    return `كل ${val} ${labels[type] || type}`;
  };

  if (loading && plans.length === 0) return (
    <div className="flex flex-col items-center justify-center py-20 bg-white border border-slate-200 rounded-3xl animate-pulse">
       <div className="w-12 h-12 bg-slate-100 rounded-full mb-4"></div>
       <div className="h-4 w-48 bg-slate-100 rounded"></div>
    </div>
  );

  return (
    <div className="space-y-8 animate-fade-up">
      
      {/* Header Area */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-6">
        <div>
          <h1 className="text-3xl font-black text-slate-900 tracking-tight">جدولة الصيانة الوقائية (PM) 📅</h1>
          <p className="text-slate-500 font-medium">إدارة خطط الصيانة الدورية المجدولة للأصول والمرافق.</p>
        </div>
        {isAdmin() && (
          <button 
            onClick={() => { setEditingPlan(null); setTasksInput(""); setShowModal(true); }}
            className="px-6 py-3 bg-blue-600 text-white font-black rounded-xl shadow-lg shadow-blue-500/20 hover:bg-blue-700 transition-all active:scale-95"
          >
            + إضافة خطة صيانة
          </button>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
        {plans.length === 0 ? (
          <div className="col-span-full py-20 text-center">
             <div className="w-20 h-20 bg-slate-50 flex items-center justify-center rounded-full mx-auto mb-6">
                <svg className="w-10 h-10 text-slate-300" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
             </div>
             <p className="text-slate-500 font-bold text-lg">لا توجد خطط صيانة مجدولة حالياً.</p>
          </div>
        ) : (
          plans.map(p => (
            <div key={p.id} className="bg-white rounded-3xl border border-slate-200 shadow-sm hover:shadow-xl transition-all group overflow-hidden">
               <div className="p-8 space-y-6">
                 <div className="flex justify-between items-start">
                    <div className="space-y-1">
                      <span className={`inline-flex px-3 py-1 rounded-lg text-[10px] font-black uppercase tracking-widest ${
                        p.is_active ? 'bg-emerald-50 text-emerald-600' : 'bg-red-50 text-red-600'
                      }`}>
                        {p.is_active ? "نشط" : "متوقف"}
                      </span>
                      <h3 className="text-xl font-black text-slate-900 group-hover:text-blue-600 transition-colors uppercase tracking-tight">{p.name}</h3>
                    </div>
                    {(isAdmin()) && (
                      <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button onClick={() => { setEditingPlan(p); setTasksInput(p.tasks?.join("\n") || ""); setShowModal(true); }} className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors">
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>
                        </button>
                        <button onClick={() => setDeleteTarget(p)} className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors">
                           <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                        </button>
                      </div>
                    )}
                 </div>

                 <p className="text-slate-500 text-sm font-medium leading-relaxed italic border-r-2 border-slate-100 pr-4">{p.description || "لا يوجد وصف لهذه الخطة"}</p>

                 <div className="bg-slate-50 p-4 rounded-2xl flex items-center justify-between">
                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">معدل التكرار:</span>
                    <span className="text-sm font-black text-slate-900 bg-white px-3 py-1 rounded-lg border border-slate-200">
                      {freqLabel(p.frequency_type, p.frequency_value)}
                    </span>
                 </div>

                 {p.tasks?.length > 0 && (
                   <div className="space-y-3 pt-4 border-t border-slate-50">
                      <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest block">المهام الأساسية:</span>
                      <div className="flex flex-col gap-2">
                        {p.tasks.slice(0, 3).map((t, i) => (
                          <div key={i} className="flex items-center gap-2 text-sm text-slate-700 font-bold">
                            <span className="w-1.5 h-1.5 bg-blue-500 rounded-full"></span>
                            {t}
                          </div>
                        ))}
                        {p.tasks.length > 3 && <span className="text-xs text-blue-500 font-black">+ {p.tasks.length - 3} مهام أخرى</span>}
                      </div>
                   </div>
                 )}
               </div>
               
               <div className="p-4 bg-slate-50 border-t border-slate-100 mt-auto">
                  <button className="w-full py-3 bg-white border border-slate-200 rounded-xl text-xs font-black text-slate-600 hover:text-blue-600 hover:border-blue-200 transition-all flex items-center justify-center gap-2">
                    عرض المواعيد القادمة
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M13 7l5 5m0 0l-5 5m5-5H6" /></svg>
                  </button>
               </div>
            </div>
          ))
        )}
      </div>

      {showModal && (
        <Modal
          title={editingPlan ? "تعديل خطة الصيانة" : "إنشاء خطة صيانة وقائية"}
          description="تساعد جداول الصيانة الوقائية في تقليل الأعطال المفاجئة وزيادة عمر الأصول."
          onCancel={() => setShowModal(false)}
          onConfirm={() => document.getElementById('pmForm').requestSubmit()}
          confirmText={editingPlan ? "حفظ التغييرات" : "حفظ واعتماد الخطة"}
          type="primary"
          maxWidth="max-w-lg"
        >
          <form id="pmForm" className="space-y-6 text-right mt-6" onSubmit={handleSave}>
             <div className="space-y-2">
                <label className="text-xs font-black text-slate-500 uppercase tracking-widest block mr-1">اسم الخطة (PM Name)</label>
                <input name="name" defaultValue={editingPlan?.name || ""} required placeholder="مثال: الفحص الشهري لأجهزة المعمل" className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-4 focus:ring-blue-500/10 outline-none font-bold text-slate-900" />
             </div>
             
             <div className="space-y-2">
                <label className="text-xs font-black text-slate-500 uppercase tracking-widest block mr-1">وصف موجز</label>
                <textarea name="description" defaultValue={editingPlan?.description || ""} rows="2" placeholder="أدخل تفاصيل إضافية للخطة..." className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-4 focus:ring-blue-500/10 outline-none font-bold text-slate-900 resize-none" />
             </div>

             <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                   <label className="text-xs font-black text-slate-500 uppercase tracking-widest block mr-1">نوع التكرار</label>
                   <select name="frequency_type" defaultValue={editingPlan?.frequency_type || "months"} className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-4 focus:ring-blue-500/10 outline-none font-bold text-slate-900 appearance-none bg-[url('data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIGZpbGw9Im5vbmUiIHZpZXdCb3g9IjAgMCAyNCAyNCIgc3Ryb2tlPSIjOWE5YmE3IiBzdHJva2Utd2lkdGg9IjIiPjxwYXRoIHN0cm9rZS1saW5lY2FwPSJyb3VuZCIgc3Ryb2tlLWpvaW5lcj0icm91bmQiIGQ9Ik0xOSA5bC03IDctNy03IiAvPjwvc3ZnPg==')] bg-no-repeat bg-[position:left_1rem_center] bg-[length:1.25rem]">
                      <option value="days">أيام (Days)</option>
                      <option value="weeks">أسابيع (Weeks)</option>
                      <option value="months">أشهر (Months)</option>
                      <option value="meter">قراءة عداد (Meter)</option>
                   </select>
                </div>
                <div className="space-y-2">
                   <label className="text-xs font-black text-slate-500 uppercase tracking-widest block mr-1">القيمة (Value)</label>
                   <input type="number" name="frequency_value" defaultValue={editingPlan?.frequency_value || 1} min="1" className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-4 focus:ring-blue-500/10 outline-none font-bold text-slate-900" />
                </div>
             </div>

             <div className="space-y-2">
                <label className="text-xs font-black text-slate-500 uppercase tracking-widest block mr-1">المهام التفصيلية (سطر لكل مهمة)</label>
                <textarea value={tasksInput} onChange={e => setTasksInput(e.target.value)} rows="3" placeholder="فحص الفلاتر&#10;تنظيف الأجهزة..." className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-4 focus:ring-blue-500/10 outline-none font-bold text-slate-900 resize-none" />
             </div>
          </form>
        </Modal>
      )}

      {/* Delete Confirmation Modal */}
      {deleteTarget && (
        <Modal
          title="تأكيد حذف الخطة"
          description={`هل أنت متأكد من حذف خطة الصيانة "${deleteTarget.name}" نهائياً؟ سيؤدي ذلك إلى إيقاف المواعيد المجدولة لها.`}
          onCancel={() => setDeleteTarget(null)}
          onConfirm={confirmDelete}
          confirmText={deleting ? "جاري الحذف..." : "حذف الخطة نهائياً"}
          type="danger"
        />
      )}
    </div>
  );
}
