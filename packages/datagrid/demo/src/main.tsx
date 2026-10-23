import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { App } from "./App";
import { WhatsNew } from "./WhatsNew";
import "./globals.css";

const rootElement = document.getElementById("root");
if (!rootElement) throw new Error("#root element not found"); // guaranteed by index.html template

createRoot(rootElement).render(
  <StrictMode>
    {new URLSearchParams(window.location.search).has("whats-new") ? <WhatsNew /> : <App />}
  </StrictMode>,
);
