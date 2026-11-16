import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { CourseEnquiryDialog } from "./CourseEnquiryDialog";

const mocks = vi.hoisted(() => ({ rpc: vi.fn(), invoke: vi.fn(), conversion: vi.fn() }));
vi.mock("@/integrations/supabase/client", () => ({ supabase: { rpc: mocks.rpc, functions: { invoke: mocks.invoke } } }));
vi.mock("@/lib/analytics", () => ({ googleAdsConversion: mocks.conversion }));

beforeEach(() => { vi.resetAllMocks(); mocks.invoke.mockResolvedValue({}); sessionStorage.clear(); localStorage.clear(); });
afterEach(cleanup);

const open = () => render(<CourseEnquiryDialog open onOpenChange={() => {}} courseId="course-1" courseTitle="Cloud Bootcamp" />);
const fill = (phone = "+234 801 234 5678") => {
  fireEvent.change(screen.getByLabelText("Full name *"), { target: { value: "Ada Test" } });
  fireEvent.change(screen.getByLabelText("Email *"), { target: { value: "ada@example.test" } });
  fireEvent.change(screen.getByLabelText("Phone (international) *"), { target: { value: phone } });
  fireEvent.change(screen.getByLabelText("Country *"), { target: { value: "Nigeria" } });
  fireEvent.change(screen.getByLabelText("Experience level *"), { target: { value: "beginner" } });
  fireEvent.change(screen.getByLabelText("When would you like to start? *"), { target: { value: "2026-11-28" } });
};
const submit = () => fireEvent.click(screen.getByRole("button", { name: "Send enquiry" }));

describe("Cloud cohort enquiry", () => {
  it("rejects a phone number not in international format without saving or tracking", () => {
    open(); fill("08012345678"); submit();
    expect(screen.getByText(/international format/)).toBeInTheDocument();
    expect(mocks.rpc).not.toHaveBeenCalled();
    expect(mocks.conversion).not.toHaveBeenCalled();
  });

  it("saves the enquiry with the course preselected, then tracks one Lead", async () => {
    mocks.rpc.mockResolvedValue({ data: { id: "lead-9", duplicate: false }, error: null });
    open(); fill(); submit();
    await waitFor(() => expect(screen.getByText(/enquiry is saved/)).toBeInTheDocument());
    const p = mocks.rpc.mock.calls[0][1].p;
    expect(p).toMatchObject({ lead_type: "course", course_id: "course-1", intended_start: "2026-11-28", experience_level: "beginner" });
    expect(mocks.conversion).toHaveBeenCalledTimes(1);
    expect(JSON.stringify(mocks.conversion.mock.calls[0])).not.toContain("ada@example.test");
  });

  it("does not track a failed save and keeps the typed answers", async () => {
    mocks.rpc.mockResolvedValue({ data: null, error: { message: "boom" } });
    open(); fill(); submit();
    await waitFor(() => expect(screen.getByRole("alert")).toBeInTheDocument());
    expect(mocks.conversion).not.toHaveBeenCalled();
    expect(JSON.parse(sessionStorage.getItem("sec_course_enquiry_draft")!).name).toBe("Ada Test");
  });

  it("ignores spam-trap submissions", async () => {
    open(); fill();
    fireEvent.change(document.querySelector('input[name="website"]')!, { target: { value: "spam" } });
    submit();
    await waitFor(() => expect(screen.getByText(/enquiry is saved/)).toBeInTheDocument());
    expect(mocks.rpc).not.toHaveBeenCalled();
    expect(mocks.conversion).not.toHaveBeenCalled();
  });
});
