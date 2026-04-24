import React, { useEffect, useState } from "react";
import { Link, Navigate } from "react-router-dom";
import PageCard from "../components/PageCard";
import Modal from "../components/Modal";
import { api } from "../api/client";
import { useAuth } from "../context/AuthContext";

export default function RequestsPage() {
  const { isAdmin, isTech } = useAuth();
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleting, setDeleting] = useState(false);

  const fetchRequests = async () => {
    try {
      const res = await api("/api/maintenance-requests");
      const json = await res.json();
      setRequests(json);
    } catch (err) {
      setError("فشل تحميل قائمة الطلبات.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRequests();
  }, []);

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      const res = await api(`/api/maintenance-requests/${deleteTarget}`, { method: "DELETE" });
      if (!res.ok) throw new Error("فشل في حذف الطلب.");
      setRequests(prev => prev.filter(r => r.id !== deleteTarget));
    } catch (err) {
      alert(err.message);
    } finally {
      setDeleting(false);
      setDeleteTarget(null);
    }
  };

  if (loading) return (
    <div className="flex flex-col items-center justify-center py-20 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl transition-colors">
      <div className="w-10 h-10 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
      <p className="mt-4 text-slate-500 dark:text-slate-400 font-bold">جاري تحميل سجل الطلبات...</p>
    </div>
  );

  if (error) return <PageCard title="سجل الطلبات"><p className="text-red-500 font-bold text-center py-10">{error}</p></PageCard>;

  return (
    <div className="space-y-6 animate-fade-up">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-black text-slate-900 dark:text-white tracking-tight">سجل طلبات الصيانة 📋</h1>
          <p className="text-slate-500 dark:text-slate-400 font-medium mt-1">عرض ومتابعة كافة الطلبات المسجلة في النظام.</p>
        </div>
        {!isTech() && (
          <Link to="/request/new" className="px-6 py-3 bg-blue-600 text-white font-bold rounded-xl shadow-lg shadow-blue-500/20 hover:bg-blue-700 transition-all active:scale-95">
            + طلب جديد
          </Link>
        )}
      </div>

      <PageCard>
        {requests.length === 0 ? (
          <div className="text-center py-20">
            <div className="w-20 h-20 bg-slate-50 dark:bg-slate-800 rounded-full flex items-center justify-center mx-auto mb-6">
              <svg className="w-10 h-10 text-slate-300 dark:text-slate-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" /></svg>
            </div>
            <p className="text-slate-500 dark:text-slate-400 font-bold text-lg">لا توجد طلبات مسجلة حالياً.</p>
            <p className="text-slate-400 dark:text-slate-500 text-sm mt-1">ابدأ بإضافة أول طلب صيانة من خلال الزر أعلاه.</p>
          </div>
        ) : (
          <div className="overflow-x-auto -mx-6 sm:-mx-8">
            <table className="w-full text-right border-collapse">
              <thead>
                <tr className="bg-slate-50/50 dark:bg-slate-800/50 border-y border-slate-100 dark:border-slate-800">
                  <th className="px-8 py-5 text-xs font-black text-slate-500 dark:text-slate-400 uppercase tracking-widest whitespace-nowrap">الكود</th>
                  <th className="px-6 py-5 text-xs font-black text-slate-500 dark:text-slate-400 uppercase tracking-widest whitespace-nowrap">العنوان / الأصل</th>
                  <th className="px-6 py-5 text-xs font-black text-slate-500 dark:text-slate-400 uppercase tracking-widest whitespace-nowrap">الموقع</th>
                  <th className="px-6 py-5 text-xs font-black text-slate-500 dark:text-slate-400 uppercase tracking-widest whitespace-nowrap">الوصف</th>
                  <th className="px-6 py-5 text-xs font-black text-slate-500 dark:text-slate-400 uppercase tracking-widest text-center">الأولوية</th>
                  <th className="px-6 py-5 text-xs font-black text-slate-500 dark:text-slate-400 uppercase tracking-widest text-center">الحالة</th>
                  {isAdmin() && <th className="px-8 py-5 text-xs font-black text-slate-500 dark:text-slate-400 uppercase tracking-widest text-center">إجراءات</th>}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {requests.map(r => (
                  <tr key={r.id} className="hover:bg-slate-50/80 dark:hover:bg-slate-800/50 transition-colors group">
                    <td className="px-8 py-5">
                      <Link to={`/track/${r.request_code}`} className="inline-flex items-center gap-2 group/code">
                        <span className="font-black text-blue-600 border-b-2 border-transparent group-hover/code:border-blue-600 transition-all">
                          #{r.request_code}
                        </span>
                        <svg className="w-3 h-3 text-blue-400 opacity-0 group-hover/code:opacity-100 transition-opacity" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" /></svg>
                      </Link>
                    </td>
                    <td className="px-6 py-5">
                      <div className="flex flex-col">
                        <span className="font-bold text-slate-800 dark:text-slate-200 text-sm">{r.title || "بدون عنوان"}</span>
                        <span className="text-xs text-slate-500 dark:text-slate-400 mt-1 font-medium">{r.asset_name || "جهاز غير محدد"}</span>
                      </div>
                    </td>
                    <td className="px-6 py-5">
                       <span className="text-slate-700 dark:text-slate-300 text-sm font-bold">{r.location || "غير محدد"}</span>
                    </td>
                    <td className="px-6 py-5">
                       <span className="text-slate-500 dark:text-slate-400 text-sm max-w-[150px] block truncate font-medium" title={r.description}>
                         {r.description}
                       </span>
                    </td>
                    <td className="px-6 py-5 text-center">
                      <span className={`inline-flex px-3 py-1 rounded-lg text-[10px] font-black uppercase tracking-tighter ${
                        r.priority === 'Critical' ? 'bg-red-50 dark:bg-red-900/30 text-red-600 dark:text-red-400' :
                        r.priority === 'High' ? 'bg-orange-50 dark:bg-orange-900/30 text-orange-600 dark:text-orange-400' :
                        r.priority === 'Medium' ? 'bg-amber-50 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400' :
                        'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400'
                      }`}>
                        {r.priority === 'Critical' ? 'حرجة 🔴' : r.priority === 'High' ? 'عالية 🟠' : r.priority === 'Medium' ? 'متوسطة 🟡' : 'منخفضة 🟢'}
                      </span>
                    </td>
                    <td className="px-6 py-5 text-center">
                      <span className={`inline-flex px-3 py-1 rounded-lg text-[11px] font-bold ${
                        r.status === 'Done' ? 'bg-emerald-50 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400' :
                        r.status === 'Pending' ? 'bg-amber-50 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400' :
                        r.status === 'In Progress' ? 'bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400' :
                        'bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400'
                      }`}>
                        {r.status === 'Done' ? 'مكتمل ✅' : r.status === 'Pending' ? 'معلق ⏳' : r.status === 'In Progress' ? 'قيد التنفيذ ⚙️' : 'جديد 🆕'}
                      </span>
                    </td>
                    {isAdmin() && (
                      <td className="px-8 py-5 text-center">
                        <button 
                          className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all"
                          onClick={() => setDeleteTarget(r.id)}
                          title="حذف الطلب"
                        >
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                        </button>
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </PageCard>

      {deleteTarget && (
        <Modal
          title="تأكيد حذف الطلب"
          description="سيتم حذف هذا الطلب وكافة سجلات التتبع المرتبطة به نهائياً. هل أنت متأكد؟"
          onCancel={() => setDeleteTarget(null)}
          onConfirm={handleDelete}
          confirmText={deleting ? "جاري الحذف..." : "حذف الطلب نهائياً"}
        />
      )}
    </div>
  );
}
