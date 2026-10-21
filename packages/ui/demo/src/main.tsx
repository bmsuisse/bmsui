import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { App } from "./App";
import { BrandMotionDemo } from "./BrandMotionDemo";
import "./globals.css";

const rootElement = document.getElementById("root");
if (!rootElement) throw new Error("#root element not found"); // guaranteed by index.html template

createRoot(rootElement).render(
  <StrictMode>
    {window.location.pathname.replace(/\/$/, "").endsWith("/brand-motion") ? <BrandMotionDemo /> : <App />}
  </StrictMode>,
);
