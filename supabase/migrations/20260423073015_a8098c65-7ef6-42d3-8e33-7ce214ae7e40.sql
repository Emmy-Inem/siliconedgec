-- Update site contact + social settings
INSERT INTO site_content (key, value, content_type) VALUES
  ('contact_address', '3rd floor, 86-90, Paul Street, London, EC2A 4NE', 'setting'),
  ('contact_phone', '+447741247592', 'setting'),
  ('contact_email', 'info@siliconedgec.com', 'setting'),
  ('whatsapp_number', '447741247592', 'setting'),
  ('social_facebook', 'https://www.facebook.com/share/1FjWv4J4E7/', 'setting'),
  ('social_twitter', 'https://x.com/SiliconEdgeCon', 'setting'),
  ('social_instagram', 'https://www.instagram.com/siliconedgeconsulting', 'setting'),
  ('social_linkedin', 'https://www.linkedin.com/company/siliconedgeconsulting/', 'setting'),
  ('social_tiktok', 'https://www.tiktok.com/@siliconedgeconsulting', 'setting')
ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value, updated_at = now();

-- Remove duplicate refund-policy slug, keep 'refund'
DELETE FROM cms_pages WHERE slug = 'refund-policy';

-- Upsert detailed CMS page content
INSERT INTO cms_pages (slug, title, status, show_in_footer, order_index, meta_description, content) VALUES
('about', 'About Us', 'published', true, 1,
 'Silicon Edge Consulting empowers professionals worldwide with live, instructor-led tech training in AI, Cloud, DevOps, Cybersecurity and Web Development.',
$$# About Silicon Edge Consulting

Silicon Edge Consulting is a global tech training company on a mission to close the digital skills gap by turning ambitious learners into job-ready technology professionals. We deliver live, instructor-led programs in Artificial Intelligence, Cloud Engineering, DevOps, Software Engineering, Cybersecurity, Data Science and Product/UI-UX Design.

## Our Story

We were founded by industry practitioners who watched too many talented people pay for courses they never finished, or finish courses that never led to a real job. Silicon Edge Consulting exists to fix both problems. Every program we run is built around three commitments: live human instruction, real hands-on projects, and structured career support that continues after the final class.

## Our Mission

To equip individuals and teams with practical, in-demand technology skills and the professional confidence to use them — through live cohorts, real-world projects, and verified certifications recognised by hiring managers.

## What Makes Us Different

- **Live, instructor-led classes** — no pre-recorded "set and forget" courses. You learn from working professionals who answer your questions in real time.
- **Built for completion** — small cohorts, weekly milestones, and tutor accountability mean students actually finish what they start.
- **Real projects, real portfolios** — every learner ships production-style projects they can show in interviews.
- **Career outcomes** — CV reviews, mock interviews, LinkedIn optimisation, and direct introductions to our hiring partners.
- **Verified certificates** — every certificate we issue is independently verifiable on our public portal.
- **Global community** — students join an active WhatsApp community and alumni network spanning the UK, Europe, Africa and North America.

## Who We Serve

- **Career switchers** breaking into tech for the first time.
- **Working professionals** levelling up into senior, cloud, AI or DevOps roles.
- **University students** preparing for graduate tech roles.
- **Companies and teams** that need bespoke upskilling through our For Businesses programme.

## Our Headquarters

Silicon Edge Consulting is headquartered in London, United Kingdom, with instructors and learners across multiple continents.

3rd floor, 86–90 Paul Street, London, EC2A 4NE, United Kingdom

## Contact Us

- Email: info@siliconedgec.com
- Phone / WhatsApp: +44 7741 247592

We'd love to hear from you — whether you're a learner, a hiring partner, or a company looking to train your team.$$
),
('privacy', 'Privacy Policy', 'published', true, 2,
 'How Silicon Edge Consulting collects, uses, stores and protects your personal information across our website and learning platform.',
$$# Privacy Policy

_Last updated: 23 April 2026_

Silicon Edge Consulting ("Silicon Edge", "we", "us", "our") respects your privacy and is committed to protecting your personal data. This Privacy Policy explains how we collect, use, share and safeguard information about you when you use our website, learning platform, and related services (together, the "Services").

By using the Services, you agree to the practices described in this Policy. If you do not agree, please do not use the Services.

## 1. Who We Are

Silicon Edge Consulting is the data controller for personal information processed under this Policy. Our registered address is 3rd floor, 86–90 Paul Street, London, EC2A 4NE, United Kingdom. You can reach us at info@siliconedgec.com.

## 2. Information We Collect

We collect information in three ways:

**a) Information you give us**
- Name, email address, phone / WhatsApp number, country
- Profile details, profession, experience level, learning goals
- Payment details processed via our payment partners (we do not store full card numbers)
- Course registrations, applications, business enquiries and support messages

