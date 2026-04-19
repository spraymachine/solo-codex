import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { Panel } from "@/components/ui/panel";

describe("Panel", () => {
  it("renders children", () => {
    render(<Panel>Hello System</Panel>);
    expect(screen.getByText("Hello System")).toBeInTheDocument();
  });

  it("applies glow variant class", () => {
    const { container } = render(<Panel glow="blue">Content</Panel>);
    expect(container.firstChild).toHaveClass("glow-blue");
  });
});
