import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Trophy, Zap } from "lucide-react";
import { motion } from "framer-motion";

const BADGES = [
  { points: 0, label: "Newcomer", color: "from-slate-500 to-slate-700" },
  { points: 100, label: "Apprentice", color: "from-cyan-500 to-blue-600" },
  { points: 500, label: "Practitioner", color: "from-violet-500 to-purple-700" },
  { points: 1000, label: "Specialist", color: "from-amber-500 to-rose-500" },
  { points: 2500, label: "Master", color: "from-emerald-500 to-teal-600" },
];

export function XpBadge({ userId }: { userId: string }) {
  const { data } = useQuery({
    queryKey: ["user-xp", userId],
    queryFn: async () => {
      const { data, error } = await supabase.rpc("get_user_xp", { p_user_id: userId });
      if (error) return { total_points: 0, level: 1 };
      return (data as any)?.[0] ?? { total_points: 0, level: 1 };
    },
  });
  const points = Number(data?.total_points ?? 0);
  const level = Number(data?.level ?? 1);
  const current = [...BADGES].reverse().find((b) => points >= b.points) ?? BADGES[0];
  const next = BADGES.find((b) => b.points > points);
  const progress = next ? Math.min(100, ((points - current.points) / (next.points - current.points)) * 100) : 100;

  return (
    <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
      className={`rounded-2xl border border-border/60 bg-gradient-to-br ${current.color} text-white p-4 md:p-5`}>
      <div className="flex items-center gap-3">
        <div className="h-11 w-11 rounded-xl bg-white/20 flex items-center justify-center"><Trophy className="h-5 w-5" /></div>
        <div className="flex-1 min-w-0">
          <p className="text-[11px] uppercase tracking-[0.18em] opacity-80">Level {level} · {current.label}</p>
          <p className="font-heading text-2xl font-bold flex items-center gap-1.5"><Zap className="h-5 w-5" />{points} XP</p>
        </div>
      </div>
      <div className="mt-3 h-1.5 rounded-full bg-white/20 overflow-hidden">
        <div className="h-full bg-white" style={{ width: `${progress}%` }} />
      </div>
      <p className="text-[11px] opacity-80 mt-1.5">{next ? `${next.points - points} XP to ${next.label}` : "Max level reached"}</p>
    </motion.div>
  );
}