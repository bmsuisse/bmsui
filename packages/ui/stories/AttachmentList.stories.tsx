import type { Meta, StoryObj } from "@storybook/react-vite";
import { useState } from "react";
import { AttachmentList } from "@bmsuisse/ui";

const FILES = [
  { id: "1", name: "Offerte 2026-0412.pdf", size: 1234567, mimeType: "application/pdf", href: "#" },
  { id: "2", name: "Preisliste Keller Haustechnik AG.xlsx", size: 48210, href: "#" },
  { id: "3", name: "Baustelle.jpg", size: 3400000, mimeType: "image/jpeg", href: "#" },
  { id: "4", name: "Unterlagen.zip", size: 15800000, mimeType: "application/zip" },
  { id: "5", name: "ein-sehr-langer-dateiname-ohne-leerzeichen-der-umbrechen-muss-2026-11-17-final-v3.docx", size: 20480, href: "#" },
];

const meta: Meta<typeof AttachmentList> = {
  title: "Patterns/AttachmentList",
  component: AttachmentList,
  decorators: [(Story) => <div className="w-[34rem] max-w-full"><Story /></div>],
};
export default meta;
type Story = StoryObj<typeof AttachmentList>;

export const Default: Story = { args: { attachments: FILES } };
export const Chips: Story = { args: { attachments: FILES, layout: "chips" } };
export const Single: Story = { args: { attachments: FILES.slice(0, 1) } };
export const Compose: Story = {
  render: () => {
    const [items, setItems] = useState(FILES);
    return <AttachmentList attachments={items} onRemove={(id) => setItems((p) => p.filter((a) => a.id !== id))} />;
  },
};
export const German: Story = {
  args: {
    attachments: FILES.slice(0, 3),
    onRemove: () => undefined,
    labels: {
      attachments: (n) => (n === 1 ? "1 Anhang" : `${n} Anhänge`),
      download: "Herunterladen",
      remove: (name) => `${name} entfernen`,
    },
  },
};
