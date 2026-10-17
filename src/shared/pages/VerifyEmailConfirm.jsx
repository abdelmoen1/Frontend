import { useEffect, useState } from "react";
import { Link, useLocation, useParams } from "react-router-dom";
import AuthShell from "../components/AuthShell";
import { useAuth } from "../auth/useAuth";
import { getUserDestination } from "../auth/destination";
import { verifyEmail } from "../services/authService";
import { verificationApiPath } from "../utils/accountEmail";

/** AUTH-02: يفتح رابط التأكيد من البريد ويرسله للخادم. لا يتطلب تسجيل الدخول؛ الرابط الموقّع هو الإثبات. */
export default function VerifyEmailConfirm() {
  const { id, hash } = useParams();
  const { search } = useLocation();
  const { isAuthenticated, user, refreshUser } = useAuth();
  const apiPath = verificationApiPath(id, hash, search);
  const [state, setState] = useState(apiPath ? "verifying" : "invalid");

  useEffect(() => {
    if (!apiPath) return undefined;
    let active = true;
    verifyEmail(apiPath)
      .then(() => {
        if (!active) return;
        setState("verified");
        if (isAuthenticated) refreshUser?.();
      })
      .catch((err) => active && setState(err?.status === 403 ? "invalid" : "failed"));
    return () => {
      active = false;
    };
    // التأكيد يُرسل مرة واحدة لكل رابط
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [apiPath]);

  const next = isAuthenticated ? getUserDestination(user) : "/login";

  if (state === "verifying") {
    return <AuthShell title="جارٍ تأكيد بريدك…" description="لحظات من فضلك." />;
  }
  if (state === "verified") {
    return (
      <AuthShell title="تم تأكيد بريدك الإلكتروني" description="يمكنك الآن استخدام كل خدمات المنصة.">
        <Link to={next} className="signin-button as-link">{isAuthenticated ? "المتابعة" : "تسجيل الدخول"}</Link>
      </AuthShell>
    );
  }
  return (
    <AuthShell
      title={state === "invalid" ? "رابط التأكيد غير صالح" : "تعذر تأكيد البريد الآن"}
      description={state === "invalid" ? "قد يكون الرابط منتهي الصلاحية (ساعة واحدة) أو منسوخًا بشكل ناقص." : "تحقق من اتصالك ثم أعد فتح الرابط."}
    >
      <Link to={isAuthenticated ? "/verify-email" : "/login"} className="signin-button as-link">
        {isAuthenticated ? "إرسال رابط جديد" : "سجّل الدخول لطلب رابط جديد"}
      </Link>
    </AuthShell>
  );
}
