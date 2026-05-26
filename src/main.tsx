import { createRoot } from "react-dom/client";

import App from "./App.tsx";

// biome-ignore lint/style/noNonNullAssertion: convention
createRoot(document.getElementById("pixi-container")!).render(<App />);
