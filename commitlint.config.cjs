// commitlint.config.cjs
module.exports = {
  extends: ["@commitlint/config-conventional"],
  rules: {
    "type-enum": [
      2,
      "always",
      [
        "feat", // ویژگی جدید
        "fix", // رفع باگ
        "docs", // مستندات
        "style", // تغییرات ظاهری و کد استایل بدون تغییر منطق
        "refactor", // بازنویسی کد
        "perf", // بهینه‌سازی کارایی
        "test", // اضافه کردن یا اصلاح تست‌ها
        "chore", // تغییرات در بیلد، ابزارها یا وابستگی‌ها
        "revert", // بازگردانی کامیت
      ],
    ],
    "scope-enum": [2, "always", [
       "monitoring", "architecture","root", "ci",  "api", "web", "domain", "application",
      "infrastructure", "shared","pdf-worker",
      "email-worker",
      "event-worker"]],
  },
};