**b) Information collected automatically**
- Device, browser, IP address, approximate location
- Pages viewed, time on page, referrer, UTM/campaign parameters
- Lesson progress, quiz attempts, certificates earned
- Cookies and similar technologies (see Section 7)

**c) Information from third parties**
- Authentication providers (e.g. Google sign-in)
- Payment processors confirming a transaction
- Marketing partners, influencers and referral sources

## 3. How We Use Your Information

We use your data to:
- Create and manage your account
- Deliver courses, live classes, certificates and learner support
- Process payments, refunds and invoices
- Send transactional emails (registration confirmations, receipts, course updates)
- Send marketing communications where you have opted in (you can unsubscribe at any time)
- Operate, secure and improve the Services
- Comply with legal, tax and regulatory obligations
- Detect and prevent fraud, abuse and security incidents

## 4. Legal Bases (UK GDPR / EU GDPR)

We process personal data under one or more of: performance of a contract, your consent, our legitimate interests (e.g. service security and improvement), and compliance with legal obligations.

## 5. Sharing Your Information

We do not sell your personal information. We share it only with:
- Trusted service providers (hosting, email delivery, analytics, payment processors)
- Instructors and tutors delivering your course, on a need-to-know basis
- Hiring partners, only with your explicit consent
- Authorities, where required by law

All providers are bound by contractual confidentiality and data protection obligations.

## 6. International Transfers

Your data may be processed outside the UK / EEA (for example by hosting or email providers in the United States). When this happens, we rely on appropriate safeguards such as Standard Contractual Clauses or equivalent mechanisms.

## 7. Cookies

We use essential cookies to operate the platform, and optional analytics / marketing cookies (only with your consent via our cookie banner). You can change your preferences at any time in your browser settings.

## 8. Data Retention

We keep your data only as long as needed to deliver the Services, comply with law, resolve disputes and enforce our agreements. Account data is typically retained while your account is active and for a reasonable period afterwards.

## 9. Your Rights

Subject to applicable law you have the right to:
- Access the personal data we hold about you
- Correct inaccurate data
- Request deletion of your data
- Object to or restrict certain processing
- Withdraw consent at any time
- Data portability
- Lodge a complaint with the UK Information Commissioner's Office (ICO) or your local supervisory authority

To exercise any of these rights, email info@siliconedgec.com.

## 10. Security

We implement technical and organisational measures (encryption in transit, access controls, role-based admin permissions, audit logging) to protect your data. No system is 100% secure, so we encourage strong unique passwords.

## 11. Children

The Services are intended for users aged 16 and above. We do not knowingly collect data from children under 16.

## 12. Changes to This Policy

We may update this Policy from time to time. Material changes will be notified via the platform or by email. The "Last updated" date above always reflects the current version.

## 13. Contact Us

For any privacy questions or to exercise your rights, contact:

