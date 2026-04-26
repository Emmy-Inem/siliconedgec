import { useEffect, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { motion } from "framer-motion";
import { Home, Save, Loader2, ExternalLink, RotateCcw } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { HOME_CONTENT_DEFAULTS } from "@/hooks/useHomeContent";

type Field = { key: string; label: string; type: "input" | "textarea"; help?: string; defaultVal: string };

const SECTIONS: { id: string; title: string; description: string; fields: Field[] }[] = [
  {
    id: "hero",
    title: "Hero Section",
    description: "Top of the home page — first impression for visitors.",
    fields: [
      { key: "home_hero_eyebrow", label: "Eyebrow text", type: "input", defaultVal: HOME_CONTENT_DEFAULTS.hero_eyebrow },
      { key: "home_typewriter_words", label: "Rotating typewriter words", type: "textarea", help: "Comma-separated. Each word types out, pauses, then deletes — replace with whatever skills you teach.", defaultVal: HOME_CONTENT_DEFAULTS.typewriter_words.join(", ") },
      { key: "home_hero_subtitle", label: "Subtitle / tagline", type: "textarea", defaultVal: HOME_CONTENT_DEFAULTS.hero_subtitle },
      { key: "home_hero_cta_primary", label: "Primary CTA label", type: "input", defaultVal: HOME_CONTENT_DEFAULTS.hero_cta_primary },
      { key: "home_hero_cta_secondary", label: "Secondary CTA label", type: "input", defaultVal: HOME_CONTENT_DEFAULTS.hero_cta_secondary },
    ],
  },
  {
    id: "hero_images",
    title: "Hero Collage Images",
    description: "Four pictures in the floating instructor collage on the right of the hero, plus the big mentor portrait in the 'Meet your mentors' section. Paste any image URL (host through Media Library). Leave blank to use live instructor photos.",
    fields: [
      { key: "home_hero_image_1", label: "Image 1 URL", type: "input", help: "Top-left tile", defaultVal: "" },
      { key: "home_hero_image_2", label: "Image 2 URL", type: "input", help: "Top-right tile", defaultVal: "" },
      { key: "home_hero_image_3", label: "Image 3 URL", type: "input", help: "Bottom-left tile", defaultVal: "" },
      { key: "home_hero_image_4", label: "Image 4 URL", type: "input", help: "Bottom-right tile", defaultVal: "" },
      { key: "home_mentor_image", label: "Mentor section image URL", type: "input", help: "Big portrait in the 'Meet your mentors' block", defaultVal: "" },
    ],
  },
  {
    id: "stats",
    title: "Stats Band (under hero)",
    description: "Numbers shown in the four stat cards under the hero. Leave any field blank to use the live count from the database.",
    fields: [
      { key: "home_stat_students", label: "Students worldwide", type: "input", help: "Numbers only, e.g. 2500", defaultVal: "" },
      { key: "home_stat_courses", label: "Live courses", type: "input", help: "Numbers only", defaultVal: "" },
      { key: "home_stat_instructors", label: "Industry mentors", type: "input", help: "Numbers only", defaultVal: "" },
      { key: "home_stat_countries", label: "Countries reached", type: "input", help: "Numbers only", defaultVal: "" },
    ],
  },
  {
    id: "alumni",
    title: "Alumni Logos Strip",
    description: "The label above the scrolling logo strip (Google, AWS, Microsoft, etc.).",
    fields: [
      { key: "home_alumni_label", label: "Strip label", type: "input", defaultVal: HOME_CONTENT_DEFAULTS.alumni_label },
    ],
  },
  {
    id: "why",
    title: "Why Silicon Edge (bento grid)",
    description: "Heading above the bento grid that explains your value proposition.",
    fields: [
      { key: "home_why_eyebrow", label: "Eyebrow text", type: "input", defaultVal: HOME_CONTENT_DEFAULTS.why_eyebrow },
      { key: "home_why_title", label: "Heading", type: "input", help: "Plain text — gradient styling is applied automatically.", defaultVal: HOME_CONTENT_DEFAULTS.why_title },
      { key: "home_why_description", label: "Description (optional)", type: "textarea", help: "Shown directly under the heading. Leave blank to hide.", defaultVal: "" },
    ],
  },
  {
    id: "categories",
    title: "Courses Catalog Section",
    description: "Heading above the horizontal scrolling course rail.",
    fields: [
      { key: "home_categories_eyebrow", label: "Eyebrow text", type: "input", defaultVal: HOME_CONTENT_DEFAULTS.categories_eyebrow },
      { key: "home_categories_title", label: "Heading", type: "input", defaultVal: HOME_CONTENT_DEFAULTS.categories_title },
      { key: "home_categories_description", label: "Description", type: "textarea", defaultVal: HOME_CONTENT_DEFAULTS.categories_description },
    ],
  },
  {
    id: "how",
    title: "How It Works (timeline)",
    description: "The 4-step scroll-driven timeline. Step icons stay the same; only the text is editable.",
    fields: [
      { key: "home_how_eyebrow", label: "Eyebrow", type: "input", defaultVal: HOME_CONTENT_DEFAULTS.how_eyebrow },
      { key: "home_how_title", label: "Section heading", type: "input", help: "Plain text — gradient styling is applied automatically.", defaultVal: HOME_CONTENT_DEFAULTS.how_title },
      { key: "home_how_step1_title", label: "Step 1 — Title", type: "input", defaultVal: HOME_CONTENT_DEFAULTS.how_step1_title },
      { key: "home_how_step1_desc", label: "Step 1 — Description", type: "textarea", defaultVal: HOME_CONTENT_DEFAULTS.how_step1_desc },
      { key: "home_how_step2_title", label: "Step 2 — Title", type: "input", defaultVal: HOME_CONTENT_DEFAULTS.how_step2_title },
      { key: "home_how_step2_desc", label: "Step 2 — Description", type: "textarea", defaultVal: HOME_CONTENT_DEFAULTS.how_step2_desc },
      { key: "home_how_step3_title", label: "Step 3 — Title", type: "input", defaultVal: HOME_CONTENT_DEFAULTS.how_step3_title },
      { key: "home_how_step3_desc", label: "Step 3 — Description", type: "textarea", defaultVal: HOME_CONTENT_DEFAULTS.how_step3_desc },
      { key: "home_how_step4_title", label: "Step 4 — Title", type: "input", defaultVal: HOME_CONTENT_DEFAULTS.how_step4_title },
      { key: "home_how_step4_desc", label: "Step 4 — Description", type: "textarea", defaultVal: HOME_CONTENT_DEFAULTS.how_step4_desc },
    ],
  },
  {
    id: "instructors",
    title: "Instructors Rail",
    description: "Heading above the horizontal scrolling instructor cards.",
    fields: [
      { key: "home_instructors_eyebrow", label: "Eyebrow", type: "input", defaultVal: HOME_CONTENT_DEFAULTS.instructors_eyebrow },
      { key: "home_instructors_title", label: "Heading", type: "input", help: "Plain text — gradient styling applied automatically.", defaultVal: HOME_CONTENT_DEFAULTS.instructors_title },
    ],
  },
  {
    id: "mentors",
    title: "Meet Your Mentors",
    description: "The dark section with the big portrait + 3 highlight points. Picture is set in 'Hero Collage Images'.",
    fields: [
      { key: "home_mentors_eyebrow", label: "Eyebrow", type: "input", defaultVal: HOME_CONTENT_DEFAULTS.mentors_eyebrow },
      { key: "home_mentors_title", label: "Heading", type: "input", defaultVal: HOME_CONTENT_DEFAULTS.mentors_title },
      { key: "home_mentors_description", label: "Description", type: "textarea", defaultVal: HOME_CONTENT_DEFAULTS.mentors_description },
    ],
  },
  {
    id: "testimonials",
    title: "Testimonials Section",
    description: "Heading above the vertical scrolling testimonial columns. The actual reviews are managed under Content Hub → Testimonials.",
    fields: [
      { key: "home_testimonials_eyebrow", label: "Eyebrow", type: "input", defaultVal: HOME_CONTENT_DEFAULTS.testimonials_eyebrow },
      { key: "home_testimonials_title", label: "Heading", type: "input", help: "Plain text — gradient styling applied automatically.", defaultVal: HOME_CONTENT_DEFAULTS.testimonials_title },
    ],
  },
  {
    id: "faq",
    title: "FAQ Section Header",
    description: "Heading above the FAQ accordion. (To edit individual Q&A items, use the codebase — they aren't yet stored in the database.)",
    fields: [
      { key: "home_faq_eyebrow", label: "Eyebrow", type: "input", defaultVal: HOME_CONTENT_DEFAULTS.faq_eyebrow },
      { key: "home_faq_title", label: "Heading", type: "input", defaultVal: HOME_CONTENT_DEFAULTS.faq_title },
      { key: "home_faq_subtitle", label: "Subtitle", type: "input", defaultVal: HOME_CONTENT_DEFAULTS.faq_subtitle },
    ],
  },
  {
    id: "cta",
    title: "Final Call-to-Action",
    description: "The big purple block at the bottom of the home page.",
    fields: [
      { key: "home_cta_eyebrow", label: "Eyebrow", type: "input", defaultVal: HOME_CONTENT_DEFAULTS.cta_eyebrow },
      { key: "home_cta_title", label: "Heading", type: "input", help: "Plain text — gradient styling applied automatically.", defaultVal: HOME_CONTENT_DEFAULTS.cta_title },
      { key: "home_cta_subtitle", label: "Subtitle", type: "textarea", defaultVal: HOME_CONTENT_DEFAULTS.cta_subtitle },
      { key: "home_cta_primary", label: "Primary button label", type: "input", defaultVal: HOME_CONTENT_DEFAULTS.cta_primary },
      { key: "home_cta_secondary", label: "Secondary button label", type: "input", defaultVal: HOME_CONTENT_DEFAULTS.cta_secondary },
    ],
  },
];

export default function AdminHomeContent() {
  const qc = useQueryClient();
  const { toast } = useToast();
  const [values, setValues] = useState<Record<string, string>>({});

  const { data: rows = [], isLoading } = useQuery({
    queryKey: ["admin-home-content"],
    queryFn: async () => (await supabase.from("site_content").select("*").like("key", "home_%")).data ?? [],
  });

  useEffect(() => {
    const initial: Record<string, string> = {};
    SECTIONS.forEach((s) => s.fields.forEach((f) => {
      const row = rows.find((r: any) => r.key === f.key);
      initial[f.key] = row?.value ?? f.defaultVal;
    }));
    setValues(initial);
  }, [rows]);

  const save = useMutation({
    mutationFn: async (sectionId: string) => {
      const section = SECTIONS.find((s) => s.id === sectionId)!;
      const upserts = section.fields.map((f) => ({ key: f.key, value: values[f.key] ?? "", content_type: "text" }));
      const { error } = await supabase.from("site_content").upsert(upserts, { onConflict: "key" });
      if (error) throw error;
      return sectionId;
    },
    onSuccess: (sectionId) => {
      const section = SECTIONS.find((s) => s.id === sectionId)!;
      toast({ title: "Saved", description: `${section.title} updated. Reload the home page to see changes.` });
      qc.invalidateQueries({ queryKey: ["admin-home-content"] });
      qc.invalidateQueries({ queryKey: ["home-content"] });
    },
    onError: (e: any) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  const resetField = (field: Field) => setValues((v) => ({ ...v, [field.key]: field.defaultVal }));

  return (
    <div className="space-y-6">
      <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary to-accent flex items-center justify-center">
            <Home className="h-5 w-5 text-primary-foreground" />
          </div>
          <div>
            <h1 className="font-heading text-2xl font-bold">Home Page Content</h1>
            <p className="text-sm text-muted-foreground">Edit text shown on the public home page. Changes are live within seconds.</p>
          </div>
        </div>
        <Button variant="outline" size="sm" asChild>
          <a href="/" target="_blank" rel="noreferrer"><ExternalLink className="h-3.5 w-3.5 mr-1.5" />Preview live page</a>
        </Button>
      </motion.div>

      {isLoading ? (
        <div className="space-y-4">
          {[0, 1, 2].map((i) => <Skeleton key={i} className="h-48 w-full" />)}
        </div>
      ) : (
        <div className="space-y-5">
          {SECTIONS.map((section) => (
            <Card key={section.id}>
              <CardContent className="p-5 space-y-4">
                <div className="flex items-start justify-between gap-3 flex-wrap">
                  <div>
                    <h2 className="font-heading text-base font-semibold">{section.title}</h2>
                    <p className="text-xs text-muted-foreground mt-0.5">{section.description}</p>
                  </div>
                  <Button size="sm" onClick={() => save.mutate(section.id)} disabled={save.isPending}>
                    {save.isPending && save.variables === section.id ? (
                      <Loader2 className="h-3.5 w-3.5 animate-spin mr-1.5" />
                    ) : (
                      <Save className="h-3.5 w-3.5 mr-1.5" />
                    )}
                    Save section
                  </Button>
                </div>
                <div className="grid gap-4 md:grid-cols-2">
                  {section.fields.map((f) => (
                    <div key={f.key} className={f.type === "textarea" ? "md:col-span-2 space-y-1.5" : "space-y-1.5"}>
                      <div className="flex items-center justify-between">
                        <label className="text-xs font-medium text-muted-foreground">{f.label}</label>
                        <button onClick={() => resetField(f)} className="text-[10px] text-muted-foreground/70 hover:text-primary flex items-center gap-1">
                          <RotateCcw className="h-2.5 w-2.5" /> reset
                        </button>
                      </div>
                      {f.type === "input" ? (
                        <Input value={values[f.key] ?? ""} onChange={(e) => setValues({ ...values, [f.key]: e.target.value })} />
                      ) : (
                        <Textarea value={values[f.key] ?? ""} onChange={(e) => setValues({ ...values, [f.key]: e.target.value })} rows={3} />
                      )}
                      {f.help && <p className="text-[10px] text-muted-foreground/70">{f.help}</p>}
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}