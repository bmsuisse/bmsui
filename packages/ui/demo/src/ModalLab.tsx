import { useEffect, useRef, useState, type ReactElement } from "react";
import {
  Button,
  ConfirmDialog,
  FormModal,
  Input,
  Label,
  Modal,
  ModalBody,
  ModalFooter,
  ResponsivePanel,
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
  Textarea,
} from "@bmsuisse/ui";

type Scenario =
  | "basic"
  | "tall"
  | "form"
  | "nested-1"
  | "nested-2"
  | "nested-3"
  | "tabs"
  | "centered"
  | "back"
  | "composed"
  | "unmount"
  | "confirm"
  | "formmodal"
  | "panel";

const filler = (n: number): string[] => Array.from({ length: n }, (_, i) => `Row ${i + 1} of the scrolling body`);

/**
 * Click-through matrix for the shared Modal/Dialog/Sheet/Tabs on a real phone or desktop. Every
 * scenario has a `data-testid="open-<name>"` button; the page behind has a counter and a scrolling
 * list so "the page is usable again after closing" can be checked by hand and by Playwright.
 */
export function ModalLab(): ReactElement {
  const [open, setOpen] = useState<Scenario | null>(null);
  const [count, setCount] = useState(0);
  const [log, setLog] = useState<string[]>([]);
  const [tab, setTab] = useState("one");
  const timers = useRef<number[]>([]);
  useEffect(() => () => timers.current.forEach((id) => window.clearTimeout(id)), []);

  const note = (message: string): void => setLog((prev) => [message, ...prev].slice(0, 8));
  const show = (s: Scenario) => (): void => setOpen(s);
  const close = (): void => setOpen(null);
  const onOpenChange = (s: Scenario) => (next: boolean) => {
    if (!next) {
      note(`closed ${s}`);
      setOpen((current) => (current === s ? null : current));
    }
  };

  const later = (ms: number, fn: () => void): void => {
    timers.current.push(window.setTimeout(fn, ms));
  };
  const rapid = (steps: Array<[number, boolean]>): void => {
    for (const [ms, value] of steps) later(ms, () => setOpen(value ? "basic" : null));
  };

  return (
    <main className="mx-auto flex max-w-2xl flex-col gap-4 p-4 pb-24">
      <h1 className="text-xl font-semibold">Modal lab</h1>
      <p className="text-sm text-muted-foreground">
        Open each scenario, close it every way you can (X, Esc, backdrop, swipe the handle), then use the page
        behind: the counter must still count and the list must still scroll.
      </p>

      <div className="flex items-center gap-3">
        <Button data-testid="page-counter" onClick={() => setCount((c) => c + 1)}>
          Page button: {count}
        </Button>
        <span data-testid="log" className="text-xs text-muted-foreground">
          {log[0] ?? "no events"}
        </span>
      </div>

      <div className="grid grid-cols-2 gap-2">
        {(
          [
            ["basic", "Basic"],
            ["tall", "Tall body"],
            ["form", "Form with inputs"],
            ["nested-1", "Nested ×3"],
            ["tabs", "Tabs inside"],
            ["centered", "alwaysCentered"],
            ["back", "Back + actions"],
            ["composed", "Composed body/footer"],
            ["unmount", "Unmount on close"],
            ["confirm", "ConfirmDialog"],
            ["formmodal", "FormModal"],
            ["panel", "ResponsivePanel"],
          ] as const
        ).map(([name, label]) => (
          <Button key={name} variant="outline" data-testid={`open-${name}`} onClick={show(name)}>
            {label}
          </Button>
        ))}
      </div>

      <div className="grid grid-cols-2 gap-2">
        <Button variant="outline" data-testid="rapid-open-close" onClick={() => rapid([[0, true], [30, false]])}>
          Open then close in 30 ms
        </Button>
        <Button
          variant="outline"
          data-testid="rapid-flip"
          onClick={() =>
            rapid([
              [0, true],
              [40, false],
              [80, true],
              [120, false],
              [160, true],
            ])
          }
        >
          Flip ×5 (ends open)
        </Button>
        <Button variant="outline" data-testid="rapid-reopen-mid-exit" onClick={() => rapid([[0, true], [400, false], [520, true]])}>
          Reopen during exit
        </Button>
      </div>

      <section aria-label="Scrolling page content" className="flex flex-col gap-1 rounded-lg border p-3 text-sm">
        {filler(30).map((row) => (
          <p key={row}>{row.replace("scrolling body", "page behind")}</p>
        ))}
      </section>

      <Modal
        open={open === "basic"}
        onOpenChange={onOpenChange("basic")}
        title="Basic modal"
        description="Centred on desktop, bottom sheet on a phone."
        footer={
          <Button data-testid="basic-done" onClick={close}>
            Done
          </Button>
        }
      >
        <p>Short body.</p>
      </Modal>

      <Modal
        open={open === "tall"}
        onOpenChange={onOpenChange("tall")}
        title="Tall body"
        footer={
          <Button data-testid="tall-done" onClick={close}>
            Done
          </Button>
        }
      >
        <div className="flex flex-col gap-2" data-testid="tall-body">
          {filler(60).map((row) => (
            <p key={row}>{row}</p>
          ))}
        </div>
      </Modal>

      <Modal
        open={open === "form"}
        onOpenChange={onOpenChange("form")}
        title="Form with inputs"
        footer={
          <Button data-testid="form-done" onClick={close}>
            Save
          </Button>
        }
      >
        <div className="flex flex-col gap-3">
          {["First name", "Last name", "Email", "Phone"].map((label) => (
            <div key={label} className="flex flex-col gap-1">
              <Label htmlFor={`f-${label}`}>{label}</Label>
              <Input id={`f-${label}`} data-testid={`field-${label}`} />
            </div>
          ))}
          <Label htmlFor="f-notes">Notes</Label>
          <Textarea id="f-notes" data-testid="field-notes" rows={4} />
        </div>
      </Modal>

      <Modal
        open={open === "nested-1" || open === "nested-2" || open === "nested-3"}
        onOpenChange={onOpenChange("nested-1")}
        title="Nested 1"
        footer={
          <Button data-testid="nested-open-2" onClick={show("nested-2")}>
            Open second
          </Button>
        }
      >
        <p>First level.</p>
        <Modal
          open={open === "nested-2" || open === "nested-3"}
          onOpenChange={(next) => {
            if (!next) setOpen("nested-1");
          }}
          title="Nested 2"
          footer={
            <Button data-testid="nested-open-3" onClick={show("nested-3")}>
              Open third
            </Button>
          }
        >
          <p>Second level.</p>
          <Modal
            open={open === "nested-3"}
            onOpenChange={(next) => {
              if (!next) setOpen("nested-2");
            }}
            title="Nested 3"
          >
            <p>Third level.</p>
          </Modal>
        </Modal>
      </Modal>

      <Modal open={open === "tabs"} onOpenChange={onOpenChange("tabs")} title="Tabs inside a modal">
        <Tabs variant="underline" value={tab} onValueChange={setTab}>
          <TabsList aria-label="Sections">
            {["one", "two", "three", "four", "five", "six", "seven"].map((value) => (
              <TabsTrigger key={value} value={value} data-testid={`tab-${value}`}>
                Section {value}
              </TabsTrigger>
            ))}
          </TabsList>
          {["one", "two", "three", "four", "five", "six", "seven"].map((value) => (
            <TabsContent key={value} value={value} data-testid={`panel-${value}`}>
              <p>Content of section {value}.</p>
            </TabsContent>
          ))}
        </Tabs>
      </Modal>

      <Modal open={open === "centered"} onOpenChange={onOpenChange("centered")} title="Always centered" alwaysCentered>
        <p>Stays a centred dialog on a phone.</p>
      </Modal>

      <Modal
        open={open === "back"}
        onOpenChange={onOpenChange("back")}
        title="Offer 7 for a customer with a rather long name"
        onBack={() => note("back")}
        backTitle="Customer"
        headerActions={
          <Button size="sm" variant="outline" data-testid="header-action">
            Action
          </Button>
        }
      >
        <p>Header with a back arrow and an action.</p>
      </Modal>

      <Modal open={open === "composed"} onOpenChange={onOpenChange("composed")} title="Composed">
        <ModalBody data-testid="composed-body">
          {filler(40).map((row) => (
            <p key={row}>{row}</p>
          ))}
        </ModalBody>
        <ModalFooter>
          <Button data-testid="composed-done" onClick={close}>
            Done
          </Button>
        </ModalFooter>
      </Modal>

      {open === "unmount" ? (
        <Modal open onOpenChange={onOpenChange("unmount")} title="Unmounted on close">
          <p>The parent drops this element the moment it closes.</p>
        </Modal>
      ) : null}

      <ConfirmDialog
        open={open === "confirm"}
        onOpenChange={onOpenChange("confirm")}
        title="Delete?"
        description="This cannot be undone."
        onConfirm={() => note("confirmed")}
        confirmTestId="confirm-yes"
      />

      <FormModal
        open={open === "formmodal"}
        onOpenChange={onOpenChange("formmodal")}
        title="FormModal"
        onSubmit={() => {
          note("submitted");
          close();
        }}
        submitTestId="formmodal-submit"
      >
        <Input aria-label="Name" data-testid="formmodal-name" />
      </FormModal>

      <ResponsivePanel open={open === "panel"} onOpenChange={onOpenChange("panel")} title="ResponsivePanel" resizable>
        <p>Larger panel.</p>
      </ResponsivePanel>
    </main>
  );
}
