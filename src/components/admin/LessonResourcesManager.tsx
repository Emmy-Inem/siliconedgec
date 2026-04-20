import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { Upload, Trash2, FileText, Loader2, X } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  lessonId: string;
  lessonTitle: string;
  courseId: string;
}

export function LessonResourcesManager({ open, onOpenChange, lessonId, lessonTitle, courseId }: Props) {
  const { toast } = useToast();
  const qc = useQueryClient();
  const [uploading, setUploading] = useState(false);

  const { data: resources = [], isLoading } = useQuery({
    queryKey: ["lesson-resources", lessonId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("lesson_resources")
        .select("*")
        .eq("lesson_id", lessonId)
        .order("order_index");
      if (error) throw error;
      return data;
    },
    enabled: open && !!lessonId,
  });

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    setUploading(true);
    try {
      for (const file of Array.from(files)) {
        const path = `${courseId}/${lessonId}/${Date.now()}-${file.name}`;
        const { error: upErr } = await supabase.storage.from("course-resources").upload(path, file);
        if (upErr) throw upErr;
        const { data: { publicUrl } } = supabase.storage.from("course-resources").getPublicUrl(path);
        const { error: insErr } = await supabase.from("lesson_resources").insert({
          lesson_id: lessonId,
          course_id: courseId,
          file_name: file.name,
          file_url: publicUrl,
          file_path: path,
          file_size: file.size,
          file_type: file.type,
          order_index: resources.length,
        });
        if (insErr) throw insErr;
      }
      qc.invalidateQueries({ queryKey: ["lesson-resources", lessonId] });
      toast({ title: "Resources uploaded" });
    } catch (e: any) {
      toast({ title: "Upload failed", description: e.message, variant: "destructive" });
    } finally {
      setUploading(false);
      e.target.value = "";
    }
  };

  const deleteResource = useMutation({
    mutationFn: async (r: any) => {
      if (r.file_path) {
        await supabase.storage.from("course-resources").remove([r.file_path]);
      }
      const { error } = await supabase.from("lesson_resources").delete().eq("id", r.id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["lesson-resources", lessonId] });
      toast({ title: "Resource deleted" });
    },
  });

  const formatSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-xl">
        <DialogHeader>
          <DialogTitle className="text-base">Resources for: {lessonTitle}</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <label className="flex items-center justify-center gap-2 px-4 py-6 border-2 border-dashed border-border rounded-lg cursor-pointer hover:border-primary/50 hover:bg-muted/30 transition-colors">
            {uploading ? (
              <><Loader2 className="h-4 w-4 animate-spin" /> Uploading...</>
            ) : (
              <><Upload className="h-4 w-4 text-muted-foreground" /> <span className="text-sm">Click to upload PDFs, slides, code, etc.</span></>
            )}
            <input type="file" multiple onChange={handleFileSelect} disabled={uploading} className="hidden" />
          </label>

          {isLoading ? (
            <div className="flex justify-center py-4"><Loader2 className="h-5 w-5 animate-spin text-primary" /></div>
          ) : resources.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-4">No resources yet.</p>
          ) : (
            <ul className="space-y-2 max-h-64 overflow-y-auto">
              {resources.map((r: any) => (
                <li key={r.id} className="flex items-center gap-3 px-3 py-2 rounded-lg border border-border hover:bg-muted/30 transition-colors group">
                  <FileText className="h-4 w-4 text-primary shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm truncate">{r.file_name}</p>
                    <p className="text-xs text-muted-foreground">{formatSize(r.file_size ?? 0)}</p>
                  </div>
                  <Button size="icon" variant="ghost" className="h-7 w-7 text-destructive opacity-0 group-hover:opacity-100" onClick={() => deleteResource.mutate(r)}>
                    <Trash2 className="h-3 w-3" />
                  </Button>
                </li>
              ))}
            </ul>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
