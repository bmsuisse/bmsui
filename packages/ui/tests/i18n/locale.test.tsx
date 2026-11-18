import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { BmsLocaleProvider, getI18n, useFormatLocale, useLabels } from "../../src/i18n/locale";
import { ConfirmDialog } from "../../src/patterns/modal/ConfirmDialog";
import { Combobox } from "../../src/patterns/combobox/Combobox";
import { ErrorState, defaultErrorStateLabels } from "../../src/patterns/error-state/ErrorState";
import { Pagination, defaultPaginationLabels } from "../../src/patterns/pagination/Pagination";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "../../src/primitives/dialog";
import { paginationLabelsFor } from "../../src/patterns/pagination/Pagination";

const noop = () => {};

describe("default labels", () => {
  it("stay the English strings every component rendered before", () => {
    expect(defaultPaginationLabels.next).toBe("Next");
    expect(defaultPaginationLabels.range("1", "25", "312")).toBe("1–25 of 312");
    expect(defaultErrorStateLabels.title).toBe("Couldn't load data");
  });
});

describe("<BmsLocaleProvider>", () => {
  it("translates built-in texts", () => {
    render(
      <BmsLocaleProvider locale="de-CH">
        <Pagination page={2} pageCount={5} onPageChange={noop} />
      </BmsLocaleProvider>,
    );
    expect(screen.getByRole("button", { name: "Weiter" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Zurück" })).toBeInTheDocument();
  });

  it("stays English without a provider", () => {
    render(<Pagination page={2} pageCount={5} onPageChange={noop} />);
    expect(screen.getByRole("button", { name: "Next" })).toBeInTheDocument();
  });

  it("lets a labels prop win, key by key", () => {
    render(
      <BmsLocaleProvider locale="fr">
        <Pagination page={2} pageCount={5} onPageChange={noop} labels={{ next: "Après" }} />
      </BmsLocaleProvider>,
    );
    expect(screen.getByRole("button", { name: "Après" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Précédent" })).toBeInTheDocument();
  });

  it("translates text props that used to default to English, and lets them win", () => {
    const { rerender } = render(
      <BmsLocaleProvider locale="it">
        <ConfirmDialog open onOpenChange={noop} title="T" onConfirm={noop} />
      </BmsLocaleProvider>,
    );
    expect(screen.getByRole("button", { name: "Conferma" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Annulla" })).toBeInTheDocument();
    rerender(
      <BmsLocaleProvider locale="it">
        <ConfirmDialog open onOpenChange={noop} title="T" confirmLabel="Elimina" onConfirm={noop} />
      </BmsLocaleProvider>,
    );
    expect(screen.getByRole("button", { name: "Elimina" })).toBeInTheDocument();
  });

  it("translates the screen-reader close button of dialogs", () => {
    render(
      <BmsLocaleProvider locale="fr">
        <Dialog open>
          <DialogContent>
            <DialogTitle>T</DialogTitle>
            <DialogDescription>D</DialogDescription>
          </DialogContent>
        </Dialog>
      </BmsLocaleProvider>,
    );
    expect(screen.getByText("Fermer")).toBeInTheDocument();
  });

  it("translates combobox defaults and plural selected counts", () => {
    render(
      <BmsLocaleProvider locale="es">
        <Combobox
          multiple
          options={[
            { value: "a", label: "A" },
            { value: "b", label: "B" },
          ]}
          value={["a", "b"]}
          onChange={vi.fn()}
        />
      </BmsLocaleProvider>,
    );
    expect(screen.getByText("2 seleccionados")).toBeInTheDocument();
  });

  it("keeps hooks stable when ErrorState toggles", () => {
    const { rerender } = render(
      <BmsLocaleProvider locale="de">
        <ErrorState error="x" />
      </BmsLocaleProvider>,
    );
    expect(screen.getByText("Daten konnten nicht geladen werden")).toBeInTheDocument();
    rerender(
      <BmsLocaleProvider locale="de">
        <ErrorState error={undefined} />
      </BmsLocaleProvider>,
    );
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
  });
});

describe("number/date formatting locale", () => {
  const range = () => screen.getByText(/1.?000$/);
  // The thousands separator depends on the runtime's ICU data (' or ’), so compare against Intl itself.
  const swiss = new Intl.NumberFormat("de-CH").format(1000);

  it("is de-CH without a provider, as before", () => {
    render(<Pagination page={1} totalItems={1000} pageSize={25} onPageChange={noop} />);
    expect(range()).toHaveTextContent(`1–25 of ${swiss}`);
  });

  it("follows the provider", () => {
    render(
      <BmsLocaleProvider locale="en">
        <Pagination page={1} totalItems={1000} pageSize={25} onPageChange={noop} />
      </BmsLocaleProvider>,
    );
    expect(range()).toHaveTextContent("1–25 of 1,000");
  });

  it("lets the component's own locale prop win", () => {
    render(
      <BmsLocaleProvider locale="en">
        <Pagination page={1} totalItems={1000} pageSize={25} locale="de-CH" onPageChange={noop} />
      </BmsLocaleProvider>,
    );
    expect(range()).toHaveTextContent(`1–25 of ${swiss}`);
  });

  it("exposes the resolution as useFormatLocale", () => {
    function Probe({ locale }: { locale?: string }) {
      return <span data-testid="p">{useFormatLocale(locale)}</span>;
    }
    const { rerender } = render(<Probe />);
    expect(screen.getByTestId("p")).toHaveTextContent("de-CH");
    rerender(
      <BmsLocaleProvider locale="fr-CH">
        <Probe />
      </BmsLocaleProvider>,
    );
    expect(screen.getByTestId("p")).toHaveTextContent("fr-CH");
    rerender(
      <BmsLocaleProvider locale="fr-CH">
        <Probe locale="it-CH" />
      </BmsLocaleProvider>,
    );
    expect(screen.getByTestId("p")).toHaveTextContent("it-CH");
  });
});

describe("useLabels", () => {
  it("ignores keys passed as undefined", () => {
    function Probe() {
      return <span data-testid="p">{useLabels(paginationLabelsFor, { next: undefined, previous: "Prev" }).next}</span>;
    }
    render(
      <BmsLocaleProvider locale="de">
        <Probe />
      </BmsLocaleProvider>,
    );
    expect(screen.getByTestId("p")).toHaveTextContent("Weiter");
    expect(getI18n("de").t("pagination.previous")).toBe("Zurück");
  });
});
