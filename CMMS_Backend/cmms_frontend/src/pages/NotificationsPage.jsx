import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import PageCard from "../components/PageCard";
import { api } from "../api/client";

export default function NotificationsPage() {
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  const fetchNotifs = async () => {
    try {
      const res = await api("/api/notifications");
      setNotifications(await res.json());
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchNotifs();
  }, []);

  const handleNotificationClick = async (n) => {
    if (!n.is_read) {
      await api(`/api/notifications/${n.id}/read`, { method: "PUT" });
      fetchNotifs();
    }
    if (n.link) {
      navigate(n.link);
    }
  };

  const markAllRead = async () => {
    await api("/api/notifications/read-all", { method: "PUT" });
    fetchNotifs();
  };

  if (loading && notifications.length === 0) return (
    <div className="flex flex-col items-center justify-center py-20 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl animate-pulse transition-colors">
       <div className="w-10 h-10 bg-slate-100 dark:bg-slate-800 rounded-full mb-4"></div>
       <div className="h-4 w-48 bg-slate-100 dark:bg-slate-800 rounded"></div>
    </div>
  );

  return (
    <div className="max-w-3xl mx-auto space-y-8 animate-fade-up">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-6">
        <div>
          <h1 className="text-3xl font-black text-slate-900 dark:text-white tracking-tight">مركز التنبيهات 🔔</h1>
          <p className="text-slate-500 dark:text-slate-400 font-medium mt-1">ابقَ على اطلاع بأحدث التغييرات في طلبات الصيانة الخاصة بك.</p>
        </div>
        <button 
          onClick={markAllRead}
          className="px-6 py-3 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 font-bold rounded-xl hover:bg-slate-50 dark:hover:bg-slate-700 transition-all active:scale-95 text-sm"
        >
          تحديد الكل كمقروء
        </button>
      </div>

      <PageCard>
        {notifications.length === 0 ? (
          <div className="text-center py-20">
             <div className="w-20 h-20 bg-slate-50 dark:bg-slate-800 rounded-full flex items-center justify-center mx-auto mb-6">
               <svg className="w-10 h-10 text-slate-300 dark:text-slate-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" /></svg>
             </div>
             <p className="text-slate-500 dark:text-slate-400 font-bold text-lg">لا توجد تنبيهات جديدة.</p>
             <p className="text-slate-400 dark:text-slate-500 text-sm mt-1">ستقوم المنظومة بإخطارك عند حدوث أي تحديثات.</p>
          </div>
        ) : (
          <div className="divide-y divide-slate-100 dark:divide-slate-800">
            {notifications.map(n => (
              <div 
                key={n.id} 
                className={`py-6 px-4 -mx-4 sm:-mx-8 group hover:bg-slate-50/50 dark:hover:bg-slate-800/50 transition-colors flex gap-5 items-start cursor-pointer ${!n.is_read ? 'bg-blue-50/30 dark:bg-blue-900/20' : ''}`}
                onClick={() => handleNotificationClick(n)}
              >
                <div className={`mt-1 w-10 h-10 rounded-2xl flex-shrink-0 flex items-center justify-center ${
                  !n.is_read ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/20' : 'bg-slate-100 dark:bg-slate-800 text-slate-400'
                }`}>
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                     <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                
                <div className="flex-1 text-right space-y-1">
                  <div className="flex items-center justify-between gap-4">
                     <h4 className={`text-base font-black ${!n.is_read ? 'text-blue-600 dark:text-blue-400' : 'text-slate-800 dark:text-slate-200'}`}>
                       {n.title || "تحديث في حالة الطلب"}
                     </h4>
                     <span className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest whitespace-nowrap">
                       {new Date(n.created_at).toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit' })}
                     </span>
                  </div>
                  <p className="text-slate-500 dark:text-slate-400 font-medium leading-relaxed">{n.message}</p>
                  
                  <div className="pt-2 flex items-center justify-between">
                     <span className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-tighter">
                       {new Date(n.created_at).toLocaleDateString()}
                     </span>
                     {!n.is_read && (
                       <button className="text-[10px] font-black text-blue-600 dark:text-blue-400 uppercase tracking-widest hover:underline">
                         تحديد كمقروء
                       </button>
                     )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </PageCard>

      <div className="bg-slate-50 dark:bg-slate-900 p-6 rounded-2xl border border-dashed border-slate-200 dark:border-slate-700 text-center">
         <p className="text-xs text-slate-400 dark:text-slate-500 font-bold">يتم حذف التنبيهات التي مضى عليها أكثر من 30 يوماً تلقائياً.</p>
      </div>
    </div>
  );
}
