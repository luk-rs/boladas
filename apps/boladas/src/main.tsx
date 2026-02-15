import React from "react";
import { createRoot } from "react-dom/client";
import App from "./App";
import { AppProviders } from "./app/providers/AppProviders";
import "./styles.css";

const preventGestureZoom = (event: Event) => {
  event.preventDefault();
};

const preventPinchZoom = (event: TouchEvent) => {
  if (event.touches.length > 1) {
    event.preventDefault();
  }
};

if (typeof document !== "undefined") {
  document.addEventListener("gesturestart", preventGestureZoom, {
    passive: false,
  });
  document.addEventListener("gesturechange", preventGestureZoom, {
    passive: false,
  });
  document.addEventListener("gestureend", preventGestureZoom, {
    passive: false,
  });
  document.addEventListener("touchmove", preventPinchZoom, {
    passive: false,
  });
}

const root = document.getElementById("root");
if (!root) throw new Error("Elemento root não encontrado");

createRoot(root).render(
  <React.StrictMode>
    <AppProviders>
      <App />
    </AppProviders>
  </React.StrictMode>
);
