import { describe, expect, it, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { SiteHeader } from "@/components/layout/site-header";
import { usePersonaStore } from "@/lib/stores/persona-store";

vi.mock("@/components/auth/auth-gate", () => ({
  useAuth: () => ({ user: { email: "maniha@improve.com" }, signOut: vi.fn() }),
}));

describe("SiteHeader", () => {
  it("renders nav links and persona avatars and switches persona", () => {
    usePersonaStore.setState({ activePersona: "mani" });
    render(<SiteHeader />);

    expect(screen.getByRole("link", { name: /dashboard/i })).toHaveAttribute("href", "/");
    expect(screen.getByRole("link", { name: /books/i })).toHaveAttribute("href", "/books");
    expect(screen.getByRole("link", { name: /words/i })).toHaveAttribute("href", "/words");
    expect(screen.getByRole("link", { name: /work/i })).toHaveAttribute("href", "/work");

    const hartiBtn = screen.getByRole("button", { name: /switch to harti/i });
    fireEvent.click(hartiBtn);
    expect(usePersonaStore.getState().activePersona).toBe("harti");
  });
});
