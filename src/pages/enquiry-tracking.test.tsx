import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import Contact from "./Contact";
import ForBusinesses from "./ForBusinesses";

const mocks = vi.hoisted(() => ({
  insert: vi.fn(), single: vi.fn(), invoke: vi.fn(), conversion: vi.fn(), meta: vi.fn(), toast: vi.fn(),
}));
vi.mock("@/integrations/supabase/client", () => ({ supabase: {
  from: () => ({ insert: mocks.insert }), functions: { invoke: mocks.invoke },
} }));
vi.mock("@/lib/analytics", () => ({ googleAdsConversion: mocks.conversion, metaEvent: mocks.meta }));
vi.mock("@/hooks/use-toast", () => ({ useToast: () => ({ toast: mocks.toast }), toast: mocks.toast }));
vi.mock("@/hooks/useSiteSettings", () => ({ useSiteSettings: () => ({ data: {} }) }));
vi.mock("@/hooks/usePageImage", () => ({ usePageImage: (_key: string, fallback: string) => fallback }));
vi.mock("@/components/Header", () => ({ Header: () => null }));
vi.mock("@/components/Footer", () => ({ Footer: () => null }));
vi.mock("@/components/SEO", () => ({ SEO: () => null }));
vi.mock("@/components/WhatsAppFAB", () => ({ WhatsAppFAB: () => null }));

beforeEach(() => { vi.resetAllMocks(); mocks.invoke.mockResolvedValue({ error: null }); });
afterEach(cleanup);

const cases = [
  { type: "contact", Component: Contact, success: "Thanks, we got it.", fill: () => {
    fireEvent.change(screen.getByLabelText("Full name *"), { target: { value: "Test Enquirer" } });
    fireEvent.change(screen.getByLabelText("Email *"), { target: { value: "enquiry@example.test" } });
    fireEvent.change(screen.getByLabelText("How can we help? *"), { target: { value: "Test message" } });
  } },
  { type: "business_training", Component: ForBusinesses, success: "Thank You!", fill: () => {
    for (const [placeholder, value] of [
      ["Company Name *", "Test Company"], ["Your Full Name *", "Test Enquirer"],
      ["Job Title *", "Manager"], ["Work Email *", "enquiry@example.test"],
      ["Phone Number *", "+440000000000"], ["What would you like your team to be trained in? *", "Cloud"],
    ]) fireEvent.change(screen.getByPlaceholderText(placeholder), { target: { value } });
  } },
];

for (const { type, Component, success, fill } of cases) {
  describe(`${type} successful enquiry tracking`, () => {
    const setup = () => {
      render(<Component />);
      const form = document.querySelector("form");
      if (!form) throw new Error("Enquiry form missing");
      return form;
    };
    const result = (error: unknown = null) => {
      const response = { data: { id: "test-enquiry" }, error };
      mocks.single.mockResolvedValue(response);
      mocks.insert.mockReturnValue(type === "contact" ? Promise.resolve(response) : { select: () => ({ single: mocks.single }) });
    };

    it("does not report a conversion on load or invalid input", () => {
      const form = setup();
      expect(mocks.conversion).not.toHaveBeenCalled();
      expect(mocks.meta).not.toHaveBeenCalled();
      // Native required-field validation must prevent submitting an empty form.
      form.requestSubmit();
      expect(mocks.insert).not.toHaveBeenCalled();
      expect(mocks.conversion).not.toHaveBeenCalled();
      expect(mocks.meta).not.toHaveBeenCalled();
    });

    it("waits for a successful insert, then sends exactly one PII-free conversion", async () => {
      let resolve: (value: unknown) => void = () => { throw new Error("Insert not pending"); };
      const pending = new Promise(r => { resolve = r; });
      mocks.single.mockReturnValue(pending);
      mocks.insert.mockReturnValue(type === "contact" ? pending : { select: () => ({ single: mocks.single }) });
      const form = setup(); fill(); fireEvent.submit(form);
      expect(mocks.insert).toHaveBeenCalledTimes(1);
      expect(mocks.conversion).not.toHaveBeenCalled();
      expect(mocks.meta).not.toHaveBeenCalled();
      resolve({ data: { id: "test-enquiry" }, error: null });
      await waitFor(() => expect(mocks.conversion).toHaveBeenCalledTimes(1));
      expect(mocks.conversion).toHaveBeenCalledWith("Lead", { value: 0, currency: "GBP", form_type: type });
      // Meta Lead is emitted only for the business training enquiry, once,
      // with no personal data.
      if (type === "business_training") {
        expect(mocks.meta).toHaveBeenCalledTimes(1);
        expect(mocks.meta).toHaveBeenCalledWith("Lead", { form_type: "business_training" });
      } else {
        expect(mocks.meta).not.toHaveBeenCalled();
      }
      expect(screen.getByText(success)).toBeInTheDocument();
    });

    it("does not report a conversion for a failed insert", async () => {
      result({ message: "Test insert failure" });
      const form = setup(); fill(); fireEvent.submit(form);
      await waitFor(() => expect(mocks.toast).toHaveBeenCalledWith(expect.objectContaining({ variant: "destructive" })));
      expect(mocks.conversion).not.toHaveBeenCalled();
      expect(mocks.meta).not.toHaveBeenCalled();
      expect(screen.queryByText(success)).not.toBeInTheDocument();
    });

    it("keeps submission successful even when tracking throws", async () => {
      result();
      mocks.conversion.mockImplementation(() => { throw new Error("Tracking unavailable"); });
      mocks.meta.mockImplementation(() => { throw new Error("Tracking unavailable"); });
      const form = setup(); fill(); fireEvent.submit(form);
      await waitFor(() => expect(screen.getByText(success)).toBeInTheDocument());
      expect(mocks.conversion).toHaveBeenCalledTimes(1);
      expect(mocks.toast).not.toHaveBeenCalledWith(expect.objectContaining({ variant: "destructive" }));
    });
  });
}