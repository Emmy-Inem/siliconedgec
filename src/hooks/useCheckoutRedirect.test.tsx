import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { useCheckoutRedirect } from "./useCheckoutRedirect";

function Checkout() {
  const { redirect, confirmation } = useCheckoutRedirect();
  return <><button onClick={() => redirect({ authorization_url: "https://checkout.stripe.com/test", currency: "USD", total: 335.5 }, "GHS")}>Checkout</button>{confirmation}</>;
}

describe("USD fallback presentation", () => {
  it("shows the actual USD total before the customer continues to the provider", () => {
    render(<Checkout />);
    fireEvent.click(screen.getByRole("button", { name: "Checkout" }));
    expect(screen.getByRole("alertdialog")).toBeInTheDocument();
    expect(screen.getByText("Total: $335.50 USD")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Continue to payment" })).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Go back" }));
    expect(screen.queryByRole("alertdialog")).not.toBeInTheDocument();
  });
});
