// Shared Silicon Edge Consulting branded email layout.
// Every outbound email (automations, announcements, newsletter, support)
// renders through `brandEmail` so branding stays consistent in one place.

export const BRAND = {
  name: "Silicon Edge Consulting",
  tagline: "Job-Ready Tech Training — AI · Cloud · DevOps",
  site: "https://siliconedgec.com",
  logo:
    "https://sdddxnjlgjjaoayyraxn.supabase.co/storage/v1/object/public/site-media/email%2Flogo-light.png",
  purple: "#a855f7",
  purpleDark: "#7e22ce",
  navy: "#0f172a",
  ink: "#1e293b",
  muted: "#64748b",
  border: "#e2e8f0",
  supportEmail: "info@siliconedgec.com",
};

export interface BrandEmailOptions {
  title: string;
  /** Pre-escaped HTML paragraphs / blocks. */
  bodyHtml: string;
  preheader?: string;
  cta?: { label: string; url: string };
  footerNote?: string;
  unsubscribeUrl?: string;
}

/** Escape plain text and turn newlines + bare URLs into HTML. */
export function textToHtml(text: string) {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(
      /(https?:\/\/[^\s<]+)/g,
      (u) => `<a href="${u}" style="color:${BRAND.purpleDark};text-decoration:underline">${u}</a>`,
    )
    .split(/\n{2,}/)
    .map(
      (p) =>
        `<p style="margin:0 0 14px;font-size:15px;line-height:1.65;color:${BRAND.ink}">${p.replace(/\n/g, "<br/>")}</p>`,
    )
    .join("");
}

export function brandEmail(o: BrandEmailOptions) {
  const year = new Date().getFullYear();
  return `<!doctype html>
<html lang="en"><head><meta charset="utf-8"/><meta name="viewport" content="width=device-width,initial-scale=1"/><title>${o.title}</title></head>
<body style="margin:0;padding:0;background:#f1f5f9;">
  ${o.preheader ? `<div style="display:none;max-height:0;overflow:hidden;opacity:0">${o.preheader}</div>` : ""}
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f1f5f9;padding:28px 12px;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;">
    <tr><td align="center">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:580px;background:#ffffff;border-radius:16px;overflow:hidden;border:1px solid ${BRAND.border};">
        <tr>
          <td style="background:${BRAND.navy};padding:22px 28px;">
            <img src="${BRAND.logo}" alt="${BRAND.name}" width="150" style="display:block;height:auto;max-width:150px;border:0;" />
            <div style="margin-top:8px;font-size:11px;letter-spacing:.6px;text-transform:uppercase;color:${BRAND.purple};font-weight:600">${BRAND.tagline}</div>
          </td>
        </tr>
        <tr>
          <td style="height:4px;background:linear-gradient(90deg,${BRAND.purple},${BRAND.purpleDark});font-size:0;line-height:0">&nbsp;</td>
        </tr>
        <tr>
          <td style="padding:30px 28px 8px">
            <h1 style="margin:0 0 16px;font-size:21px;line-height:1.3;color:${BRAND.navy};font-weight:700">${o.title}</h1>
            ${o.bodyHtml}
            ${
              o.cta
                ? `<table role="presentation" cellpadding="0" cellspacing="0" style="margin:22px 0 6px"><tr><td style="border-radius:10px;background:${BRAND.purple}">
                    <a href="${o.cta.url}" style="display:inline-block;padding:12px 26px;font-size:15px;font-weight:600;color:#ffffff;text-decoration:none;border-radius:10px">${o.cta.label}</a>
                   </td></tr></table>`
                : ""
            }
          </td>
        </tr>
        <tr>
          <td style="padding:22px 28px 26px">
            <div style="border-top:1px solid ${BRAND.border};padding-top:16px;font-size:12px;line-height:1.6;color:${BRAND.muted}">
              ${o.footerNote ? `<div style="margin-bottom:10px">${o.footerNote}</div>` : ""}
              <strong style="color:${BRAND.navy}">${BRAND.name}</strong><br/>
              <a href="${BRAND.site}" style="color:${BRAND.purpleDark};text-decoration:none">siliconedgec.com</a> ·
              <a href="mailto:${BRAND.supportEmail}" style="color:${BRAND.purpleDark};text-decoration:none">${BRAND.supportEmail}</a><br/>
              <span style="color:#94a3b8">© ${year} ${BRAND.name}. All rights reserved.</span>
              ${
                o.unsubscribeUrl
                  ? `<br/><a href="${o.unsubscribeUrl}" style="color:#94a3b8;text-decoration:underline">Unsubscribe from these emails</a>`
                  : ""
              }
            </div>
          </td>
        </tr>
      </table>
    </td></tr>
  </table>
</body></html>`;
}