import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { logAdminActivity } from "@/lib/admin-logger";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import {
  Settings, Globe, Phone, Mail, MapPin, MessageCircle,
  Facebook, Twitter, Instagram, Linkedin, Youtube, Save, Loader2
} from "lucide-react";

const SETTINGS_KEYS = [
  { key: "site_name", label: "Site Name", icon: Globe, placeholder: "Silicon Edge Consulting", group: "general" },
  { key: "site_tagline", label: "Tagline", icon: Globe, placeholder: "Empowering professionals with job-ready tech skills", group: "general" },
  { key: "contact_email", label: "Contact Email", icon: Mail, placeholder: "info@siliconedgec.com", group: "contact" },
  { key: "contact_phone", label: "Phone Number", icon: Phone, placeholder: "+447741247592", group: "contact" },
  { key: "contact_address", label: "Address", icon: MapPin, placeholder: "3rd floor, 86-90, Paul Street, London, EC2A 4NE", group: "contact" },
  { key: "whatsapp_number", label: "WhatsApp Number", icon: MessageCircle, placeholder: "2348001234567", group: "contact" },
  { key: "social_facebook", label: "Facebook URL", icon: Facebook, placeholder: "https://facebook.com/...", group: "social" },
  { key: "social_twitter", label: "Twitter / X URL", icon: Twitter, placeholder: "https://x.com/...", group: "social" },
  { key: "social_instagram", label: "Instagram URL", icon: Instagram, placeholder: "https://instagram.com/...", group: "social" },
  { key: "social_linkedin", label: "LinkedIn URL", icon: Linkedin, placeholder: "https://linkedin.com/company/...", group: "social" },
  { key: "social_youtube", label: "YouTube URL", icon: Youtube, placeholder: "https://youtube.com/@...", group: "social" },
  { key: "footer_copyright", label: "Copyright Text", icon: Globe, placeholder: "© All Rights Reserved. Silicon Edge Consulting.", group: "general" },
];

const GROUPS = [
  { id: "general", label: "General", desc: "Basic site identity and branding" },
  { id: "contact", label: "Contact Info", desc: "Contact details shown in footer and WhatsApp FAB" },
  { id: "social", label: "Social Links", desc: "Social media profile URLs" },
];

export default function AdminSettings() {
  const { toast } = useToast();
  const qc = useQueryClient();
  const [form, setForm] = useState<Record<string, string>>({});
  const [dirty, setDirty] = useState(false);

  const { data: settings = [], isLoading } = useQuery({
    queryKey: ["admin-settings"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("site_content")
        .select("*")
        .in("key", SETTINGS_KEYS.map((s) => s.key));
      if (error) throw error;
      return data;
    },
  });

  useEffect(() => {
    const initial: Record<string, string> = {};
    SETTINGS_KEYS.forEach((s) => {
      const existing = settings.find((sc) => sc.key === s.key);
      initial[s.key] = existing?.value ?? "";
    });
    setForm(initial);
    setDirty(false);
  }, [settings]);

  const saveMutation = useMutation({
    mutationFn: async () => {
      const updates = SETTINGS_KEYS.map((s) => ({
        key: s.key,
        value: form[s.key] || null,
        content_type: "setting",
      }));

      for (const u of updates) {
        const existing = settings.find((sc) => sc.key === u.key);
        if (existing) {
          await supabase.from("site_content").update({ value: u.value }).eq("id", existing.id);
        } else if (u.value) {
          await supabase.from("site_content").insert({ key: u.key, value: u.value, content_type: "setting" });
        }
      }

      await logAdminActivity("update", "settings", undefined, { keys: Object.keys(form).filter((k) => form[k]) });
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin-settings"] });
      qc.invalidateQueries({ queryKey: ["site-settings"] });
      setDirty(false);
      toast({ title: "Settings saved", description: "Your changes are now live on the site." });
    },
    onError: (e) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <motion.div animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 1, ease: "linear" }} className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full" />
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary to-accent flex items-center justify-center">
            <Settings className="h-5 w-5 text-primary-foreground" />
          </div>
          <div>
            <h1 className="font-heading text-2xl font-bold">Site Settings</h1>
            <p className="text-sm text-muted-foreground">Manage your site identity, contact info, and social links.</p>
          </div>
        </div>
        <Button onClick={() => saveMutation.mutate()} disabled={!dirty || saveMutation.isPending} size="sm">
          {saveMutation.isPending ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : <Save className="h-4 w-4 mr-1" />}
          {saveMutation.isPending ? "Saving..." : "Save Changes"}
        </Button>
      </motion.div>

      {GROUPS.map((group, gi) => (
        <motion.div
          key={group.id}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: gi * 0.08 }}
          className="bg-card rounded-2xl border border-border p-6 hover:border-primary/20 transition-all"
        >
          <div className="mb-5">
            <h2 className="font-heading font-semibold text-base">{group.label}</h2>
            <p className="text-xs text-muted-foreground">{group.desc}</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {SETTINGS_KEYS.filter((s) => s.group === group.id).map((setting) => {
              const Icon = setting.icon;
              return (
                <div key={setting.key} className="space-y-1.5">
                  <label className="text-sm font-medium flex items-center gap-1.5">
                    <Icon className="h-3.5 w-3.5 text-muted-foreground" />
                    {setting.label}
                  </label>
                  <input
                    type="text"
                    value={form[setting.key] ?? ""}
                    placeholder={setting.placeholder}
                    onChange={(e) => {
                      setForm({ ...form, [setting.key]: e.target.value });
                      setDirty(true);
                    }}
                    className="w-full px-3 py-2 rounded-lg border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 placeholder:text-muted-foreground/40"
                  />
                </div>
              );
            })}
          </div>
        </motion.div>
      ))}
    </div>
  );
}
