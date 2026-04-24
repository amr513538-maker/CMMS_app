import React, { useEffect, useState } from "react";
import PageCard from "../components/PageCard";
import { api } from "../api/client";

export default function ReportsPage() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [filters, setFilters] = useState({ start: "", end: "", priority: "", status: "" });

  const fetchReport = async () => {
    setLoading(true);
    try {
      const q = new URLSearchParams(filters).toString();
      const res = await api(`/api/reports?${q}`);
      setData(await res.json());
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchReport(); }, []);

  return (
    <div className="space-y-8 animate-fade-up">
      
      {/* Header */}
      <div className="print:hidden">
        <h1 className="text-3xl font-black text-slate-900 dark:text-white tracking-tight">تقارير الصيانة والتحليلات 📊</h1>
        <p className="text-slate-500 dark:text-slate-400 font-medium mt-1">استخراج البيانات، تتبع الكفاءة، وتحليل سجلات الصيانة الدورية.</p>
      </div>

      {/* Filter Section */}
      <div className="print:hidden">
        <PageCard>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6 items-end">
          <div className="space-y-2">
            <label className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest block mr-1">من تاريخ</label>
            <input type="date" className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-4 focus:ring-blue-500/10 outline-none font-bold text-slate-700 dark:text-slate-200" value={filters.start} onChange={e => setFilters({...filters, start: e.target.value})} />
          </div>
          <div className="space-y-2">
            <label className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest block mr-1">إلى تاريخ</label>
            <input type="date" className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-4 focus:ring-blue-500/10 outline-none font-bold text-slate-700 dark:text-slate-200" value={filters.end} onChange={e => setFilters({...filters, end: e.target.value})} />
          </div>
          <div className="space-y-2">
            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mr-1">الأولوية</label>
            <select className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-4 focus:ring-blue-500/10 outline-none font-bold text-slate-700 appearance-none bg-[url('data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIGZpbGw9Im5vbmUiIHZpZXdCb3g9IjAgMCAyNCAyNCIgc3Ryb2tlPSIjOWE5YmE3IiBzdHJva2Utd2lkdGg9IjIiPjxwYXRoIHN0cm9rZS1saW5lY2FwPSJyb3VuZCIgc3Ryb2tlLWpvaW5lcj0icm91bmQiIGQ9Ik0xOSA5bC03IDctNy03IiAvPjwvc3ZnPg==')] bg-no-repeat bg-[position:left_1rem_center] bg-[length:1.25rem]" value={filters.priority} onChange={e => setFilters({...filters, priority: e.target.value})}>
              <option value="">كل الأولويات</option>
              <option value="Critical">Critical</option>
              <option value="High">High</option>
              <option value="Medium">Medium</option>
            </select>
          </div>
          <button onClick={fetchReport} className="w-full py-3.5 bg-blue-600 text-white font-black rounded-xl shadow-lg shadow-blue-500/20 hover:bg-blue-700 transition-all active:scale-95">تحديث التقرير</button>
        </div>
      </PageCard>
      </div>

      {loading ? (
        <div className="flex flex-col items-center justify-center py-20 animate-pulse">
           <div className="w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
        </div>
      ) : data && (
        <div className="space-y-8 animate-fade-up">
          
          {/* Quick Metrics */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 print:hidden">
            <div className="bg-white dark:bg-slate-900 p-8 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm text-center space-y-2 transition-colors">
               <span className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest block">إجمالي السجلات</span>
               <h3 className="text-4xl font-black text-slate-900 dark:text-white leading-none">{data.summary.total}</h3>
            </div>
            <div className="bg-white dark:bg-slate-900 p-8 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm text-center space-y-2 transition-colors">
               <span className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest block">معدل الإنجاز</span>
               <h3 className="text-4xl font-black text-emerald-600 dark:text-emerald-400 leading-none">
                 {data.summary.total > 0 ? Math.round(((data.summary.statuses.Done || 0) / data.summary.total) * 100) : 0}%
               </h3>
            </div>
            <div className="bg-white dark:bg-slate-900 p-8 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm text-center space-y-2 transition-colors">
               <span className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest block">الأولوية الحرجة</span>
               <h3 className="text-4xl font-black text-red-600 dark:text-red-400 leading-none">{data.summary.priorities.Critical || 0}</h3>
            </div>
          </div>

          {/* Table Details */}
          <div className="print:block print:m-0 print:p-0">
            <PageCard title="تفاصيل السجلات المستخرجة">
               <div className="overflow-x-auto -mx-6 sm:-mx-8">
                 <table className="w-full text-right print:text-sm">
                   <thead>
                     <tr className="bg-slate-50/80 dark:bg-slate-800/50 border-y border-slate-100 dark:border-slate-800 print:bg-transparent print:border-b-2 print:border-black">
                       <th className="px-8 py-5 text-xs font-black text-slate-500 dark:text-slate-400 uppercase tracking-widest print:text-black">الكود</th>
                       <th className="px-6 py-5 text-xs font-black text-slate-500 dark:text-slate-400 uppercase tracking-widest print:text-black">العنوان</th>
                       <th className="px-6 py-5 text-xs font-black text-slate-500 dark:text-slate-400 uppercase tracking-widest print:text-black">المعمل</th>
                       <th className="px-6 py-5 text-xs font-black text-slate-500 dark:text-slate-400 uppercase tracking-widest print:text-black">الأولوية</th>
                       <th className="px-6 py-5 text-xs font-black text-slate-500 dark:text-slate-400 uppercase tracking-widest print:text-black">الحالة</th>
                       <th className="px-6 py-5 text-xs font-black text-slate-500 dark:text-slate-400 uppercase tracking-widest print:text-black">التاريخ</th>
                       <th className="px-8 py-5 text-xs font-black text-slate-500 dark:text-slate-400 uppercase tracking-widest print:text-black">الفني</th>
                     </tr>
                   </thead>
                   <tbody className="divide-y divide-slate-100 dark:divide-slate-800 print:divide-black/20">
                     {data.details.length === 0 ? (
                       <tr><td colSpan="7" className="text-center py-20 text-slate-400 dark:text-slate-500 font-bold">لا توجد نتائج مطابقة للفلاتر</td></tr>
                     ) : (
                       data.details.map(r => (
                         <tr key={r.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                           <td className="px-8 py-5 font-black text-blue-600 dark:text-blue-400 text-sm print:text-black">#{r.request_code}</td>
                           <td className="px-6 py-5 font-bold text-slate-800 dark:text-slate-200 text-sm">{r.title || "—"}</td>
                           <td className="px-6 py-5 text-slate-500 dark:text-slate-400 font-medium text-sm print:text-black">{r.lab_name || "—"}</td>
                           <td className="px-6 py-5">
                              <span className="inline-flex px-3 py-1 rounded-lg text-[10px] font-black uppercase tracking-tighter bg-slate-50 dark:bg-slate-800 text-slate-500 dark:text-slate-400 border border-slate-100 dark:border-slate-700 print:border-none print:bg-transparent print:p-0">
                                {r.priority}
                              </span>
                           </td>
                           <td className="px-6 py-5">
                              <span className={`inline-flex px-3 py-1 rounded-lg text-xs font-bold print:bg-transparent print:p-0 print:text-black ${
                                r.status === 'Done' ? 'bg-emerald-50 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400' : 'bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400'
                              }`}>
                                {r.status}
                              </span>
                           </td>
                           <td className="px-6 py-5 text-slate-400 dark:text-slate-500 text-xs font-bold uppercase print:text-black">{r.requested_at?.split("T")[0]}</td>
                           <td className="px-8 py-5 text-slate-600 dark:text-slate-300 text-sm font-bold print:text-black">{r.technician || "—"}</td>
                         </tr>
                       ))
                     )}
                   </tbody>
                 </table>
               </div>
            </PageCard>
          </div>
        </div>
      )}
    </div>
  );
}
