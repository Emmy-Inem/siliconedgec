import { useLocation } from "react-router-dom";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { SEO } from "@/components/SEO";
import { Card } from "@/components/ui/card";
import { useSiteSettings } from "@/hooks/useSiteSettings";

type LegalKey = "terms" | "privacy" | "refund" | "cookie";

const META: Record<LegalKey, { title: string; description: string; heading: string }> = {
  terms: {
    title: "Terms of Service",
    description: "The terms and conditions for using Silicon Edge Consulting's website, courses, and services.",
    heading: "Terms of Service",
  },
  privacy: {
    title: "Privacy Policy",
    description: "How Silicon Edge Consulting collects, uses, stores, and protects your personal data.",
    heading: "Privacy Policy",
  },
  refund: {
    title: "Refund Policy",
    description: "Our refund and cancellation policy for paid courses, cohorts, and subscriptions.",
    heading: "Refund & Cancellation Policy",
  },
  cookie: {
    title: "Cookie Policy",
    description: "How we use cookies and similar technologies on the Silicon Edge Consulting website.",
    heading: "Cookie Policy",
  },
};

function resolveKey(pathname: string): LegalKey {
  if (pathname.startsWith("/privacy")) return "privacy";
  if (pathname.startsWith("/refund")) return "refund";
  if (pathname.startsWith("/cookie")) return "cookie";
  return "terms";
}

const H = ({ children }: { children: React.ReactNode }) => (
  <h2 className="font-heading text-xl sm:text-2xl font-semibold text-foreground mt-8 mb-3">{children}</h2>
);
const P = ({ children }: { children: React.ReactNode }) => (
  <p className="text-sm sm:text-base text-muted-foreground leading-relaxed mb-3">{children}</p>
);
const UL = ({ children }: { children: React.ReactNode }) => (
  <ul className="list-disc pl-6 text-sm sm:text-base text-muted-foreground leading-relaxed space-y-1 mb-3">{children}</ul>
);

