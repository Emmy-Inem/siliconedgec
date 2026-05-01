/**
 * Classify a lead/visit into a high-level marketing channel by inspecting
 * its UTM source/medium and HTTP referrer. Used by Leads Hub + Marketing
 * Analytics so admins can immediately see which platform sent a lead.
 *
 * "Direct" means: no UTM source AND no referrer host that maps to a known
 * platform. Typically these visitors typed the URL, used a bookmark, or
 * came from an in-app browser / private window that strips referrers.
 */

export type Channel =
  | "Facebook"
  | "Instagram"
  | "TikTok"
  | "Google"
  | "YouTube"
  | "LinkedIn"
  | "WhatsApp"
  | "X (Twitter)"
  | "Email"
  | "Referral"
  | "Direct";

export interface ChannelInput {
  utm_source?: string | null;
  utm_medium?: string | null;
  referrer?: string | null;
}

const SOURCE_MAP: Array<[RegExp, Channel]> = [
  [/facebook|^fb$|fb_|meta(?!l)/i, "Facebook"],
  [/instagram|^ig$|ig_/i, "Instagram"],
  [/tiktok|^tt$|tt_/i, "TikTok"],
  [/google|adwords|gads|googleads/i, "Google"],
  [/youtube|^yt$|yt_/i, "YouTube"],
  [/linkedin|^li$|li_/i, "LinkedIn"],
  [/whatsapp|^wa$|wa_/i, "WhatsApp"],
  [/twitter|^x$|x\.com/i, "X (Twitter)"],
  [/mailchimp|sendgrid|newsletter|email/i, "Email"],
];

const REFERRER_MAP: Array<[RegExp, Channel]> = [
  [/(^|\.)facebook\.com|fb\.me|m\.facebook\.com/i, "Facebook"],
  [/(^|\.)instagram\.com/i, "Instagram"],
  [/(^|\.)tiktok\.com/i, "TikTok"],
  [/google\.[a-z.]+|googleadservices|doubleclick/i, "Google"],
  [/(^|\.)youtube\.com|youtu\.be/i, "YouTube"],
  [/(^|\.)linkedin\.com|lnkd\.in/i, "LinkedIn"],
  [/whatsapp\.com|wa\.me/i, "WhatsApp"],
  [/(^|\.)twitter\.com|(^|\.)x\.com|t\.co/i, "X (Twitter)"],
];

export function classifyChannel(input: ChannelInput): Channel {
  const src = (input.utm_source || "").toString().trim();
  if (src) {
    for (const [re, ch] of SOURCE_MAP) if (re.test(src)) return ch;
  }
  if (input.utm_medium && /email/i.test(input.utm_medium)) return "Email";

  const ref = (input.referrer || "").toString().trim();
  if (ref) {
    let host = ref;
    try { host = new URL(ref).hostname; } catch { /* keep raw */ }
    for (const [re, ch] of REFERRER_MAP) if (re.test(host)) return ch;
    if (typeof window !== "undefined") {
      try {
        if (host && !host.includes(window.location.hostname)) return "Referral";
      } catch { /* noop */ }
    } else if (host) {
      return "Referral";
    }
  }
  return "Direct";
}

export const CHANNEL_BADGE: Record<Channel, string> = {
  Facebook:      "bg-blue-600/15 text-blue-600 border-blue-600/30",
  Instagram:     "bg-pink-500/15 text-pink-600 border-pink-500/30",
  TikTok:        "bg-foreground/10 text-foreground border-foreground/20",
  Google:        "bg-sky-500/15 text-sky-600 border-sky-500/30",
  YouTube:       "bg-red-500/15 text-red-600 border-red-500/30",
  LinkedIn:      "bg-blue-700/15 text-blue-700 border-blue-700/30",
  WhatsApp:      "bg-green-500/15 text-green-600 border-green-500/30",
  "X (Twitter)": "bg-foreground/10 text-foreground border-foreground/20",
  Email:         "bg-amber-500/15 text-amber-700 border-amber-500/30",
  Referral:      "bg-purple-500/15 text-purple-600 border-purple-500/30",
  Direct:        "bg-muted text-muted-foreground border-border",
};

export const DIRECT_EXPLANATION =
  "No campaign tag and no referring website. Visitor typed the URL, used a bookmark, came from an app/private window that strips referrers, or clicked a non-tagged link (SMS, plain WhatsApp message, etc.).";
