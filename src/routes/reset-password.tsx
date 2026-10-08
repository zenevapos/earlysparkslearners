import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Sparkles, ArrowLeft } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/reset-password")({
  head: () => ({ meta: [{ title: "LittleSparks — Reset Password" }] }),
  component: ResetPasswordPage,
});

function ResetPasswordPage() {
  const navigate = useNavigate();
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [valid, setValid] = useState<boolean | null>(null);

  useEffect(() => {
    // Check if the URL has a recovery token in the hash
    const hash = window.location.hash;
    const hasRecovery = hash.includes("type=recovery") && hash.includes("access_token");
    setValid(hasRecovery);
  }, []);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (password !== confirmPassword) {
      toast.error("Passwords do not match");
      return;
    }
    if (password.length < 6) {
      toast.error("Password must be at least 6 characters");
      return;
    }
    setBusy(true);
    try {
      const { error } = await supabase.auth.updateUser({ password });
      if (error) throw error;
      toast.success("Password updated! You can now sign in.");
      navigate({ to: "/auth" });
    } catch (err: any) {
      toast.error(err.message ?? "Failed to reset password");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-gradient-to-b from-background to-secondary px-6">
      <div className="mb-8 text-center">
        <div className="mx-auto mb-3 grid h-20 w-20 place-items-center rounded-3xl bg-gradient-to-br from-primary to-accent text-white shadow-2xl">
          <Sparkles className="h-10 w-10" />
        </div>
        <h1 className="text-3xl font-black text-foreground">LittleSparks</h1>
        <p className="text-sm text-muted-foreground">Playful learning for ages 1–6</p>
      </div>

      <div className="w-full max-w-sm rounded-3xl bg-card p-6 shadow-xl">
        {valid === null ? (
          <div className="py-8 text-center text-muted-foreground">Verifying link…</div>
        ) : valid === false ? (
          <div className="py-8 text-center">
            <p className="mb-4 text-foreground">This reset link is invalid or expired.</p>
            <button
              onClick={() => navigate({ to: "/auth" })}
              className="inline-flex items-center gap-2 text-sm font-semibold text-primary"
            >
              <ArrowLeft className="h-4 w-4" />
              Back to sign in
            </button>
          </div>
        ) : (
          <>
            <h2 className="mb-4 text-center text-xl font-black text-foreground">Reset your password</h2>
            <form onSubmit={submit} className="space-y-3">
              <input
                type="password"
                required
                minLength={6}
                autoComplete="new-password"
                placeholder="New password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="h-14 w-full rounded-2xl border-2 border-border bg-background px-4 text-base focus:border-primary focus:outline-none"
              />
              <input
                type="password"
                required
                minLength={6}
                autoComplete="new-password"
                placeholder="Confirm new password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="h-14 w-full rounded-2xl border-2 border-border bg-background px-4 text-base focus:border-primary focus:outline-none"
              />
              <button
                type="submit"
                disabled={busy}
                className="h-14 w-full rounded-2xl bg-primary text-base font-black text-primary-foreground shadow-lg transition-transform active:scale-95 disabled:opacity-60"
              >
                {busy ? "…" : "Update password"}
              </button>
            </form>
            <button
              onClick={() => navigate({ to: "/auth" })}
              className="mt-3 inline-flex w-full items-center justify-center gap-2 text-sm font-semibold text-primary"
            >
              <ArrowLeft className="h-4 w-4" />
              Back to sign in
            </button>
          </>
        )}
      </div>
    </div>
  );
}
