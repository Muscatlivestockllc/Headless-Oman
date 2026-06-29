import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Loader2, LogIn, ShieldCheck } from "lucide-react";
import { startLogin } from "@/lib/customerAuth.functions";

export const Route = createFileRoute("/account/login")({
  component: LoginPage,
  head: () => ({
    meta: [
      { title: "Sign in — MLS" },
      { name: "description", content: "Sign in to your MLS account to view orders and addresses." },
    ],
  }),
});

function LoginPage() {
  const startLoginFn = useServerFn(startLogin);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleLogin = async () => {
    setLoading(true);
    setError(null);
    try {
      const { url } = await startLoginFn();
      window.location.href = url;
    } catch (e: any) {
      setError(e?.message ?? "Could not start login");
      setLoading(false);
    }
  };

  return (
    <div className="container mx-auto max-w-md px-4 py-16">
      <div className="rounded-xl border border-border bg-card p-8 text-center shadow-sm">
        <div className="mx-auto mb-4 grid h-12 w-12 place-items-center rounded-full bg-crimson/10 text-crimson">
          <ShieldCheck className="h-6 w-6" />
        </div>
        <h1 className="font-display text-3xl font-extrabold">Sign in to MLS</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          We use Shopify's secure customer login. You'll be sent a one-time code
          to your email — no password to remember.
        </p>

        <Button
          onClick={handleLogin}
          disabled={loading}
          size="lg"
          className="mt-6 w-full bg-crimson text-crimson-foreground hover:bg-rich-red"
        >
          {loading ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <>
              <LogIn className="mr-2 h-4 w-4" /> Continue with email
            </>
          )}
        </Button>

        {error && <p className="mt-3 text-sm text-destructive">{error}</p>}

        <p className="mt-6 text-xs text-muted-foreground">
          By continuing, you agree to MLS's terms and privacy policy.
        </p>
      </div>
    </div>
  );
}
