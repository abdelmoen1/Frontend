import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";

import { oauthErrorMessage } from "../utils/apiErrors";

// رمز الخطأ من الخادم: oauth_error=<سبب محدد>، أو الصيغة العامة error=google
const oauthErrorCode = (params) =>
  params.get("oauth_error") || (params.get("error") === "google" ? "provider_error" : null);

// يقرأ رمز خطأ Google من الرابط مرة واحدة ثم يزيله حتى لا تعود الرسالة عند التحديث
export function useOAuthError() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [message] = useState(() => oauthErrorMessage(oauthErrorCode(searchParams)));

  useEffect(() => {
    if (!oauthErrorCode(searchParams)) return;
    const next = new URLSearchParams(searchParams);
    next.delete("oauth_error");
    if (next.get("error") === "google") next.delete("error");
    setSearchParams(next, { replace: true });
  }, [searchParams, setSearchParams]);

  return message;
}
