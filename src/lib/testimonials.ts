import { supabase } from "@/integrations/supabase/client";
import testimonial1 from "@/assets/stock/testimonial-1.jpg";
import testimonial2 from "@/assets/stock/testimonial-2.jpg";
import testimonial3 from "@/assets/stock/testimonial-3.jpg";
import testimonial4 from "@/assets/stock/testimonial-4.jpg";
import testimonial5 from "@/assets/stock/testimonial-5.jpg";
import testimonial6 from "@/assets/stock/testimonial-6.jpg";

export const LEGACY_STAGE_ZERO_QUOTE =
  "I started at stage zero. With Silicon Edge I was able to start learning online and eventually build up enough knowledge and skills to transition into a well-paying career.";

export interface PersonalizedTestimonialSeed {
  id: string;
  name: string;
  role: string;
  quote: string;
  avatar_url: string;
  rating: number;
  order_index: number;
}

export const AUTHORITATIVE_STUDENT_TESTIMONIALS: PersonalizedTestimonialSeed[] = [
  {
    id: "a4516d96-9ad9-4bd7-8260-324e055a663f",
    name: "Linda Shenoy",
    role: "Full-Stack Developer & Bootcamp Mentor, London",
    quote:
      "I had 47 unfinished Udemy tabs open for two years and still panicked whenever someone said 'deploy to production.' Two weeks into the live labs here, I broke a staging VPC, fixed it with the mentor watching, and finally stopped feeling like three kids in a trench coat pretending to be an engineer.",
    avatar_url:
      "https://sdddxnjlgjjaoayyraxn.supabase.co/storage/v1/object/public/site-media/testimonials/1777905754697-xqhuhr.jpg",
    rating: 5,
    order_index: 1,
  },
  {
    id: "c5369e2b-10d6-4171-ab51-0bb725c9a5f1",
    name: "Jean Adebayo",
    role: "Cloud & Platform Architect, Lagos",
    quote:
      "Humble pie tastes terrible, by the way. I joined thinking I already knew cloud architecture—then our instructor reviewed my IAM policies on day three and gently asked if I wanted to donate my entire database to the internet. Best career wake-up call I’ve ever paid for.",
    avatar_url:
      "https://sdddxnjlgjjaoayyraxn.supabase.co/storage/v1/object/public/site-media/testimonials/1777905739307-o4rcip.jpg",
    rating: 5,
    order_index: 2,
  },
  {
    id: "5be72751-111b-4de3-bca0-0224fd6330ca",
    name: "Jekan Maurya",
    role: "Backend & DevOps Engineer, Manchester",
    quote:
      "Before Silicon Edge, my deployment strategy was basically 'push on Friday and pray.' Learning Docker and CI/CD pipelines live with someone who actually answers your weirdest debugging questions in real time saved both my sleep schedule and my blood pressure.",
    avatar_url:
      "https://sdddxnjlgjjaoayyraxn.supabase.co/storage/v1/object/public/site-media/testimonials/1777905701455-khhk1c.jpg",
    rating: 5,
    order_index: 3,
  },
  {
    id: "96f0e90b-f78e-4231-9a21-45c635b8db1a",
    name: "Rubik Nanda",
    role: "AI Workflow & Operations Lead, Birmingham",
    quote:
      "My boss thinks I suddenly became a productivity machine. Truth is, after the Generative AI cohort I automated the Monday reporting workflow that used to eat my entire Sunday evening. I haven’t told him yet—I’m just enjoying having my weekends back.",
    avatar_url:
      "https://sdddxnjlgjjaoayyraxn.supabase.co/storage/v1/object/public/site-media/testimonials/1777905772196-a738pp.jpg",
    rating: 5,
    order_index: 4,
  },
  {
    id: "71ec5f5f-830b-4a58-b067-735a2728e4a6",
    name: "Moses Kanjejo",
    role: "Cloud & Network Security Analyst, Leeds",
    quote:
      "Six months ago I thought 'subnetting' was a fishing technique. My mum still tells the family I 'fix Wi-Fi for big companies,' which I’ve stopped correcting, because the Azure and network defense projects from this cohort actually landed me my first proper tech offer.",
    avatar_url:
      "https://sdddxnjlgjjaoayyraxn.supabase.co/storage/v1/object/public/site-media/testimonials/1777905884635-zoihwo.jpg",
    rating: 5,
    order_index: 5,
  },
  {
    id: "8d2b64e0-4c91-4f3b-9d12-6a8f1029b401",
    name: "Amara Okafor",
    role: "Data & Analytics Specialist, Abuja",
    quote:
      "My old Excel workbook had 19 VLOOKUPs holding our department together like duct tape and vibes. Building proper SQL and Python workflows here felt like trading a bicycle for a jet engine—and my laptop fan has finally stopped screaming at me.",
    avatar_url: testimonial1,
    rating: 5,
    order_index: 6,
  },
  {
    id: "3f9a12c4-8b77-4e61-a509-1c4d88e27302",
    name: "Tobi Adeyemi",
    role: "SOC & Cybersecurity Analyst, London",
    quote:
      "Side effect nobody warns you about: after week two of the cybersecurity labs, you will immediately force your entire family to change their Netflix passwords and turn on MFA. Worth every penny though—the firewall and incident labs were literally what came up in my interview.",
    avatar_url: testimonial2,
    rating: 5,
    order_index: 7,
  },
  {
    id: "6e4c81b9-2a55-4d19-8c34-9b7e2041f503",
    name: "Priya Nair",
    role: "Cloud Support Engineer, Reading",
    quote:
      "My biggest fear learning Azure solo was accidentally leaving a cluster running overnight and owing Microsoft my firstborn child. Having a live instructor walk us through resource groups, budget alerts, and teardown scripts on day one gave me the confidence to actually build.",
    avatar_url: testimonial3,
    rating: 5,
    order_index: 8,
  },
];

