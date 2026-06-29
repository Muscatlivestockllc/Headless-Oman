import { createFileRoute, Link, redirect } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Loader2, LogOut, MapPin, Package, User as UserIcon } from "lucide-react";
import { getCustomerProfile, logoutCustomer } from "@/lib/customerAuth.functions";
import { formatPrice } from "@/lib/shopify";

export const Route = createFileRoute("/account/")({
  head: () => ({ meta: [{ title: "My Account — MLS" }] }),
  loader: async () => {
    const result = await getCustomerProfile();
    if (!result.authenticated) {
      throw redirect({ to: "/account/login" });
    }
    return result;
  },
  component: AccountPage,
});

function AccountPage() {
  const data = Route.useLoaderData();
  const logoutFn = useServerFn(logoutCustomer);
  const [loggingOut, setLoggingOut] = useState(false);

  if (!data.authenticated) return null; // narrowed via redirect

  const { customer, orders } = data;
  const name =
    [customer?.firstName, customer?.lastName].filter(Boolean).join(" ") || "Customer";

  const handleLogout = async () => {
    setLoggingOut(true);
    try {
      const { url } = await logoutFn();
      window.location.href = url;
    } catch {
      setLoggingOut(false);
    }
  };

  return (
    <div className="container mx-auto max-w-5xl px-4 py-12">
      <div className="mb-8 flex flex-wrap items-end justify-between gap-3">
        <div>
          <div className="text-[11px] font-bold uppercase tracking-[0.2em] text-crimson">
            My Account
          </div>
          <h1 className="mt-2 font-display text-3xl font-extrabold md:text-4xl">
            Welcome, {name}
          </h1>
          {customer?.emailAddress?.emailAddress && (
            <p className="mt-1 text-sm text-muted-foreground">
              {customer.emailAddress.emailAddress}
            </p>
          )}
        </div>
        <Button
          variant="outline"
          onClick={handleLogout}
          disabled={loggingOut}
        >
          {loggingOut ? (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          ) : (
            <LogOut className="mr-2 h-4 w-4" />
          )}
          Sign out
        </Button>
      </div>

      <div className="grid gap-6 md:grid-cols-3">
        {/* Profile card */}
        <div className="rounded-xl border border-border bg-card p-5">
          <div className="mb-3 flex items-center gap-2 text-sm font-semibold">
            <UserIcon className="h-4 w-4 text-crimson" /> Profile
          </div>
          <dl className="space-y-1.5 text-sm">
            <div>
              <dt className="text-xs text-muted-foreground">Name</dt>
              <dd>{name}</dd>
            </div>
            {customer?.emailAddress?.emailAddress && (
              <div>
                <dt className="text-xs text-muted-foreground">Email</dt>
                <dd>{customer.emailAddress.emailAddress}</dd>
              </div>
            )}
            {customer?.phoneNumber?.phoneNumber && (
              <div>
                <dt className="text-xs text-muted-foreground">Phone</dt>
                <dd>{customer.phoneNumber.phoneNumber}</dd>
              </div>
            )}
          </dl>
        </div>

        {/* Default address */}
        <div className="rounded-xl border border-border bg-card p-5 md:col-span-2">
          <div className="mb-3 flex items-center gap-2 text-sm font-semibold">
            <MapPin className="h-4 w-4 text-crimson" /> Default address
          </div>
          {customer?.defaultAddress ? (
            <address className="text-sm not-italic leading-relaxed text-foreground">
              {customer.defaultAddress.formatted ? (
                <span style={{ whiteSpace: "pre-line" }}>
                  {Array.isArray(customer.defaultAddress.formatted)
                    ? customer.defaultAddress.formatted.join("\n")
                    : customer.defaultAddress.formatted}
                </span>
              ) : (
                <>
                  {customer.defaultAddress.address1}
                  {customer.defaultAddress.address2 && <>, {customer.defaultAddress.address2}</>}
                  <br />
                  {customer.defaultAddress.city}{" "}
                  {customer.defaultAddress.zip}
                  <br />
                  {customer.defaultAddress.territoryCode}
                </>
              )}
            </address>
          ) : (
            <p className="text-sm text-muted-foreground">No address on file yet.</p>
          )}
        </div>
      </div>

      {/* Orders */}
      <div className="mt-10">
        <div className="mb-4 flex items-center gap-2">
          <Package className="h-5 w-5 text-crimson" />
          <h2 className="font-display text-xl font-bold">Recent orders</h2>
        </div>

        {orders.length === 0 ? (
          <div className="rounded-xl border border-dashed border-border bg-card/50 p-10 text-center">
            <p className="text-sm text-muted-foreground">
              You haven't placed any orders yet.
            </p>
            <Link
              to="/"
              className="mt-3 inline-block text-sm font-semibold text-crimson hover:underline"
            >
              Start shopping →
            </Link>
          </div>
        ) : (
          <ul className="space-y-3">
            {orders.map((o: any) => (
              <li
                key={o.id}
                className="rounded-xl border border-border bg-card p-4 md:p-5"
              >
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <div className="font-semibold">{o.name ?? `#${o.number}`}</div>
                    <div className="text-xs text-muted-foreground">
                      {new Date(o.processedAt).toLocaleDateString(undefined, {
                        year: "numeric",
                        month: "long",
                        day: "numeric",
                      })}
                    </div>
                    <div className="mt-1 flex flex-wrap gap-1.5">
                      {o.financialStatus && (
                        <span className="rounded-full bg-charcoal/10 px-2 py-0.5 text-[10px] font-semibold uppercase">
                          {String(o.financialStatus).toLowerCase()}
                        </span>
                      )}
                      {o.fulfillmentStatus && (
                        <span className="rounded-full bg-crimson/10 px-2 py-0.5 text-[10px] font-semibold uppercase text-crimson">
                          {String(o.fulfillmentStatus).toLowerCase()}
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="font-display text-lg font-bold text-crimson">
                    {formatPrice(o.totalPrice.amount, o.totalPrice.currencyCode)}
                  </div>
                </div>
                {o.lineItems?.edges?.length > 0 && (
                  <div className="mt-3 flex flex-wrap gap-2">
                    {o.lineItems.edges.map((li: any, i: number) => (
                      <div
                        key={i}
                        className="flex items-center gap-2 rounded-md bg-muted/50 px-2 py-1 text-xs"
                      >
                        {li.node.image?.url && (
                          <img
                            src={li.node.image.url}
                            alt={li.node.image.altText ?? li.node.title}
                            className="h-8 w-8 rounded object-cover"
                          />
                        )}
                        <span className="line-clamp-1">
                          {li.node.title} × {li.node.quantity}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
