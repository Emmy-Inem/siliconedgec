import { act, render } from "@testing-library/react";
import { beforeEach, afterEach, describe, expect, it, vi } from "vitest";
import { UtmTracker } from "./UtmTracker";

const mocks = vi.hoisted(() => ({
  location: { pathname: "/courses", search: "", hash: "" },
  track: vi.fn().mockResolvedValue(undefined),
}));
vi.mock("react-router-dom", () => ({ useLocation: () => mocks.location }));
vi.mock("@/hooks/useUtmTracking", () => ({ useUtmTracking: vi.fn() }));
vi.mock("@/lib/track-lead", () => ({ trackLead: mocks.track }));
vi.mock("@/lib/geo", () => ({ getVisitorGeo: vi.fn().mockResolvedValue(null) }));
vi.mock("@/lib/analytics", () => ({ gaPageview: vi.fn(), gaSetUserId: vi.fn() }));
vi.mock("@/integrations/supabase/client", () => ({ supabase: { auth: {
  getUser: vi.fn().mockResolvedValue({ data: { user: null } }),
  onAuthStateChange: vi.fn(() => ({ data: { subscription: { unsubscribe: vi.fn() } } })),
} } }));

describe("internal page visits", () => {
  beforeEach(() => { vi.useFakeTimers(); vi.clearAllMocks(); mocks.location = { pathname: "/courses", search: "", hash: "" }; });
  afterEach(() => vi.useRealTimers());
  it("counts revisits but not consecutive renders", () => {
    const page = render(<UtmTracker />);
    act(() => vi.advanceTimersByTime(400));
    page.rerender(<UtmTracker />);
    act(() => vi.advanceTimersByTime(400));
    expect(mocks.track).toHaveBeenCalledTimes(1);
    mocks.location = { pathname: "/", search: "", hash: "" };
    page.rerender(<UtmTracker />);
    act(() => vi.advanceTimersByTime(400));
    mocks.location = { pathname: "/courses", search: "", hash: "" };
    page.rerender(<UtmTracker />);
    act(() => vi.advanceTimersByTime(400));
    expect(mocks.track).toHaveBeenCalledTimes(3);
  });
  it("records only one campaign landing", () => {
    mocks.location.search = "?utm_source=google";
    render(<UtmTracker />);
    act(() => vi.advanceTimersByTime(400));
    expect(mocks.track).toHaveBeenCalledTimes(1);
    expect(mocks.track).toHaveBeenCalledWith({ formType: "page_visit", formData: { path: "/courses" } });
  });
  it("does not record admin navigation", () => {
    mocks.location.pathname = "/admin/analytics";
    render(<UtmTracker />);
    act(() => vi.advanceTimersByTime(400));
    expect(mocks.track).not.toHaveBeenCalled();
  });
});