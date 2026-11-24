import { afterEach, expect, it, vi } from "vitest";
import { QueryClient, QueryObserver } from "@tanstack/react-query";
import { ADMIN_REPORT_REFRESH_MS, adminReportRefresh } from "./admin-report-refresh";

afterEach(() => vi.useRealTimers());

it("refreshes an open administrator report every day, not every 12 hours", async () => {
  vi.useFakeTimers();
  expect(ADMIN_REPORT_REFRESH_MS).toBe(86_400_000);
  const client = new QueryClient();
  const fetchReport = vi.fn(async () => ({ visitors: 24 }));
  const observer = new QueryObserver(client, {
    ...adminReportRefresh,
    queryKey: ["report"],
    queryFn: fetchReport,
  });
  const unsubscribe = observer.subscribe(() => {});
  await vi.advanceTimersByTimeAsync(0);
  expect(fetchReport).toHaveBeenCalledTimes(1);
  await vi.advanceTimersByTimeAsync(43_200_000);
  expect(fetchReport).toHaveBeenCalledTimes(1);
  await vi.advanceTimersByTimeAsync(43_199_999);
  expect(fetchReport).toHaveBeenCalledTimes(1);
  await vi.advanceTimersByTimeAsync(1);
  expect(fetchReport).toHaveBeenCalledTimes(2);
  unsubscribe();
  client.clear();
});

it("retains manual refresh and administrator-save invalidation before one day", async () => {
  const client = new QueryClient();
  const fetchReport = vi.fn(async () => ({ visitors: 24 }));
  const observer = new QueryObserver(client, {
    ...adminReportRefresh,
    queryKey: ["report"],
    queryFn: fetchReport,
  });
  const unsubscribe = observer.subscribe(() => {});
  await observer.refetch();
  fetchReport.mockClear();
  await observer.refetch();
  expect(fetchReport).toHaveBeenCalledTimes(1);
  await client.invalidateQueries({ queryKey: ["report"] });
  expect(fetchReport).toHaveBeenCalledTimes(2);
  unsubscribe();
  client.clear();
});

it("does not refresh reports on focus, reconnect or while hidden", () => {
  expect(adminReportRefresh.refetchOnWindowFocus).toBe(false);
  expect(adminReportRefresh.refetchOnReconnect).toBe(false);
  expect(adminReportRefresh.refetchIntervalInBackground).toBe(false);
});