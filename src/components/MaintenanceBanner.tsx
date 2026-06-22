import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Wrench } from "lucide-react";

export function MaintenanceBanner() {
  const [data, setData] = useState<{ enabled: boolean; message: string } | null>(null);

  useEffect(() => {
    (async () => {
      const { data } = await supabase.from("site_content").select("value").eq("key", "maintenance_mode").maybeSingle();
      if (data?.value) {
        try { setData(JSON.parse(data.value as any)); } catch {}
      }
    })();
  }, []);

  if (!data?.enabled) return null;

  return (
    <div className="bg-amber-500/10 border-b border-amber-500/30 text-amber-200 text-sm py-2 px-4 text-center flex items-center justify-center gap-2">
      <Wrench className="h-4 w-4" />
      <span>{data.message}</span>
    </div>
  );
}