# Opensource Xmind

<div align="center">

**یک ابزار مایند مپ رایگان و متن‌باز، الهام‌گرفته از Xmind**

![Version](https://img.shields.io/badge/version-1.0.0-blue.svg)
![Platform](https://img.shields.io/badge/platform-Windows-lightgrey.svg)
![License](https://img.shields.io/badge/license-MIT-green.svg)
![Built with](https://img.shields.io/badge/built%20with-React%20%2B%20Electron-61dafb.svg)

</div>

---

## 📥 دانلود

برای دانلود مستقیم نسخه ویندوز، به بخش [Releases](../../releases) مراجعه کنید و آخرین فایل `Opensource Xmind Setup x.x.x.exe` را دانلود و اجرا کنید.

---

## ✨ ویژگی‌ها

- **ساخت مایند مپ** با افزودن تاپیک، زیر‌تاپیک و ارتباط بین تاپیک‌ها
- **ویرایش متن** با دابل‌کلیک روی هر تاپیک
- **۴ تم گرافیکی**: Default، Dark، Ocean، Sunset
- **جابجایی صفحه** با نگه داشتن `Space` و درگ کردن
- **زوم** با اسکرول موس
- **ذخیره خودکار** در IndexedDB مرورگر (بدون نیاز به اینترنت)
- **اکسپورت** به فرمت‌های JSON، SVG و PNG (با رنگ‌های تم انتخابی)
- **ایمپورت** از JSON (برای بازیابی نسخه پشتیبان)
- **Undo / Redo** کامل
- **اجرا به صورت دسکتاپ** (Electron) یا **در مرورگر** (localhost)

---

## 🖥️ اجرا به صورت دسکتاپ

فایل نصبی را از بخش [Releases](../../releases) دانلود کنید.

---

## 🛠️ اجرای محلی (توسعه)

### پیش‌نیازها

- [Node.js 20+](https://nodejs.org/)

### مراحل

```bash
# ۱. کلون پروژه
git clone https://github.com/YOUR_USERNAME/opensource-xmind.git
cd opensource-xmind

# ۲. کپی کردن تنظیمات پیش‌فرض
copy .env.example .env

# ۳. نصب وابستگی‌ها
npm install

# ۴. اجرای محیط توسعه (dev server)
npm run dev
```

سپس مرورگر را باز کنید و به آدرس `http://127.0.0.1:5173` بروید.

---

## 🚀 اجرای نسخه Production در مرورگر

```bash
npm run start
```

این دستور ابتدا پروژه را Build می‌کند و سپس روی `http://127.0.0.1:4173` سرو می‌کند.

---

## 📦 ساخت فایل EXE (برای ویندوز)

```bash
npm run electron:build
```

فایل نصبی در پوشه `dist_electron/` ساخته می‌شود.

---

## ⌨️ میانبرهای صفحه‌کلید

| کلید | عملکرد |
|------|---------|
| `Tab` | افزودن زیر‌تاپیک |
| `Enter` | افزودن تاپیک همتا |
| `Delete` / `Backspace` | حذف تاپیک انتخابی |
| `Ctrl+Z` | Undo |
| `Ctrl+Y` / `Ctrl+Shift+Z` | Redo |
| `Ctrl+S` | ذخیره دستی |
| `Escape` | لغو اتصال یا ویرایش |
| دابل‌کلیک روی تاپیک | ویرایش متن تاپیک |
| دابل‌کلیک روی بوم خالی | افزودن تاپیک شناور |
| `Space` + درگ | جابجایی (Pan) صفحه |
| اسکرول موس | زوم |

---

## 🏗️ معماری

```
src/
├── components/
│   ├── Canvas.tsx      # بوم تعاملی مایند مپ
│   ├── MapEditor.tsx   # صفحه ویرایشگر
│   └── MapHome.tsx     # صفحه خانگی (لیست مپ‌ها)
├── model/
│   ├── editor.ts       # منطق اصلی (Undo/Redo، اکشن‌ها)
│   ├── export.ts       # خروجی SVG/PNG با پشتیبانی تم
│   ├── sample.ts       # مپ نمونه
│   └── validate.ts     # اعتبارسنجی ایمپورت JSON
├── db.ts               # IndexedDB (ذخیره‌سازی محلی)
├── types.ts            # تایپ‌های TypeScript
└── App.tsx             # مدیریت صفحه‌ها
main.js                 # فایل اصلی Electron
```

- **React + TypeScript + Vite** — رندر SPA
- **Electron** — بسته‌بندی به عنوان اپ دسکتاپ
- **IndexedDB** — ذخیره‌سازی محلی (بدون سرور)
- **بدون تحلیل‌گر، بدون حساب کاربری، بدون ارسال داده**

---

## 📄 مجوز

این پروژه تحت مجوز [MIT](LICENSE) منتشر شده است.
