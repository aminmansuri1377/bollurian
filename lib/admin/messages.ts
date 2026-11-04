export function adminErrorMessage(error: unknown): string {
  const code = error instanceof Error ? error.message : String(error);
  switch (code) {
    case "ADMIN_BAD_PASSWORD": return "رمز واردشده صحیح نیست.";
    case "ADMIN_LOCKED": return "پنج تلاش ناموفق انجام شده است. پس از یک دقیقه دوباره تلاش کنید.";
    case "ADMIN_NATIVE_REQUIRED": return "مدیریت قیمت در نسخه نهایی، فقط داخل برنامه نصب‌شده فعال است.";
    case "ADMIN_CONFIG_INVALID": return "تنظیمات رمز معتبر نیست. برنامه باید با تنظیمات صحیح دوباره ساخته شود.";
    case "ADMIN_REQUIRED": return "دسترسی مدیریت معتبر نیست. پنجره را ببندید و دوباره وارد شوید.";
    default: return "ارتباط با بخش مدیریت برقرار نشد. دوباره تلاش کنید.";
  }
}
