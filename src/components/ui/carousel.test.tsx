import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { Carousel, CarouselContent, CarouselItem, CarouselPrevious, CarouselNext } from "./carousel";

// Regression: prev/next buttons MUST expose accessible names so screen-reader
// users can navigate. If these labels go missing the a11y audit fails.
describe("Carousel a11y", () => {
  it("exposes accessible names on previous/next buttons", () => {
    render(
      <Carousel>
        <CarouselContent>
          <CarouselItem>One</CarouselItem>
          <CarouselItem>Two</CarouselItem>
        </CarouselContent>
        <CarouselPrevious />
        <CarouselNext />
      </Carousel>,
    );
    expect(screen.getByRole("button", { name: /previous slide/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /next slide/i })).toBeInTheDocument();
  });
});