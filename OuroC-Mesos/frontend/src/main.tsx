import { createRoot } from "react-dom/client";
import { Buffer } from "buffer";
import App from "./App.tsx";
import { NotificationsProvider } from "./contexts/NotificationsContext";
import { PromoCodesProvider } from "./contexts/PromoCodesContext";
import "./index.css";

// Polyfill Buffer for Solana libraries
window.Buffer = Buffer;

createRoot(document.getElementById("root")!).render(
  <NotificationsProvider>
    <PromoCodesProvider>
      <App />
    </PromoCodesProvider>
  </NotificationsProvider>
);
