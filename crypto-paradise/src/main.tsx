import { StrictMode } from "react";
import { createRoot } from "react-dom/client";

// Bundled fonts — exact families used in the Figma design.
import "@fontsource/inter/400.css";
import "@fontsource/inter/500.css";
import "@fontsource/inter/600.css";
import "@fontsource/quicksand/600.css";

import "./index.css";
import App from "./App";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
