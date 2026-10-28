export const COACH_WHATSAPP_URL = "https://wa.me/447741247592";

export function getCoachContext(path: string) {
  const page = path.split(/[?#]/)[0];
  const sections: [RegExp, string, string, string[]][] = [
    [/^\/for-businesses/, "Team training", "I can help you plan training for your team. Business enquiries do not require an account.", ["How can we arrange training for our team?", "Can you tailor training to our business?", "What should I include in my training enquiry?"]],
    [/^\/cart/, "Your checkout", "Need help with checkout, payment options or a promo code?", ["Which payment options are available in my region?", "How do I apply a promo code?", "What happens after payment?"]],
    [/^\/courses\/[^/]+/, "This course", "Ask about this course’s skills, prerequisites, projects and next steps.", ["Who is this course suitable for?", "What will I learn on this course?", "How do I enroll in this course?"]],
    [/^\/courses/, "Find your course", "Tell me your background and goal, and I’ll help you compare courses.", ["Which course fits my experience?", "Help me compare cloud, AI and data courses", "Where should a beginner start?"]],
    [/^\/(paths|learning-paths)/, "Your learning path", "Let’s work out a practical learning sequence for your goal.", ["Which learning path suits my career goal?", "What should I learn first?", "How do courses in this path fit together?"]],
    [/^\/pricing/, "Tuition and payment", "I can explain published prices and available payment information.", ["What is included in the tuition?", "Are installment plans available?", "How does regional currency pricing work?"]],
    [/^\/(certificates|verify)/, "Certificates", "I can help you understand course certificates and public verification.", ["How can I verify a certificate?", "What are the certificate requirements?", "Is a course certificate the same as a vendor certification?"]],
    [/^\/(career|jobs)/, "Career opportunities", "Explore published opportunities and career support. I won’t promise a job outcome.", ["What career support is available?", "How do I apply for a listed role?", "Tell me about the partner programme"]],
    [/^\/blog/, "Insights and guides", "Ask me to explain this article or connect its topic to relevant training.", ["Summarise this article", "What should I learn next on this topic?", "Which courses relate to this topic?"]],
    [/^\/instructors/, "Meet the instructors", "Ask about the published instructor profiles and their assigned courses.", ["What does this instructor teach?", "Tell me about the published instructor experience", "How are classes delivered?"]],
    [/^\/(help|support|contact)/, "Help and support", "I can help with public guidance or connect you to the team on WhatsApp.", ["How can I contact the team?", "I need help with course access", "Where can I find the published policies?"]],
    [/^\/about/, "About Silicon Edge", "Learn about Silicon Edge Consulting’s training and approach.", ["What does Silicon Edge Consulting do?", "How is the training delivered?", "How can I contact Silicon Edge?"]],
  ];
  const match = sections.find(([pattern]) => pattern.test(page));
  return { path: page, label: match?.[1] ?? "Your learning goals", greeting: match?.[2] ?? "Tell me what you want to achieve. I’ll help you explore Silicon Edge Consulting’s training and services.", suggestions: match?.[3] ?? ["Help me choose a course", "What does Silicon Edge Consulting offer?", "I’m looking for training for my team"] };
}
