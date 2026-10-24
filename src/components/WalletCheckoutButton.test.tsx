import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { WalletCheckoutButton } from "./WalletCheckoutButton";

afterEach(cleanup);

describe("regional checkout options", () => {
  it.each(["NGN", "GHS", "KES", "ZAR", "XOF", "EGP"])("offers local %s checkout without a Stripe wallet detour", (currency) => {
    render(<WalletCheckoutButton currency={currency} ready onCheckout={vi.fn()} />);
    expect(screen.getByText("Local payment options")).toBeInTheDocument();
    expect(screen.getByText(new RegExp(`region in ${currency}`))).toBeInTheDocument();
    expect(screen.queryByRole("button")).not.toBeInTheDocument();
  });

  it.each(["EUR", "GBP", "USD", "JPY"])("offers wallets for international %s checkout", (currency) => {
    const onCheckout = vi.fn();
    render(<WalletCheckoutButton currency={currency} ready onCheckout={onCheckout} />);
    fireEvent.click(screen.getByRole("button", { name: "Apple Pay or Google Pay" }));
    expect(onCheckout).toHaveBeenCalledOnce();
    expect(screen.queryByText(/NGN|naira/i)).not.toBeInTheDocument();
  });

  it("waits for the visitor's pricing region before offering a payment method", () => {
    const { container } = render(<WalletCheckoutButton currency="USD" ready={false} onCheckout={vi.fn()} />);
    expect(container).toBeEmptyDOMElement();
  });
});
