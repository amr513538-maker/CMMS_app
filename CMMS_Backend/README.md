# CMMS - نظام إدارة الصيانة المحوسب

## 📋 المتطلبات
- **Node.js** v18+
- **PostgreSQL** v14+

---

## 🚀 التشغيل السريع

### 1. إعداد قاعدة البيانات
```bash
# أنشئ قاعدة بيانات PostgreSQL باسم cmms_db
createdb cmms_db
```

### 2. إعداد Backend
```bash
cd cmms_backend

# انسخ ملف البيئة وعدّل الإعدادات
cp .env.example .env
# عدّل DB_USER و DB_PASSWORD حسب إعداداتك

# تثبيت المكتبات
npm install

# تهيئة قاعدة البيانات (إنشاء الجداول + البيانات الأساسية)
npm run db:init

# تشغيل السيرفر
npm start
```

### 3. إعداد Frontend
```bash
cd cmms_frontend

# تثبيت المكتبات
npm install

# تشغيل في وضع التطوير
npm run dev
```

### 4. الدخول
- **الواجهة:** http://localhost:5173
- **API:** http://localhost:5000/api
- **بيانات Admin الافتراضية:**
  - User: `admin`
  - Password: `admin`

---

## 👥 الأدوار
| الدور | الوصف |
|-------|-------|
| `admin` | مدير النظام - صلاحيات كاملة |
| `user` | مستخدم عادي - إنشاء وتتبع الطلبات |
| `IT Support` | دعم تقني - إدارة الطلبات والأجهزة |

---

## 📁 هيكل المشروع
```
cmms_backend/
├── index.js            # نقطة الدخول الرئيسية
├── db.js               # اتصال PostgreSQL
├── .env                # إعدادات البيئة
├── .env.example        # نموذج الإعدادات
├── controllers/        # Business Logic
├── routes/             # API Routes
├── middleware/          # Auth + Upload
├── utils/              # JWT Helper
├── sql/schema.sql      # Database Schema
├── scripts/dbInit.js   # Database Initializer
└── public/uploads/     # Uploaded Files

cmms_frontend/
├── src/
│   ├── App.jsx         # Main App + Routing
│   ├── api/client.js   # HTTP Client
│   ├── context/        # Auth + Theme Context
│   ├── components/     # Shared Components
│   └── pages/          # All Pages
└── vite.config.js      # Vite + Proxy Config
```

---

## 🔧 أوامر مفيدة
```bash
# إعادة تهيئة قاعدة البيانات (⚠️ يحذف كل البيانات)
npm run db:init

# تشغيل السيرفر
npm start
```
