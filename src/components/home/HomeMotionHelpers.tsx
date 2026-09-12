import React, { useState, useEffect, useRef } from "react";
import { motion, useInView, useMotionValue, useSpring, useReducedMotion } from "framer-motion";
import { Button } from "@/components/ui/button";

export function useTypewriter(words: string[], typeSpeed = 90, deleteSpeed = 45, pause = 1500) {
  const [text, setText] = useState("");
  const [wordIndex, setWordIndex] = useState(0);
  const [phase, setPhase] = useState<"typing" | "pausing" | "deleting">("typing");

  useEffect(() => {
    if (!words || words.length === 0) return;
    const word = words[wordIndex % words.length] ?? "";

    if (phase === "pausing") {
      const t = setTimeout(() => setPhase("deleting"), pause);
      return () => clearTimeout(t);
    }

    if (phase === "typing") {
      if (text === word) {
        setPhase("pausing");
        return;
      }
      const t = setTimeout(() => {
        setText(word.slice(0, text.length + 1));
      }, typeSpeed);
      return () => clearTimeout(t);
    }

    // deleting
    if (text === "") {
      setWordIndex((i) => (i + 1) % words.length);
      setPhase("typing");
      return;
    }
    const t = setTimeout(() => {
      setText(word.slice(0, text.length - 1));
    }, deleteSpeed);
    return () => clearTimeout(t);
  }, [text, wordIndex, phase, words, typeSpeed, deleteSpeed, pause]);

  return text;
}

export function CountUp({ target, duration = 1.8, suffix = "" }: { target: number; duration?: number; suffix?: string }) {
  const [count, setCount] = useState(0);
  const ref = useRef<HTMLSpanElement>(null);
  const inView = useInView(ref, { once: true, margin: "-40px" });
  useEffect(() => {
    if (!inView) return;
    let raf = 0;
    const start = performance.now();
    const tick = (now: number) => {
      const p = Math.min((now - start) / (duration * 1000), 1);
      const eased = 1 - Math.pow(1 - p, 3);
      setCount(Math.floor(eased * target));
      if (p < 1) raf = requestAnimationFrame(tick);
      else setCount(target);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [inView, target, duration]);
  return <span ref={ref}>{count.toLocaleString()}{suffix}</span>;
}

export function MagneticButton({ children, className = "", asChild = false, ...rest }: React.ComponentProps<typeof Button>) {
  const ref = useRef<HTMLDivElement>(null);
  const x = useMotionValue(0);
  const y = useMotionValue(0);
  const sx = useSpring(x, { stiffness: 200, damping: 15 });
  const sy = useSpring(y, { stiffness: 200, damping: 15 });
  const reduce = useReducedMotion();

  const handleMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (reduce || !ref.current) return;
    const r = ref.current.getBoundingClientRect();
    x.set((e.clientX - (r.left + r.width / 2)) * 0.25);
    y.set((e.clientY - (r.top + r.height / 2)) * 0.25);
  };
  const handleLeave = () => { x.set(0); y.set(0); };

  return (
    <motion.div ref={ref} onMouseMove={handleMove} onMouseLeave={handleLeave} style={{ x: sx, y: sy }} className="inline-block">
      <Button asChild={asChild} className={className} {...rest}>{children}</Button>
    </motion.div>
  );
}

export const staggerContainer = { hidden: {}, show: { transition: { staggerChildren: 0.08 } } };
export const staggerItem = {
  hidden: { opacity: 0, y: 18 },
  show: { opacity: 1, y: 0, transition: { type: "tween" as const, ease: "easeOut" as const, duration: 0.5 } },
};
export const sectionReveal = {
  initial: { opacity: 0, y: 24 },
  whileInView: { opacity: 1, y: 0 },
  viewport: { once: true, margin: "-60px" },
  transition: { duration: 0.55, ease: "easeOut" as const },
};
