import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { WordPage } from "@/components/word/word-page";
import { getDb } from "@/lib/db/database";
import { usePersonaStore } from "@/lib/stores/persona-store";
import { useReadStore } from "@/lib/stores/read-store";

const pushMock = vi.fn();
const replaceMock = vi.fn();

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: pushMock, replace: replaceMock }),
}));

const BASE_RECORD = {
  id: "word-1",
  word: "ephemeral",
  definition: "Lasting for a very short time.",
  partOfSpeech: "adjective",
  myDefinition: "",
  synonyms: [],
  allDefinitions: [
    { partOfSpeech: "adjective", definition: "Lasting for a very short time.", example: "Youth is ephemeral." },
    { partOfSpeech: "adjective", definition: "Transitory; short-lived." },
  ],
  allSynonyms: ["fleeting", "transient", "momentary"],
  sourceType: "book" as const,
  favorite: false,
  createdAt: "2026-06-13T10:00:00.000Z",
  updatedAt: "2026-06-13T10:00:00.000Z",
};

describe("WordPage", () => {
  beforeEach(async () => {
    await getDb("mani").readRecords.clear();
    usePersonaStore.setState({ activePersona: "mani" });
    useReadStore.setState({ records: [], loaded: false });
    pushMock.mockClear();
    replaceMock.mockClear();
  });

  it("renders word, pos, and all definitions", async () => {
    await getDb("mani").readRecords.add(BASE_RECORD);
    render(<WordPage id="word-1" />);

    await waitFor(() => expect(screen.getByText("ephemeral")).toBeInTheDocument());
    expect(screen.getAllByText("adjective").length).toBeGreaterThan(0);
    expect(screen.getByText("Lasting for a very short time.")).toBeInTheDocument();
    expect(screen.getByText("Transitory; short-lived.")).toBeInTheDocument();
    expect(screen.getByText(/Youth is ephemeral/)).toBeInTheDocument();
  });

  it("renders synonym chips from allSynonyms", async () => {
    await getDb("mani").readRecords.add(BASE_RECORD);
    render(<WordPage id="word-1" />);

    await waitFor(() => expect(screen.getByText("fleeting")).toBeInTheDocument());
    expect(screen.getByText("transient")).toBeInTheDocument();
    expect(screen.getByText("momentary")).toBeInTheDocument();
  });

  it("redirects to /words when record not found", async () => {
    render(<WordPage id="nonexistent" />);

    await waitFor(() => expect(replaceMock).toHaveBeenCalledWith("/words"), { timeout: 2000 });
  });

  it("pre-populates myDefinition and selected synonyms from record", async () => {
    await getDb("mani").readRecords.add({
      ...BASE_RECORD,
      myDefinition: "things that fade fast",
      synonyms: ["fleeting"],
    });
    render(<WordPage id="word-1" />);

    await waitFor(() => {
      expect((screen.getByPlaceholderText("Write your own take on this word…") as HTMLTextAreaElement).value).toBe(
        "things that fade fast",
      );
    });
    expect(screen.getByText("1 / 2")).toBeInTheDocument();
  });

  it("toggling synonym updates counter", async () => {
    await getDb("mani").readRecords.add(BASE_RECORD);
    render(<WordPage id="word-1" />);

    await waitFor(() => expect(screen.getByText("fleeting")).toBeInTheDocument());
    fireEvent.click(screen.getByRole("button", { name: "fleeting" }));
    expect(screen.getByText("1 / 2")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "transient" }));
    expect(screen.getByText("2 / 2")).toBeInTheDocument();
  });

  it("locks synonym selection at 2", async () => {
    await getDb("mani").readRecords.add(BASE_RECORD);
    render(<WordPage id="word-1" />);

    await waitFor(() => expect(screen.getByText("fleeting")).toBeInTheDocument());
    fireEvent.click(screen.getByRole("button", { name: "fleeting" }));
    fireEvent.click(screen.getByRole("button", { name: "transient" }));

    const momentaryBtn = screen.getByRole("button", { name: "momentary" });
    expect(momentaryBtn).toBeDisabled();
  });

  it("adds custom synonym via input", async () => {
    await getDb("mani").readRecords.add(BASE_RECORD);
    render(<WordPage id="word-1" />);

    await waitFor(() => expect(screen.getByPlaceholderText("Add your own…")).toBeInTheDocument());
    fireEvent.change(screen.getByPlaceholderText("Add your own…"), { target: { value: "brief" } });
    fireEvent.click(screen.getByRole("button", { name: "+ Add" }));

    expect(screen.getByText(/brief/)).toBeInTheDocument();
    expect(screen.getByText("1 / 2")).toBeInTheDocument();
  });

  it("save button calls updateRecord and redirects", async () => {
    await getDb("mani").readRecords.add(BASE_RECORD);
    render(<WordPage id="word-1" />);

    await waitFor(() => expect(screen.getByText("Save changes")).toBeInTheDocument());
    fireEvent.click(screen.getByRole("button", { name: "Save changes" }));

    await waitFor(() => expect(pushMock).toHaveBeenCalledWith("/words"));
  });
});
