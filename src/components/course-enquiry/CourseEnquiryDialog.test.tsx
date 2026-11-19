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
  it("saves unpaid registration interest for the selected course without creating enrollment or checkout", async () => {
    mocks.rpc.mockResolvedValue({ data: { id: "interest-1", duplicate: false, is_test: true }, error: null });
    render(<CourseEnquiryDialog open onOpenChange={() => {}} courseId="software-course" courseTitle="Software Engineering" mode="registration" />);
    fill();
    fireEvent.change(screen.getByLabelText("When would you like to start? *"), { target: { value: "later_cohort" } });
    fireEvent.change(screen.getByLabelText("Full name *"), { target: { value: "[TEST] Course Registration" } });
    fireEvent.click(screen.getByRole("button", { name: "Register interest" }));
    await waitFor(() => expect(mocks.rpc).toHaveBeenCalledTimes(1));
    expect(mocks.rpc.mock.calls[0][0]).toBe("submit_enquiry");
    expect(mocks.rpc.mock.calls[0][1].p).toMatchObject({
      lead_type: "course", course_id: "software-course", intended_start: "later_cohort",
      training_needs: "Course registration interest: Software Engineering", is_test: true,
    });
    expect(mocks.conversion).not.toHaveBeenCalled();
    expect(mocks.invoke.mock.calls.every(([name]) => name === "notify-business-lead")).toBe(true);
  });

  it("rejects a phone number not in international format without saving or tracking", () => {
    open(); fill("08012345678"); submit();
    expect(screen.getByText(/international format/)).toBeInTheDocument();
    expect(mocks.rpc).not.toHaveBeenCalled();
    expect(mocks.conversion).not.toHaveBeenCalled();
  });

  it("saves the enquiry with the course preselected, then tracks one Lead", async () => {
    mocks.rpc.mockResolvedValue({ data: { id: "lead-9", duplicate: false, is_test: false }, error: null });
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

  it("never reports a labelled QA enquiry as a Google Ads conversion", async () => {
    // Even if a server response were wrong, a [TEST] name stays suppressed.
    mocks.rpc.mockResolvedValue({ data: { id: "lead-qa", duplicate: false, is_test: false }, error: null });
    open(); fill();
    fireEvent.change(screen.getByLabelText("Full name *"), { target: { value: "[TEST] QA" } });
    submit();
    await waitFor(() => expect(screen.getByText(/enquiry is saved/)).toBeInTheDocument());
    expect(mocks.rpc.mock.calls[0][1].p.is_test).toBe(true);
    expect(mocks.conversion).not.toHaveBeenCalled();
  });

  it("sends the Lead with only non-personal fields", async () => {
    mocks.rpc.mockResolvedValue({ data: { id: "lead-7", duplicate: false, is_test: false }, error: null });
    open(); fill(); submit();
    await waitFor(() => expect(mocks.conversion).toHaveBeenCalledTimes(1));
    expect(mocks.conversion).toHaveBeenCalledWith("Lead", { value: 0, currency: "GBP", form_type: "course_enquiry", transaction_id: "lead-lead-7" });
  });

  it("suppresses the conversion when the server marks the row as test (e.g. +test@)", async () => {
    mocks.rpc.mockResolvedValue({ data: { id: "lead-s", duplicate: false, is_test: true }, error: null });
    open(); fill();
    fireEvent.change(screen.getByLabelText("Email *"), { target: { value: "ops+test@example.test" } });
    submit();
    await waitFor(() => expect(screen.getByText(/enquiry is saved/)).toBeInTheDocument());
    expect(mocks.conversion).not.toHaveBeenCalled();
  });

  it("suppresses the conversion when the server omits the test flag (fails closed)", async () => {
    mocks.rpc.mockResolvedValue({ data: { id: "lead-x", duplicate: false }, error: null });
    open(); fill(); submit();
    await waitFor(() => expect(screen.getByText(/enquiry is saved/)).toBeInTheDocument());
    expect(mocks.conversion).not.toHaveBeenCalled();
  });
});
