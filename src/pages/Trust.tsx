import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { SEO } from "@/components/SEO";
import { Card } from "@/components/ui/card";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { ShieldCheck, Lock, Database, Cookie, UserCheck, Mail, Server, FileText } from "lucide-react";
import { useSiteSettings } from "@/hooks/useSiteSettings";


const Section = ({
  icon: Icon,
  title,
  children,
}: {
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  children: React.ReactNode;
}) => (
  <Card className="p-6 sm:p-8 border-border/60">
    <div className="flex items-center gap-3 mb-4">
      <div className="w-10 h-10 rounded-lg bg-primary/10 text-primary flex items-center justify-center">
        <Icon className="h-5 w-5" />
      </div>
      <h2 className="font-heading text-xl sm:text-2xl font-semibold text-foreground">{title}</h2>
    </div>
    <div className="text-sm sm:text-base text-muted-foreground leading-relaxed space-y-3">
      {children}
    </div>
  </Card>
);

export default function Trust() {
  const { data: settings } = useSiteSettings();
  const brand = settings?.site_name || "Silicon Edge Consulting";
  const securityEmail = settings?.contact_email || "info@siliconedgec.com";

  const faqs = [
    {
      q: "How do I sign in to the platform?",
      a: `Learners and staff sign in with email and password or with Google. Passwords are handled by our managed authentication provider and are never stored in plain text by ${brand}.`,
    },
    {
      q: "How is my data protected?",
      a: `Row-level security policies are enabled on user-facing tables so learners can only read and modify their own records. Administrative actions are restricted to staff with the appropriate role, and sensitive operations such as payment confirmation run in server-side functions.`,
    },
    {
      q: `What payment information does ${brand} store?`,
      a: `Card and bank details are entered directly into our payment partners (Paystack and Stripe) and are not stored on our servers. We retain order references, amounts, and status to issue receipts and resolve disputes.`,
    },
    {
      q: "Does the site use cookies?",
      a: `We use a small number of cookies to keep you signed in, remember your cart, and measure how the site is used. A cookie banner lets you accept or decline non-essential analytics and marketing cookies.`,
    },
    {
      q: "How can I request a copy of or delete my data?",
      a: `Email ${securityEmail} to ask for access, correction, portability, or deletion. We will honour valid requests after verifying your identity and aim to acknowledge security and privacy reports within a few business days.`,
    },
  ];

  const sameAs = [
    settings?.social_facebook,
    settings?.social_twitter,
    settings?.social_instagram,
    settings?.social_linkedin,
    settings?.social_youtube,
    settings?.social_tiktok,
  ].filter(Boolean) as string[];

  const origin = "https://siliconedgec.com";

  const jsonLd = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "Organization",
        "@id": `${origin}/#organization`,
        name: brand,
        url: origin,
        email: securityEmail,
        description: `${brand} delivers live, instructor-led training in AI, Cloud, DevOps and more, helping professionals build job-ready tech skills.`,
        ...(sameAs.length ? { sameAs } : {}),
      },
      {
        "@type": "WebPage",
        "@id": `${origin}/trust`,
        url: `${origin}/trust`,
        name: `Trust, Security & Privacy | ${brand}`,
        description: `How ${brand} protects your account, learning data, and payments — authentication, hosting, data handling, cookies, and how to contact us about security or privacy.`,
        isPartOf: { "@id": `${origin}/#organization` },
      },
      {
        "@type": "FAQPage",
        mainEntity: faqs.map((f) => ({
          "@type": "Question",
          name: f.q,
          acceptedAnswer: { "@type": "Answer", text: f.a },
        })),
      },
    ],
  };

  return (

    <div className="min-h-screen bg-background">
      <SEO
        title="Trust, Security & Privacy"
        description={`How ${brand} protects your account, learning data, and payments — authentication, hosting, data handling, cookies, and how to contact us about security or privacy.`}
        jsonLd={jsonLd}
      />

      <Header />

      <main className="container mx-auto px-5 sm:px-6 pt-28 sm:pt-32 pb-20 max-w-4xl">
        <header className="mb-10 sm:mb-12">
          <p className="text-primary font-medium text-xs tracking-[0.25em] uppercase mb-4">Trust Center</p>
          <h1 className="font-heading text-3xl sm:text-4xl lg:text-5xl font-bold text-foreground mb-4">
            Trust, security &amp; privacy at {brand}
          </h1>
          <p className="text-muted-foreground text-base sm:text-lg leading-relaxed">
            This page is maintained by {brand} to answer common security and privacy questions about our learning platform. It describes the controls currently in place and the practices we follow. It is editable project content and is not an independent certification or audit.
          </p>
          <p className="text-xs text-muted-foreground/80 mt-4">
            Last updated: {new Date().toLocaleDateString("en-GB", { year: "numeric", month: "long", day: "numeric" })}
          </p>
        </header>

        <div className="space-y-6">
          <Section icon={UserCheck} title="Accounts &amp; authentication">
            <p>
              Learners and staff sign in with email and password or with Google. Passwords are handled by our managed authentication provider and are never stored in plain text by {brand}.
            </p>
            <p>
              Administrative areas are gated by role-based access control. Repeated failed sign-in attempts are rate-limited, and suspicious IPs can be blocked by our team.
            </p>
          </Section>

          <Section icon={Server} title="Platform &amp; hosting">
            <p>
              The application is built on Lovable Cloud, which provisions a managed Postgres database, authentication, file storage, and serverless functions. Traffic to the site is served over HTTPS.
            </p>
            <p>
              {brand} configures the application, access rules, and integrations on top of that platform. Platform-level availability, patching, and infrastructure security are the responsibility of the underlying providers.
            </p>
          </Section>

          <Section icon={Database} title="Data we collect &amp; how it is used">
            <p>
              We collect the information you provide when you create an account, enroll in a course, submit a business or job-application form, or contact support — typically your name, email, phone number (when given), and the courses and progress associated with your account.
            </p>
            <p>
              We use this information to deliver the courses you signed up for, issue certificates, respond to your requests, send service and marketing communications you have opted into, and improve the platform. We do not sell your personal data.
            </p>
          </Section>

          <Section icon={Lock} title="Access controls in the database">
            <p>
              Row-level security policies are enabled on user-facing tables so that learners can only read and modify their own records. Administrative and moderator actions are restricted to staff accounts with the appropriate role.
            </p>
            <p>
              Sensitive operations such as payment confirmation are performed by server-side functions using elevated credentials that are never exposed to the browser.
            </p>
          </Section>

          <Section icon={FileText} title="Payments">
            <p>
              Card and bank payments are processed by our payment partners (including Paystack and Stripe). Card numbers and bank credentials are entered directly into the payment provider and are not stored on our servers. We retain order references, amounts, and status so we can issue receipts and resolve disputes.
            </p>
          </Section>

          <Section icon={Cookie} title="Cookies &amp; analytics">
            <p>
              We use a small number of cookies and similar technologies to keep you signed in, remember your cart, and measure how the site is used so we can improve it. A cookie banner lets you accept or decline non-essential analytics and marketing cookies.
            </p>
            <p>
              Analytics may include Google Analytics 4 and internal usage logging. We do not knowingly use these tools to build profiles for third-party advertising.
            </p>
          </Section>

          <Section icon={ShieldCheck} title="Retention, deletion &amp; your rights">
            <p>
              We retain your account data while your account is active and for a reasonable period afterwards so we can answer questions about your enrollments and certificates. You can ask us to update or delete your account by emailing the address below.
            </p>
            <p>
              Where local law gives you additional rights — such as access, correction, portability, or objection — we will honour valid requests after verifying your identity.
            </p>
          </Section>

          <Section icon={Mail} title="Security &amp; privacy contact">
            <p>
              To report a suspected security issue, request a copy of your data, or ask a privacy question, email{" "}
              <a href={`mailto:${securityEmail}`} className="text-primary underline underline-offset-2 hover:no-underline">
                {securityEmail}
              </a>
              . Please include enough detail for us to reproduce or investigate the issue. We aim to acknowledge security reports within a few business days.
            </p>
            <p>
              We ask security researchers to test only against accounts they own, avoid actions that could degrade service for other users, and give us a reasonable opportunity to remediate before public disclosure.
            </p>
          </Section>
        </div>

        <section className="mt-14 sm:mt-16">
          <h2 className="font-heading text-xl sm:text-2xl font-semibold text-foreground mb-4">
            Common security and privacy questions
          </h2>
          <Accordion type="single" collapsible className="w-full">
            {faqs.map((f, i) => (
              <AccordionItem key={i} value={`item-${i}`} className="border-border/60">
                <AccordionTrigger className="text-left text-sm sm:text-base font-medium hover:no-underline">
                  {f.q}
                </AccordionTrigger>
                <AccordionContent className="text-sm sm:text-base text-muted-foreground leading-relaxed">
                  {f.a}
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </section>

        <p className="text-xs text-muted-foreground/80 mt-10 leading-relaxed">
          This page describes practices and controls currently in place at {brand}. It is not a regulatory certification and does not replace our terms of service or privacy policy. We update it as the platform evolves.
        </p>

      </main>

      <Footer />
    </div>
  );
}