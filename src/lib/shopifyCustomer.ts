// Shopify Customer Account API — public client (PKCE) configuration.
// These values come from the Shopify admin → Customer Account API page.
export const SHOPIFY_CUSTOMER = {
  shopId: "59406614597",
  clientId: "06daa3bf-add3-4f50-b81c-9e2d1314b5e1",
  authorizeUrl: "https://shopify.com/authentication/59406614597/oauth/authorize",
  tokenUrl: "https://shopify.com/authentication/59406614597/oauth/token",
  logoutUrl: "https://shopify.com/authentication/59406614597/logout",
  apiUrl: "https://shopify.com/59406614597/account/customer/api/2025-07/graphql",
  // OAuth scopes required for reading the customer profile + orders.
  scope: "openid email customer-account-api:full",
} as const;

// Cookie names used by the auth flow
export const AUTH_COOKIES = {
  accessToken: "mls_cust_at",
  refreshToken: "mls_cust_rt",
  idToken: "mls_cust_id",
  pkceVerifier: "mls_pkce_v",
  oauthState: "mls_oauth_s",
} as const;
