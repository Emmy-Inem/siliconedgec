import { motion } from "framer-motion";

type TechLogo = { name: string; src: string; tag: string };

const HERO_TECH_LOGOS: TechLogo[] = [
  { name: "AWS",          tag: "Cloud",  src: "https://upload.wikimedia.org/wikipedia/commons/9/93/Amazon_Web_Services_Logo.svg" },
  { name: "Azure",        tag: "Cloud",  src: "https://cdn.jsdelivr.net/gh/devicons/devicon/icons/azure/azure-original.svg" },
  { name: "Google Cloud", tag: "Cloud",  src: "https://cdn.jsdelivr.net/gh/devicons/devicon/icons/googlecloud/googlecloud-original.svg" },
  { name: "OpenAI",       tag: "AI",     src: "https://upload.wikimedia.org/wikipedia/commons/0/04/ChatGPT_logo.svg" },
  { name: "Gemini",       tag: "AI",     src: "https://upload.wikimedia.org/wikipedia/commons/8/8a/Google_Gemini_logo.svg" },
  { name: "TensorFlow",   tag: "ML",     src: "https://cdn.jsdelivr.net/gh/devicons/devicon/icons/tensorflow/tensorflow-original.svg" },
  { name: "Python",       tag: "Code",   src: "https://cdn.jsdelivr.net/gh/devicons/devicon/icons/python/python-original.svg" },
  { name: "React",        tag: "Web",    src: "https://cdn.jsdelivr.net/gh/devicons/devicon/icons/react/react-original.svg" },
  { name: "Docker",       tag: "DevOps", src: "https://cdn.jsdelivr.net/gh/devicons/devicon/icons/docker/docker-original.svg" },
  { name: "Kubernetes",   tag: "DevOps", src: "https://cdn.jsdelivr.net/gh/devicons/devicon/icons/kubernetes/kubernetes-plain.svg" },
  { name: "GitHub",       tag: "Code",   src: "https://cdn.jsdelivr.net/gh/devicons/devicon/icons/github/github-original.svg" },
  { name: "TypeScript",   tag: "Code",   src: "https://cdn.jsdelivr.net/gh/devicons/devicon/icons/typescript/typescript-original.svg" },
];

/** Two slow orbital marquee rows of tech logos (top drifts right, bottom drifts left).
 * Frames the hero headline without crowding it; logos are always in motion. */
export function FloatingTechLogos() {
  type Pos = {
    top: string;
    left: string;
    size: number;        // px
    rot: number;         // initial rotation
    delay: number;       // float anim delay
    mobile?: boolean;    // show on mobile too
  };

  const positions: Pos[] = [
    { top: "10%", left: "6%",  size: 56, rot: -8,  delay: 0,    mobile: true },
    { top: "22%", left: "86%", size: 60, rot:  6,  delay: 0.4,  mobile: true },
    { top: "60%", left: "4%",  size: 52, rot:  4,  delay: 0.8,  mobile: true },
    { top: "70%", left: "88%", size: 56, rot: -6,  delay: 1.2,  mobile: true },
    { top: "4%",  left: "44%", size: 48, rot:  3,  delay: 0.2 },
    { top: "32%", left: "16%", size: 50, rot: -4,  delay: 0.6 },
    { top: "30%", left: "78%", size: 50, rot:  5,  delay: 1.0 },
    { top: "78%", left: "20%", size: 54, rot:  7,  delay: 0.3 },
    { top: "82%", left: "70%", size: 50, rot: -5,  delay: 0.9 },
    { top: "50%", left: "92%", size: 44, rot:  4,  delay: 1.4 },
    { top: "55%", left: "2%",  size: 44, rot: -7,  delay: 1.6 },
    { top: "16%", left: "70%", size: 48, rot: -3,  delay: 0.5 },
  ];

  const items = HERO_TECH_LOGOS.slice(0, positions.length).map((logo, i) => ({
    logo,
    pos: positions[i],
  }));

  return (
    <div className="pointer-events-none absolute inset-0" aria-hidden="true">
      {items.map(({ logo, pos }, i) => (
        <motion.div
          key={logo.name}
          initial={{ opacity: 0, scale: 0.6, rotate: pos.rot }}
          animate={{
            opacity: 1,
            scale: 1,
            y: [0, -10, 0],
            rotate: [pos.rot, pos.rot + 3, pos.rot],
          }}
          transition={{
            opacity: { duration: 0.6, delay: 0.2 + i * 0.04 },
            scale: { duration: 0.6, delay: 0.2 + i * 0.04, ease: "easeOut" },
            y: { duration: 6 + (i % 4), repeat: Infinity, ease: "easeInOut", delay: pos.delay },
            rotate: { duration: 6 + (i % 4), repeat: Infinity, ease: "easeInOut", delay: pos.delay },
          }}
          style={{
            top: pos.top,
            left: pos.left,
            width: pos.size,
            height: pos.size,
            willChange: "transform",
          }}
          className="absolute rounded-2xl bg-white border border-primary/10 shadow-[0_10px_30px_-14px_hsl(var(--primary)/0.4)] p-2.5 hidden md:flex items-center justify-center"
          title={logo.name}
        >
          <img
            src={logo.src}
            alt={logo.name}
            loading="eager"
            className="max-w-full max-h-full object-contain"
            onError={(e) => {
              (e.currentTarget as HTMLImageElement).style.display = "none";
            }}
          />
        </motion.div>
      ))}
    </div>
  );
}
