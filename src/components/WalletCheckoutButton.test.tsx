import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { WalletCheckoutButton } from "./WalletCheckoutButton";

afterEach(cleanup);
vi.mock("./NativeWalletCheckout", () => ({ default: () => <div>Official wallet integration</div> }));
const request = { currency: "USD", course_id: "course", callback_url: "https://siliconedgec.com/cart", cancel_url: "https://siliconedgec.com/cart" };

describe("regional checkout options", () => {
  it.each(["NGN", "GHS", "KES", "ZAR", "XOF", "EGP"])("routes %s checkout through the standard button without extra labels", (currency) => {
    const { container } = render(<WalletCheckoutButton currency={currency} ready request={{ ...request, currency }} userId="user" />);
    expect(container).toBeEmptyDOMElement();
    expect(screen.queryByRole("button")).not.toBeInTheDocument();
  });

  it.each(["EUR", "GBP", "USD", "JPY"])("mounts official wallets for %s checkout without region labels", async (currency) => {
    render(<WalletCheckoutButton currency={currency} ready request={{ ...request, currency }} userId="user" />);
    expect(await screen.findByText("Official wallet integration")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Apple Pay or Google Pay" })).not.toBeInTheDocument();
    expect(screen.queryByText(/NGN|naira|international|local payment/i)).not.toBeInTheDocument();
  });

  it("waits for the visitor's pricing region before offering a payment method", () => {
    const { container } = render(<WalletCheckoutButton currency="USD" ready={false} request={request} />);
    expect(container).toBeEmptyDOMElement();
  });
});
