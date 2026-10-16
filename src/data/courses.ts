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
    id: "ai-beginners-llm-productivity",
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
  {
    id: "ai-fundamentals",
    title: "AI & Machine Learning Fundamentals",
    description: "Master the core concepts of AI and ML. Build real-world models with Python, TensorFlow, and scikit-learn in this hands-on, instructor-led program.",
    category: "Artificial Intelligence & Machine Learning",
    price: 450,
    difficulty: "Beginner",
    durationHours: 40,
    thumbnailUrl: "",
    instructorName: "Dr. Amina Okafor",
    instructorAvatar: "",
    rating: 4.8,
    studentsEnrolled: 1240,
    learningOutcomes: [
      "Understand supervised and unsupervised learning algorithms",
      "Build and deploy ML models using Python",
      "Work with real-world datasets and feature engineering",
      "Implement neural networks with TensorFlow/Keras",
      "Evaluate model performance and optimize hyperparameters",
    ],
    instructorBio: "Dr. Amina Okafor is an AI researcher with 12+ years of experience in machine learning and natural language processing. She has published over 30 papers and led AI teams at leading tech companies.",
    modules: [
      { id: "m1", title: "Introduction to AI & ML", lessons: [{ id: "l1", title: "What is Artificial Intelligence?", duration: "45 min" }, { id: "l2", title: "Types of Machine Learning", duration: "60 min" }, { id: "l3", title: "Setting Up Your Environment", duration: "30 min" }] },
      { id: "m2", title: "Supervised Learning", lessons: [{ id: "l4", title: "Linear Regression Deep Dive", duration: "90 min" }, { id: "l5", title: "Classification Algorithms", duration: "75 min" }, { id: "l6", title: "Decision Trees & Random Forests", duration: "60 min" }] },
      { id: "m3", title: "Deep Learning Foundations", lessons: [{ id: "l7", title: "Neural Network Architecture", duration: "90 min" }, { id: "l8", title: "Building with TensorFlow", duration: "120 min" }, { id: "l9", title: "Capstone Project", duration: "180 min" }] },
    ],
  },
  {
    id: "aws-cloud-architect",
    title: "AWS Cloud Solutions Architect",
    description: "Prepare for the AWS Solutions Architect certification. Learn to design resilient, high-performing, secure, and cost-optimized architectures.",
    category: "Cloud Engineering",
    price: 550,
    difficulty: "Intermediate",
    durationHours: 60,
    thumbnailUrl: "",
    instructorName: "Chidi Nwankwo",
    instructorAvatar: "",
    rating: 4.9,
    studentsEnrolled: 980,
    learningOutcomes: [
      "Design multi-tier architectures on AWS",
      "Implement secure identity and access management",
      "Optimize cost and performance at scale",
      "Deploy fault-tolerant and highly available systems",
      "Pass the AWS Solutions Architect Associate exam",
    ],
    instructorBio: "Chidi Nwankwo is a 5x AWS certified architect who has designed cloud infrastructure for Fortune 500 companies. He brings hands-on project experience to every lesson.",
    modules: [
      { id: "m1", title: "AWS Fundamentals", lessons: [{ id: "l1", title: "Cloud Computing Overview", duration: "45 min" }, { id: "l2", title: "AWS Global Infrastructure", duration: "60 min" }] },
      { id: "m2", title: "Compute & Networking", lessons: [{ id: "l3", title: "EC2 & Auto Scaling", duration: "90 min" }, { id: "l4", title: "VPC Deep Dive", duration: "75 min" }] },
      { id: "m3", title: "Storage & Databases", lessons: [{ id: "l5", title: "S3 & Glacier", duration: "60 min" }, { id: "l6", title: "RDS & DynamoDB", duration: "90 min" }] },
    ],
  },
  {
    id: "devops-cicd",
    title: "DevOps Engineering & CI/CD Mastery",
    description: "Learn end-to-end DevOps practices. Master Docker, Kubernetes, Jenkins, Terraform, and build production-grade CI/CD pipelines.",
    category: "DevOps",
    price: 500,
    difficulty: "Intermediate",
    durationHours: 50,
    thumbnailUrl: "",
    instructorName: "Emeka Adeyemi",
    instructorAvatar: "",
    rating: 4.7,
    studentsEnrolled: 760,
    learningOutcomes: [
      "Containerize applications with Docker",
      "Orchestrate at scale with Kubernetes",
      "Build CI/CD pipelines with Jenkins & GitHub Actions",
      "Infrastructure as Code with Terraform",
      "Monitor and observe production systems",
    ],
    instructorBio: "Emeka Adeyemi is a senior DevOps engineer with experience at top fintech and SaaS companies. He has automated deployments for systems serving millions of users.",
    modules: [
      { id: "m1", title: "DevOps Culture & Practices", lessons: [{ id: "l1", title: "What is DevOps?", duration: "30 min" }, { id: "l2", title: "Version Control Best Practices", duration: "45 min" }] },
      { id: "m2", title: "Containers & Orchestration", lessons: [{ id: "l3", title: "Docker Fundamentals", duration: "90 min" }, { id: "l4", title: "Kubernetes in Production", duration: "120 min" }] },
    ],
  },
  {
    id: "data-science-python",
    title: "Data Science with Python",
    description: "From data wrangling to visualization and statistical modeling. Become a data-driven problem solver using Python's powerful ecosystem.",
    category: "Data Engineering",
    price: 400,
    difficulty: "Beginner",
    durationHours: 45,
    thumbnailUrl: "",
    instructorName: "Fatima Hassan",
    instructorAvatar: "",
    rating: 4.6,
    studentsEnrolled: 1500,
    learningOutcomes: [
      "Wrangle and clean data with Pandas",
      "Create compelling visualizations with Matplotlib & Seaborn",
      "Apply statistical analysis to real datasets",
      "Build predictive models with scikit-learn",
      "Present data-driven insights effectively",
    ],
    instructorBio: "Fatima Hassan is a data scientist and educator who has trained over 5,000 students across Africa. Her teaching style emphasizes practical, real-world applications.",
    modules: [
      { id: "m1", title: "Python for Data Science", lessons: [{ id: "l1", title: "NumPy Essentials", duration: "60 min" }, { id: "l2", title: "Pandas Masterclass", duration: "90 min" }] },
      { id: "m2", title: "Data Visualization", lessons: [{ id: "l3", title: "Matplotlib Deep Dive", duration: "75 min" }, { id: "l4", title: "Interactive Dashboards", duration: "60 min" }] },
    ],
  },
  {
    id: "cybersecurity-essentials",
    title: "Cybersecurity Analyst Bootcamp",
    description: "Learn to protect organizations from cyber threats. Covers network security, ethical hacking, incident response, and compliance frameworks.",
    category: "Cybersecurity",
    price: 600,
    difficulty: "Expert",
    durationHours: 70,
    thumbnailUrl: "",
    instructorName: "Oluwaseun Bello",
    instructorAvatar: "",
    rating: 4.9,
    studentsEnrolled: 620,
    learningOutcomes: [
      "Identify and mitigate common attack vectors",
      "Perform penetration testing ethically",
      "Implement security monitoring and SIEM",
      "Respond to and recover from security incidents",
      "Understand compliance frameworks (ISO 27001, NIST)",
    ],
    instructorBio: "Oluwaseun Bello is a certified ethical hacker (CEH) and cybersecurity consultant. He has helped secure infrastructure for banks and government agencies across West Africa.",
    modules: [
      { id: "m1", title: "Security Fundamentals", lessons: [{ id: "l1", title: "Threat Landscape Overview", duration: "45 min" }, { id: "l2", title: "Network Security Basics", duration: "75 min" }] },
      { id: "m2", title: "Ethical Hacking", lessons: [{ id: "l3", title: "Reconnaissance Techniques", duration: "90 min" }, { id: "l4", title: "Exploitation & Post-Exploitation", duration: "120 min" }] },
    ],
  },
  {
    id: "fullstack-react",
    title: "Full-Stack Web Development with React",
    description: "Build modern, production-ready web applications. Master React, Node.js, PostgreSQL, and deploy to the cloud with confidence.",
    category: "Programming & Software Development",
    price: 480,
    difficulty: "Intermediate",
    durationHours: 55,
    thumbnailUrl: "",
    instructorName: "Ngozi Eze",
    instructorAvatar: "",
    rating: 4.8,
    studentsEnrolled: 2100,
    learningOutcomes: [
      "Build responsive UIs with React and TypeScript",
      "Design RESTful APIs with Node.js and Express",
      "Work with PostgreSQL and Prisma ORM",
      "Implement authentication and authorization",
      "Deploy full-stack apps to production",
    ],
    instructorBio: "Ngozi Eze is a full-stack developer and bootcamp instructor. She has built products used by millions and mentored hundreds of developers into their first tech roles.",
    modules: [
      { id: "m1", title: "React Foundations", lessons: [{ id: "l1", title: "Components & Props", duration: "60 min" }, { id: "l2", title: "State Management", duration: "75 min" }] },
      { id: "m2", title: "Backend Development", lessons: [{ id: "l3", title: "REST API Design", duration: "90 min" }, { id: "l4", title: "Database Integration", duration: "75 min" }] },
    ],
  },
];
