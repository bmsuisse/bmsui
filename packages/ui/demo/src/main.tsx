import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { App } from "./App";
import { BrandMotionDemo } from "./BrandMotionDemo";
import { ModalLab } from "./ModalLab";
import "./globals.css";

const rootElement = document.getElementById("root");
if (!rootElement) throw new Error("#root element not found"); // guaranteed by index.html template

function pickDemo() {
  const path = window.location.pathname.replace(/\/$/, "");
  if (path.endsWith("/brand-motion")) return <BrandMotionDemo />;
  if (path.endsWith("/modal-lab")) return <ModalLab />;
  return <App />;
}

createRoot(rootElement).render(
  <StrictMode>
    {pickDemo()}
  </StrictMode>,
);
