import type { LoaderFunctionArgs } from "@shopify/remix-oxygen";
import { useLoaderData, Form, Link } from "react-router";
import { Package, LogOut, User, Mail, ShoppingBag, Star, ArrowRight } from "lucide-react";
import { Button } from "~/components/ui/button";

const CUSTOMER_ORDERS_QUERY = `#graphql
  query CustomerOrders {
    customer {
      id
      firstName
      lastName
      emailAddress { emailAddress }
      orders(first: 10, sortKey: PROCESSED_AT, reverse: true) {
        nodes {
          id
          name
          processedAt
          financialStatus
          fulfillmentStatus
          totalPrice { amount currencyCode }
          lineItems(first: 3) {
            nodes {
              title
              quantity
              image { url altText }
            }
          }
        }
      }
    }
  }
` as const;

export async function loader({ context }: LoaderFunctionArgs) {
  await context.customerAccount.handleAuthStatus();
  const { data } = await context.customerAccount.query(CUSTOMER_ORDERS_QUERY);
  return { customer: data.customer };
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-AE", {
    year: "numeric", month: "short", day: "numeric",
  });
}

function formatMoney(amount: string, currency: string) {
  return new Intl.NumberFormat("en-AE", {
    style: "currency", currency,
  }).format(parseFloat(amount));
}

function statusColor(status: string) {
  const s = status?.toLowerCase();
  if (s === "paid" || s === "fulfilled") return "bg-green-100 text-green-700";
  if (s === "pending" || s === "unfulfilled") return "bg-yellow-100 text-yellow-700";
  if (s === "refunded" || s === "cancelled") return "bg-red-100 text-red-700";
  return "bg-muted text-muted-foreground";
}

export default function AccountIndex() {
  const { customer } = useLoaderData<typeof loader>();
  const orders = customer?.orders?.nodes ?? [];
  const name = [customer?.firstName, customer?.lastName].filter(Boolean).join(" ") || "Customer";
  const email = customer?.emailAddress?.emailAddress ?? "";

  return (
    <div className="space-y-8">
      {/* Profile card */}
      <div className="flex items-center gap-4 rounded-xl border border-border bg-card p-5 shadow-sm">
        <div className="grid h-14 w-14 place-items-center rounded-full bg-crimson text-crimson-foreground text-xl font-bold">
          {name.charAt(0).toUpperCase()}
        </div>
        <div className="flex-1 min-w-0">
          <p className="font-display text-lg font-bold">{name}</p>
          <p className="flex items-center gap-1.5 text-sm text-muted-foreground truncate">
            <Mail className="h-3.5 w-3.5 flex-shrink-0" />
            {email}
          </p>
        </div>
        <Form method="post" action="/account/logout">
          <Button variant="outline" size="sm" className="gap-2 text-muted-foreground">
            <LogOut className="h-4 w-4" />
            Sign out
          </Button>
        </Form>
      </div>

      {/* MLS Rewards */}
      <Link to="/pages/rewards" className="block">
        <div className="flex items-center justify-between gap-4 overflow-hidden rounded-xl border border-gold/30 bg-charcoal p-5 shadow-sm transition-all hover:border-gold/50 hover:shadow-md">
          <div className="flex items-center gap-4">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-gold/15 border border-gold/25">
              <Star className="h-5 w-5 text-gold" />
            </div>
            <div>
              <p className="font-display font-bold text-off-white">MLS Rewards</p>
              <p className="text-xs text-off-white/55">View your points balance and redeem rewards</p>
            </div>
          </div>
          <ArrowRight className="h-4 w-4 shrink-0 text-gold/60" />
        </div>
      </Link>

      {/* Orders */}
      <div>
        <h2 className="mb-4 flex items-center gap-2 font-display text-xl font-bold">
          <ShoppingBag className="h-5 w-5 text-crimson" />
          Order History
        </h2>

        {orders.length === 0 ? (
          <div className="flex flex-col items-center gap-3 rounded-xl border border-dashed border-border py-16 text-center text-muted-foreground">
            <Package className="h-10 w-10 opacity-40" />
            <p className="font-medium">No orders yet</p>
            <Link to="/">
              <Button size="sm" className="bg-crimson text-crimson-foreground hover:bg-rich-red">
                Start Shopping
              </Button>
            </Link>
          </div>
        ) : (
          <div className="flex flex-col gap-4">
            {orders.map((order) => (
              <div
                key={order.id}
                className="rounded-xl border border-border bg-card p-4 shadow-sm"
              >
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div>
                    <p className="font-semibold">{order.name}</p>
                    <p className="text-xs text-muted-foreground">{formatDate(order.processedAt)}</p>
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-[11px] font-semibold capitalize ${statusColor(order.financialStatus)}`}>
                      {order.financialStatus?.toLowerCase()}
                    </span>
                    <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-[11px] font-semibold capitalize ${statusColor(order.fulfillmentStatus)}`}>
                      {order.fulfillmentStatus?.toLowerCase()}
                    </span>
                    <span className="font-bold text-crimson">
                      {formatMoney(order.totalPrice.amount, order.totalPrice.currencyCode)}
                    </span>
                  </div>
                </div>

                {order.lineItems.nodes.length > 0 && (
                  <div className="mt-3 flex flex-wrap gap-2">
                    {order.lineItems.nodes.map((item, i) => (
                      <div key={i} className="flex items-center gap-2 rounded-lg bg-muted px-3 py-1.5 text-xs">
                        {item.image && (
                          <img
                            src={item.image.url}
                            alt={item.image.altText ?? item.title}
                            className="h-6 w-6 rounded object-cover"
                          />
                        )}
                        <span className="text-foreground">{item.title}</span>
                        <span className="text-muted-foreground">×{item.quantity}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
