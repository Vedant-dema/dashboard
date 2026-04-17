import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import App from "./App";
import { hydrateAppFontFamilyFromStorage } from "./common/utils/appFontFamily";
import { hydrateAppFontScaleFromStorage } from "./common/utils/appFontScale";
import { hydrateMotionFromStorage } from "./common/utils/appMotion";
import { ErrorBoundary } from "./components/ErrorBoundary";
import { AuthProvider } from "./contexts/AuthContext";
import { LanguageProvider } from "./contexts/LanguageContext";
import "./index.css";
import "./app-font-cascade.css";

hydrateAppFontScaleFromStorage();
hydrateAppFontFamilyFromStorage();
hydrateMotionFromStorage();

const rootEl = document.getElementById("root");
if (!rootEl) {
  document.body.innerHTML =
    '<p style="font-family:sans-serif;padding:2rem">Missing #root in index.html</p>';
} else {
  createRoot(rootEl).render(
    <StrictMode>
      <ErrorBoundary>
        <LanguageProvider>
          <AuthProvider>
            <App />
          </AuthProvider>
        </LanguageProvider>
      </ErrorBoundary>
    </StrictMode>
  );
}
