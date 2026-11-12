import type { Meta, StoryObj } from "@storybook/react-vite";
import {
  Table, TableBody, TableCaption, TableCell, TableFooter, TableHead, TableHeader, TableRow,
} from "@bmsuisse/ui";

const meta: Meta = { title: "Primitives/Table" };
export default meta;
type Story = StoryObj;

const rows = [["INV-001", "Paid", 250], ["INV-002", "Pending", 150], ["INV-003", "Unpaid", 350]] as const;

export const Default: Story = {
  render: () => (
    <Table className="w-[28rem]">
      <TableCaption>Recent invoices</TableCaption>
      <TableHeader>
        <TableRow><TableHead>Invoice</TableHead><TableHead>Status</TableHead><TableHead className="text-right">Amount</TableHead></TableRow>
      </TableHeader>
      <TableBody>
        {rows.map(([id, s, a]) => (
          <TableRow key={id}><TableCell>{id}</TableCell><TableCell>{s}</TableCell><TableCell className="text-right">{a}.00</TableCell></TableRow>
        ))}
      </TableBody>
      <TableFooter>
        <TableRow><TableCell colSpan={2}>Total</TableCell><TableCell className="text-right">750.00</TableCell></TableRow>
      </TableFooter>
    </Table>
  ),
};
export const Minimal: Story = {
  render: () => (
    <Table className="w-72">
      <TableBody>
        <TableRow><TableCell>Alpha</TableCell><TableCell>1</TableCell></TableRow>
        <TableRow><TableCell>Beta</TableCell><TableCell>2</TableCell></TableRow>
      </TableBody>
    </Table>
  ),
};
