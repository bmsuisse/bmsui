import type { Meta, StoryObj } from "@storybook/react-vite";
import { useState } from "react";
import {
  Button, Dialog, DialogBody, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger, Input,
} from "@bmsuisse/ui";

const meta: Meta = { title: "Primitives/Dialog" };
export default meta;
type Story = StoryObj;

export const Default: Story = {
  render: () => (
    <Dialog>
      <DialogTrigger asChild><Button variant="outline">Open dialog</Button></DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Rename offer</DialogTitle>
          <DialogDescription>Give the offer a name you will recognize.</DialogDescription>
        </DialogHeader>
        <DialogBody><Input placeholder="Offer name" /></DialogBody>
        <DialogFooter><Button>Save</Button></DialogFooter>
      </DialogContent>
    </Dialog>
  ),
};
export const Controlled: Story = {
  render: () => {
    const [open, setOpen] = useState(false);
    return (
      <>
        <Button variant="outline" onClick={() => setOpen(true)}>Open (controlled)</Button>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogContent showCloseButton={false}>
            <DialogHeader><DialogTitle>No close button</DialogTitle></DialogHeader>
            <DialogBody>Close it with the button below or Esc.</DialogBody>
            <DialogFooter><Button onClick={() => setOpen(false)}>Done</Button></DialogFooter>
          </DialogContent>
        </Dialog>
      </>
    );
  },
};
export const LongBody: Story = {
  render: () => (
    <Dialog>
      <DialogTrigger asChild><Button variant="outline">Open long dialog</Button></DialogTrigger>
      <DialogContent>
        <DialogHeader><DialogTitle>Scrolling body</DialogTitle></DialogHeader>
        <DialogBody>
          {Array.from({ length: 40 }, (_, i) => <p key={i} className="py-1 text-sm">Line {i + 1}</p>)}
        </DialogBody>
        <DialogFooter><Button>OK</Button></DialogFooter>
      </DialogContent>
    </Dialog>
  ),
};
