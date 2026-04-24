import React, { useEffect, useState } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import PageCard from "../components/PageCard";
import { api } from "../api/client";
import { useAuth } from "../context/AuthContext";
import Modal from "../components/Modal";

export default function TrackingPage() {
  const { code } = useParams();
  const navigate = useNavigate();
  const { isAdmin, isTech } = useAuth();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showStatusModal, setShowStatusModal] = useState(false);
  const [newStatus, setNewStatus] = useState("");

  const fetchData = async () => {
    try {
      const res = await api(`/api/maintenance-requests/track/${code}`);
      if (!res.ok) throw new Error("لم يتم العثور على الطلب");
      const json = await res.json();
      // Flatten: merge request fields + events into one object for easier access
      setData({ ...json.request, events: json.events || [] });
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [code]);

  const handleUpdateStatus = async () => {
    try {
      const res = await api(`/api/maintenance-requests/${data.id}/status`, {
        method: "PUT",
        body: JSON.stringify({ status: newStatus })
      });
      if (res.ok) {
        setShowStatusModal(false);
        fetchData();
      }
    } catch (err) {
      alert("فشل تحديث الحالة");
    }
  };

  if (loading) return (
    <div className="flex flex-col items-center justify-center py-20 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl animate-pulse transition-colors">
      <div className="w-12 h-12 bg-slate-100 dark:bg-slate-800 rounded-full mb-4"></div>
      <div className="h-4 w-48 bg-slate-100 dark:bg-slate-800 rounded mb-2"></div>
      <div className="h-3 w-32 bg-slate-50 dark:bg-slate-800 rounded"></div>
    </div>
  );

  if (error) return (
    <div className="max-w-2xl mx-auto py-20 text-center">
      <div className="w-20 h-20 bg-red-50 dark:bg-red-900/30 text-red-500 rounded-full flex items-center justify-center mx-auto mb-6">
        <svg className="w-10 h-10" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>
      </div>
      <h2 className="text-2xl font-black text-slate-900 dark:text-white mb-2">عذراً، الطلب غير موجود</h2>
      <p className="text-slate-500 dark:text-slate-400 mb-8">الكود الذي أدخلته غير صحيح أو انتهت صلاحيته.</p>
      <Link to="/track" className="px-8 py-3 bg-blue-600 text-white font-bold rounded-xl shadow-lg shadow-blue-500/20 hover:bg-blue-700 transition-all">العودة لمركز التتبع</Link>
    </div>
  );

  return (
    <div className="max-w-5xl mx-auto space-y-8 animate-fade-up">
      
      {/* Header Section */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-6 bg-white dark:bg-slate-900 p-8 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm relative overflow-hidden transition-colors">
        <div className="absolute top-0 right-0 w-32 h-32 bg-blue-50 dark:bg-blue-900/20 rounded-full blur-3xl opacity-50 -mr-16 -mt-16"></div>
        <div className="relative z-10 space-y-2">
          <div className="inline-flex items-center gap-2 px-3 py-1 bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 rounded-lg text-xs font-black uppercase tracking-widest">
            وضع التتبع المباشر
          </div>
          <h1 className="text-3xl font-black text-slate-900 dark:text-white tracking-tight">متابعة الطلب <span className="text-blue-600 dark:text-blue-400">#{data.request_code}</span></h1>
          <p className="text-slate-500 dark:text-slate-400 font-medium">تم تسجيل الطلب في {new Date(data.requested_at || data.created_at).toLocaleDateString('ar-EG', { day: 'numeric', month: 'long', year: 'numeric' })}</p>
        </div>
        <div className="relative z-10 flex gap-3">
          {(isAdmin() || isTech()) && (
            <button 
              onClick={() => {setNewStatus(data.status); setShowStatusModal(true);}}
              className="px-6 py-3 bg-blue-600 text-white font-bold rounded-xl shadow-lg shadow-blue-500/20 hover:bg-blue-700 transition-all active:scale-95 flex items-center gap-2"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>
              تحديث الحالة
            </button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Left Column: Details & Timeline */}
        <div className="lg:col-span-2 space-y-8">
          
          <PageCard title="تفاصيل الطلب">
            <div className="space-y-6">
              <div className="grid grid-cols-2 gap-8">
                <div className="space-y-1">
                  <span className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest block">الموضوع</span>
                  <p className="text-lg font-bold text-slate-800 dark:text-slate-200">{data.title || "بدون عنوان"}</p>
                </div>
                <div className="space-y-1">
                  <span className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest block">الأصل / الجهاز</span>
                  <p className="text-lg font-bold text-slate-800 dark:text-slate-200">{data.asset_name || "جهاز غير محدد"}</p>
                </div>
              </div>
              <div className="space-y-2 p-6 bg-slate-50 dark:bg-slate-800/50 rounded-2xl border border-slate-100 dark:border-slate-800">
                <span className="text-[10px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-widest block">وصف المشكلة</span>
                <p className="text-slate-700 dark:text-slate-300 leading-relaxed font-medium">{data.description}</p>
              </div>
              {data.image_url && (
                <div className="rounded-2xl overflow-hidden border border-slate-200">
                  <img src={data.image_url} alt="عطل" className="w-full h-auto object-cover hover:scale-105 transition-transform duration-500" />
                </div>
              )}
            </div>
          </PageCard>

          <PageCard title="سجل تتبع الحالة">
            <div className="relative pt-4 pb-4">
              {/* Vertical line connector */}
              <div className="absolute top-0 bottom-0 right-[25px] w-0.5 bg-slate-100 dark:bg-slate-800"></div>
              
              <div className="space-y-10 relative">
                {data.events?.map((evt, index) => (
                  <div key={index} className="flex flex-row-reverse items-start gap-8 group">
                    <div className="relative z-10 flex flex-col items-center">
                      <div className={`w-14 h-14 rounded-2xl flex items-center justify-center shadow-lg transition-transform group-hover:scale-110 ${
                        index === 0 ? 'bg-blue-600 text-white shadow-blue-500/30' : 'bg-white dark:bg-slate-800 border-2 border-slate-200 dark:border-slate-700 text-slate-400'
                      }`}>
                        {index === 0 ? (
                           <svg className="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>
                        ) : (
                           <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" /></svg>
                        )}
                      </div>
                    </div>
                    <div className="flex-1 text-right pt-2">
                       <h4 className={`text-lg font-black ${index === 0 ? 'text-blue-600 dark:text-blue-400' : 'text-slate-800 dark:text-slate-200'}`}>
                         {evt.event_type === 'status_change' ? evt.message : 
                          evt.event_type === 'comment' ? 'تعليق جديد' : 
                          evt.event_type === 'assignment' ? evt.message : 'تحديث على الطلب'}
                       </h4>
                       <p className="text-slate-500 dark:text-slate-400 text-sm mt-1 font-medium">{evt.message || "لا يوجد ملاحظات إضافية"}</p>
                       {evt.user_name && <p className="text-xs text-blue-600 dark:text-blue-400 font-bold mt-1">بواسطة: {evt.user_name}</p>}
                       <span className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase inline-block mt-3 bg-slate-50 dark:bg-slate-800 px-3 py-1 rounded-full border border-slate-100 dark:border-slate-700">
                         {new Date(evt.created_at).toLocaleString('ar-EG', { hour: '2-digit', minute: '2-digit', day: 'numeric', month: 'short' })}
                       </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </PageCard>
        </div>

        {/* Right Column: Status & Technician */}
        <div className="space-y-8">
          
          <div className="bg-white dark:bg-slate-900 p-8 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-6 transition-colors">
            <div className="text-center">
              <span className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest block mb-4">الحالة الحالية</span>
              <div className={`inline-flex px-8 py-3 rounded-2xl text-xl font-black ${
                data.status === 'Done' ? 'bg-emerald-50 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400' : 
                data.status === 'Pending' ? 'bg-amber-50 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400' : 'bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400'
              }`}>
                {data.status === 'Done' ? 'مكتمل ✅' : data.status === 'Pending' ? 'معلق ⏳' : 'قيد المعالجة 🛡️'}
              </div>
            </div>
            
            <div className="pt-6 border-t border-slate-100 dark:border-slate-800 space-y-4">
               {/* Removed Assigned Technician block */}
               
               <div>
                  <span className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest block mb-2 text-right">الأولوية</span>
                  <div className="flex items-center justify-end gap-3 p-4 bg-slate-50 dark:bg-slate-800 rounded-2xl">
                     <span className={`text-sm font-black ${data.priority === 'Critical' ? 'text-red-600 dark:text-red-400' : 'text-slate-700 dark:text-slate-300'}`}>
                       {data.priority || "Medium"}
                     </span>
                     <div className={`w-3 h-3 rounded-full ${data.priority === 'Critical' ? 'bg-red-500 animate-pulse' : 'bg-blue-500'}`}></div>
                  </div>
               </div>
            </div>
          </div>


        </div>
      </div>

      {showStatusModal && (
        <Modal
          title="تحديث حالة طلب الصيانة"
          description="يرجى اختيار الحالة الجديدة التي وصل إليها الطلب حالياً."
          onCancel={() => setShowStatusModal(false)}
          onConfirm={handleUpdateStatus}
          confirmText="حفظ الحالة"
          type="primary"
        >
          <div className="space-y-4 mt-6">
            <label className="text-xs font-black text-slate-500 dark:text-slate-400 uppercase tracking-widest block mr-1">الحالة المستهدفة</label>
            <select 
              value={newStatus} 
              onChange={e => setNewStatus(e.target.value)}
              className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-4 focus:ring-blue-500/10 outline-none font-bold text-slate-900 dark:text-white appearance-none transition-colors"
            >
              <option value="Pending">Pending (معلق)</option>
              <option value="In Progress">In Progress (قيد التنفيذ)</option>
              <option value="Done">Done (مكتمل)</option>
            </select>
          </div>
        </Modal>
      )}
    </div>
  );
}
