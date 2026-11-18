import { HomeIcon } from "@heroicons/react/24/outline";
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { AttachmentList } from "../src/patterns/attachment-list/AttachmentList";
import { BottomNavigation } from "../src/patterns/bottom-navigation/BottomNavigation";
import { Chip } from "../src/patterns/chip/Chip";
import { CodeBlock } from "../src/patterns/code-block/CodeBlock";
import { ConversationRow } from "../src/patterns/conversation-row/ConversationRow";
import { JsonView } from "../src/patterns/json-view/JsonView";
import { MailMessage } from "../src/patterns/mail-message/MailMessage";
import { PromptSuggestions } from "../src/patterns/prompt-suggestions/PromptSuggestions";
import { Rating } from "../src/patterns/rating/Rating";
import { SkipLinks } from "../src/patterns/skip-links/SkipLinks";
import { SplitButton } from "../src/patterns/split-button/SplitButton";
import { StatStrip, StatStripItem } from "../src/patterns/stat-strip/StatStrip";
import { ToolCallCard } from "../src/patterns/tool-call/ToolCall";
import { TypingIndicator } from "../src/patterns/typing-indicator/TypingIndicator";

/** Every default text of the newer components must be overridable through `labels` (the hook for built-in translations). */
describe("labels cover the user-facing texts", () => {
  it("StatStrip loading, SkipLinks nav, PromptSuggestions group, TypingIndicator, SplitButton menu", () => {
    render(
      <StatStrip>
        <StatStripItem label="A" value="1" loading labels={{ loading: "Lädt" }} />
      </StatStrip>,
    );
    expect(screen.getByLabelText("Lädt")).toBeInTheDocument();
    render(<SkipLinks links={[{ label: "x", href: "#x" }]} labels={{ nav: "Sprunglinks" }} />);
    expect(screen.getByRole("navigation", { name: "Sprunglinks" })).toBeInTheDocument();
    render(<PromptSuggestions suggestions={["a"]} labels={{ group: "Vorschläge" }} />);
    expect(screen.getByLabelText("Vorschläge")).toBeInTheDocument();
    render(<TypingIndicator labels={{ typing: "Schreibt gerade" }} />);
    expect(screen.getByText("Schreibt gerade")).toBeInTheDocument();
    render(<SplitButton items={[{ id: "a", label: "A", onSelect: () => {} }]} labels={{ menu: "Weitere Aktionen" }}>Senden</SplitButton>);
    expect(screen.getByRole("button", { name: "Weitere Aktionen" })).toBeInTheDocument();
  });

  it("CodeBlock region name, JsonView header/summary/size/copy", () => {
    render(<CodeBlock code="x" labels={{ code: "Quelltext" }} />);
    expect(screen.getByRole("region", { name: "Quelltext" })).toBeInTheDocument();
    render(
      <JsonView
        value={{ a: 1 }}
        labels={{ json: "Daten", size: (b) => `${b} Byte`, summary: (c, s) => `${s} / ${c}`, copyNamed: (l) => `${l} kopieren` }}
      />,
    );
    expect(screen.getByRole("button", { name: "Daten kopieren" })).toBeInTheDocument();
    expect(screen.getByText(/Byte \/ 1 key/)).toBeInTheDocument();
  });

  it("ToolCall duration, AttachmentList units and download name, Chip remove, Rating value", () => {
    render(<ToolCallCard name="t" duration={1500} labels={{ duration: (ms) => `${ms / 1000} Sek.` }} />);
    expect(screen.getByText("1.5 Sek.")).toBeInTheDocument();
    render(
      <AttachmentList
        attachments={[{ id: "1", name: "a.pdf", size: 2048, href: "/a" }]}
        labels={{ sizeUnits: ["B", "Ko", "Mo", "Go"], downloadFile: (n) => `${n} herunterladen` }}
      />,
    );
    expect(screen.getByText(/Ko/)).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "a.pdf herunterladen" })).toBeInTheDocument();
    render(<Chip onRemove={() => {}} labels={{ removeItem: (t) => `${t} entfernen` }}>Brand</Chip>);
    expect(screen.getByRole("button", { name: "Brand entfernen" })).toBeInTheDocument();
    render(<Rating readOnly value={3} labels={{ ratingValue: (_l, v) => `Bewertung ${v}` }} />);
    expect(screen.getByRole("img", { name: "Bewertung 3 out of 5" })).toBeInTheDocument();
  });

  it("MailMessage recipient line, separator and status text; BottomNavigation overflow; ConversationRow singular", () => {
    render(
      <MailMessage
        direction="outbound"
        sender={{ name: "Bob" }}
        time="2026-11-10T08:00:00Z"
        recipients={{ to: ["a@b.ch"], cc: ["c@d.ch"] }}
        status="failed"
        error="Mailbox voll"
        labels={{
          separator: " | ",
          recipientLine: (g, a) => `${g} → ${a.join("; ")}`,
          statusWithError: (s, e) => `${s} (${e})`,
        }}
      >
        Hallo
      </MailMessage>,
    );
    expect(screen.getByText(/to → a@b\.ch/)).toBeInTheDocument();
    expect(screen.getByText(/\| cc → c@d\.ch/)).toBeInTheDocument();
    expect(screen.getByText("Sending failed (Mailbox voll)")).toBeInTheDocument();
    render(
      <BottomNavigation
        aria-label="Main"
        items={[{ id: "h", label: "Home", icon: HomeIcon, badge: 120 }]}
        value="h"
        labels={{ overflow: (m) => `>${m}` }}
      />,
    );
    expect(screen.getByText(">99")).toBeInTheDocument();
    render(
      <ul>
        <ConversationRow subject="S" customer={{ name: "C" }} time="2026-11-10T08:00:00Z" threadCount={2} labels={{ threads: (n) => `${n} Nachrichten` }} />
      </ul>,
    );
    expect(screen.getByLabelText("2 Nachrichten")).toBeInTheDocument();
  });
});
