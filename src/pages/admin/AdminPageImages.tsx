import { useEffect, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { ImageUploader } from "@/components/admin/ImageUploader";
import { Image as ImageIcon, Save, Loader2 } from "lucide-react";

/**
 * Catalog of image slots admins can replace across the public pages. Each
 * slot has a stable `key` stored in `site_content`. Pages render the override
 * via `usePageImage(key, fallback)` and fall back to the bundled stock asset.
 *
 * To expose a new image slot: add an entry here AND have the page read it
 * with usePageImage().
 */
const IMAGE_SLOTS: { id: string; title: string; description: string; slots: { key: string; label: string; help?: string }[] }[] = [
  {
    id: "business",
    title: "For Businesses Page",
    description: "Hero image and any visuals on the /for-businesses page.",
    slots: [
      { key: "page_image_business_hero", label: "Hero image", help: "Right-side photo in the top hero. Recommended ratio 5:4." },
    ],
  },
  {
    id: "certificates",
    title: "Certificates Page",
    description: "Visuals on the public /certificates page.",
    slots: [
      { key: "page_image_certificate_hero", label: "Celebration photo", help: "Photo of a graduate holding their certificate." },
    ],
  },
  {
    id: "home_extras",
    title: "Home Page Extras",
    description: "Additional images on the home page (hero collage and mentor photo are managed under Home Page Content).",
    slots: [
      { key: "page_image_home_cta_bg", label: "Final CTA background (optional)", help: "Background image behind the bottom call-to-action band. Leave blank for the default gradient." },
    ],
  },
];

export default function AdminPageImages() {
  const qc = useQueryClient();
  const { toast } = useToast();
  const [values, setValues] = useState<Record<string, string>>({});

  const { data: rows = [], isLoading } = useQuery({
    queryKey: ["admin-page-images"],
    queryFn: async () => (await supabase.from("site_content").select("key, value").like("key", "page_image_%")).data ?? [],
  });

  useEffect(() => {
    const initial: Record<string, string> = {};
    IMAGE_SLOTS.forEach((sec) =>
      sec.slots.forEach((s) => {
        const row = rows.find((r: any) => r.key === s.key);
        initial[s.key] = row?.value ?? "";
      }),
    );
    setValues(initial);
  }, [rows]);

  const save = useMutation({
    mutationFn: async (sectionId: string) => {
      const sec = IMAGE_SLOTS.find((s) => s.id === sectionId)!;
      const upserts = sec.slots.map((s) => ({ key: s.key, value: values[s.key] ?? "", content_type: "image" }));
      const { error } = await supabase.from("site_content").upsert(upserts, { onConflict: "key" });
      if (error) throw error;
      return sectionId;
    },
    onSuccess: (id) => {
      const sec = IMAGE_SLOTS.find((s) => s.id === id)!;
      toast({ title: "Saved", description: `${sec.title} images updated.` });
      qc.invalidateQueries({ queryKey: ["admin-page-images"] });
      qc.invalidateQueries({ queryKey: ["page-images"] });
    },
    onError: (e: any) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary to-accent flex items-center justify-center">
          <ImageIcon className="h-5 w-5 text-primary-foreground" />
        </div>
        <div>
          <h1 className="font-heading text-2xl font-bold">Page Images</h1>
          <p className="text-sm text-muted-foreground">Replace the stock photos used on individual public pages. Empty fields fall back to the default bundled image.</p>
        </div>
      </div>

      {isLoading ? (
        <div className="space-y-4">{[0, 1, 2].map((i) => <Skeleton key={i} className="h-48 w-full" />)}</div>
      ) : (
        <div className="space-y-5">
          {IMAGE_SLOTS.map((sec) => (
            <Card key={sec.id}>
              <CardContent className="p-5 space-y-4">
                <div className="flex items-start justify-between gap-3 flex-wrap">
                  <div>
                    <h2 className="font-heading text-base font-semibold">{sec.title}</h2>
                    <p className="text-xs text-muted-foreground mt-0.5">{sec.description}</p>
                  </div>
                  <Button size="sm" onClick={() => save.mutate(sec.id)} disabled={save.isPending}>
                    {save.isPending && save.variables === sec.id
                      ? <Loader2 className="h-3.5 w-3.5 animate-spin mr-1.5" />
                      : <Save className="h-3.5 w-3.5 mr-1.5" />}
                    Save section
                  </Button>
                </div>
                <div className="grid gap-5 md:grid-cols-2">
                  {sec.slots.map((s) => (
                    <div key={s.key} className="space-y-1.5">
                      <label className="text-xs font-medium text-muted-foreground">{s.label}</label>
                      <ImageUploader
                        value={values[s.key] ?? ""}
                        onChange={(url) => setValues((v) => ({ ...v, [s.key]: url }))}
                        folder="pages"
                      />
                      {s.help && <p className="text-[10px] text-muted-foreground/70">{s.help}</p>}
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
