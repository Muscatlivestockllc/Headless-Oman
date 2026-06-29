import { createFileRoute, redirect } from "@tanstack/react-router";
import {
  getCookie,
  setCookie,
  deleteCookie,
  getRequestHost,
} from "@tanstack/react-start/server";
import { SHOPIFY_CUSTOMER, AUTH_COOKIES } from "@/lib/shopifyCustomer";

function originFromHost(): string {
  const host = getRequestHost();
  const proto = host.startsWith("localhost") || host.startsWith("127.0.0.1") ? "http" : "https";
  return `${proto}://${host}`;
}

export const Route = createFileRoute("/api/auth/callback")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const url = new URL(request.url);
        const code = url.searchParams.get("code");
        const state = url.searchParams.get("state");
        const err = url.searchParams.get("error");

        if (err) {
          return new Response(`OAuth error: ${err}`, { status: 400 });
        }
        if (!code || !state) {
          return new Response("Missing code or state", { status: 400 });
        }

        const expectedState = getCookie(AUTH_COOKIES.oauthState);
        const verifier = getCookie(AUTH_COOKIES.pkceVerifier);
        if (!expectedState || expectedState !== state) {
          return new Response("Invalid state", { status: 400 });
        }
        if (!verifier) {
          return new Response("Missing PKCE verifier", { status: 400 });
        }

        const body = new URLSearchParams({
          grant_type: "authorization_code",
          client_id: SHOPIFY_CUSTOMER.clientId,
          redirect_uri: `${originFromHost()}/api/auth/callback`,
          code,
          code_verifier: verifier,
        });

        const tokenRes = await fetch(SHOPIFY_CUSTOMER.tokenUrl, {
          method: "POST",
          headers: { "Content-Type": "application/x-www-form-urlencoded" },
          body,
        });

        if (!tokenRes.ok) {
          const text = await tokenRes.text();
          console.error("Token exchange failed", tokenRes.status, text);
          return new Response(`Token exchange failed: ${tokenRes.status}`, { status: 502 });
        }

        const tokens = (await tokenRes.json()) as {
          access_token: string;
          refresh_token?: string;
          id_token?: string;
          expires_in?: number;
        };

        // Store tokens in httpOnly cookies
        const baseOpts = {
          httpOnly: true,
          secure: true,
          sameSite: "lax" as const,
          path: "/",
        };
        setCookie(AUTH_COOKIES.accessToken, tokens.access_token, {
          ...baseOpts,
          maxAge: tokens.expires_in ?? 60 * 60 * 2,
        });
        if (tokens.refresh_token) {
          setCookie(AUTH_COOKIES.refreshToken, tokens.refresh_token, {
            ...baseOpts,
            maxAge: 60 * 60 * 24 * 30,
          });
        }
        if (tokens.id_token) {
          setCookie(AUTH_COOKIES.idToken, tokens.id_token, {
            ...baseOpts,
            maxAge: 60 * 60 * 24 * 30,
          });
        }

        // Clear transient PKCE cookies
        deleteCookie(AUTH_COOKIES.pkceVerifier, { path: "/" });
        deleteCookie(AUTH_COOKIES.oauthState, { path: "/" });

        throw redirect({ to: "/account" });
      },
    },
  },
});
