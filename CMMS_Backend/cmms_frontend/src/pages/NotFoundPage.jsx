import React from "react";
import { Link } from "react-router-dom";

export default function NotFoundPage() {
  return (
    <div className="flex items-center justify-center min-h-[60vh] animate-fade-up">
      <div className="text-center max-w-md space-y-8">
        <div className="text-[120px] font-black text-blue-600/10 dark:text-blue-400/10 leading-none select-none">404</div>
        <div className="space-y-3 -mt-16">
          <h2 className="text-2xl font-black text-slate-900 dark:text-white">عفواً! يبدو أنك تهت في النظام</h2>
          <p className="text-slate-500 dark:text-slate-400 font-medium leading-relaxed">
            الصفحة التي تحاول الوصول إليها قد تم نقلها، حذفها، أو أنها لم تكن موجودة من الأساس.
          </p>
        </div>
        <Link 
          to="/" 
          className="inline-flex items-center gap-2 px-8 py-4 bg-blue-600 text-white font-black rounded-2xl shadow-xl shadow-blue-500/20 hover:bg-blue-700 active:scale-95 transition-all"
        >
          🏠 العودة للرئيسية
        </Link>
      </div>
    </div>
  );
}
