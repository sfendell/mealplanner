import { GOOGLE_CALENDAR_SCOPE, GOOGLE_CLIENT_ID } from "../config";

const TOKEN_KEY = "mealprep_google_access_token";

type TokenClient = {
  requestAccessToken: (overrideConfig?: { prompt?: string }) => void;
};

declare global {
  interface Window {
    google?: {
      accounts: {
        oauth2: {
          initTokenClient: (config: {
            client_id: string;
            scope: string;
            callback: (response: {
              access_token?: string;
              error?: string;
              error_description?: string;
            }) => void;
          }) => TokenClient;
          revoke: (token: string, done?: () => void) => void;
        };
      };
    };
  }
}

function loadGisScript(): Promise<void> {
  if (window.google?.accounts?.oauth2) {
    return Promise.resolve();
  }

  return new Promise((resolve, reject) => {
    const existing = document.querySelector<HTMLScriptElement>(
      'script[src="https://accounts.google.com/gsi/client"]'
    );
    if (existing) {
      existing.addEventListener("load", () => resolve());
      existing.addEventListener("error", () =>
        reject(new Error("Failed to load Google Identity Services"))
      );
      return;
    }

    const script = document.createElement("script");
    script.src = "https://accounts.google.com/gsi/client";
    script.async = true;
    script.onload = () => resolve();
    script.onerror = () =>
      reject(new Error("Failed to load Google Identity Services"));
    document.head.appendChild(script);
  });
}

export function getStoredAccessToken(): string | null {
  return sessionStorage.getItem(TOKEN_KEY);
}

export function clearStoredAccessToken(): void {
  const token = sessionStorage.getItem(TOKEN_KEY);
  sessionStorage.removeItem(TOKEN_KEY);
  if (token && window.google?.accounts?.oauth2) {
    window.google.accounts.oauth2.revoke(token);
  }
}

export function isGoogleAuthConfigured(): boolean {
  return Boolean(GOOGLE_CLIENT_ID);
}

export async function requestGoogleCalendarAccess(): Promise<string> {
  if (!GOOGLE_CLIENT_ID) {
    throw new Error(
      "Missing Google OAuth Client ID. Set VITE_GOOGLE_CLIENT_ID or GOOGLE_CLIENT_ID in src/config.ts."
    );
  }

  await loadGisScript();

  return new Promise((resolve, reject) => {
    if (!window.google?.accounts?.oauth2) {
      reject(new Error("Google Identity Services failed to initialize"));
      return;
    }

    const client = window.google.accounts.oauth2.initTokenClient({
      client_id: GOOGLE_CLIENT_ID,
      scope: GOOGLE_CALENDAR_SCOPE,
      callback: (response) => {
        if (response.error || !response.access_token) {
          reject(
            new Error(
              response.error_description ||
                response.error ||
                "Google sign-in was cancelled"
            )
          );
          return;
        }
        sessionStorage.setItem(TOKEN_KEY, response.access_token);
        resolve(response.access_token);
      },
    });

    // Prompt consent the first time; reuse silent grant when possible.
    const prompt = getStoredAccessToken() ? "" : "consent";
    client.requestAccessToken({ prompt });
  });
}

export async function ensureGoogleCalendarAccess(): Promise<string> {
  const existing = getStoredAccessToken();
  if (existing) return existing;
  return requestGoogleCalendarAccess();
}
