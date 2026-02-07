import React from "react";
import { createRoot } from "react-dom/client";
import App from "./App";
import "./styles.css";

const THEME_META_NAME = "theme-color";
const LIGHT_THEME_COLOR = "#f5f5f5";
const DARK_THEME_COLOR = "#0f172a";

function syncThemeColorMeta() {
  const theme = localStorage.getItem("theme");
  const color = theme === "dark" ? DARK_THEME_COLOR : LIGHT_THEME_COLOR;
  const meta = document.querySelector(
    `meta[name="${THEME_META_NAME}"]`,
  ) as HTMLMetaElement | null;
  if (meta) {
    meta.setAttribute("content", color);
  }
}

syncThemeColorMeta();
window.addEventListener("theme-change", syncThemeColorMeta);

const root = document.getElementById("root");
if (!root) throw new Error("Root element not found");

createRoot(root).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
