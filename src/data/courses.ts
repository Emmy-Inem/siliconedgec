import { Star, Clock, BarChart3, User } from "lucide-react";

export interface Course {
  id: string;
  slug?: string;
  title: string;
  description: string;
  category: string;
  price: number;
  discountPrice?: number;
  difficulty: "Beginner" | "Intermediate" | "Expert";
  durationHours: number;
  thumbnailUrl: string;
  instructorName: string;
  instructorAvatar: string;
  rating: number;
  studentsEnrolled: number;
  modules: Module[];
  learningOutcomes: string[];
  whatsIncluded?: string[];
  instructorBio: string;
  isPublished?: boolean;
}

export interface Module {
  id: string;
  title: string;
  lessons: { id: string; title: string; duration: string }[];
}

export const categories = [
  "All",
  "Cloud Engineering",
  "DevOps",
  "Cybersecurity",
  "Programming & Software Development",
  "Data Engineering",
  "Artificial Intelligence & Machine Learning",
];

export const courses: Course[] = [
  {
    id: "a11b0001-1111-4000-8000-000000000001",
    slug: "ai-beginners-llm-productivity",
    title: "AI for Beginners: Mastering LLMs & Generative AI for 10x Productivity",
    description: "Demystify Large Language Models (ChatGPT, Claude, Gemini, DeepSeek). Master prompt engineering frameworks and build real-world productivity workflows to automate daily work, research, synthesis, writing, and spreadsheet tasks. Save 10+ hours every week and supercharge your everyday productivity.",
    category: "Artificial Intelligence & Machine Learning",
    price: 45000,
    discountPrice: 75000,
    difficulty: "Beginner",
    durationHours: 24,
    thumbnailUrl: "https://images.unsplash.com/photo-1677442136019-21780ecad995?auto=format&fit=crop&w=1200&q=80",
    instructorName: "Dr. Amina Okafor",
    instructorAvatar: "",
    rating: 4.9,
    studentsEnrolled: 840,
    isPublished: true,
    learningOutcomes: [
      "Understand LLM fundamentals: tokens, context windows, and model reasoning without technical jargon",
      "Master core prompt engineering frameworks: Few-Shot, Role Prompting, Chain-of-Thought, and Output Constraints",
      "Automate repetitive daily writing: high-impact emails, business proposals, executive summaries, and reports",
      "Extract insights from long documents, analyze messy PDFs, and write advanced spreadsheet formulas in seconds",
      "Build custom AI assistants and GPTs with knowledge bases tailored to your specific workflow or company",
      "Protect confidential data, avoid hallucinations, and follow safe, ethical AI workplace guidelines",
    ],
    whatsIncluded: [
      "24 hours of interactive lessons, practical walkthroughs, and case studies",
      "Prompt Engineering Cheat Sheet + 50+ Copy-Paste Workplace Prompt Templates",
      "Weekly hands-on labs: Document synthesis, Excel automation, and custom GPT creation",
      "Live Q&A sessions with AI practitioners and peer accountability group",
      "Lifetime access to updated lessons as new frontier models are released",
      "Verified Certificate of Completion from Silicon Edge Consulting",
    ],
    instructorBio: "Dr. Amina Okafor is an AI researcher and consultant with 12+ years of experience in natural language processing and applied generative AI systems.",
    modules: [
      {
        id: "m1",
        title: "Demystifying AI & Large Language Models (LLMs)",
        lessons: [
          { id: "l1", title: "Welcome to the AI Era: What LLMs Can (and Cannot) Do for You", duration: "25 min" },
          { id: "l2", title: "How LLMs Work: Tokens, Probabilities, and Context Windows Simplified", duration: "35 min" },
          { id: "l3", title: "Comparing Frontier Models: ChatGPT, Claude, Gemini & DeepSeek", duration: "40 min" },
          { id: "l4", title: "Setting Up Your Personal AI Productivity Workspace", duration: "30 min" },
        ],
      },
      {
        id: "m2",
        title: "Prompt Engineering: The Skill That Unlocks 10x Quality",
        lessons: [
          { id: "l5", title: "The Core Framework: Context, Task, Instructions, and Format", duration: "45 min" },
          { id: "l6", title: "Advanced Techniques: Few-Shot Examples and Persona / Role Assignment", duration: "40 min" },
          { id: "l7", title: "Chain-of-Thought & Step-by-Step Reasoning for Complex Decisions", duration: "45 min" },
          { id: "l8", title: "Eliminating Hallucinations: Verification Strategies and Source Grounding", duration: "35 min" },
        ],
      },
      {
        id: "m3",
        title: "10x Workplace Productivity with LLMs",
        lessons: [
          { id: "l9", title: "High-Speed Writing: Emails, Proposals, Reports, and Executive Summaries", duration: "50 min" },
          { id: "l10", title: "Deep Reading & Synthesis: Summarizing 50-page PDFs and Research in Minutes", duration: "45 min" },
          { id: "l11", title: "Spreadsheet Magic: Excel & Google Sheets Formulas, Macros, and Data Cleaning", duration: "55 min" },
          { id: "l12", title: "Everyday Coding & Scripting for Non-Developers", duration: "60 min" },
        ],
      },
      {
        id: "m4",
        title: "Custom AI Assistants & Ethical Best Practices",
        lessons: [
          { id: "l13", title: "Building Custom GPTs and Claude Projects with Knowledge Files", duration: "60 min" },
          { id: "l14", title: "Data Privacy, Enterprise Security, and Confidentiality Protocols", duration: "35 min" },
          { id: "l15", title: "Capstone Project: Designing Your Personal AI Productivity System", duration: "90 min" },
        ],
      },
    ],
  },
];
