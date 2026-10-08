import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Sparkles, ArrowLeft } from "lucide-react";
import { toast } from "sonner";
import installQr from "@/assets/install-qr.png";

export const Route = createFileRoute("/auth")({
  head: () => ({ meta: [{ title: "LittleSparks — Sign in" }] }),
  component: AuthPage,
});

function AuthPage() {
  const navigate = useNavigate();
  const [mode, setMode] = useState<"login" | "signup" | "forgot">("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) navigate({ to: "/" });
    });
  }, [navigate]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    try {
      if (mode === "signup") {
        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: { emailRedirectTo: window.location.origin },
        });
        if (error) throw error;
        toast.success("Welcome! Account created.");
        navigate({ to: "/" });
      } else if (mode === "login") {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        navigate({ to: "/" });
      } else if (mode === "forgot") {
        const { error } = await supabase.auth.resetPasswordForEmail(email, {
          redirectTo: `${window.location.origin}/reset-password`,
        });
        if (error) throw error;
        toast.success("Check your email for a reset link.");
        setMode("login");
      }
    } catch (err: any) {
      toast.error(err.message ?? "Something went wrong");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-gradient-to-b from-background to-secondary px-6">
      <div className="mb-8 text-center">
        <div className="mx-auto mb-3 grid h-20 w-20 place-items-center rounded-3xl bg-gradient-to-br from-primary to-accent text-white shadow-2xl animate-bounce-in">
          <Sparkles className="h-10 w-10" />
        </div>
        <h1 className="text-3xl font-black text-foreground">LittleSparks</h1>
        <p className="text-sm text-muted-foreground">Playful learning for ages 1–6</p>
      </div>

      <form onSubmit={submit} className="w-full max-w-sm space-y-3 rounded-3xl bg-card p-6 shadow-xl">
        <h2 className="mb-2 text-center text-xl font-black text-foreground">
          {mode === "login" && "Parent sign in"}
          {mode === "signup" && "Create parent account"}
          {mode === "forgot" && "Reset password"}
        </h2>

        <input
          type="email"
          required
          autoComplete="email"
          placeholder="Email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="h-14 w-full rounded-2xl border-2 border-border bg-background px-4 text-base focus:border-primary focus:outline-none"
        />

        {mode !== "forgot" && (
          <input
            type="password"
            required
            minLength={6}
            autoComplete={mode === "login" ? "current-password" : "new-password"}
            placeholder="Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="h-14 w-full rounded-2xl border-2 border-border bg-background px-4 text-base focus:border-primary focus:outline-none"
          />
        )}

        <button
          type="submit"
          disabled={busy}
          className="h-14 w-full rounded-2xl bg-primary text-base font-black text-primary-foreground shadow-lg transition-transform active:scale-95 disabled:opacity-60"
        >
          {busy
            ? "…"
            : mode === "login"
              ? "Sign in"
              : mode === "signup"
                ? "Create account"
                : "Send reset link"}
        </button>

        {mode === "login" && (
          <>
            <button
              type="button"
              onClick={() => {
                setMode("forgot");
                setPassword("");
              }}
              className="w-full text-sm font-semibold text-primary"
            >
              Forgot password?
            </button>
            <button
              type="button"
              onClick={() => {
                setMode("signup");
                setPassword("");
              }}
              className="w-full text-sm font-semibold text-primary"
            >
              New here? Create an account
            </button>
          </>
        )}

        {mode === "signup" && (
          <button
            type="button"
            onClick={() => {
              setMode("login");
              setPassword("");
            }}
            className="inline-flex w-full items-center justify-center gap-2 text-sm font-semibold text-primary"
          >
            <ArrowLeft className="h-4 w-4" />
            Have an account? Sign in
          </button>
        )}

        {mode === "forgot" && (
          <button
            type="button"
            onClick={() => {
              setMode("login");
              setPassword("");
            }}
            className="inline-flex w-full items-center justify-center gap-2 text-sm font-semibold text-primary"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to sign in
          </button>
        )}
      </form>

      <div className="mt-6 w-full max-w-sm rounded-3xl bg-card/80 p-5 text-center shadow-lg">
        <p className="mb-3 text-sm font-bold text-foreground">Get LittleSparks on your phone</p>
        <img
          src={installQr}
          alt="QR code to open LittleSparks on your phone"
          className="mx-auto h-40 w-40 rounded-2xl bg-white p-2"
        />
        <p className="mt-3 text-xs text-muted-foreground">
          Scan with your phone camera, then choose “Add to Home Screen”.
        </p>
      </div>
    </div>
  );
}
