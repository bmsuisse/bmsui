import type { Meta, StoryObj } from "@storybook/react-vite";
import { useState } from "react";
import { ChatBubbleLeftIcon, MapPinIcon, TagIcon } from "@heroicons/react/24/outline";
import { Button, Timeline, TimelineGroup, TimelineItem } from "@bmsuisse/ui";

const meta: Meta<typeof Timeline> = {
  title: "Patterns/Timeline",
  component: Timeline,
  decorators: [(Story) => <div className="max-w-md"><Story /></div>],
};

export default meta;
type Story = StoryObj<typeof Timeline>;

// Fixed instants, so screenshots are stable.
const T1 = "2026-11-10T08:15:00Z";
const T2 = "2026-11-10T09:40:00Z";
const T3 = "2026-11-10T11:05:00Z";

/** A running process: finished steps recede, the active one is prominent, the rest wait. */
export const Process: Story = {
  render: () => (
    <Timeline timeFormat="time" pending="Waiting for the final check…">
      <TimelineItem status="done" title="Document read" description="12 pages, 48 positions" time={T1} />
      <TimelineItem status="done" title="Skill chosen" description="Sanitary offer · by the assistant" time={T2} />
      <TimelineItem status="active" title="Matching the catalog" description="Position 31 of 48" time={T3} />
      <TimelineItem status="pending" title="Final check" />
    </Timeline>
  ),
};

export const WithError: Story = {
  render: () => (
    <Timeline timeFormat="time">
      <TimelineItem status="done" title="Upload received" time={T1} />
      <TimelineItem status="error" title="Parsing failed" time={T2} collapsible>
        The file is password protected. Remove the password and retry.
      </TimelineItem>
    </Timeline>
  ),
};

/** History with icons and tones, grouped by day. */
export const ActivityHistory: Story = {
  render: () => (
    <Timeline timeFormat="datetime">
      <TimelineGroup label="10.11.2026">
        <TimelineItem icon={MapPinIcon} tone="info" title="Visit" description="Site walk, Bern" time={T3} />
        <TimelineItem icon={ChatBubbleLeftIcon} tone="success" title="Call with the buyer" time={T2} />
      </TimelineGroup>
      <TimelineGroup label="09.11.2026">
        <TimelineItem icon={TagIcon} tone="warning" title="Offer sent" description="CHF 12’400" time="2026-11-09T14:20:00Z" />
        <TimelineItem title="Customer created" time="2026-11-09T07:00:00Z" />
      </TimelineGroup>
    </Timeline>
  ),
};

/** Plain events: a dot in the tone colour; `time` can also be your own text. */
export const PlainDots: Story = {
  render: () => (
    <Timeline>
      <TimelineItem tone="info" title="Status changed to Approved" time="Today, 09:10" />
      <TimelineItem tone="neutral" title="Comment added" time="Yesterday" />
      <TimelineItem tone="error" title="Rejected once" time="Monday" />
    </Timeline>
  ),
};

/** Detail folds; uncontrolled it follows the status (open while active, folded once done) until you toggle it. */
export const CollapsibleDetail: Story = {
  render: () => (
    <Timeline timeFormat="time">
      <TimelineItem status="done" title="Checked the catalog" time={T1} collapsible>
        <pre className="overflow-x-auto rounded-md bg-muted p-2 font-mono text-xs">{'{ "hits": 14, "best": "A-4711" }'}</pre>
      </TimelineItem>
      <TimelineItem status="active" title="Writing the answer" time={T3} collapsible>
        Drafting from 14 matches.
      </TimelineItem>
    </Timeline>
  ),
};

export const Controlled: Story = {
  render: () => {
    const [open, setOpen] = useState(false);
    return (
      <div className="space-y-3">
        <Button size="sm" variant="outline" onClick={() => setOpen((o) => !o)}>
          {open ? "Fold" : "Unfold"} from outside
        </Button>
        <Timeline>
          <TimelineItem status="done" title="Step" collapsible open={open} onOpenChange={setOpen}>
            Detail text.
          </TimelineItem>
        </Timeline>
      </div>
    );
  },
};

/** `size="sm"` for chat bubbles and side panels. */
export const Small: Story = {
  render: () => (
    <Timeline size="sm" timeFormat="time" className="rounded-lg border border-foreground/10 p-3 dark:border-border">
      <TimelineItem status="done" title="Read the document" time={T1} />
      <TimelineItem status="active" title="Matching" description="Position 31 of 48" time={T3} />
      <TimelineItem status="pending" title="Final check" />
    </Timeline>
  ),
};

export const LongText: Story = {
  render: () => (
    <Timeline timeFormat="time">
      <TimelineItem
        status="done"
        title="Supercalifragilisticexpialidocious_extremely_long_unbroken_step_name_that_must_wrap"
        description="A description that runs over several lines so you can see how the rail keeps up with a tall row on a narrow phone screen."
        time={T1}
      />
      <TimelineItem status="active" title="Next" time={T3} />
    </Timeline>
  ),
};

export const Labels: Story = {
  render: () => (
    <Timeline timeFormat="time" pending labels={{ pending: "Lädt…" }} locale="de-CH">
      <TimelineItem status="done" title="Erledigt" time={T1} />
    </Timeline>
  ),
};

export const Static: Story = {
  render: () => (
    <Timeline animated={false} timeFormat="time">
      <TimelineItem status="active" title="No transitions" time={T1} collapsible>
        Detail.
      </TimelineItem>
    </Timeline>
  ),
};
