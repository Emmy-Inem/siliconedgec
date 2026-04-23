import { ReactNode, useEffect } from "react";
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
  const initial = params.get("tab") || defaultTab || tabs[0]?.value;

  useEffect(() => {
    if (!params.get("tab") && initial) {
      const next = new URLSearchParams(params);
      next.set("tab", initial);
      setParams(next, { replace: true });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleChange = (value: string) => {
    const next = new URLSearchParams(params);
    next.set("tab", value);
    setParams(next, { replace: true });
  };

  return (
    <div className="space-y-5">
      <div>
        <h1 className="font-heading text-2xl font-bold">{title}</h1>
        {description && <p className="text-sm text-muted-foreground">{description}</p>}
      </div>
      <Tabs value={initial} onValueChange={handleChange} className="w-full">
        <div className="overflow-x-auto -mx-4 px-4 sm:mx-0 sm:px-0 scrollbar-thin">
          <TabsList className="h-auto inline-flex w-max justify-start gap-1 bg-muted/60 p-1">
            {tabs.map((t) => (
              <TabsTrigger
                key={t.value}
                value={t.value}
                className="text-xs sm:text-sm whitespace-nowrap shrink-0"
              >
                {t.label}
              </TabsTrigger>
            ))}
          </TabsList>
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