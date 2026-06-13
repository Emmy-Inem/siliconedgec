import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Download, Loader2 } from "lucide-react";
import { toast } from "@/hooks/use-toast";

interface ResourceFile { id: string; file_name: string; file_url: string }

/**
 * Bulk-downloads every resource attached to a course as a single zip.
 * Uses dynamic imports so JSZip/file-saver don't bloat the initial bundle.
 */
export function DownloadAllButton({
  courseTitle,
  resources,
}: {
  courseTitle: string;
  resources: ResourceFile[];
}) {
  const [busy, setBusy] = useState(false);

  if (!resources.length) return null;

  const onClick = async () => {
    setBusy(true);
    try {
      const [{ default: JSZip }, { saveAs }] = await Promise.all([
        import("jszip"),
        import("file-saver"),
      ]);
      const zip = new JSZip();
      let added = 0;
      await Promise.all(
        resources.map(async (r) => {
          try {
            const res = await fetch(r.file_url);
            if (!res.ok) return;
            const blob = await res.blob();
            const safe = r.file_name.replace(/[\\/:*?"<>|]+/g, "_");
            zip.file(safe, blob);
            added += 1;
          } catch {
            // skip individual failures, keep the others
          }
        }),
      );
      if (!added) {
        toast({
          title: "Nothing to download",
          description: "We couldn't fetch those resources right now.",
          variant: "destructive",
        });
        return;
      }
      const out = await zip.generateAsync({ type: "blob" });
      const safeTitle = courseTitle.replace(/[\\/:*?"<>|]+/g, "_").slice(0, 60) || "course";
      saveAs(out, `${safeTitle}-resources.zip`);
      toast({ title: "Download ready", description: `Packaged ${added} file${added === 1 ? "" : "s"}.` });
    } catch (e: any) {
      toast({ title: "Download failed", description: e?.message ?? "Please try again.", variant: "destructive" });
    } finally {
      setBusy(false);
    }
  };

  return (
    <Button size="sm" variant="outline" onClick={onClick} disabled={busy} className="gap-1.5">
      {busy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Download className="h-3.5 w-3.5" />}
      Download all ({resources.length})
    </Button>
  );
}