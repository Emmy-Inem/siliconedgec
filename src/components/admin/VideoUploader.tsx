import { useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Upload, X } from "lucide-react";

interface Props {
  value?: string;
  thumbnail?: string;
  onChange: (videoUrl: string, thumbnailUrl?: string) => void;
  folder?: string;
}

const MAX_BYTES = 200 * 1024 * 1024;

/** Grabs a frame from the selected video and returns it as a JPEG blob. */
async function captureThumbnail(file: File): Promise<Blob | null> {
  return new Promise((resolve) => {
    const video = document.createElement("video");
    video.preload = "metadata";
    video.muted = true;
    video.playsInline = true;
    const url = URL.createObjectURL(file);
    const cleanup = () => URL.revokeObjectURL(url);

    video.onloadedmetadata = () => {
      video.currentTime = Math.min(1, (video.duration || 2) / 2);
    };
    video.onseeked = () => {
      try {
        const canvas = document.createElement("canvas");
        canvas.width = video.videoWidth || 1280;
        canvas.height = video.videoHeight || 720;
        canvas.getContext("2d")?.drawImage(video, 0, 0, canvas.width, canvas.height);
        canvas.toBlob((b) => { cleanup(); resolve(b); }, "image/jpeg", 0.82);
      } catch {
        cleanup();
        resolve(null);
      }
    };
    video.onerror = () => { cleanup(); resolve(null); };
    video.src = url;
  });
}

export function VideoUploader({ value, thumbnail, onChange, folder = "testimonial-videos" }: Props) {
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  const handleFile = async (file: File) => {
    if (!file.type.startsWith("video/")) {
      toast({ title: "Not a video", description: "Choose an MP4, MOV or WebM file.", variant: "destructive" });
      return;
    }
    if (file.size > MAX_BYTES) {
      toast({ title: "File too large", description: "Videos must be under 200MB.", variant: "destructive" });
      return;
    }
    setUploading(true);
    try {
      const stamp = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
      const ext = file.name.split(".").pop() || "mp4";

      setProgress("Uploading video…");
      const videoPath = `${folder}/${stamp}.${ext}`;
      const { error: vErr } = await supabase.storage
        .from("site-media")
        .upload(videoPath, file, { cacheControl: "31536000", upsert: false, contentType: file.type });
      if (vErr) throw vErr;
      const videoUrl = supabase.storage.from("site-media").getPublicUrl(videoPath).data.publicUrl;

      setProgress("Generating thumbnail…");
      let thumbUrl: string | undefined;
      const thumbBlob = await captureThumbnail(file);
      if (thumbBlob) {
        const thumbPath = `${folder}/${stamp}-poster.jpg`;
        const { error: tErr } = await supabase.storage
          .from("site-media")
          .upload(thumbPath, thumbBlob, { cacheControl: "31536000", upsert: false, contentType: "image/jpeg" });
        if (!tErr) thumbUrl = supabase.storage.from("site-media").getPublicUrl(thumbPath).data.publicUrl;
      }

      onChange(videoUrl, thumbUrl);
      toast({ title: "Video uploaded", description: thumbUrl ? "Thumbnail generated automatically." : "Add a thumbnail manually if needed." });
    } catch (e) {
      toast({ title: "Upload failed", description: (e as Error).message, variant: "destructive" });
    } finally {
      setUploading(false);
      setProgress("");
      if (inputRef.current) inputRef.current.value = "";
    }
  };

  return (
    <div className="space-y-3">
      {value ? (
        <div className="relative rounded-lg overflow-hidden border border-border bg-muted">
          <video src={value} poster={thumbnail} controls preload="metadata" className="w-full max-h-56 object-contain bg-black" />
          <Button
            type="button"
            size="icon"
            variant="secondary"
            className="absolute top-2 right-2 h-7 w-7"
            onClick={() => onChange("", "")}
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
      ) : null}
      <div className="flex items-center gap-2">
        <Button type="button" variant="outline" size="sm" disabled={uploading} onClick={() => inputRef.current?.click()}>
          {uploading ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Upload className="h-4 w-4 mr-2" />}
          {uploading ? progress || "Uploading…" : value ? "Replace video" : "Upload video"}
        </Button>
        <span className="text-xs text-muted-foreground">MP4, MOV or WebM · up to 200MB</span>
      </div>
      <input
        ref={inputRef}
        type="file"
        accept="video/*"
        className="hidden"
        onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFile(f); }}
      />
    </div>
  );
}
