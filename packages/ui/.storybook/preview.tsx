import type { Decorator, Preview } from "@storybook/react-vite";
import "./storybook.css";

// Toolbar toggle -> `.dark` on <html>, which is how the library's tokens
// (`@custom-variant dark`) flip, not prefers-color-scheme. The Brand toggle sets
// `data-brand` on <html>, like OneSales does (see brands.css); "default" removes it.
const withTheme: Decorator = (Story, context) => {
  const dark = context.globals.theme === "dark";
  document.documentElement.classList.toggle("dark", dark);
  document.documentElement.style.colorScheme = dark ? "dark" : "light";
  const corners = context.globals.corners as string | undefined;
  if (corners && corners !== "rounded") document.documentElement.dataset.corners = corners;
  else delete document.documentElement.dataset.corners;
  const brand = context.globals.brand as string | undefined;
  if (brand && brand !== "default") document.documentElement.dataset.brand = brand;
  else delete document.documentElement.dataset.brand;
  return (
    <div className="bg-background p-4 text-foreground">
      <Story />
    </div>
  );
};

const preview: Preview = {
  decorators: [withTheme],
  globalTypes: {
    theme: {
      description: "Color scheme",
      toolbar: {
        title: "Theme",
        icon: "circlehollow",
        items: [
          { value: "light", title: "Light" },
          { value: "dark", title: "Dark" },
        ],
        dynamicTitle: true,
      },
    },
    corners: {
      description: "Corner style: rounded (reference radius) or square",
      toolbar: {
        title: "Corners",
        icon: "box",
        items: [
          { value: "rounded", title: "Rounded", icon: "circle" },
          { value: "square", title: "Square", icon: "square" },
        ],
        dynamicTitle: true,
      },
    },
    brand: {
      description: "Brand theme (OneSales tenants)",
      toolbar: {
        title: "Brand",
        icon: "paintbrush",
        items: [
          { value: "default", title: "None (reference tokens)", icon: "circlehollow" },
          { value: "bms", title: "BMS", left: "🔴" },
          { value: "proone", title: "ProOne", left: "🔵" },
          { value: "procasa", title: "ProCasa", left: "🟤" },
        ],
        dynamicTitle: true,
      },
    },
  },
  initialGlobals: { theme: "light", brand: "default", corners: "rounded" },
  parameters: {
    layout: "centered",
    backgrounds: { disable: true },
    controls: { matchers: { color: /(background|color)$/i, date: /Date$/i } },
  },
  tags: ["autodocs"],
};

export default preview;
