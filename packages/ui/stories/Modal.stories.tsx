import type { Meta, StoryObj } from "@storybook/react-vite";
import { useState } from "react";
import { Button, FormField, FormModal, Input, Modal, ModalBody, ModalFooter, QuestionDialog, ResponsivePanel } from "@bmsuisse/ui";

const meta: Meta = { title: "Patterns/Modal" };
export default meta;
type Story = StoryObj;

const sleep = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));

export const Basic: Story = {
  render: () => {
    const [open, setOpen] = useState(false);
    return (
      <>
        <Button onClick={() => setOpen(true)}>Open modal</Button>
        <Modal
          open={open}
          onOpenChange={setOpen}
          title="Delete draft"
          description="This cannot be undone."
          footer={<Button onClick={() => setOpen(false)}>Done</Button>}
        >
          <p className="text-sm">The draft and its attachments will be removed.</p>
        </Modal>
      </>
    );
  },
};
export const Form: Story = {
  render: () => {
    const [open, setOpen] = useState(false);
    const [name, setName] = useState("");
    return (
      <>
        <Button onClick={() => setOpen(true)}>Open form modal</Button>
        <FormModal
          open={open}
          onOpenChange={setOpen}
          title="New contact"
          description="Saved after you submit."
          submitDisabled={!name}
          onSubmit={async () => {
            await sleep(600);
            setOpen(false);
          }}
        >
          <FormField label="Name" required>
            <Input value={name} onChange={(e) => setName(e.target.value)} />
          </FormField>
        </FormModal>
      </>
    );
  },
};
export const Panel: Story = {
  render: () => {
    const [open, setOpen] = useState(false);
    return (
      <>
        <Button onClick={() => setOpen(true)}>Open panel</Button>
        <ResponsivePanel
          open={open}
          onOpenChange={setOpen}
          title="Order details"
          description="Dialog on desktop, bottom sheet below lg."
          size="lg"
          resizable
          draggable
          footer={<Button onClick={() => setOpen(false)}>Close</Button>}
        >
          <div className="space-y-2 text-sm">
            {Array.from({ length: 30 }, (_, i) => <p key={i}>Line item {i + 1}</p>)}
          </div>
        </ResponsivePanel>
      </>
    );
  },
};
export const Question: Story = {
  render: () => {
    const [open, setOpen] = useState(false);
    return (
      <>
        <Button onClick={() => setOpen(true)}>Open question</Button>
        <QuestionDialog
          open={open}
          onOpenChange={setOpen}
          title="Save changes before closing?"
          description="Your edits have not been saved yet."
          actions={[
            { label: "Don't save", variant: "outline", onClick: () => sleep(400) },
            { label: "Save", onClick: () => sleep(800) },
          ]}
        />
      </>
    );
  },
};

/** A centred dialog on desktop, a bottom sheet on phones: resize the viewport below 1024px to see it. */
export const Composed: Story = {
  render: () => {
    const [open, setOpen] = useState(false);
    return (
      <>
        <Button onClick={() => setOpen(true)}>Open composed modal</Button>
        <Modal
          open={open}
          onOpenChange={setOpen}
          title="Offer 1042 for Muster AG"
          onBack={() => setOpen(false)}
          backTitle="Customer"
          headerActions={<Button size="sm" variant="outline">Export</Button>}
        >
          <ModalBody>
            {Array.from({ length: 30 }, (_, i) => (
              <p key={i} className="text-sm">Line {i + 1} of a body that scrolls while header and footer stay put.</p>
            ))}
          </ModalBody>
          <ModalFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
            <Button onClick={() => setOpen(false)}>Save</Button>
          </ModalFooter>
        </Modal>
      </>
    );
  },
};
