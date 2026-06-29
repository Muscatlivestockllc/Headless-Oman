import type { LoaderFunctionArgs } from "@shopify/remix-oxygen";
import { Outlet } from "react-router";
import { User } from "lucide-react";

export async function loader({ context }: LoaderFunctionArgs) {
  await context.customerAccount.handleAuthStatus();
  return {};
}

export default function AccountLayout() {
  return (
    <div className="min-h-screen bg-background">
      <div className="border-b border-border bg-card px-4 py-6">
        <div className="container mx-auto flex items-center gap-3">
          <div className="grid h-9 w-9 place-items-center rounded-full bg-crimson/10">
            <User className="h-5 w-5 text-crimson" />
          </div>
          <h1 className="font-display text-2xl font-extrabold">My Account</h1>
        </div>
      </div>
      <div className="container mx-auto px-4 py-8">
        <Outlet />
      </div>
    </div>
  );
}
