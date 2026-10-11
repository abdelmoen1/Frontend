// الوجهة بعد تسجيل الدخول حسب الدور وحالة الإعداد الأولي
export function getUserDestination(user) {
  if (user?.role === "student") {
    return user.onboarding_completed ? "/loading" : "/student/onboarding";
  }

  if (user?.role === "organization") {
    return user.onboarding_completed ? "/loading" : "/organization/onboarding";
  }

  return "/";
}
