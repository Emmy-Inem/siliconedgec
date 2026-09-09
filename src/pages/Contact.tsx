import { useState } from "react";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { SEO } from "@/components/SEO";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { useSiteSettings } from "@/hooks/useSiteSettings";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Mail, Phone, MapPin, MessageSquare, Loader2 } from "lucide-react";

export default function Contact() {
  const { data: settings } = useSiteSettings();
  const { toast } = useToast();
  const brand = settings?.site_name || "Silicon Edge Consulting";
  const email = settings?.contact_email || "info@siliconedgec.com";
  const phone = (settings?.contact_phone && settings.contact_phone !== "UPDATE IN ADMIN SETTINGS") ? settings.contact_phone : "+447741247592";
  const address = (settings?.contact_address && settings.contact_address !== "UPDATE IN ADMIN SETTINGS") ? settings.contact_address : "3rd floor, 86–90 Paul Street, London, EC2A 4NE";

  const [form, setForm] = useState({ name: "", email: "", company: "", phone: "", message: "" });
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSending(true);
    try {
      const { error } = await supabase.from("business_leads").insert({
        contact_name: form.name,
        email: form.email,
        company_name: form.company || "Individual",
        phone: form.phone || null,
        message: form.message,
        training_needs: "General contact form",
        status: "new",
      });
      if (error) throw error;
      setSent(true);
      setForm({ name: "", email: "", company: "", phone: "", message: "" });
      toast({ title: "Message sent", description: "We'll get back to you shortly." });
    } catch (err: any) {
      toast({ title: "Could not send", description: err.message, variant: "destructive" });
    } finally {
      setSending(false);
    }
  };

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "ContactPage",
    name: `Contact ${brand}`,
    url: "https://siliconedgec.com/contact",
    mainEntity: {
      "@type": "Organization",
      name: brand,
      email,
      telephone: phone,
      address,
    },
  };

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <SEO
        title="Contact Us | Silicon Edge Consulting"
        description="Get in touch with Silicon Edge Consulting for course inquiries, corporate partnerships, and admissions."
        canonical="https://siliconedgec.com/contact"
        jsonLd={jsonLd}
      />
      <Header />
      <main className="flex-1 container mx-auto px-5 sm:px-6 pt-28 sm:pt-32 pb-20 max-w-6xl">
        <header className="text-center mb-12">
          <p className="text-primary font-medium text-xs tracking-[0.25em] uppercase mb-3">Contact</p>
          <h1 className="font-heading text-3xl sm:text-4xl lg:text-5xl font-bold mb-4">Talk to our team</h1>
          <p className="text-muted-foreground text-base sm:text-lg max-w-2xl mx-auto">
            Questions about a course, corporate training, certificates, or partnerships? Send a message and we'll reply within one business day.
          </p>
        </header>

        <div className="grid grid-cols-1 lg:grid-cols-[1fr_360px] gap-8">
          <Card className="p-6 sm:p-8 border-border/60">
            {sent ? (
              <div className="text-center py-12">
                <div className="inline-flex h-12 w-12 items-center justify-center rounded-full bg-primary/10 text-primary mb-4">
                  <MessageSquare className="h-6 w-6" />
                </div>
                <h2 className="font-heading text-xl font-semibold mb-2">Thanks — we got it.</h2>
                <p className="text-muted-foreground text-sm mb-6">A member of the team will be in touch shortly.</p>
                <Button variant="outline" onClick={() => setSent(false)}>Send another message</Button>
              </div>
            ) : (
              <form onSubmit={submit} className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="name">Full name *</Label>
                    <Input id="name" value={form.name} required onChange={(e) => setForm({ ...form, name: e.target.value })} />
                  </div>
                  <div>
                    <Label htmlFor="email">Email *</Label>
                    <Input id="email" type="email" value={form.email} required onChange={(e) => setForm({ ...form, email: e.target.value })} />
                  </div>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="company">Company (optional)</Label>
                    <Input id="company" value={form.company} onChange={(e) => setForm({ ...form, company: e.target.value })} />
                  </div>
                  <div>
                    <Label htmlFor="phone">Phone (optional)</Label>
                    <Input id="phone" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
                  </div>
                </div>
                <div>
                  <Label htmlFor="message">How can we help? *</Label>
                  <Textarea id="message" rows={6} required value={form.message} onChange={(e) => setForm({ ...form, message: e.target.value })} />
                </div>
                <Button type="submit" disabled={sending} className="w-full sm:w-auto">
                  {sending ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Sending…</> : "Send message"}
                </Button>
              </form>
            )}
          </Card>

          <div className="space-y-4">
            <Card className="p-6 border-border/60">
              <h2 className="font-heading font-semibold mb-4">Reach us directly</h2>
              <ul className="space-y-3 text-sm">
                <li className="flex items-start gap-3"><MapPin className="h-4 w-4 text-primary mt-0.5" /><span>{address}</span></li>
                <li className="flex items-center gap-3"><Mail className="h-4 w-4 text-primary" /><a href={`mailto:${email}`} className="hover:text-primary break-all">{email}</a></li>
                <li className="flex items-center gap-3"><Phone className="h-4 w-4 text-primary" /><a href={`tel:${phone}`} className="hover:text-primary">{phone}</a></li>
              </ul>
            </Card>
            <Card className="p-6 border-border/60 bg-primary/5">
              <h2 className="font-heading font-semibold mb-2">For businesses</h2>
              <p className="text-sm text-muted-foreground mb-3">Looking for cohort or enterprise training?</p>
              <Button asChild variant="outline" size="sm" className="w-full"><a href="/for-businesses">Visit business page</a></Button>
            </Card>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
}