import React, { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { api } from "../api/client";

function StatCard({ title, value, colorClass, icon }) {
  return (
    <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-100 dark:border-slate-800 shadow-sm flex items-center justify-between group animate-fade-up transition-colors duration-300">
      <div className="flex items-center gap-4">
        <div className={`w-12 h-12 rounded-2xl flex items-center justify-center ${colorClass} shadow-sm group-hover:scale-110 transition-transform`}>
          {icon}
        </div>
        <div className="text-right">
           <p className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest">{title}</p>
           <h3 className="text-3xl font-black text-slate-900 dark:text-white mt-0.5">{value}</h3>
        </div>
      </div>
    </div>
  );
}

function ManagementBoard({ title, subtitle, icon, path, iconColorClass }) {
  return (
    <Link to={path} className="group block">
      <div className="bg-white dark:bg-slate-900 p-10 rounded-[2.5rem] border border-slate-100 dark:border-slate-800 shadow-sm hover:shadow-2xl hover:shadow-blue-500/5 transition-all duration-500 text-center relative overflow-hidden">
        <div className={`w-20 h-20 rounded-full ${iconColorClass} dark:bg-slate-800/50 flex items-center justify-center mx-auto mb-8 shadow-inner`}>
           {icon}
        </div>
        <h3 className="text-2xl font-black text-slate-900 dark:text-white mb-4 group-hover:text-blue-600 transition-colors">{title}</h3>
        <p className="text-slate-400 dark:text-slate-500 text-sm font-medium leading-relaxed max-w-sm mx-auto">{subtitle}</p>
      </div>
    </Link>
  );
}

function ProgressBarRow({ label, value, color, percent }) {
  return (
    <div className="space-y-2">
      <div className="flex justify-between items-center text-[10px] font-black uppercase tracking-tight">
        <span className="text-slate-400 dark:text-slate-500">{label}</span>
        <span className="text-slate-900 dark:text-white">{percent}%</span>
      </div>
      <div className="h-2.5 w-full bg-slate-50 dark:bg-slate-800 rounded-full overflow-hidden">
        <div 
          className={`h-full rounded-full transition-all duration-1000 ${color}`} 
          style={{ width: `${percent}%` }}
        ></div>
      </div>
    </div>
  );
}

function AdminDashboard({ requestData = {} }) {
  const { isAdmin, isTech } = useAuth();
  const navigate = useNavigate();
  const kpis = requestData?.kpis || {};
  const recent = requestData?.recentRequests || [];

  return (
    <div className="space-y-10 animate-fade-in">
      
      {/* 🚀 Header */}
      <div className="flex items-center gap-5">
         <div className="h-1.5 w-14 bg-blue-600 rounded-full"></div>
         <h2 className="text-2xl font-black text-[#1e1b4b] dark:text-white tracking-tight">مركز إدارة النظام</h2>
      </div>

      {/* 🚀 Management Cards - Only show for Admins */}
      {isAdmin() && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          <ManagementBoard
            title="إدارة المستخدمين"
            subtitle="تحكم في حسابات الموظفين والمدراء والفنيين، قم بإضافة مستخدمين جدد وتعديل الصلاحيات."
            icon={<svg className="w-10 h-10 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"/></svg>}
            path="/settings/users"
            iconColorClass="bg-blue-50"
          />
          <ManagementBoard
            title="المعامل والأجهزة"
            subtitle="إدارة كافة الأقسام والمعامل التابعة للجامعة، تتبع الأجهزة المسجلة وحالة كل معمل."
            icon={<svg className="w-10 h-10 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z"/></svg>}
            path="/settings/labs"
            iconColorClass="bg-indigo-50"
          />
        </div>
      )}

      {/* 🚀 Stats Row */}
      <div className={`grid grid-cols-1 sm:grid-cols-2 ${isAdmin() ? 'lg:grid-cols-4' : 'lg:grid-cols-3'} gap-6`}>
        <StatCard title="إجمالي طلبات الصيانة" value={kpis.total || 0} colorClass="bg-emerald-50 text-emerald-600" icon={<svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/></svg>} />
        <StatCard title="طلبات بانتظار البدء" value={kpis.open || 0} colorClass="bg-orange-50 text-orange-600" icon={<svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>} />
        <StatCard title="مهام تم إنجازها" value={kpis.done || 0} colorClass="bg-blue-50 text-blue-600" icon={<svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M5 13l4 4L19 7"/></svg>} />
        {isAdmin() && (
          <StatCard title="إجمالي المستخدمين" value={kpis.userCount || 0} colorClass="bg-indigo-50 text-indigo-600" icon={<svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"/></svg>} />
        )}
      </div>

      {/* 🚀 Bottom Row */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        
        {/* Table Column */}
        <div className="lg:col-span-8">
           <div className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-[2.5rem] shadow-sm overflow-hidden h-full transition-colors">
              <div className="px-10 py-8 border-b border-slate-50 dark:border-slate-800 flex items-center justify-between">
                <h3 className="text-xl font-black text-[#1e1b4b] dark:text-white">{isTech() ? "قائمة طلبات الصيانة" : "آخر طلبات الصيانة الواردة"}</h3>
                {!isTech() && <Link to="/requests" className="px-5 py-2 bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-blue-100 transition-colors">سجل الطلبات</Link>}
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-right">
                  <thead className="bg-slate-50/20 dark:bg-slate-800/50 text-slate-400">
                    <tr>
                      <th className="px-10 py-5 text-[10px] font-black uppercase tracking-widest">الكود</th>
                      <th className="px-6 py-5 text-[10px] font-black uppercase tracking-widest">الموضوع</th>
                      <th className="px-6 py-5 text-[10px] font-black uppercase tracking-widest">الحالة</th>
                      <th className="px-10 py-5 text-[10px] font-black uppercase tracking-widest">التاريخ</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50 dark:divide-slate-800">
                    {recent.length === 0 ? (
                      <tr><td colSpan="4" className="px-10 py-12 text-center text-slate-300 dark:text-slate-600 font-bold italic">لا توجد طلبات حديثة حالياً</td></tr>
                    ) : (
                      recent.map(r => (
                        <tr 
                          key={r.id} 
                          onClick={() => navigate(`/track/${r.request_code}`)}
                          className="hover:bg-slate-50/50 dark:hover:bg-slate-800/50 transition-colors cursor-pointer group/row"
                        >
                          <td className="px-10 py-5 font-bold text-blue-600 dark:text-blue-400 text-sm tracking-tight group-hover/row:underline">#{r.request_code}</td>
                          <td className="px-6 py-5 font-bold text-slate-700 dark:text-slate-300 text-sm">{r.title}</td>
                          <td className="px-6 py-5">
                            <span className={`inline-flex px-4 py-1.5 rounded-full font-black text-[9px] ${
                                r.status === 'Done' ? 'bg-emerald-50 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400' :
                                r.status === 'Pending' ? 'bg-orange-50 dark:bg-orange-900/30 text-orange-600 dark:text-orange-400' : 
                                'bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400'
                              }`}>
                              {r.status === 'Done' ? 'مكتملة' : r.status === 'Pending' ? 'بانتظار البدء' : 'مفتوحة'}
                            </span>
                          </td>
                          <td className="px-10 py-5 text-slate-400 dark:text-slate-500 text-[11px] font-bold">{r.requested_at ? new Date(r.requested_at).toLocaleDateString('ar-EG') : "—"}</td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
           </div>
        </div>

        {/* Stats Column */}
        <div className="lg:col-span-4">
           <div className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-[2.5rem] shadow-sm p-10 h-full transition-colors">
              <h3 className="text-xl font-black text-[#1e1b4b] dark:text-white mb-10">إحصائيات المهام</h3>
              <div className="space-y-6">
                <ProgressBarRow label="مكتملة" percent={requestData?.breakdown?.completed?.percent || 0} color="bg-blue-600" />
                <ProgressBarRow label="قيد التنفيذ" percent={requestData?.breakdown?.inProgress?.percent || 0} color="bg-orange-500" />
                <ProgressBarRow label="متأخرة" percent={requestData?.breakdown?.delayed?.percent || 0} color="bg-red-500" />
                <ProgressBarRow label="مجدولة" percent={requestData?.breakdown?.scheduled?.percent || 0} color="bg-emerald-500" />
                <ProgressBarRow label="مغلقة" percent={requestData?.breakdown?.closed?.percent || 0} color="bg-indigo-400" />
              </div>
           </div>
        </div>

      </div>
    </div>
  );
}

// User Dashboard Simplified to match theme
function UserDashboard({ kpis = {}, recent = [] }) {
  const navigate = useNavigate();

  const getStatusInfo = (status) => {
    switch (status) {
      case 'Done': return { text: 'مكتمل ✅', class: 'bg-emerald-50 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400' };
      case 'In Progress': return { text: 'قيد التنفيذ ⚙️', class: 'bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400' };
      case 'Pending': return { text: 'معلق ⏳', class: 'bg-amber-50 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400' };
      case 'New': return { text: 'جديد 🆕', class: 'bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400' };
      default: return { text: status || 'غير معروف', class: 'bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400' };
    }
  };

  return (
    <div className="space-y-10 animate-fade-in">
       <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          <StatCard title="طلباتي الإجمالية" value={kpis.total || 0} colorClass="bg-blue-50 text-blue-600" icon={<svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M12 4v16m8-8H4" /></svg>} />
          <StatCard title="بانتظار المراجعة" value={kpis.open || 0} colorClass="bg-orange-50 text-orange-600" icon={<svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>} />
          <StatCard title="تم الإصلاح بنجاح" value={kpis.done || 0} colorClass="bg-emerald-50 text-emerald-600" icon={<svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M5 13l4 4L19 7" /></svg>} />
       </div>
       <div className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-[2.5rem] shadow-sm overflow-hidden transition-colors">
          <div className="px-10 py-8 border-b border-slate-50 dark:border-slate-800 flex items-center justify-between">
            <h3 className="text-xl font-black text-[#1e1b4b] dark:text-white">سجل طلباتي</h3>
            <Link to="/request/new" className="px-8 py-3 bg-blue-600 text-white rounded-2xl text-xs font-black shadow-xl shadow-blue-500/20 hover:bg-blue-700 transition-all">ارسل طلب جديد</Link>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-right">
              <thead className="bg-slate-50/20 dark:bg-slate-800/50 text-slate-400 dark:text-slate-500">
                <tr>
                  <th className="px-10 py-5 text-[10px] font-black uppercase tracking-widest">الكود</th>
                  <th className="px-6 py-5 text-[10px] font-black uppercase tracking-widest">الموضوع</th>
                  <th className="px-6 py-5 text-[10px] font-black uppercase tracking-widest text-center">الحالة</th>
                  <th className="px-10 py-5 text-[10px] font-black uppercase tracking-widest text-center">إجراء</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50 dark:divide-slate-800">
                {recent.length === 0 ? (
                  <tr><td colSpan="4" className="px-10 py-12 text-center text-slate-300 dark:text-slate-600 font-bold italic">لا توجد طلبات بعد</td></tr>
                ) : (
                  recent.map(r => {
                    const status = getStatusInfo(r.status);
                    return (
                      <tr 
                        key={r.id} 
                        onClick={() => navigate(`/track/${r.request_code}`)}
                        className="hover:bg-slate-50/50 dark:hover:bg-slate-800/50 transition-colors cursor-pointer group"
                      >
                        <td className="px-10 py-5 font-bold text-blue-600 dark:text-blue-400 text-sm tracking-tight group-hover:underline">#{r.request_code}</td>
                        <td className="px-6 py-5 font-bold text-slate-700 dark:text-slate-300 text-sm">{r.title}</td>
                        <td className="px-6 py-5 text-center">
                           <span className={`inline-flex px-4 py-1.5 rounded-full font-black text-[9px] ${status.class}`}>
                             {status.text}
                           </span>
                        </td>
                        <td className="px-10 py-5 text-center">
                          <span className="text-blue-600 dark:text-blue-400 font-black text-[10px] opacity-50 group-hover:opacity-100 transition-opacity">عرض التفاصيل ←</span>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
       </div>
    </div>
  );
}

export default function DashboardPage() {
  const { user, isAdmin, isTech, isUser } = useAuth();
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    let mounted = true;
    api("/api/dashboard/stats").then(r => {
      if (!r.ok) throw new Error("فشل الاتصال بالسيرفر");
      return r.json();
    }).then(d => {
      if (mounted) setData(d);
    }).catch(err => {
      if (mounted) setError(err.message);
    });
    return () => { mounted = false; };
  }, []);

  const is_Admin = typeof isAdmin === 'function' ? isAdmin() : false;
  const is_Tech = typeof isTech === 'function' ? isTech() : false;

  if (error) return <div className="py-20 text-center text-red-500 font-black">{error}</div>;
  if (!data) return <div className="py-20 text-center text-slate-400 font-bold animate-pulse">جاري التحميل...</div>;

  return (
    <div className="pb-20">
      {is_Admin || is_Tech ? (
        <AdminDashboard requestData={data} />
      ) : (
        <UserDashboard kpis={data.kpis} recent={data.recentRequests} />
      )}
    </div>
  );
}