Silicon Edge Consulting
3rd floor, 86–90 Paul Street, London, EC2A 4NE
Email: info@siliconedgec.com
Phone: +44 7741 247592$$
),
('terms', 'Terms of Service', 'published', true, 3,
 'The terms and conditions that govern your use of Silicon Edge Consulting''s website, courses, certificates and learning platform.',
$$# Terms of Service

_Last updated: 23 April 2026_

These Terms of Service ("Terms") form a binding agreement between you ("you", "the User") and Silicon Edge Consulting ("Silicon Edge", "we", "us", "our"). By creating an account, enrolling in a course, registering for a webinar or otherwise using our website and platform (the "Services"), you agree to these Terms.

If you do not agree, do not use the Services.

## 1. Eligibility

You must be at least 16 years old (or the age of digital consent in your jurisdiction) to use the Services. By using them you represent that the information you provide is accurate and that you have the legal capacity to enter into this agreement.

## 2. Your Account

- You are responsible for keeping your login credentials confidential.
- You are responsible for all activity that takes place under your account.
- One person, one account. Sharing accounts is prohibited.
- We may suspend or terminate accounts that violate these Terms.

## 3. Courses, Webinars and Live Classes

- Course schedules, instructors, syllabi and prices may change. We will give reasonable notice of material changes.
- Free webinars are subject to capacity. A registration is per user, per webinar, per cohort.
- Live classes are delivered via approved video conferencing tools. Attendance and recordings are governed by the platform rules and applicable law.
- We do not guarantee employment, salary outcomes, or visa sponsorship.

## 4. Payments and Pricing

- All prices are shown on the relevant course or pricing page and are typically in Nigerian Naira (₦), unless stated otherwise.
- Payments are processed by third-party providers (e.g. Paystack, Stripe). By paying, you also accept their terms.
- Discounts, promo codes and influencer offers are subject to their own validity rules and cannot be combined unless stated.

## 5. Refunds

Refund eligibility is governed by our Refund Policy, which forms part of these Terms.

## 6. Certificates

- Certificates are issued only after the requirements of the relevant course are met (e.g. attendance, project submission, passing quizzes).
- Each certificate is independently verifiable on our public verification portal.
- Misuse, forgery or misrepresentation of a Silicon Edge certificate may result in revocation and legal action.

## 7. Acceptable Use

You agree not to:
- Resell, redistribute or publicly share course materials, recordings or assessments
- Use the Services for unlawful, harmful, harassing or fraudulent activity
- Attempt to bypass security, scrape, reverse engineer or overload the platform
- Misrepresent yourself or impersonate others (including instructors and staff)
- Upload content that infringes intellectual property, privacy or other rights

## 8. Intellectual Property

All course content, branding, code, designs, certificates and platform features are owned by Silicon Edge Consulting or its licensors and are protected by copyright and other laws. We grant you a limited, personal, non-transferable, non-sublicensable licence to access enrolled content for your own learning. No other use is permitted without prior written consent.

## 9. User Content

You retain ownership of content you submit (e.g. project work, questions, reviews) but grant Silicon Edge a worldwide, royalty-free licence to host, display and use it for the purpose of operating and improving the Services.

## 10. Third-Party Services

The Services may link to or integrate third-party tools (e.g. cloud providers, video conferencing, payment processors, analytics). We are not responsible for the content, availability or practices of those third parties.

## 11. Disclaimers

The Services are provided "as is" and "as available" without warranties of any kind, whether express or implied, including warranties of merchantability, fitness for a particular purpose, and non-infringement, except as required by law.

## 12. Limitation of Liability

To the maximum extent permitted by law, Silicon Edge Consulting shall not be liable for indirect, incidental, special, consequential or punitive damages, or any loss of profits, revenue, data or goodwill arising from your use of the Services. Our total aggregate liability for any claim shall not exceed the amount you paid to Silicon Edge in the 12 months preceding the claim.

## 13. Indemnity

You agree to indemnify and hold harmless Silicon Edge Consulting and its staff against claims arising out of your breach of these Terms or misuse of the Services.

## 14. Termination

You may close your account at any time. We may suspend or terminate access for breach of these Terms, fraud, or where required by law. Sections that by their nature should survive termination (e.g. IP, liability, indemnity) will continue to apply.

## 15. Changes to These Terms

We may update these Terms from time to time. Continued use of the Services after a material change constitutes acceptance of the new Terms.

## 16. Governing Law

These Terms are governed by the laws of England and Wales. Disputes will be subject to the exclusive jurisdiction of the courts of England and Wales, unless mandatory consumer law in your country of residence provides otherwise.

## 17. Contact

Silicon Edge Consulting
3rd floor, 86–90 Paul Street, London, EC2A 4NE
Email: info@siliconedgec.com
Phone: +44 7741 247592$$
),
('refund', 'Refund Policy', 'published', true, 4,
 'Silicon Edge Consulting''s refund policy for paid courses, cohorts and live training programs, including eligibility windows and how to request a refund.',
$$# Refund Policy

_Last updated: 23 April 2026_

We want every learner to have a great experience at Silicon Edge Consulting. This Refund Policy explains when and how you can request a refund for a paid course or program. It applies to all paid Services purchased directly through siliconedgec.com.

## 1. 7-Day Satisfaction Window (Self-Paced & Pre-Cohort)

For paid courses and programs, you may request a full refund within **7 calendar days** of purchase, provided that:
- The cohort or live training has not yet started, **and**
- You have completed less than 20% of the course content (lessons, modules, recorded materials).

If both conditions are met, we will refund 100% of the amount paid (excluding non-refundable third-party processing fees where applicable).

## 2. After the Cohort Has Started

Once a live cohort or instructor-led program has officially begun:
- **Within the first 7 days of cohort start**: 50% refund, less any non-refundable third-party processing fees.
- **After the first 7 days**: No refund. You may request to defer your seat to the next available cohort once, subject to availability and an administrative fee.

## 3. Non-Refundable Items

The following are non-refundable:
- Free webinars (no payment is taken).
- Certificates that have already been issued or verified.
- Add-ons such as 1:1 mentoring sessions that have already been delivered.
- Promotional / discounted seats explicitly marked as final sale.
- Bundled cart purchases where any course in the bundle has already started or exceeded the 20% completion threshold.

## 4. Refunds for Technical Issues

If a Silicon Edge–side technical issue prevents you from accessing a paid course for an extended period and we are unable to resolve it, you are eligible for a pro-rata refund or course credit, regardless of the dates above.

## 5. Chargebacks

Please contact us before initiating a chargeback. Unjustified chargebacks may result in account suspension and the loss of access to all purchased content and certificates.

## 6. How to Request a Refund

Send a refund request to **info@siliconedgec.com** with:
- The email address used at purchase
- The course / cohort name
- The order or payment reference
- A short reason for the request

We aim to respond within **3 business days** and to process approved refunds within **7 to 14 business days** to your original payment method. The exact arrival time depends on your bank or payment provider.

## 7. Currency and Fees

Refunds are issued in the original currency and to the original payment method. Currency conversion losses, foreign-exchange fees and payment-processor fees charged by your bank are not refundable.

## 8. Updates to This Policy

We may update this Refund Policy from time to time. The "Last updated" date above always reflects the current version. Existing purchases are governed by the policy in effect at the time of purchase.

## 9. Contact

Silicon Edge Consulting
3rd floor, 86–90 Paul Street, London, EC2A 4NE
Email: info@siliconedgec.com
Phone: +44 7741 247592$$
)
ON CONFLICT (slug) DO UPDATE SET
  title = EXCLUDED.title,
  status = EXCLUDED.status,
  show_in_footer = EXCLUDED.show_in_footer,
  order_index = EXCLUDED.order_index,
  meta_description = EXCLUDED.meta_description,
  content = EXCLUDED.content,
  updated_at = now();