import { forwardRef, useEffect, useImperativeHandle, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Gauge, PictureInPicture2, Keyboard } from "lucide-react";
import { cn } from "@/lib/utils";

const SPEEDS = [0.5, 0.75, 1, 1.25, 1.5, 1.75, 2];
const SPEED_KEY = "lesson-player-speed";

export interface EnhancedVideoPlayerHandle {
  el: () => HTMLVideoElement | null;
}

interface Props {
  src: string;
  onTimeUpdate?: (e: React.SyntheticEvent<HTMLVideoElement>) => void;
  onLoadedMetadata?: (e: React.SyntheticEvent<HTMLVideoElement>) => void;
  onEnded?: (e: React.SyntheticEvent<HTMLVideoElement>) => void;
}

/**
 * Adds playback speed control, Picture-in-Picture, and keyboard shortcuts
 * (space/k=play, arrows=seek, ↑/↓=volume, m=mute, f=fullscreen, p=PiP)
 * on top of the native HTML5 player. Persists the last chosen speed.
 */
export const EnhancedVideoPlayer = forwardRef<EnhancedVideoPlayerHandle, Props>(
  function EnhancedVideoPlayer({ src, onTimeUpdate, onLoadedMetadata, onEnded }, ref) {
    const videoRef = useRef<HTMLVideoElement | null>(null);
    const containerRef = useRef<HTMLDivElement | null>(null);
    const [speed, setSpeed] = useState<number>(() => {
      const stored = Number(localStorage.getItem(SPEED_KEY));
      return Number.isFinite(stored) && stored > 0 ? stored : 1;
    });
    const [pipSupported, setPipSupported] = useState(false);

    useImperativeHandle(ref, () => ({ el: () => videoRef.current }));

    useEffect(() => {
      setPipSupported(typeof document !== "undefined" && (document as any).pictureInPictureEnabled === true);
    }, []);

    useEffect(() => {
      if (videoRef.current) videoRef.current.playbackRate = speed;
      localStorage.setItem(SPEED_KEY, String(speed));
    }, [speed]);

    // Keyboard shortcuts when the player is focused / hovered.
    useEffect(() => {
      const v = videoRef.current;
      const c = containerRef.current;
      if (!v || !c) return;
      const handler = (e: KeyboardEvent) => {
        const target = e.target as HTMLElement | null;
        if (target && /^(INPUT|TEXTAREA|SELECT)$/.test(target.tagName)) return;
        if (target?.isContentEditable) return;
        if (!c.matches(":hover") && document.activeElement !== v && !c.contains(document.activeElement)) return;

        switch (e.key) {
          case " ":
          case "k":
            e.preventDefault();
            if (v.paused) {
              v.play();
            } else {
              v.pause();
            }
            break;
          case "ArrowLeft":
            e.preventDefault();
            v.currentTime = Math.max(0, v.currentTime - 10);
            break;
          case "ArrowRight":
            e.preventDefault();
            v.currentTime = Math.min(v.duration || Infinity, v.currentTime + 10);
            break;
          case "ArrowUp":
            e.preventDefault();
            v.volume = Math.min(1, v.volume + 0.1);
            break;
          case "ArrowDown":
            e.preventDefault();
            v.volume = Math.max(0, v.volume - 0.1);
            break;
          case "m":
            e.preventDefault();
            v.muted = !v.muted;
            break;
          case "f":
            e.preventDefault();
            if (document.fullscreenElement) document.exitFullscreen();
            else v.requestFullscreen?.();
            break;
          case "p":
            e.preventDefault();
            togglePip();
            break;
        }
      };
      window.addEventListener("keydown", handler);
      return () => window.removeEventListener("keydown", handler);
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const togglePip = async () => {
      const v = videoRef.current;
      if (!v || !pipSupported) return;
      try {
        if ((document as any).pictureInPictureElement) {
          await (document as any).exitPictureInPicture();
        } else {
          await (v as any).requestPictureInPicture();
        }
      } catch {
        // ignore; some browsers throw on disallowed contexts
      }
    };

    return (
      <div ref={containerRef} className="relative group">
        <div className="aspect-video rounded-xl overflow-hidden bg-black">
          <video
            ref={videoRef}
            src={src}
            controls
            playsInline
            onTimeUpdate={onTimeUpdate}
            onLoadedMetadata={onLoadedMetadata}
            onEnded={onEnded}
            className="w-full h-full"
          />
        </div>
        {/* Overlay controls — sit above the video, do not block native controls (top-right). */}
        <div className="absolute top-2 right-2 flex gap-1.5 opacity-0 group-hover:opacity-100 focus-within:opacity-100 transition-opacity z-10">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                size="sm"
                variant="secondary"
                className="h-8 gap-1 bg-black/60 hover:bg-black/80 text-white border-0"
                aria-label={`Playback speed ${speed}x`}
              >
                <Gauge className="h-3.5 w-3.5" />
                {speed}x
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              {SPEEDS.map((s) => (
                <DropdownMenuItem
                  key={s}
                  onClick={() => setSpeed(s)}
                  className={cn(s === speed && "font-semibold text-primary")}
                >
                  {s}x{s === 1 && " (normal)"}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
          {pipSupported && (
            <Button
              size="sm"
              variant="secondary"
              className="h-8 bg-black/60 hover:bg-black/80 text-white border-0"
              onClick={togglePip}
              aria-label="Toggle picture in picture"
            >
              <PictureInPicture2 className="h-3.5 w-3.5" />
            </Button>
          )}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                size="sm"
                variant="secondary"
                className="h-8 bg-black/60 hover:bg-black/80 text-white border-0"
                aria-label="Keyboard shortcuts"
              >
                <Keyboard className="h-3.5 w-3.5" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="text-xs">
              <DropdownMenuItem disabled>Space / K — Play / Pause</DropdownMenuItem>
              <DropdownMenuItem disabled>← / → — Seek 10s</DropdownMenuItem>
              <DropdownMenuItem disabled>↑ / ↓ — Volume</DropdownMenuItem>
              <DropdownMenuItem disabled>M — Mute</DropdownMenuItem>
              <DropdownMenuItem disabled>F — Fullscreen</DropdownMenuItem>
              <DropdownMenuItem disabled>P — Picture in Picture</DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    );
  },
);