import { createServerFn } from "@tanstack/react-start";
import { getCookie, setCookie, deleteCookie, getRequestHost } from "@tanstack/react-start/server";
import { SHOPIFY_CUSTOMER, AUTH_COOKIES } from "@/lib/shopifyCustomer";

// ---------- PKCE helpers (Web Crypto, Worker-compatible) ----------

function base64UrlEncode(bytes: ArrayBuffer | Uint8Array): string {
  const arr = bytes instanceof Uint8Array ? bytes : new Uint8Array(bytes);
  let str = "";
  for (let i = 0; i < arr.length; i++) str += String.fromCharCode(arr[i]);
  return btoa(str).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function randomString(byteLen = 32): string {
  const bytes = new Uint8Array(byteLen);
  crypto.getRandomValues(bytes);
  return base64UrlEncode(bytes);
}

async function sha256(input: string): Promise<string> {
  const data = new TextEncoder().encode(input);
  const hash = await crypto.subtle.digest("SHA-256", data);
  return base64UrlEncode(hash);
}

function originFromRequest(): string {
  const host = getRequestHost();
  // Worker runs over HTTPS in deployed envs; localhost may be http.
  const proto = host.startsWith("localhost") || host.startsWith("127.0.0.1") ? "http" : "https";
  return `${proto}://${host}`;
}

function redirectUri(): string {
  return `${originFromRequest()}/api/auth/callback`;
}

// ---------- Server functions ----------

// Start login: generates PKCE + state, stashes them in httpOnly cookies,
// returns the authorize URL the client should navigate to.
export const startLogin = createServerFn({ method: "POST" }).handler(async () => {
  const verifier = randomString(32);
  const challenge = await sha256(verifier);
  const state = randomString(16);
  const nonce = randomString(16);

  const cookieOpts = {
    httpOnly: true,
    secure: true,
    sameSite: "lax" as const,
    path: "/",
    maxAge: 60 * 10, // 10 minutes
  };
  setCookie(AUTH_COOKIES.pkceVerifier, verifier, cookieOpts);
  setCookie(AUTH_COOKIES.oauthState, state, cookieOpts);

  const url = new URL(SHOPIFY_CUSTOMER.authorizeUrl);
  url.searchParams.set("client_id", SHOPIFY_CUSTOMER.clientId);
  url.searchParams.set("scope", SHOPIFY_CUSTOMER.scope);
  url.searchParams.set("response_type", "code");
  url.searchParams.set("redirect_uri", redirectUri());
  url.searchParams.set("state", state);
  url.searchParams.set("nonce", nonce);
  url.searchParams.set("code_challenge", challenge);
  url.searchParams.set("code_challenge_method", "S256");

  return { url: url.toString() };
});

// Logout: clears local cookies, returns the Shopify logout URL.
export const logoutCustomer = createServerFn({ method: "POST" }).handler(async () => {
  const idToken = getCookie(AUTH_COOKIES.idToken);
  const cookieClear = { path: "/" };
  deleteCookie(AUTH_COOKIES.accessToken, cookieClear);
  deleteCookie(AUTH_COOKIES.refreshToken, cookieClear);
  deleteCookie(AUTH_COOKIES.idToken, cookieClear);

  const url = new URL(SHOPIFY_CUSTOMER.logoutUrl);
  if (idToken) url.searchParams.set("id_token_hint", idToken);
  url.searchParams.set("post_logout_redirect_uri", originFromRequest());
  return { url: url.toString() };
});

// ---------- Customer Account API helpers ----------

const CUSTOMER_QUERY = `
  query Customer {
    customer {
      id
      firstName
      lastName
      emailAddress { emailAddress }
      phoneNumber { phoneNumber }
      defaultAddress {
        formatted
        firstName
        lastName
        company
        address1
        address2
        city
        zoneCode
        territoryCode
        zip
        phoneNumber
      }
    }
  }
`;

const ORDERS_QUERY = `
  query Orders($first: Int!) {
    customer {
      orders(first: $first, sortKey: PROCESSED_AT, reverse: true) {
        edges {
          node {
            id
            number
            name
            processedAt
            financialStatus
            fulfillmentStatus
            totalPrice { amount currencyCode }
            lineItems(first: 4) {
              edges {
                node {
                  title
                  quantity
                  image { url altText }
                }
              }
            }
          }
        }
      }
    }
  }
`;

async function customerApiRequest<T = any>(
  accessToken: string,
  query: string,
  variables: Record<string, unknown> = {}
): Promise<{ data?: T; errors?: any } | null> {
  const res = await fetch(SHOPIFY_CUSTOMER.apiUrl, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: accessToken, // Customer Account API expects raw token, no "Bearer "
    },
    body: JSON.stringify({ query, variables }),
  });
  if (res.status === 401) return null; // signal expired
  if (!res.ok) throw new Error(`Customer API HTTP ${res.status}`);
  return res.json();
}

export const getCustomerProfile = createServerFn({ method: "GET" }).handler(async () => {
  const token = getCookie(AUTH_COOKIES.accessToken);
  if (!token) return { authenticated: false as const };

  const profileRes = await customerApiRequest<any>(token, CUSTOMER_QUERY);
  if (!profileRes) return { authenticated: false as const, expired: true as const };

  if (profileRes.errors) {
    console.error("Customer profile errors", profileRes.errors);
    return { authenticated: false as const };
  }

  const ordersRes = await customerApiRequest<any>(token, ORDERS_QUERY, { first: 10 });
  const orders =
    ordersRes?.data?.customer?.orders?.edges?.map((e: any) => e.node) ?? [];

  return {
    authenticated: true as const,
    customer: profileRes.data?.customer,
    orders,
  };
});
