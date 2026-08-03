import type { LoaderFunctionArgs, ActionFunctionArgs } from "@shopify/remix-oxygen";

// Cross-device recent searches for logged-in customers. Stored on the customer record as the
// custom.recent_searches metafield (JSON array), read/written server-side via the Admin API and
// keyed by the customer identified through the Customer Account API. Logged-out shoppers get
// { loggedIn: false } and the client keeps its per-browser localStorage list.

const NS = "custom";
const KEY = "recent_searches";
const MAX = 6;

async function getCustomerId(context: any): Promise<string | null> {
  try {
    if (!(await context.customerAccount.isLoggedIn())) return null;
    const { data } = await context.customerAccount.query(`#graphql
      query { customer { id } }
    `);
    return data?.customer?.id ?? null;
  } catch {
    return null;
  }
}

async function readRecent(context: any, id: string): Promise<string[]> {
  try {
    const d = await context.adminFetch(
      `query RecentSearches($id: ID!) {
         customer(id: $id) { metafield(namespace: "${NS}", key: "${KEY}") { value } }
       }`,
      { id },
    );
    const v = d?.customer?.metafield?.value;
    const arr = v ? JSON.parse(v) : [];
    return Array.isArray(arr) ? arr.filter((s: any) => typeof s === "string").slice(0, MAX) : [];
  } catch {
    return [];
  }
}

async function writeRecent(context: any, id: string, list: string[]): Promise<void> {
  try {
    await context.adminFetch(
      `mutation SetRecent($mf: [MetafieldsSetInput!]!) {
         metafieldsSet(metafields: $mf) { userErrors { message } }
       }`,
      { mf: [{ ownerId: id, namespace: NS, key: KEY, type: "json", value: JSON.stringify(list) }] },
    );
  } catch {
    /* best-effort — client still has localStorage */
  }
}

// GET → the customer's saved recent searches.
export async function loader({ context }: LoaderFunctionArgs) {
  const id = await getCustomerId(context);
  if (!id) return Response.json({ loggedIn: false, searches: [] });
  return Response.json({ loggedIn: true, searches: await readRecent(context, id) });
}

// POST { term } to add one, or { clear: true } to wipe.
export async function action({ request, context }: ActionFunctionArgs) {
  const id = await getCustomerId(context);
  if (!id) return Response.json({ loggedIn: false, searches: [] });

  let body: any = {};
  try { body = await request.json(); } catch { /* empty body */ }

  let list = await readRecent(context, id);
  if (body?.clear) {
    list = [];
  } else {
    const term = String(body?.term ?? "").trim();
    if (term.length >= 2) {
      list = [term, ...list.filter((r) => r.toLowerCase() !== term.toLowerCase())].slice(0, MAX);
    }
  }
  await writeRecent(context, id, list);
  return Response.json({ loggedIn: true, searches: list });
}
