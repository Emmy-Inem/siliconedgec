// Generates a downloadable .ics calendar file for a single live class.
export function buildIcsFile(opts: {
  uid: string;
  title: string;
  description?: string;
  url?: string;
  start: Date;
  durationMinutes: number;
}): string {
  const fmt = (d: Date) =>
    d.toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "");
  const end = new Date(opts.start.getTime() + opts.durationMinutes * 60_000);
  const escape = (s: string) =>
    s.replace(/[\\,;]/g, (m) => "\\" + m).replace(/\n/g, "\\n");
  const lines = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//Silicon Edge//Live Class//EN",
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
    "BEGIN:VEVENT",
    `UID:${opts.uid}@siliconedgec.com`,
    `DTSTAMP:${fmt(new Date())}`,
    `DTSTART:${fmt(opts.start)}`,
    `DTEND:${fmt(end)}`,
    `SUMMARY:${escape(opts.title)}`,
    opts.description ? `DESCRIPTION:${escape(opts.description)}` : "",
    opts.url ? `URL:${opts.url}` : "",
    opts.url ? `LOCATION:${opts.url}` : "",
    "END:VEVENT",
    "END:VCALENDAR",
  ].filter(Boolean);
  return lines.join("\r\n");
}

export function downloadIcs(filename: string, content: string) {
  const blob = new Blob([content], { type: "text/calendar;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename.endsWith(".ics") ? filename : `${filename}.ics`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 100);
}

export function googleCalendarUrl(opts: {
  title: string;
  description?: string;
  url?: string;
  start: Date;
  durationMinutes: number;
}): string {
  const fmt = (d: Date) =>
    d.toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "");
  const end = new Date(opts.start.getTime() + opts.durationMinutes * 60_000);
  const params = new URLSearchParams({
    action: "TEMPLATE",
    text: opts.title,
    dates: `${fmt(opts.start)}/${fmt(end)}`,
    details: [opts.description ?? "", opts.url ? `Join: ${opts.url}` : ""].filter(Boolean).join("\n\n"),
    location: opts.url ?? "",
  });
  return `https://calendar.google.com/calendar/render?${params.toString()}`;
}
