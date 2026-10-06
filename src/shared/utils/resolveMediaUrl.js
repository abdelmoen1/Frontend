const LOCAL_HOSTS = new Set(["localhost", "127.0.0.1", "::1"]);

export function resolveMediaUrl(mediaUrl) {
  if (typeof mediaUrl !== "string" || mediaUrl.trim() === "") {
    return mediaUrl;
  }

  try {
    const baseUrl = import.meta.env.VITE_API_BASE_URL;
    const apiUrl = new URL(
      baseUrl,
      globalThis.location?.origin || "http://localhost",
    );
    const resolvedUrl = new URL(mediaUrl, apiUrl);

    if (LOCAL_HOSTS.has(resolvedUrl.hostname)) {
      resolvedUrl.protocol = apiUrl.protocol;
      resolvedUrl.host = apiUrl.host;
    }

    return resolvedUrl.href;
  } catch {
    return mediaUrl;
  }
}
