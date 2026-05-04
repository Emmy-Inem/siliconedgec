import { useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Upload, Loader2, X } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface Props {
  value: string;
  onChange: (url: string) => void;
  /** Folder inside the site-media bucket, e.g. "testimonials", "pages". */
  folder?: string;
  /** Show a square preview instead of a wide one. */
  rounded?: boolean;
  /** Hide the URL text input — only show preview + Upload button. */
  hideUrlField?: boolean;
}

/**
 * Upload an image to the public `site-media` bucket and return its URL.
 * Also accepts a manually pasted URL — useful for external CDNs.
 */
export function ImageUploader({ value, onChange, folder = "general", rounded = false, hideUrlField = false }: Props) {
  const [uploading, setUploading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  const handleFile = async (file: File) => {
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) {
      toast({ title: "File too large", description: "Max 5MB.", variant: "destructive" });
      return;
    }
    setUploading(true);
    const ext = file.name.split(".").pop() || "jpg";
    const path = `${folder}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
    const { error } = await supabase.storage.from("site-media").upload(path, file, {
      cacheControl: "3600",
      upsert: false,
      contentType: file.type,
    });
    setUploading(false);
    if (error) {
      toast({ title: "Upload failed", description: error.message, variant: "destructive" });
      return;
    }
    const { data } = supabase.storage.from("site-media").getPublicUrl(path);
    onChange(data.publicUrl);
    toast({ title: "Image uploaded" });
  };

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-3">
        {value ? (
          <div className="relative shrink-0">
            <img
              src={value}
              alt="preview"
              className={
                rounded
                  ? "h-16 w-16 rounded-full object-cover border border-border"
                  : "h-16 w-24 rounded-md object-cover border border-border"
              }
            />
            <button
              type="button"
              onClick={() => onChange("")}
              className="absolute -top-1.5 -right-1.5 bg-card border border-border rounded-full p-0.5 shadow"
              aria-label="Remove image"
            >
              <X className="h-3 w-3" />
            </button>
          </div>
        ) : (
          <div
            className={
              rounded
                ? "h-16 w-16 rounded-full border-2 border-dashed border-border bg-muted/30 flex items-center justify-center"
                : "h-16 w-24 rounded-md border-2 border-dashed border-border bg-muted/30 flex items-center justify-center"
            }
          >
            <Upload className="h-4 w-4 text-muted-foreground/50" />
          </div>
        )}
        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled={uploading}
          onClick={() => inputRef.current?.click()}
        >
          {uploading ? <Loader2 className="h-3.5 w-3.5 animate-spin mr-1.5" /> : <Upload className="h-3.5 w-3.5 mr-1.5" />}
          {value ? "Replace" : "Upload"}
        </Button>
        <input
          ref={inputRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) handleFile(f);
            e.target.value = "";
          }}
        />
      </div>
      {!hideUrlField && (
        <Input
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder="…or paste an image URL"
          className="text-xs"
        />
      )}
    </div>
  );
}
