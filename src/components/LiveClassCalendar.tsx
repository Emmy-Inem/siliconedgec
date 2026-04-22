import { useMemo, useState } from "react";
import { ChevronLeft, ChevronRight, Video, Calendar as CalIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface LiveClassItem {
  id: string;
  title: string;
  scheduled_at: string;
  duration_minutes: number;
  meeting_url: string;
  meeting_provider: string;
  course_id: string;
  status: string;
  instructor_name?: string | null;
}

interface Props {
  classes: LiveClassItem[];
  showJoin?: boolean;
}

export function LiveClassCalendar({ classes, showJoin = true }: Props) {
  const [cursor, setCursor] = useState(() => {
    const d = new Date();
    return new Date(d.getFullYear(), d.getMonth(), 1);
  });
  const [selectedDay, setSelectedDay] = useState<Date | null>(null);

  const monthLabel = cursor.toLocaleDateString(undefined, { month: "long", year: "numeric" });

  const grid = useMemo(() => {
    const start = new Date(cursor.getFullYear(), cursor.getMonth(), 1);
    const startDay = start.getDay(); // 0 = Sun
    const daysInMonth = new Date(cursor.getFullYear(), cursor.getMonth() + 1, 0).getDate();
    const cells: (Date | null)[] = [];
    for (let i = 0; i < startDay; i++) cells.push(null);
    for (let d = 1; d <= daysInMonth; d++) cells.push(new Date(cursor.getFullYear(), cursor.getMonth(), d));
    while (cells.length % 7 !== 0) cells.push(null);
    return cells;
  }, [cursor]);

  const classesByDay = useMemo(() => {
    const map = new Map<string, LiveClassItem[]>();
    classes.forEach((c) => {
      const d = new Date(c.scheduled_at);
      const key = `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(c);
    });
    return map;
  }, [classes]);

  const keyOf = (d: Date) => `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
  const today = new Date();
  const todayKey = keyOf(today);

  const selectedClasses = selectedDay ? classesByDay.get(keyOf(selectedDay)) ?? [] : [];

  return (
    <div className="bg-card border border-border rounded-xl p-4 sm:p-6 space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <CalIcon className="h-5 w-5 text-primary" />
          <h3 className="font-heading text-lg font-semibold">{monthLabel}</h3>
        </div>
        <div className="flex gap-1">
          <Button variant="ghost" size="icon" onClick={() => setCursor(new Date(cursor.getFullYear(), cursor.getMonth() - 1, 1))}>
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <Button variant="ghost" size="sm" onClick={() => { const d = new Date(); setCursor(new Date(d.getFullYear(), d.getMonth(), 1)); }}>
            Today
          </Button>
          <Button variant="ghost" size="icon" onClick={() => setCursor(new Date(cursor.getFullYear(), cursor.getMonth() + 1, 1))}>
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-7 gap-1 text-xs text-center text-muted-foreground font-medium">
        {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((d) => <div key={d} className="py-1">{d}</div>)}
      </div>

      <div className="grid grid-cols-7 gap-1">
        {grid.map((d, i) => {
          if (!d) return <div key={i} className="aspect-square" />;
          const k = keyOf(d);
          const items = classesByDay.get(k) ?? [];
          const isToday = k === todayKey;
          const isSelected = selectedDay && keyOf(selectedDay) === k;
          return (
            <button
              key={i}
              onClick={() => setSelectedDay(d)}
              className={cn(
                "aspect-square rounded-md p-1 text-xs flex flex-col items-center justify-start transition-colors border",
                isSelected ? "border-primary bg-primary/10" : "border-transparent hover:bg-muted",
                isToday && !isSelected && "border-primary/40"
              )}
            >
              <span className={cn("font-medium", isToday && "text-primary")}>{d.getDate()}</span>
              {items.length > 0 && (
                <span className="mt-1 inline-block h-1.5 w-1.5 rounded-full bg-primary" />
              )}
              {items.length > 1 && (
                <span className="text-[9px] text-muted-foreground">{items.length}</span>
              )}
            </button>
          );
        })}
      </div>

      {selectedDay && (
        <div className="border-t border-border pt-4 space-y-2">
          <p className="text-sm font-medium">
            {selectedDay.toLocaleDateString(undefined, { weekday: "long", month: "long", day: "numeric" })}
          </p>
          {selectedClasses.length === 0 ? (
            <p className="text-sm text-muted-foreground">No live classes scheduled.</p>
          ) : selectedClasses.map((c) => (
            <div key={c.id} className="flex items-center justify-between bg-muted/40 rounded-lg p-3">
              <div className="min-w-0">
                <p className="text-sm font-medium truncate">{c.title}</p>
                <p className="text-xs text-muted-foreground">
                  {new Date(c.scheduled_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                  {" · "}{c.duration_minutes} min · {c.meeting_provider}
                </p>
              </div>
              {showJoin && c.status !== "cancelled" && (
                <Button size="sm" asChild>
                  <a href={c.meeting_url} target="_blank" rel="noopener noreferrer">
                    <Video className="h-3.5 w-3.5 mr-1" />Join
                  </a>
                </Button>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}