import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, expect, it, vi } from "vitest";
import { EnhancedVideoPlayer } from "./EnhancedVideoPlayer";

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

it("uses detected picture-in-picture support from the keyboard and removes its listener", () => {
  const original = Object.getOwnPropertyDescriptor(document, "pictureInPictureEnabled");
  Object.defineProperty(document, "pictureInPictureEnabled", { configurable: true, value: true });
  try {
    const { container, unmount } = render(<EnhancedVideoPlayer src="/lesson.mp4" />);
    const video = container.querySelector("video");
    if (!video) throw new Error("Missing lesson video");
    const request = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(video, "requestPictureInPicture", { configurable: true, value: request });
    screen.getByRole("button", { name: "Toggle picture in picture" }).focus();
    fireEvent.keyDown(window, { key: "p" });
    expect(request).toHaveBeenCalledTimes(1);
    unmount();
    fireEvent.keyDown(window, { key: "p" });
    expect(request).toHaveBeenCalledTimes(1);
  } finally {
    if (original) Object.defineProperty(document, "pictureInPictureEnabled", original);
    else Reflect.deleteProperty(document, "pictureInPictureEnabled");
  }
});