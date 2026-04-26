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
      { key: "home_typewriter_words", label: "Typewriter words", type: "textarea", help: "Comma-separated list. Each word is typed out and deleted in turn.", defaultVal: HOME_CONTENT_DEFAULTS.typewriter_words.join(", ") },
      { key: "home_hero_subtitle", label: "Subtitle / tagline", type: "textarea", defaultVal: HOME_CONTENT_DEFAULTS.hero_subtitle },
      { key: "home_hero_cta_primary", label: "Primary CTA label", type: "input", defaultVal: HOME_CONTENT_DEFAULTS.hero_cta_primary },
      { key: "home_hero_cta_secondary", label: "Secondary CTA label", type: "input", defaultVal: HOME_CONTENT_DEFAULTS.hero_cta_secondary },
    ],
  },
  {
    id: "hero_images",
    title: "Hero Collage Images",
    description: "Four pictures used in the floating instructor collage on the right of the hero. Paste image URLs (use the Media Library to host) — leave blank to fall back to the live instructor photos.",
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
    title: "Homepage Stats",
    description: "Numbers shown in the four stat cards under the hero. Leave blank to use live counts from the database.",
    fields: [
      { key: "home_stat_students", label: "Students worldwide", type: "input", help: "Numbers only, e.g. 2500", defaultVal: "" },
      { key: "home_stat_courses", label: "Live courses", type: "input", help: "Numbers only", defaultVal: "" },
      { key: "home_stat_instructors", label: "Industry mentors", type: "input", help: "Numbers only", defaultVal: "" },
      { key: "home_stat_countries", label: "Countries reached", type: "input", help: "Numbers only", defaultVal: "" },
    ],
  },
  {
    id: "why",
    title: "Why Learn With Us",
    description: "Section explaining your value proposition.",
    fields: [
      { key: "home_why_eyebrow", label: "Eyebrow text", type: "input", defaultVal: HOME_CONTENT_DEFAULTS.why_eyebrow },
      { key: "home_why_title", label: "Heading", type: "input", defaultVal: HOME_CONTENT_DEFAULTS.why_title },
      { key: "home_why_description", label: "Description", type: "textarea", defaultVal: HOME_CONTENT_DEFAULTS.why_description },
    ],
  },
  {
    id: "categories",
    title: "Browse Categories",
    description: "Heading above the horizontal course catalog.",
    fields: [
      { key: "home_categories_eyebrow", label: "Eyebrow text", type: "input", defaultVal: HOME_CONTENT_DEFAULTS.categories_eyebrow },
      { key: "home_categories_title", label: "Heading", type: "input", defaultVal: HOME_CONTENT_DEFAULTS.categories_title },
      { key: "home_categories_description", label: "Description", type: "textarea", defaultVal: HOME_CONTENT_DEFAULTS.categories_description },
    ],
  },
  {
    id: "whatsapp",
    title: "WhatsApp Community Banner",
    description: "Banner directly under the hero section.",
    fields: [
      { key: "home_whatsapp_banner_title", label: "Title", type: "input", defaultVal: HOME_CONTENT_DEFAULTS.whatsapp_banner_title },
      { key: "home_whatsapp_banner_subtitle", label: "Subtitle", type: "input", defaultVal: HOME_CONTENT_DEFAULTS.whatsapp_banner_subtitle },
      { key: "home_whatsapp_banner_url", label: "WhatsApp link", type: "input", help: "Full URL e.g. https://wa.me/...", defaultVal: HOME_CONTENT_DEFAULTS.whatsapp_banner_url },
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