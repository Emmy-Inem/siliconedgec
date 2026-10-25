import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import NativeWalletCheckout from "./NativeWalletCheckout";

const mocks = vi.hoisted(() => ({ config: "pk_test_public" as string | null, eligible: true, confirm: vi.fn() }));
vi.mock("@stripe/stripe-js", () => ({ loadStripe: vi.fn(() => Promise.resolve({})) }));
vi.mock("@/integrations/supabase/client", () => ({ supabase: { functions: { invoke: vi.fn() } } }));
vi.mock("@tanstack/react-query", () => ({ useQuery: ({ queryKey }: { queryKey: string[] }) => ({
  data: queryKey[0] === "stripe-wallet-config" ? mocks.config : {
    sessionId: "cs_test", clientSecret: "secret", currency: "USD", total: 240.12,
    returnUrl: "https://siliconedgec.com/cart?stripe=1&session_id=cs_test",
  },
}) }));
vi.mock("@stripe/react-stripe-js/checkout", async () => {
  const React = await import("react");
  return {
    CheckoutElementsProvider: ({ children }: { children: React.ReactNode }) => children,
    useCheckoutElements: () => ({ type: "success", checkout: { confirm: mocks.confirm } }),
    ExpressCheckoutElement: ({ onAvailablePaymentMethodsChange, onConfirm }: any) => {
      React.useEffect(() => { onAvailablePaymentMethodsChange({ paymentMethods: mocks.eligible ? { googlePay: true } : undefined }); }, []);
      return <button onClick={() => onConfirm({ paymentFailed: vi.fn() })}>Official Google Pay</button>;
    },
  };
});
const request = { currency: "EUR", course_id: "course", callback_url: "https://siliconedgec.com/cart", cancel_url: "https://siliconedgec.com/cart" };
afterEach(cleanup);
beforeEach(() => { mocks.config = "pk_test_public"; mocks.eligible = true; mocks.confirm.mockReset(); });

describe("official wallet checkout", () => {
  it("shows the confirmed USD total next to the eligible official button before any payment", async () => {
    render(<NativeWalletCheckout request={request} userId="user" />);
    expect(await screen.findByText(/Wallet total:.*240.12.*USD/)).toBeInTheDocument();
    expect(screen.getByText("EUR wallet payment unavailable. Charged in USD.")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Official Google Pay" })).toBeVisible();
    expect(mocks.confirm).not.toHaveBeenCalled();
  });
  it("keeps normal checkout available when the wallet backend is not configured", () => {
    mocks.config = null;
    render(<NativeWalletCheckout request={request} userId="user" />);
    expect(screen.queryByRole("button")).not.toBeInTheDocument();
    expect(screen.getByText(/Continue below for cards/)).toBeInTheDocument();
  });
  it("hides wallet buttons and totals for an ineligible device", () => {
    mocks.eligible = false;
    render(<NativeWalletCheckout request={request} userId="user" />);
    expect(screen.queryByRole("button")).not.toBeInTheDocument();
    expect(screen.queryByText(/Wallet total/)).not.toBeInTheDocument();
  });
  it("confirms through Stripe and leaves a declined payment unfulfilled", async () => {
    mocks.confirm.mockResolvedValue({ type: "error", error: { message: "Your card was declined." } });
    render(<NativeWalletCheckout request={request} userId="user" />);
    fireEvent.click(await screen.findByRole("button", { name: "Official Google Pay" }));
    await waitFor(() => expect(screen.getByRole("alert")).toHaveTextContent("Your card was declined."));
    expect(mocks.confirm).toHaveBeenCalledWith(expect.objectContaining({ redirect: "if_required", returnUrl: expect.stringContaining("session_id=cs_test") }));
    expect(window.location.href).not.toContain("session_id");
  });
  it("does not confirm while checkout totals are being updated", async () => {
    render(<NativeWalletCheckout request={request} userId="user" disabled />);
    fireEvent.click(await screen.findByRole("button", { name: "Official Google Pay" }));
    expect(mocks.confirm).not.toHaveBeenCalled();
  });
});
