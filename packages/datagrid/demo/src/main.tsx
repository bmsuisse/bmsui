import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "react-day-picker/style.css";
import { App } from "./App";
import "./globals.css";

const rootElement = document.getElementById("root");
if (!rootElement) throw new Error("#root element not found"); // guaranteed by index.html template

createRoot(rootElement).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
