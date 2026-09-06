import { ReactNode, useEffect, useState, useRef, useId } from "react";
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
  const headingId = useId();
  const descId = useId();
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
        <h1 id={headingId} className="font-heading text-xl sm:text-2xl font-bold">{title}</h1>
        {description && <p id={descId} className="text-xs sm:text-sm text-muted-foreground">{description}</p>}
      </div>
      <Tabs
        value={active}
        onValueChange={handleChange}
        className="w-full"
        // Roving-tabindex behaviour from Radix is preserved; we add a
        // semantic label so screen readers announce which hub the tablist
        // belongs to (e.g. "Analytics, tab list, 7 tabs").
        activationMode="manual"
      >
        <div className="-mx-3 sm:-mx-6 px-3 sm:px-6 py-2 bg-background/85 backdrop-blur border-b border-border/60">
          <div className="overflow-x-auto scrollbar-thin">
            <TabsList
              aria-labelledby={headingId}
              aria-describedby={description ? descId : undefined}
              className="h-auto inline-flex w-max justify-start gap-1 bg-muted/60 p-1"
            >
              {tabs.map((t) => (
                <TabsTrigger
                  key={t.value}
                  value={t.value}
                  // a11y:
                  //  - min-h-11 / min-w-11 hits the WCAG 2.5.5 (target size) AAA
                  //    44x44px touch target on mobile.
                  //  - touch-manipulation removes the 300ms tap delay on iOS.
                  //  - explicit focus-visible ring so keyboard users see focus
                  //    even when the trigger is the active tab.
                  //  - aria-label falls back to the visible label so screen
                  //    readers don't read raw values like "tracking-qa".
                  aria-label={t.label}
                  className="text-xs sm:text-sm whitespace-nowrap shrink-0 min-h-11 sm:min-h-9 min-w-11 px-3 touch-manipulation focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-background data-[state=active]:font-semibold"
                >
                  {t.label}
                </TabsTrigger>
              ))}
            </TabsList>
          </div>
        </div>
        {tabs.map((t) => (
          <TabsContent
            key={t.value}
            value={t.value}
            // tabIndex=0 makes the panel focusable so keyboard users can
            // page-down through long content after activating a tab.
            tabIndex={0}
            className="mt-4 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 rounded-md"
          >
            {active === t.value && t.content}
          </TabsContent>
        ))}
      </Tabs>
      {/* SR-only live region announces tab changes for screen readers. */}
      <p className="sr-only" role="status" aria-live="polite">
        Showing {tabs.find((t) => t.value === active)?.label ?? active} tab.
      </p>
    </div>
  );
}