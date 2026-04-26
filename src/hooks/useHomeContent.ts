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
  alumni_label: string;
  how_eyebrow: string;
  how_title: string;
  how_step1_title: string;
  how_step1_desc: string;
  how_step2_title: string;
  how_step2_desc: string;
  how_step3_title: string;
  how_step3_desc: string;
  how_step4_title: string;
  how_step4_desc: string;
  instructors_eyebrow: string;
  instructors_title: string;
  mentors_eyebrow: string;
  mentors_title: string;
  mentors_description: string;
  testimonials_eyebrow: string;
  testimonials_title: string;
  faq_eyebrow: string;
  faq_title: string;
  faq_subtitle: string;
  cta_eyebrow: string;
  cta_title: string;
  cta_subtitle: string;
  cta_primary: string;
  cta_secondary: string;
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
  alumni_label: "Our alumni now work at",
  how_eyebrow: "How it works",
  how_title: "From curious to hired.",
  how_step1_title: "Apply & enroll",
  how_step1_desc: "Pick your track. Pay flexibly. Get instant access to your cohort.",
  how_step2_title: "Learn live, weekly",
  how_step2_desc: "Real instructor-led classes with Q&A. Recordings keep you on track.",
  how_step3_title: "Build real projects",
  how_step3_desc: "Ship portfolio-grade work, reviewed by mentors actively working in tech.",
  how_step4_title: "Get job-ready",
  how_step4_desc: "CV reviews, mock interviews, and intros to our hiring partner network.",
  instructors_eyebrow: "World-class instructors",
  instructors_title: "Taught by people actively shipping in tech.",
  mentors_eyebrow: "Meet your mentors",
  mentors_title: "Guidance from people who've already done it.",
  mentors_description:
    "Our mentors are senior engineers and managers from the companies you want to work at. They review your code, your CV, and your interview answers — and they tell you the truth.",
  testimonials_eyebrow: "Loved by ambitious learners",
  testimonials_title: "Don't take our word for it.",
  faq_eyebrow: "Frequently asked",
  faq_title: "Everything you need to know.",
  faq_subtitle: "Still curious? Reach out — real humans reply.",
  cta_eyebrow: "Your edge starts now",
  cta_title: "Stop scrolling. Start learning.",
  cta_subtitle:
    "Join the next cohort and graduate with a portfolio, a network, and the confidence to compete anywhere.",
  cta_primary: "Browse courses",
  cta_secondary: "Talk to admissions",
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
  "home_alumni_label",
  "home_how_eyebrow",
  "home_how_title",
  "home_how_step1_title",
  "home_how_step1_desc",
  "home_how_step2_title",
  "home_how_step2_desc",
  "home_how_step3_title",
  "home_how_step3_desc",
  "home_how_step4_title",
  "home_how_step4_desc",
  "home_instructors_eyebrow",
  "home_instructors_title",
  "home_mentors_eyebrow",
  "home_mentors_title",
  "home_mentors_description",
  "home_testimonials_eyebrow",
  "home_testimonials_title",
  "home_faq_eyebrow",
  "home_faq_title",
  "home_faq_subtitle",
  "home_cta_eyebrow",
  "home_cta_title",
  "home_cta_subtitle",
  "home_cta_primary",
  "home_cta_secondary",
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
        alumni_label: get("home_alumni_label", DEFAULTS.alumni_label),
        how_eyebrow: get("home_how_eyebrow", DEFAULTS.how_eyebrow),
        how_title: get("home_how_title", DEFAULTS.how_title),
        how_step1_title: get("home_how_step1_title", DEFAULTS.how_step1_title),
        how_step1_desc: get("home_how_step1_desc", DEFAULTS.how_step1_desc),
        how_step2_title: get("home_how_step2_title", DEFAULTS.how_step2_title),
        how_step2_desc: get("home_how_step2_desc", DEFAULTS.how_step2_desc),
        how_step3_title: get("home_how_step3_title", DEFAULTS.how_step3_title),
        how_step3_desc: get("home_how_step3_desc", DEFAULTS.how_step3_desc),
        how_step4_title: get("home_how_step4_title", DEFAULTS.how_step4_title),
        how_step4_desc: get("home_how_step4_desc", DEFAULTS.how_step4_desc),
        instructors_eyebrow: get("home_instructors_eyebrow", DEFAULTS.instructors_eyebrow),
        instructors_title: get("home_instructors_title", DEFAULTS.instructors_title),
        mentors_eyebrow: get("home_mentors_eyebrow", DEFAULTS.mentors_eyebrow),
        mentors_title: get("home_mentors_title", DEFAULTS.mentors_title),
        mentors_description: get("home_mentors_description", DEFAULTS.mentors_description),
        testimonials_eyebrow: get("home_testimonials_eyebrow", DEFAULTS.testimonials_eyebrow),
        testimonials_title: get("home_testimonials_title", DEFAULTS.testimonials_title),
        faq_eyebrow: get("home_faq_eyebrow", DEFAULTS.faq_eyebrow),
        faq_title: get("home_faq_title", DEFAULTS.faq_title),
        faq_subtitle: get("home_faq_subtitle", DEFAULTS.faq_subtitle),
        cta_eyebrow: get("home_cta_eyebrow", DEFAULTS.cta_eyebrow),
        cta_title: get("home_cta_title", DEFAULTS.cta_title),
        cta_subtitle: get("home_cta_subtitle", DEFAULTS.cta_subtitle),
        cta_primary: get("home_cta_primary", DEFAULTS.cta_primary),
        cta_secondary: get("home_cta_secondary", DEFAULTS.cta_secondary),
      };
    },
  });
}

export const HOME_CONTENT_DEFAULTS = DEFAULTS;