import type { Meta, StoryObj } from "@storybook/react-vite";
import { useState } from "react";
import { Pagination } from "@bmsuisse/ui";

const meta: Meta<typeof Pagination> = { title: "Patterns/Pagination", component: Pagination };

export default meta;
type Story = StoryObj<typeof Pagination>;

export const Default: Story = {
  render: () => {
    const [page, setPage] = useState(5);
    return <Pagination page={page} onPageChange={setPage} pageCount={13} />;
  },
};
export const WithTotals: Story = {
  render: () => {
    const [page, setPage] = useState(2);
    const [size, setSize] = useState(25);
    return (
      <Pagination page={page} onPageChange={setPage} totalItems={1042} pageSize={size} pageSizeOptions={[10, 25, 50]} onPageSizeChange={(s) => { setSize(s); setPage(1); }} />
    );
  },
};
export const Compact: Story = {
  render: () => {
    const [page, setPage] = useState(3);
    return <Pagination compact page={page} onPageChange={setPage} pageCount={13} />;
  },
};
export const Disabled: Story = { render: () => <Pagination disabled page={1} onPageChange={() => {}} pageCount={5} /> };
