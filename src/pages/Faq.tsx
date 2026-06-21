import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { SEO } from "@/components/SEO";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";

const FAQS = [
  { q: "How are courses delivered?", a: "All cohorts are live, instructor-led sessions held on Zoom with recordings available afterwards in the student dashboard." },
  { q: "Do I get a certificate?", a: "Yes. On completion you receive a verifiable certificate with a public verification URL." },
  { q: "What payment methods do you accept?", a: "We accept card payments via Paystack in Naira. Invoices are available for corporate enrollments." },
  { q: "Can I get a refund?", a: "Yes, within 7 days of your first session if you have not completed more than 20% of the curriculum." },
  { q: "Is there job placement support?", a: "Every paid program includes resume reviews, mock interviews, and introductions to our hiring partners." },
  { q: "Do you train teams?", a: "Yes — visit our For Businesses page for cohort pricing and a custom curriculum." },
  { q: "What if I miss a class?", a: "Sessions are recorded and posted within 24 hours. You can also attend the same lesson in the next cohort." },
  { q: "Are there prerequisites?", a: "Most beginner tracks have none. Advanced tracks list prerequisites on the course page." },
];

export default function Faq() {
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: FAQS.map((f) => ({
      "@type": "Question",
      name: f.q,
      acceptedAnswer: { "@type": "Answer", text: f.a },
    })),
  };

  return (
    <div className="min-h-screen bg-background">
      <SEO title="Frequently Asked Questions" description="Answers about courses, certificates, payments, refunds, and team training." canonical="/faq" jsonLd={jsonLd} />
      <Header />
      <main className="container mx-auto px-5 sm:px-6 py-16 max-w-3xl">
        <h1 className="font-heading text-4xl font-bold mb-3">Frequently Asked Questions</h1>
        <p className="text-muted-foreground mb-8">Everything you need to know before enrolling.</p>
        <Accordion type="single" collapsible className="w-full">
          {FAQS.map((f, i) => (
            <AccordionItem key={i} value={`item-${i}`}>
              <AccordionTrigger className="text-left">{f.q}</AccordionTrigger>
              <AccordionContent className="text-muted-foreground">{f.a}</AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>
      </main>
      <Footer />
    </div>
  );
}