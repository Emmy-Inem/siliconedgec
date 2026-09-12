import { useState, ImgHTMLAttributes } from "react";

interface SafeImageProps extends Omit<ImgHTMLAttributes<HTMLImageElement>, "alt"> {
  /** Fallback URL or imported asset shown when `src` fails to load. */
  fallback: string;
  /** Meaningful descriptive alt text for screen readers, or empty string only if purely decorative. */
  alt: string;
}

/**
 * <img> wrapper that swaps to a guaranteed-working fallback if the network
 * request errors out. Used everywhere we render user-provided URLs
 * (instructor avatars, course thumbnails, brand logos, OG images).
 */
export function SafeImage({ src, fallback, alt, onError, ...rest }: SafeImageProps) {
  const [errored, setErrored] = useState(false);
  const finalSrc = !src || errored ? fallback : src;
  const isDecorative = alt === "";

  return (
    <img
      {...rest}
      src={finalSrc}
      alt={alt}
      aria-hidden={isDecorative ? "true" : undefined}
      onError={(e) => {
        if (!errored) setErrored(true);
        onError?.(e);
      }}
    />
  );
}
