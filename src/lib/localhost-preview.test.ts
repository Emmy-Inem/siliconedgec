import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { isLocalhost, shouldShowStagedFeature } from "./localhost-preview";

describe("localhost-preview utility", () => {
  const originalLocation = window.location;

  beforeEach(() => {
    // Reset window.location
    vi.restoreAllMocks();
  });

  afterEach(() => {
    Object.defineProperty(window, "location", {
      value: originalLocation,
      writable: true,
    });
  });

  const setHostname = (hostname: string, search = "") => {
    delete (window as any).location;
    window.location = {
      ...originalLocation,
      hostname,
      search,
    } as any;
  };

  it("detects localhost correctly", () => {
    setHostname("localhost");
    expect(isLocalhost()).toBe(true);
  });

  it("detects 127.0.0.1 correctly", () => {
    setHostname("127.0.0.1");
    expect(isLocalhost()).toBe(true);
  });

  it("returns false for production domain", () => {
    setHostname("siliconedgec.com");
    expect(isLocalhost()).toBe(false);
  });

  it("returns false for www domain", () => {
    setHostname("www.siliconedgec.com");
    expect(isLocalhost()).toBe(false);
  });

  it("restricts staged features to localhost when localhostOnly is true", () => {
    setHostname("siliconedgec.com");
    expect(shouldShowStagedFeature(true)).toBe(false);

    setHostname("localhost");
    expect(shouldShowStagedFeature(true)).toBe(true);
  });

  it("allows staged features everywhere when localhostOnly is false", () => {
    setHostname("siliconedgec.com");
    expect(shouldShowStagedFeature(false)).toBe(true);
  });

  it("supports preview_mode query param override in staging", () => {
    setHostname("siliconedgec.com", "?preview_mode=true");
    expect(shouldShowStagedFeature(true)).toBe(true);
  });
});