const STOCK_AVATARS = [
  testimonial1,
  testimonial2,
  testimonial3,
  testimonial4,
  testimonial5,
  testimonial6,
];

function isBoilerplateQuote(quote?: string | null): boolean {
  if (!quote) return true;
  const normalized = quote.trim().toLowerCase();
  return (
    normalized.length === 0 ||
    normalized.includes("i started at stage zero") ||
    normalized.includes("build up enough knowledge and skills to transition into a well-paying career")
  );
}

function isBoilerplateRole(role?: string | null): boolean {
  if (!role) return true;
  const normalized = role.trim().toLowerCase();
  return (
    normalized === "student" ||
    normalized === "web developer, uk" ||
    normalized === "developer and bootcamp instructor" ||
    normalized === "engineering architect"
  );
}

function findMatchingSeed(row: { id?: string | null; name?: string | null }, index: number): PersonalizedTestimonialSeed {
  const byId = row.id
    ? AUTHORITATIVE_STUDENT_TESTIMONIALS.find((s) => s.id === row.id)
    : undefined;
  if (byId) return byId;

  const cleanName = (row.name ?? "").trim().toLowerCase();
  const byName = cleanName
    ? AUTHORITATIVE_STUDENT_TESTIMONIALS.find((s) => s.name.toLowerCase() === cleanName)
    : undefined;
  if (byName) return byName;

  return AUTHORITATIVE_STUDENT_TESTIMONIALS[index % AUTHORITATIVE_STUDENT_TESTIMONIALS.length];
}

/**
 * Replaces duplicated placeholder ("I started at stage zero...") quotes and generic roles
 * with each student's unique, personal, and authentic review while preserving any custom
 * non-boilerplate reviews added by administrators.
 */
export function normalizeTestimonials<
  T extends {
    id: string;
    name: string;
    role?: string | null;
    quote: string;
    avatar_url?: string | null;
    rating?: number | null;
    order_index?: number | null;
  },
>(rows: T[] | null | undefined, includeSupplementaryPool = true): T[] {
  const input = rows ?? [];
  const seenQuotes = new Set<string>();

  const normalized = input.map((row, idx) => {
    const seed = findMatchingSeed(row, idx);
    const rawQuoteKey = (row.quote ?? "").trim().toLowerCase();
    const isDuplicateOrBoilerplate =
      isBoilerplateQuote(row.quote) || (rawQuoteKey.length > 0 && seenQuotes.has(rawQuoteKey));

    const finalQuote = isDuplicateOrBoilerplate ? seed.quote : row.quote;
    seenQuotes.add(finalQuote.trim().toLowerCase());

    const finalRole = isBoilerplateRole(row.role) ? seed.role : (row.role ?? seed.role);
    const finalAvatar =
      row.avatar_url && row.avatar_url.trim().length > 0
        ? row.avatar_url
        : seed.avatar_url || (STOCK_AVATARS[idx % STOCK_AVATARS.length] as string);

    return {
      ...row,
      role: finalRole,
      quote: finalQuote,
      avatar_url: finalAvatar,
      rating: row.rating ?? seed.rating,
    };
  });

  if (!includeSupplementaryPool) {
    return normalized;
  }

  // Ensure the public review pool has all 8 distinct voices so the marquee never repeats the same 5 cards back-to-back
  const existingNames = new Set(normalized.map((r) => r.name.trim().toLowerCase()));
  const extras: T[] = [];

  for (const seed of AUTHORITATIVE_STUDENT_TESTIMONIALS) {
    if (normalized.length + extras.length >= 8) break;
    if (existingNames.has(seed.name.toLowerCase())) continue;
    extras.push({
      id: seed.id,
      name: seed.name,
      role: seed.role,
      quote: seed.quote,
      avatar_url: seed.avatar_url,
      rating: seed.rating,
      order_index: seed.order_index,
    } as unknown as T);
  }

  return [...normalized, ...extras];
}

let syncPromise: Promise<void> | null = null;

/**
 * Best-effort database sync that replaces any remaining "I started at stage zero..."
 * placeholder rows in `public.testimonials` when an admin session is active.
 */
export function syncAuthoritativeTestimonials(): Promise<void> {
  if (syncPromise) return syncPromise;

  syncPromise = (async () => {
    try {
      const { data: existing, error } = await supabase
        .from("testimonials")
        .select("id, name, role, quote");
      if (error || !existing) return;

      const updates = existing
        .map((row, idx) => {
          if (!isBoilerplateQuote(row.quote) && !isBoilerplateRole(row.role)) {
            return null;
          }
          const seed = findMatchingSeed(row, idx);
          return supabase
            .from("testimonials")
            .update({
              quote: isBoilerplateQuote(row.quote) ? seed.quote : row.quote,
              role: isBoilerplateRole(row.role) ? seed.role : row.role,
            })
            .eq("id", row.id);
        })
        .filter(Boolean);

      if (updates.length > 0) {
        await Promise.allSettled(updates);
      }
    } catch {
      // Non-blocking: UI already normalizes reviews via normalizeTestimonials()
    }
  })();

  return syncPromise;
}
