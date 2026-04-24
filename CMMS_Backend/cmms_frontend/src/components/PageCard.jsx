import React from "react";

export default function PageCard({ title, children }) {
  return (
    <section className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-sm overflow-hidden animate-fade-up transition-colors">
      {title && (
        <div className="px-6 py-5 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between bg-slate-50/50 dark:bg-slate-800/30">
          <h1 
            className="text-lg font-black text-slate-800 dark:text-white tracking-tight flex items-center gap-2"
            dangerouslySetInnerHTML={{ __html: title }} 
          />
        </div>
      )}
      <div className="p-6 sm:p-8 dark:text-slate-300">
        {children}
      </div>
    </section>
  );
}
