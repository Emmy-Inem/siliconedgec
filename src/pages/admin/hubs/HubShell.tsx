import { ReactNode, useEffect, useState, useRef } from "react";
import { useSearchParams } from "react-router-dom";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";

export interface HubTab {
  value: string;
  label: string;
  content: ReactNode;
}

interface Props {
  title: string;
  description?: string;
  tabs: HubTab[];
  defaultTab?: string;
}

export function HubShell({ title, description, tabs, defaultTab }: Props) {
  const [params, setParams] = useSearchParams();
  const fallback = defaultTab || tabs[0]?.value;
  const isValid = (v: string | null) => !!v && tabs.some((t) => t.value === v);
  const fromUrl = params.get("tab");
  // Local state drives the Tabs component so taps respond instantly on mobile,
  // even before the URL round-trip resolves. The URL is the secondary source of
  // truth and is kept in sync with replaceState.
  const [active, setActive] = useState<string>(isValid(fromUrl) ? (fromUrl as string) : fallback);
  const lastSyncedRef = useRef<string>(active);

  // Sync FROM URL → local state (handles back/forward + first paint with ?tab=…)
  useEffect(() => {
    if (isValid(fromUrl) && fromUrl !== active) {
      setActive(fromUrl as string);
      lastSyncedRef.current = fromUrl as string;
    } else if (!fromUrl) {
      // Ensure URL reflects the chosen default so deep-links/refresh work
      const next = new URLSearchParams(params);
      next.set("tab", active);
      setParams(next, { replace: true });
      lastSyncedRef.current = active;
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fromUrl]);

  const handleChange = (value: string) => {
    if (!isValid(value)) return;
    setActive(value); // immediate UI update — critical for mobile taps
    if (lastSyncedRef.current === value) return;
    lastSyncedRef.current = value;
    const next = new URLSearchParams(params);
    next.set("tab", value);
    setParams(next, { replace: true });
  };

  return (
    <div className="space-y-4 sm:space-y-5">
      <div>
        <h1 className="font-heading text-xl sm:text-2xl font-bold">{title}</h1>
        {description && <p className="text-xs sm:text-sm text-muted-foreground">{description}</p>}
      </div>
      <Tabs value={active} onValueChange={handleChange} className="w-full">
        <div className="sticky top-0 z-10 -mx-3 sm:-mx-6 px-3 sm:px-6 py-2 bg-background/85 backdrop-blur border-b border-border/60">
          <div className="overflow-x-auto scrollbar-thin">
            <TabsList className="h-auto inline-flex w-max justify-start gap-1 bg-muted/60 p-1">
              {tabs.map((t) => (
                <TabsTrigger
                  key={t.value}
                  value={t.value}
                  className="text-xs sm:text-sm whitespace-nowrap shrink-0 min-h-9 px-3 touch-manipulation"
                >
                  {t.label}
                </TabsTrigger>
              ))}
            </TabsList>
          </div>
        </div>
        {tabs.map((t) => (
          <TabsContent key={t.value} value={t.value} className="mt-4">
            {t.content}
          </TabsContent>
        ))}
      </Tabs>
    </div>
  );
}