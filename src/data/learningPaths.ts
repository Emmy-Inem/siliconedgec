export interface CuratedLearningPath {
  id: string;
  title: string;
  description: string;
  level: string;
  hours: number;
  courseCount: number;
  courses: {
    id: string;
    slug: string;
    title: string;
    difficulty: string;
    duration: string;
    description: string;
    thumbnailUrl?: string;
  }[];
}

export const CURATED_LEARNING_PATHS: CuratedLearningPath[] = [
  {
    id: "ai-generative-productivity-track",
    title: "Artificial Intelligence & Generative AI Career Track",
    description:
      "Master Large Language Models (ChatGPT, Claude, Gemini, DeepSeek), prompt engineering frameworks, and generative AI workflows to automate workplace tasks and build custom AI assistants.",
    level: "Beginner friendly",
    hours: 24,
    courseCount: 1,
    courses: [
      {
        id: "a11b0001-1111-4000-8000-000000000001",
        slug: "ai-beginners-llm-productivity",
        title: "AI for Beginners: Mastering LLMs & Generative AI for 10x Productivity",
        difficulty: "Beginner",
        duration: "24h",
        description:
          "Demystify Large Language Models (ChatGPT, Claude, Gemini, DeepSeek). Master prompt engineering frameworks and build real-world productivity workflows.",
        thumbnailUrl: "https://images.unsplash.com/photo-1677442136019-21780ecad995?auto=format&fit=crop&w=1200&q=80",
      },
    ],
  },
  {
    id: "cloud-engineering-accelerator-track",
    title: "Cloud Engineering & DevOps Accelerator Track",
    description:
      "From Linux and cloud fundamentals to containerization, Kubernetes, CI/CD pipelines, and multi-cloud infrastructure on Azure and AWS.",
    level: "Beginner to Intermediate",
    hours: 48,
    courseCount: 1,
    courses: [
      {
        id: "3b1f29ec-8fd4-4ff0-9357-1987b90e6c91",
        slug: "cloud-engineering-accelerator-4-week-hands-on-bootcamp",
        title: "Cloud Engineering Accelerator: 4-Week Hands-On Bootcamp",
        difficulty: "Intermediate",
        duration: "48h",
        description:
          "Fast-track your cloud career with real-world infrastructure provisioning, automation, and enterprise deployment.",
        thumbnailUrl: "https://images.unsplash.com/photo-1451187580459-43490279c0fa?auto=format&fit=crop&w=1200&q=80",
      },
    ],
  },
  {
    id: "data-engineering-analytics-track",
    title: "Data Engineering & Modern Analytics Track",
    description:
      "Build scalable data pipelines, data warehouses, streaming analytics, and business intelligence solutions using SQL, Python, and cloud big data services.",
    level: "All levels",
    hours: 36,
    courseCount: 1,
    courses: [
      {
        id: "data-eng-core-01",
        slug: "data-engineering-foundations",
        title: "Modern Data Engineering with Python, SQL & Cloud Data Lakes",
        difficulty: "Beginner",
        duration: "36h",
        description:
          "Design robust ETL/ELT pipelines, model relational and analytical databases, and automate data transformations.",
        thumbnailUrl: "https://images.unsplash.com/photo-1551288049-bebda4e38f71?auto=format&fit=crop&w=1200&q=80",
      },
    ],
  },
  {
    id: "cybersecurity-cloud-defense-track",
    title: "Cybersecurity & Cloud Defense Track",
    description:
      "Protect enterprise digital assets, conduct vulnerability assessments, implement zero-trust architecture, and master modern incident response.",
    level: "Beginner to Intermediate",
    hours: 30,
    courseCount: 1,
    courses: [
      {
        id: "cyber-defense-01",
        slug: "cybersecurity-fundamentals",
        title: "Enterprise Cybersecurity & Cloud Defense Fundamentals",
        difficulty: "Beginner",
        duration: "30h",
        description:
          "Learn practical threat modeling, network security, IAM policies, and cloud hardening techniques.",
        thumbnailUrl: "https://images.unsplash.com/photo-1563986768609-322da13575f3?auto=format&fit=crop&w=1200&q=80",
      },
    ],
  },
];
