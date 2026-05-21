interface WhatsAppSettingsLike {
  whatsapp_community_url?: string | null;
  whatsapp_number?: string | null;
}

const STALE_COMMUNITY_PATHS = new Set([
  "/Fk8RN2yDKS800vnIG8K98X",
]);

function normalizeUrl(raw?: string | null) {
  const value = raw?.trim();
  if (!value) return null;

  try {
    return new URL(value.startsWith("http") ? value : `https://${value}`);
  } catch {
    return null;
  }
}

export function buildWhatsAppDirectUrl(rawNumber?: string | null, message?: string) {
  const number = (rawNumber ?? "").replace(/\D/g, "");
  if (!number) return null;

  const base = `https://wa.me/${number}`;
  return message ? `${base}?text=${encodeURIComponent(message)}` : base;
}

export function getWhatsAppCommunityUrl(
  settings?: WhatsAppSettingsLike | null,
  fallbackMessage = "Hi Silicon Edge team, I want to connect with the instructor community."
) {
  const community = normalizeUrl(settings?.whatsapp_community_url);

  if (
    community &&
    community.hostname === "chat.whatsapp.com" &&
    !STALE_COMMUNITY_PATHS.has(community.pathname)
  ) {
    return community.toString();
  }

  return buildWhatsAppDirectUrl(settings?.whatsapp_number, fallbackMessage);
}