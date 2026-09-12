import React, { useRef } from "react";
import { motion, useMotionValue, useSpring, useTransform, useReducedMotion } from "framer-motion";

export function TiltCollage({ instructors }: { instructors: { name: string; role: string; image: string }[] }) {
  const ref = useRef<HTMLDivElement>(null);
  const mx = useMotionValue(0);
  const my = useMotionValue(0);
  const rotX = useSpring(useTransform(my, [-0.5, 0.5], [8, -8]), { stiffness: 120, damping: 12 });
  const rotY = useSpring(useTransform(mx, [-0.5, 0.5], [-10, 10]), { stiffness: 120, damping: 12 });
  const reduce = useReducedMotion();

  const handle = (e: React.MouseEvent<HTMLDivElement>) => {
    if (reduce || !ref.current) return;
    const r = ref.current.getBoundingClientRect();
    mx.set((e.clientX - r.left) / r.width - 0.5);
    my.set((e.clientY - r.top) / r.height - 0.5);
  };
  const reset = () => { mx.set(0); my.set(0); };

  const cards = instructors.slice(0, 4);
  const positions = [
    { top: "0%",  left: "8%",  rot: -6, z: 30, w: "55%", delay: 0.1 },
    { top: "10%", left: "48%", rot: 5,  z: 20, w: "48%", delay: 0.2 },
    { top: "48%", left: "0%",  rot: -3, z: 25, w: "50%", delay: 0.3 },
    { top: "52%", left: "52%", rot: 7,  z: 15, w: "46%", delay: 0.4 },
  ];

  return (
    <div ref={ref} onMouseMove={handle} onMouseLeave={reset} className="relative w-full aspect-square max-w-[520px] mx-auto" style={{ perspective: 1200 }}>
      <div className="absolute inset-[12%] rounded-full bg-primary/10 blur-3xl" />

      <motion.div style={{ rotateX: rotX, rotateY: rotY, transformStyle: "preserve-3d" }} className="absolute inset-0">
        {cards.map((inst, i) => {
          const p = positions[i];
          return (
            <motion.div
              key={inst.name + i}
              initial={{ opacity: 0, y: 40, rotate: 0 }}
              animate={{ opacity: 1, y: 0, rotate: p.rot }}
              transition={{ delay: p.delay, type: "spring", stiffness: 70, damping: 14 }}
              whileHover={{ scale: 1.05, rotate: 0, zIndex: 50 }}
              className="absolute rounded-2xl overflow-hidden border border-border/40 shadow-2xl glass-card"
              style={{ top: p.top, left: p.left, width: p.w, zIndex: p.z, transform: `translateZ(${p.z}px)` }}
            >
              <img src={inst.image} alt={inst.name} className="w-full aspect-[4/5] object-cover" />
              <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent p-3">
                <p className="text-white text-xs font-semibold leading-tight">{inst.name}</p>
                <p className="text-white/70 text-[10px]">{inst.role}</p>
              </div>
            </motion.div>
          );
        })}
      </motion.div>
    </div>
  );
}
