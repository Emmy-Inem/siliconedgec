import { createElement, type PropsWithChildren } from "react";
import { QueryClient, QueryClientProvider, type QueryObserverOptions } from "@tanstack/react-query";
import { renderHook, waitFor, cleanup } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { useHomeContent } from "./useHomeContent";
import { useSiteSettings } from "./useSiteSettings";

const { from } = vi.hoisted(() => ({ from: vi.fn() }));
vi.mock("@/integrations/supabase/client", () => ({ supabase: { from } }));

describe("public content caching", () => {
  beforeEach(() => {
    from.mockReset();
    from.mockImplementation(() => ({
      select: () => ({
        eq: async () => ({ data: [{ key: "site_name", value: "Saved site name" }] }),
        like: async () => ({ data: [{ key: "home_hero_subtitle", value: "Saved homepage subtitle" }] }),
      }),
    }));
  });
  afterEach(cleanup);

  it.each([
    { hook: useHomeContent, key: "home-content", field: "hero_subtitle", value: "Saved homepage subtitle" },
    { hook: useSiteSettings, key: "site-settings", field: "site_name", value: "Saved site name" },
  ])("reuses $key for 30 minutes and retains it for 60 minutes", async ({ hook, key, field, value }) => {
    const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    const wrapper = ({ children }: PropsWithChildren) =>
      createElement(QueryClientProvider, { client }, children);
    const useContent = hook as () => { data?: unknown; isSuccess: boolean };
    const first = renderHook(useContent, { wrapper });
    await waitFor(() => expect(first.result.current.isSuccess).toBe(true));
    expect(first.result.current.data).toHaveProperty(field, value);
    first.unmount();
    const second = renderHook(useContent, { wrapper });
    await waitFor(() => expect(second.result.current.isSuccess).toBe(true));
    expect(from).toHaveBeenCalledTimes(1);
    const query = client.getQueryCache().find({ queryKey: [key] });
    const options = query?.options as QueryObserverOptions | undefined;
    expect(options?.staleTime).toBe(30 * 60 * 1000);
    expect(options?.gcTime).toBe(60 * 60 * 1000);
    expect(options?.refetchOnWindowFocus).toBe(false);
    second.unmount();
    client.clear();
  });
});