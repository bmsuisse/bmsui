import type { Meta, StoryObj } from "@storybook/react-vite";
import { useState } from "react";
import { FileInput } from "@bmsuisse/ui";

const meta: Meta<typeof FileInput> = {
  title: "Patterns/FileInput",
  component: FileInput,
  args: { files: [], onFilesChange: () => {} },
  render: (args) => {
    const [files, setFiles] = useState<File[]>(args.files);
    return (
      <div className="w-96">
        <FileInput {...args} files={files} onFilesChange={setFiles} />
      </div>
    );
  },
};
export default meta;
type Story = StoryObj<typeof FileInput>;

export const Default: Story = {};
export const MultipleWithLimits: Story = {
  args: { multiple: true, accept: ".pdf,.docx", maxSize: 5 * 1024 * 1024, hint: "PDF or Word, up to 5 MB" },
};
export const SmallImages: Story = { args: { size: "sm", accept: "image/*", hint: "PNG, JPG" } };
export const WithFile: Story = { args: { files: [new File(["hello"], "offer.pdf", { type: "application/pdf" })] } };
export const Disabled: Story = { args: { disabled: true } };
