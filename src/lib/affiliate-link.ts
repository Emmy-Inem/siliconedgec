import { siteUrl } from "@/lib/site-url";

export type LandingOption = { value: string; label: string };

/** Destination options a partner can point their referral link at. */
export function landingOptions(course?: { slug?: string | null; id?: string } | null): LandingOption[] {
  const slug = course?.slug || course?.id;
  const opts: LandingOption[] = [];
  if (slug) {
    opts.push({ value: `/courses/${slug}`, label: "Course page (recommended)" });
    opts.push({ value: `/courses/${slug}?enrol=1`, label: "Course page — open checkout" });
  }
  opts.push({ value: "/courses", label: "All courses" });
  opts.push({ value: "/pricing", label: "Pricing page" });
  opts.push({ value: "/bootcamp", label: "Bootcamp page" });
  opts.push({ value: "/", label: "Homepage" });
  return opts;
}

/** Default destination for a selection: its stored landing_path, else the course page. */
export function defaultLandingPath(
  selection?: { landing_path?: string | null } | null,
  course?: { slug?: string | null; id?: string } | null,
): string {
  if (selection?.landing_path) return selection.landing_path;
  const slug = course?.slug || course?.id;
  return slug ? `/courses/${slug}` : "/";
}

/** Build a full, UTM-tagged referral URL. */
export function buildAffiliateLink(path: string, code: string, campaign?: string | null): string {
  const [base, existing] = path.split("?");
  const params = new URLSearchParams(existing ?? "");
  params.set("ref", code);
  params.set("utm_source", "partner");
  params.set("utm_medium", "affiliate");
  params.set("utm_campaign", (campaign?.trim() || code));
  return `${siteUrl(base)}?${params.toString()}`;
}
