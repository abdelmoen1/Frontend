import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";

import { oauthErrorMessage } from "../utils/apiErrors";

// يقرأ رمز خطأ Google من الرابط مرة واحدة ثم يزيله حتى لا تعود الرسالة عند التحديث
export function useOAuthError() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [message] = useState(() => oauthErrorMessage(searchParams.get("oauth_error")));

  useEffect(() => {
    if (!searchParams.has("oauth_error")) return;
    const next = new URLSearchParams(searchParams);
    next.delete("oauth_error");
    setSearchParams(next, { replace: true });
  }, [searchParams, setSearchParams]);

  return message;
}
