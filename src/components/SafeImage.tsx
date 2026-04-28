import { useState, ImgHTMLAttributes } from "react";

interface SafeImageProps extends ImgHTMLAttributes<HTMLImageElement> {
  /** Fallback URL or imported asset shown when `src` fails to load. */
  fallback: string;
}

/**
 * <img> wrapper that swaps to a guaranteed-working fallback if the network
 * request errors out. Used everywhere we render user-provided URLs
 * (instructor avatars, course thumbnails, brand logos, OG images).
 */
export function SafeImage({ src, fallback, alt = "", onError, ...rest }: SafeImageProps) {
  const [errored, setErrored] = useState(false);
  const finalSrc = !src || errored ? fallback : src;
  return (
    <img
      {...rest}
      src={finalSrc}
      alt={alt}
      onError={(e) => {
        if (!errored) setErrored(true);
        onError?.(e);
      }}
    />
  );
}
