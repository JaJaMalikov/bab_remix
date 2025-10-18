import { createRoot } from "react-dom/client";

import "./styles/globals.css";
import "@radix-ui/themes/styles.css";

import App from "./App";

const container = document.getElementById("app");
if (!container) {
  throw new Error("Root element not found");
}

const root = createRoot(container);
root.render(<App />);
