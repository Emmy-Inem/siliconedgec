import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface HomeContent {
  hero_eyebrow: string;
  hero_subtitle: string;
  hero_cta_primary: string;
  hero_cta_secondary: string;
  typewriter_words: string[];
  why_eyebrow: string;
  why_title: string;
  why_description: string;
  categories_eyebrow: string;
  categories_title: string;
  categories_description: string;
  whatsapp_banner_title: string;
  whatsapp_banner_subtitle: string;
  whatsapp_banner_url: string;
  hero_image_1: string;
  hero_image_2: string;
  hero_image_3: string;
  hero_image_4: string;
  mentor_image: string;
  stat_students: string;
  stat_courses: string;
  stat_instructors: string;
  stat_countries: string;
}

const DEFAULTS: HomeContent = {
  hero_eyebrow: "Start Learning",
  hero_subtitle: "Live Online Courses. Hands-On Projects. Real Certifications.",
  hero_cta_primary: "Explore Courses",
  hero_cta_secondary: "Sign up now",
  typewriter_words: [
    "Cloud Engineering",
    "Software Engineering",
    "Artificial Intelligence",
    "Web Development",
    "Cybersecurity",
    "Data Science",
    "DevOps",
    "Product Design",
    "UI/UX Design",
  ],
  why_eyebrow: "Why Learn with Silicon Edge",
  why_title: "Build better skills, faster",
  why_description:
    "We understand the challenges of breaking into or advancing in the tech industry. That's why Silicon Edge Consulting is built on a foundation of active empowerment, ensuring every student not only learns but thrives.",
  categories_eyebrow: "Browse Categories",
  categories_title: "The world's top courses",
  categories_description:
    "We keep adding new online video courses with new additions published every month.",
  whatsapp_banner_title: "Join Our Community",
  whatsapp_banner_subtitle: "Get instant course updates on WhatsApp.",
  whatsapp_banner_url: "https://wa.me/447741247592",
  hero_image_1: "",
  hero_image_2: "",
  hero_image_3: "",
  hero_image_4: "",
  mentor_image: "",
  stat_students: "",
  stat_courses: "",
  stat_instructors: "",
  stat_countries: "",
};

export const HOME_CONTENT_KEYS = [
  "home_hero_eyebrow",
  "home_hero_subtitle",
  "home_hero_cta_primary",
  "home_hero_cta_secondary",
  "home_typewriter_words",
  "home_why_eyebrow",
  "home_why_title",
  "home_why_description",
  "home_categories_eyebrow",
  "home_categories_title",
  "home_categories_description",
  "home_whatsapp_banner_title",
  "home_whatsapp_banner_subtitle",
  "home_whatsapp_banner_url",
  "home_hero_image_1",
  "home_hero_image_2",
  "home_hero_image_3",
  "home_hero_image_4",
  "home_mentor_image",
  "home_stat_students",
  "home_stat_courses",
  "home_stat_instructors",
  "home_stat_countries",
] as const;

export function useHomeContent() {
  return useQuery({
    queryKey: ["home-content"],
    staleTime: 1000 * 60 * 5,
    queryFn: async (): Promise<HomeContent> => {
      const { data } = await supabase
        .from("site_content")
        .select("key, value")
        .like("key", "home_%");
      const map = new Map<string, string>(
        (data ?? []).map((r: any) => [r.key, r.value ?? ""]),
      );
      const get = (k: string, fallback: string) => {
        const v = map.get(k);
        return v && v.trim().length > 0 ? v : fallback;
      };
      const words = get("home_typewriter_words", DEFAULTS.typewriter_words.join(","))
        .split(",")
        .map((w) => w.trim())
        .filter(Boolean);
      return {
        hero_eyebrow: get("home_hero_eyebrow", DEFAULTS.hero_eyebrow),
        hero_subtitle: get("home_hero_subtitle", DEFAULTS.hero_subtitle),
        hero_cta_primary: get("home_hero_cta_primary", DEFAULTS.hero_cta_primary),
        hero_cta_secondary: get("home_hero_cta_secondary", DEFAULTS.hero_cta_secondary),
        typewriter_words: words.length > 0 ? words : DEFAULTS.typewriter_words,
        why_eyebrow: get("home_why_eyebrow", DEFAULTS.why_eyebrow),
        why_title: get("home_why_title", DEFAULTS.why_title),
        why_description: get("home_why_description", DEFAULTS.why_description),
        categories_eyebrow: get("home_categories_eyebrow", DEFAULTS.categories_eyebrow),
        categories_title: get("home_categories_title", DEFAULTS.categories_title),
        categories_description: get(
          "home_categories_description",
          DEFAULTS.categories_description,
        ),
        whatsapp_banner_title: get(
          "home_whatsapp_banner_title",
          DEFAULTS.whatsapp_banner_title,
        ),
        whatsapp_banner_subtitle: get(
          "home_whatsapp_banner_subtitle",
          DEFAULTS.whatsapp_banner_subtitle,
        ),
        whatsapp_banner_url: get(
          "home_whatsapp_banner_url",
          DEFAULTS.whatsapp_banner_url,
        ),
        hero_image_1: map.get("home_hero_image_1") ?? "",
        hero_image_2: map.get("home_hero_image_2") ?? "",
        hero_image_3: map.get("home_hero_image_3") ?? "",
        hero_image_4: map.get("home_hero_image_4") ?? "",
        mentor_image: map.get("home_mentor_image") ?? "",
        stat_students: map.get("home_stat_students") ?? "",
        stat_courses: map.get("home_stat_courses") ?? "",
        stat_instructors: map.get("home_stat_instructors") ?? "",
        stat_countries: map.get("home_stat_countries") ?? "",
      };
    },
  });
}

export const HOME_CONTENT_DEFAULTS = DEFAULTS;