function Body({ k, brand, email }: { k: LegalKey; brand: string; email: string }) {
  if (k === "terms") {
    return (
      <>
        <P>Welcome to {brand}. By accessing or using our website, online courses, live classes, and related services (the "Services"), you agree to be bound by these Terms of Service.</P>
        <H>1. Eligibility & accounts</H>
        <P>You must be at least 16 years old to create an account. You are responsible for the accuracy of the information you provide and for maintaining the confidentiality of your credentials.</P>
        <H>2. Course access & licence</H>
        <P>On purchase or free enrollment, we grant you a non-exclusive, non-transferable, revocable licence to access course content for personal, non-commercial learning. You may not redistribute, resell, scrape, mirror, or share course materials, recordings, or assets.</P>
        <H>3. Payments</H>
        <P>Prices are listed in Nigerian Naira (₦) unless stated otherwise. Payments are processed by Paystack and/or Stripe. By paying you authorise us and our processors to charge the applicable amount, taxes, and fees.</P>
        <H>4. Cohorts, live classes & schedule changes</H>
        <P>Live sessions may be rescheduled. We will give reasonable notice and provide recordings where feasible.</P>
        <H>5. Acceptable use</H>
        <UL>
          <li>No harassment, hate speech, or illegal content.</li>
          <li>No reverse engineering, scraping, or attempts to bypass security.</li>
          <li>No sharing of your account, certificates, or paid content.</li>
        </UL>
        <H>6. Certificates</H>
        <P>Certificates are issued only when course-completion requirements are met. They verify completion of training and are not regulated qualifications.</P>
        <H>7. Intellectual property</H>
        <P>All content, trademarks, logos, and platform code are owned by {brand} or its licensors. Your submissions remain yours; you grant us a licence to host and display them as needed to operate the Services.</P>
        <H>8. Termination</H>
        <P>We may suspend or terminate accounts that breach these Terms. You may close your account at any time from your account settings.</P>
        <H>9. Disclaimers & liability</H>
        <P>The Services are provided "as is". To the maximum extent permitted by law, {brand} disclaims all implied warranties and is not liable for indirect or consequential losses. Our aggregate liability is limited to the amount you paid us in the 12 months before the event.</P>
        <H>10. Governing law</H>
        <P>These Terms are governed by the laws of the Federal Republic of Nigeria, without regard to conflict-of-law principles.</P>
        <H>11. Contact</H>
        <P>Questions about these Terms? Email <a href={`mailto:${email}`} className="text-primary hover:underline">{email}</a>.</P>
      </>
    );
  }
  if (k === "privacy") {
    return (
      <>
        <P>This Privacy Policy explains how {brand} collects, uses, and protects information when you use our Services. We comply with the Nigeria Data Protection Act (NDPA) and apply GDPR-equivalent practices for international learners.</P>
        <H>1. Data we collect</H>
        <UL>
          <li><strong>Account data:</strong> name, email, password hash, avatar.</li>
          <li><strong>Learning data:</strong> enrollments, progress, quiz attempts, certificates.</li>
          <li><strong>Commerce data:</strong> orders, payment references (full card data never touches our servers).</li>
          <li><strong>Usage data:</strong> pages viewed, device, IP address, UTM parameters.</li>
        </UL>
        <H>2. How we use data</H>
        <UL>
          <li>Deliver and improve the Services.</li>
          <li>Process payments and issue certificates and receipts.</li>
          <li>Send transactional emails and (with consent) marketing updates.</li>
          <li>Detect fraud, abuse, and security incidents.</li>
        </UL>
        <H>3. Legal bases</H>
        <P>We process data under contract (to deliver courses), legitimate interests (platform security, analytics), consent (marketing, optional cookies), and legal obligation (tax/accounting).</P>
        <H>4. Sharing</H>
        <P>We share data only with processors who help us run the Services: Supabase (database/auth), Paystack/Stripe (payments), Google (analytics, with consent), and email providers. We do not sell personal data.</P>
        <H>5. International transfers</H>
        <P>Some processors operate outside Nigeria. We rely on standard contractual clauses and processor-level safeguards.</P>
        <H>6. Retention</H>
        <P>We retain account and learning data while your account is active and for up to 7 years after closure for tax and audit purposes. You may request earlier deletion (subject to legal retention).</P>
        <H>7. Your rights</H>
        <UL>
          <li>Access, correct, or export your data.</li>
          <li>Request erasure or restriction of processing.</li>
          <li>Withdraw consent at any time.</li>
          <li>Lodge a complaint with the NDPC or your local data authority.</li>
        </UL>
        <P>To exercise any right, email <a href={`mailto:${email}`} className="text-primary hover:underline">{email}</a>.</P>
        <H>8. Security</H>
        <P>We use TLS in transit, encrypted storage at rest, role-based access controls, and Row-Level Security on all user data.</P>
        <H>9. Changes</H>
        <P>We will post material changes here and, where required, notify you by email.</P>
      </>
    );
  }
  if (k === "refund") {
    return (
      <>
        <P>We want you to be confident in your purchase. This policy explains when and how refunds are issued.</P>
        <H>1. 7-day money-back window</H>
        <P>For self-paced course purchases, you may request a full refund within 7 days of purchase, provided you have completed less than 25% of the course content.</P>
        <H>2. Live cohorts & instructor-led classes</H>
        <P>Refunds for live cohorts are available up to 48 hours before the first scheduled session. After the cohort starts, fees are non-refundable, but you may transfer your seat to a future cohort once at no extra cost.</P>
        <H>3. Bundles & learning paths</H>
        <P>Bundles are refundable only if no course in the bundle has been started.</P>
        <H>4. Subscriptions</H>
        <P>Subscriptions can be cancelled at any time; cancellation stops future renewals. Past billing periods are not refundable.</P>
        <H>5. Promotional & free seats</H>
        <P>Discounted seats redeemed via promo codes, scholarships, or partner programs are not refundable.</P>
        <H>6. How to request a refund</H>
        <P>Email <a href={`mailto:${email}`} className="text-primary hover:underline">{email}</a> with your order reference. Approved refunds are returned to the original payment method within 5–10 business days.</P>
        <H>7. Chargebacks</H>
        <P>Please contact us before initiating a chargeback — most disputes can be resolved within 48 hours.</P>
      </>
    );
  }
  return (
    <>
      <P>This Cookie Policy explains what cookies and similar technologies {brand} uses, why we use them, and how you can control them.</P>
      <H>1. What are cookies?</H>
      <P>Cookies are small text files placed on your device when you visit a website. We also use localStorage and similar browser storage.</P>
      <H>2. Categories we use</H>
      <UL>
        <li><strong>Essential:</strong> required for sign-in, cart, security, and saving your consent choice. Cannot be disabled.</li>
        <li><strong>Analytics:</strong> aggregate measurement via Google Analytics 4 to improve the platform.</li>
        <li><strong>Marketing:</strong> measure ad performance and personalise messages — only set if you accept "All cookies".</li>
      </UL>
      <H>3. Your choices</H>
      <P>You will see a cookie banner on your first visit. You can accept all cookies or only essential cookies. You can change your choice at any time by clearing the <code>se_cookie_consent</code> key in your browser storage; the banner will reappear.</P>
      <H>4. Third parties</H>
      <P>Cookies may also be set by Paystack/Stripe at checkout (for fraud prevention) and by embedded video players. These are governed by those providers' own policies.</P>
      <H>5. Contact</H>
      <P>Questions? Email <a href={`mailto:${email}`} className="text-primary hover:underline">{email}</a>.</P>
    </>
  );
}

export default function Legal() {
  const { pathname } = useLocation();
  const { data: settings } = useSiteSettings();
  const key = resolveKey(pathname);
  const meta = META[key];
  const brand = settings?.site_name || "Silicon Edge Consulting";
  const email = settings?.contact_email || "info@siliconedgec.com";

  return (
    <div className="min-h-screen bg-background">
      <SEO title={`${meta.title} | ${brand}`} description={meta.description} canonical={`https://www.siliconedgec.com${pathname}`} />
      <Header />
      <main className="container mx-auto px-5 sm:px-6 py-12 sm:py-16 max-w-3xl">
        <header className="mb-8">
          <p className="text-xs uppercase tracking-widest text-primary mb-2">Legal</p>
          <h1 className="font-heading text-3xl sm:text-4xl font-bold text-foreground">{meta.heading}</h1>
          <p className="text-sm text-muted-foreground mt-2">Last updated: {new Date().toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" })}</p>
        </header>
        <Card className="p-6 sm:p-8 border-border/60">
          <Body k={key} brand={brand} email={email} />
        </Card>
      </main>
      <Footer />
    </div>
  );
}