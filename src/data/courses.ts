import { Star, Clock, BarChart3, User } from "lucide-react";

export interface Course {
  id: string;
  slug?: string;
  title: string;
  description: string;
  longDescription?: string;
  category: string;
  price: number;
  discountPrice?: number;
  difficulty: "Beginner" | "Intermediate" | "Expert";
  durationHours: number;
  thumbnailUrl: string;
  instructorName: string | null;
  instructorAvatar: string;
  rating: number | null;
  studentsEnrolled: number | null;
  modules: Module[];
  learningOutcomes: string[];
  whatsIncluded?: string[];
  instructorBio: string;
  isPublished?: boolean;
  whoIsThisFor?: string[];
  prerequisites?: string;
  requirements?: string[];
}

export interface Module {
  id: string;
  title: string;
  lessons: { id: string; title: string; duration: string; description?: string }[];
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
    title: "AI for Beginners: Mastering LLMs & Generative AI for Workplace Productivity",
    description: "Demystify Large Language Models (ChatGPT, Claude, Gemini, DeepSeek). Master prompt engineering frameworks and build practical workflows for daily work, research, synthesis, writing, and spreadsheet tasks.",
    longDescription: "Explore generative AI and Large Language Models in a beginner-friendly, hands-on course without complicated mathematics or programming jargon. Learn how ChatGPT, Claude, Gemini, and DeepSeek work, practise prompt engineering, and build workflows for writing, document synthesis, and custom AI assistants for your job.",
    category: "Artificial Intelligence & Machine Learning",
    price: 45000,
    discountPrice: 75000,
    difficulty: "Beginner",
    durationHours: 24,
    thumbnailUrl: "https://images.unsplash.com/photo-1677442136019-21780ecad995?auto=format&fit=crop&w=1200&q=80",
    instructorName: null,
    instructorAvatar: "",
    rating: null,
    studentsEnrolled: null,
    isPublished: true,
    whoIsThisFor: [
      "Working Professionals & Executives looking to eliminate busywork and automate reports, emails, and presentations",
      "Founders, Freelancers & Solopreneurs who need a 24/7 AI-powered team to draft copy, research competitors, and ideate",
      "Researchers, Lawyers, & Analysts needing to synthesize massive 100+ page PDFs, extract data, and spot trends quickly",
      "Non-Technical Creators & Students wanting a competitive edge in their career without learning complex code",
    ],
    prerequisites: "None! No coding, mathematics, or technical background required. Just a laptop, an internet connection, and curiosity.",
    requirements: [
      "A computer or tablet with modern web browser",
      "Free account on ChatGPT (chatgpt.com), Claude (claude.ai), or Google Gemini (gemini.google.com)",
      "Zero prior AI or coding experience needed",
    ],
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
      "Prompt Engineering Cheat Sheet and Workplace Prompt Templates",
      "Weekly hands-on labs: Document synthesis, Excel automation, and custom GPT creation",
      "Live Q&A sessions with AI practitioners and peer accountability group",
      "Lifetime access to updated lessons as new frontier models are released",
      "Verified Certificate of Completion from Silicon Edge Consulting",
    ],
    instructorBio: "",
    modules: [
      {
        id: "m1",
        title: "Module 1: Demystifying AI & Large Language Models (LLMs)",
        lessons: [
          {
            id: "l1",
            title: "Welcome to the AI Era: What LLMs Can (and Cannot) Do for You",
            duration: "25 min",
            description: "Orientation to modern generative AI, setting realistic expectations, and mapping the top productivity use cases across industries.",
          },
          {
            id: "l2",
            title: "How LLMs Work: Tokens, Probabilities, and Context Windows Simplified",
            duration: "35 min",
            description: "Understand tokens, parameters, and context limits using intuitive visual analogies without mathematical formulas.",
          },
          {
            id: "l3",
            title: "Comparing Frontier Models: ChatGPT, Claude, Gemini & DeepSeek",
            duration: "40 min",
            description: "A comprehensive breakdown of leading models, their strengths, weaknesses, reasoning abilities, and when to pick which tool.",
          },
          {
            id: "l4",
            title: "Setting Up Your Personal AI Productivity Workspace",
            duration: "30 min",
            description: "Configure your browser, extensions, keyboard shortcuts, and custom instructions for lightning-fast daily access.",
          },
        ],
      },
      {
        id: "m2",
        title: "Module 2: Prompt Engineering for Better Results",
        lessons: [
          {
            id: "l5",
            title: "The Core Framework: Context, Task, Instructions, and Format",
            duration: "45 min",
            description: "Master the CTIF prompt formula to turn vague, generic AI outputs into executive-ready deliverables on your first try.",
          },
          {
            id: "l6",
            title: "Advanced Techniques: Few-Shot Examples and Persona / Role Assignment",
            duration: "40 min",
            description: "Learn how to supply high-quality examples and adopt specific expert personas (CFO, Senior Copywriter, Management Consultant).",
          },
          {
            id: "l7",
            title: "Chain-of-Thought & Step-by-Step Reasoning for Complex Decisions",
            duration: "45 min",
            description: "Unlock superior analytical thinking from models by forcing deliberation, hypothesis testing, and multi-step evaluation.",
          },
          {
            id: "l8",
            title: "Eliminating Hallucinations: Verification Strategies and Source Grounding",
            duration: "35 min",
            description: "Bulletproof your results against fake facts by forcing citation grounding, constraint adherence, and critical cross-checking.",
          },
        ],
      },
      {
        id: "m3",
        title: "Module 3: Workplace Productivity with LLMs",
        lessons: [
          {
            id: "l9",
            title: "High-Speed Writing: Emails, Proposals, Reports, and Executive Summaries",
            duration: "50 min",
            description: "Draft polished, persuasive professional communication in seconds, maintaining your personal voice and tone.",
          },
          {
            id: "l10",
            title: "Deep Reading & Synthesis: Summarizing 50-page PDFs and Research in Minutes",
            duration: "45 min",
            description: "Upload dense documents, contracts, and financial reports; extract key risks, takeaways, and action items effortlessly.",
          },
          {
            id: "l11",
            title: "Spreadsheet Magic: Excel & Google Sheets Formulas, Macros, and Data Cleaning",
            duration: "55 min",
            description: "Generate complex nested formulas, regex queries, and python/macro scripts simply by describing what you need in plain English.",
          },
          {
            id: "l12",
            title: "Everyday Coding & Scripting for Non-Developers",
            duration: "60 min",
            description: "Automate repetitive computer tasks, parse CSV files, and scrape public information without needing a computer science degree.",
          },
        ],
      },
      {
        id: "m4",
        title: "Module 4: Custom AI Assistants & Ethical Best Practices",
        lessons: [
          {
            id: "l13",
            title: "Building Custom GPTs and Claude Projects with Knowledge Files",
            duration: "60 min",
            description: "Create specialized AI tools tailored to your exact team guidelines, tone of voice, product specs, and company SOPs.",
          },
          {
            id: "l14",
            title: "Data Privacy, Enterprise Security, and Confidentiality Protocols",
            duration: "35 min",
            description: "How to safely use AI with corporate data, opt out of model training, and navigate workplace policies ethically.",
          },
          {
            id: "l15",
            title: "Capstone Project: Designing Your Personal AI Productivity System",
            duration: "90 min",
            description: "Build an end-to-end AI workflow that automates your most time-consuming weekly responsibility and submit for verification.",
          },
        ],
      },
    ],
  },
];
