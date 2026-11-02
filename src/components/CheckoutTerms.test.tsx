import { render, screen, fireEvent } from "@testing-library/react";
import { expect, it, vi } from "vitest";
import { CheckoutTerms } from "./CheckoutTerms";

it("requires deliberate acknowledgement and links the published policies", () => {
  const change = vi.fn(); render(<CheckoutTerms accepted={false} onChange={change} />);
  expect(screen.getByRole("checkbox")).not.toBeChecked();
  expect(screen.getByRole("link", { name: "Terms and Conditions" })).toHaveAttribute("href", "/terms");
  fireEvent.click(screen.getByRole("checkbox")); expect(change).toHaveBeenCalledWith(true);
});
