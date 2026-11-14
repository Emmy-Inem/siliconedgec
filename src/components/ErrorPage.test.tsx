import { describe, it, expect, vi } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { BrowserRouter, MemoryRouter, Route, Routes } from "react-router-dom";
import { HelmetProvider } from "react-helmet-async";
import { ErrorBoundary, RouteErrorBoundary } from "./ErrorBoundary";
import { ErrorPage } from "./ErrorPage";

const Bomb = () => {
  throw new Error("Simulated test explosion");
};

describe("ErrorBoundary and ErrorPage", () => {
  it("recovers the destination after navigating away from a failed route", () => {
    cleanup();
    const spy = vi.spyOn(console, "error").mockImplementation(() => {});
    try {
      render(
        <HelmetProvider>
          <MemoryRouter initialEntries={["/broken"]}>
            <RouteErrorBoundary>
              <Routes>
                <Route path="/broken" element={<Bomb />} />
                <Route path="/courses" element={<p>Recovered course destination</p>} />
              </Routes>
            </RouteErrorBoundary>
          </MemoryRouter>
        </HelmetProvider>
      );
      expect(screen.getByText(/Something went wrong/i)).toBeInTheDocument();
      fireEvent.click(screen.getAllByRole("link", { name: /Browse Courses/i })[0]);
      expect(screen.getByText("Recovered course destination")).toBeInTheDocument();
      expect(screen.queryByText(/Something went wrong/i)).not.toBeInTheDocument();
    } finally {
      cleanup();
      spy.mockRestore();
    }
  });
  it("renders ErrorPage with Home and Course links when an error is thrown", () => {
    // Suppress console.error in test output for the intentional test explosion
    const spy = vi.spyOn(console, "error").mockImplementation(() => {});

    render(
      <HelmetProvider>
        <BrowserRouter>
          <ErrorBoundary>
            <Bomb />
          </ErrorBoundary>
        </BrowserRouter>
      </HelmetProvider>
    );

    // Verify main error headings
    expect(screen.getByText(/Something went wrong/i)).toBeInTheDocument();

    // Verify links to Home and Courses
    const homeLinks = screen.getAllByRole("link", { name: /home/i });
    expect(homeLinks.length).toBeGreaterThanOrEqual(1);
    expect(homeLinks.some((l) => l.getAttribute("href") === "/")).toBe(true);

    const courseLinks = screen.getAllByRole("link", { name: /course/i });
    expect(courseLinks.length).toBeGreaterThanOrEqual(1);
    expect(courseLinks.some((l) => l.getAttribute("href") === "/courses")).toBe(true);

    spy.mockRestore();
  });

  it("renders ErrorPage standalone with custom title and statusCode", () => {
    render(
      <HelmetProvider>
        <BrowserRouter>
          <ErrorPage
            statusCode="500"
            title="Service Interruption"
            message="Please try heading back to courses or home."
          />
        </BrowserRouter>
      </HelmetProvider>
    );

    expect(screen.getByText(/Service Interruption/i)).toBeInTheDocument();
    expect(screen.getByText(/Error 500/i)).toBeInTheDocument();
    const browseLinks = screen.getAllByRole("link", { name: /Browse Courses/i });
    expect(browseLinks.length).toBeGreaterThanOrEqual(1);
    expect(browseLinks[0]).toHaveAttribute("href", "/courses");
    expect(screen.getByRole("link", { name: /Back to Home/i })).toHaveAttribute("href", "/");
  });
});
