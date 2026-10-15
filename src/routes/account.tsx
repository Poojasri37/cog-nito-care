import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { createLocalAccount, loginLocalAccount, setLocalSession, type LocalAccountRole } from "@/lib/local-accounts";

export const Route = createFileRoute("/account")({
  head: () => ({ meta: [{ title: "Local account — CareCompanion AI" }] }),
  component: AccountPage,
});

function AccountPage() {
  const [mode, setMode] = useState<"login" | "create">("create");
  const [role, setRole] = useState<LocalAccountRole>("patient");
  const [name, setName] = useState("");
  const [patientName, setPatientName] = useState("");
  const [preferredName, setPreferredName] = useState("");
  const [caregiverName, setCaregiverName] = useState("");
  const [patientCode, setPatientCode] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [inviteCode, setInviteCode] = useState("");
  const [error, setError] = useState("");
  const [working, setWorking] = useState(false);

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setWorking(true);
    try {
      if (mode === "create") {
        const result = await createLocalAccount({
          role,
          email,
          password,
          name,
          patientName,
          preferredName,
          caregiverName,
          inviteCode: patientCode,
        });
        setInviteCode(result.inviteCode ?? "");
        if (result.inviteCode) return;
      } else {
        await loginLocalAccount(email, password, role);
      }
      window.location.assign("/companion");
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Unable to save this account in the browser.");
    } finally {
      setWorking(false);
    }
  }

  function enterDemo() {
    setLocalSession({ role: "demo" });
    window.location.assign("/");
  }

  function continueWithCreatedAccount() {
    window.location.assign("/companion");
  }

  return (
    <main className="mx-auto flex min-h-screen max-w-2xl items-center px-4 py-10">
      <section className="w-full rounded-3xl border border-border bg-card p-6 shadow-sm md:p-9">
        <p className="text-sm font-semibold uppercase tracking-widest text-primary">CareCompanion</p>
        <h1 className="mt-2 font-display text-3xl">{inviteCode ? "Patient account created" : mode === "create" ? "Create a local account" : "Log in"}</h1>
        {inviteCode ? (
          <div className="mt-6 space-y-4">
            <p>Your new patient profile is empty and saved only in this browser. Share this code with the caregiver who should access this patient profile:</p>
            <p className="rounded-xl bg-secondary p-4 text-center font-mono text-2xl font-bold tracking-[0.3em]">{inviteCode}</p>
            <p className="text-sm text-muted-foreground">Caregiver accounts must be created in this same browser to link locally. Data is not synchronized to other devices.</p>
            <button onClick={continueWithCreatedAccount} className="min-h-12 w-full rounded-xl bg-primary px-4 font-semibold text-primary-foreground">Continue to companion</button>
          </div>
        ) : (
          <>
            <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
              Accounts and care information stay in this browser; there is no server account or cross-device sync. Use Demo mode to keep exploring the existing Margaret demo.
            </p>
            <div className="mt-6 grid grid-cols-2 gap-2 rounded-xl bg-secondary p-1">
              <button type="button" onClick={() => setMode("create")} className={`min-h-11 rounded-lg ${mode === "create" ? "bg-card font-semibold shadow-sm" : ""}`}>Create account</button>
              <button type="button" onClick={() => setMode("login")} className={`min-h-11 rounded-lg ${mode === "login" ? "bg-card font-semibold shadow-sm" : ""}`}>Log in</button>
            </div>
            <form onSubmit={submit} className="mt-5 space-y-4">
              <label className="block text-sm font-medium">Account type
                <select value={role} onChange={(event) => setRole(event.target.value as LocalAccountRole)} className="mt-1 min-h-12 w-full rounded-xl border border-border bg-background px-3">
                  <option value="patient">Patient</option>
                  <option value="caregiver">Caregiver</option>
                </select>
              </label>
              {mode === "create" && (
                <>
                  <label className="block text-sm font-medium">{role === "patient" ? "Your name" : "Caregiver name"}
                    <input required value={name} onChange={(event) => setName(event.target.value)} autoComplete="name" className="mt-1 min-h-12 w-full rounded-xl border border-border bg-background px-3" />
                  </label>
                  {role === "patient" ? (
                    <>
                      <div className="grid gap-4 sm:grid-cols-2">
                        <label className="block text-sm font-medium">Patient name
                          <input required value={patientName} onChange={(event) => setPatientName(event.target.value)} className="mt-1 min-h-12 w-full rounded-xl border border-border bg-background px-3" />
                        </label>
                        <label className="block text-sm font-medium">Name to use in conversation
                          <input required value={preferredName} onChange={(event) => setPreferredName(event.target.value)} className="mt-1 min-h-12 w-full rounded-xl border border-border bg-background px-3" />
                        </label>
                      </div>
                      <label className="block text-sm font-medium">Caregiver name (optional)
                        <input value={caregiverName} onChange={(event) => setCaregiverName(event.target.value)} className="mt-1 min-h-12 w-full rounded-xl border border-border bg-background px-3" />
                      </label>
                    </>
                  ) : (
                    <label className="block text-sm font-medium">Patient's local care code
                      <input required value={patientCode} onChange={(event) => setPatientCode(event.target.value)} autoCapitalize="characters" className="mt-1 min-h-12 w-full rounded-xl border border-border bg-background px-3 font-mono uppercase" />
                    </label>
                  )}
                </>
              )}
              <label className="block text-sm font-medium">Email
                <input required type="email" value={email} onChange={(event) => setEmail(event.target.value)} autoComplete="email" className="mt-1 min-h-12 w-full rounded-xl border border-border bg-background px-3" />
              </label>
              <label className="block text-sm font-medium">Password
                <input required type="password" minLength={8} value={password} onChange={(event) => setPassword(event.target.value)} autoComplete={mode === "create" ? "new-password" : "current-password"} className="mt-1 min-h-12 w-full rounded-xl border border-border bg-background px-3" />
              </label>
              {error && <p role="alert" className="rounded-xl bg-destructive/10 p-3 text-sm text-destructive">{error}</p>}
              <button disabled={working} className="min-h-12 w-full rounded-xl bg-primary px-4 font-semibold text-primary-foreground disabled:opacity-50">{working ? "Please wait…" : mode === "create" ? "Create account" : "Log in"}</button>
            </form>
            <div className="mt-5 flex flex-wrap items-center justify-between gap-3 border-t border-border pt-5 text-sm">
              <button onClick={enterDemo} className="font-semibold text-primary underline">Continue in Demo mode</button>
              <Link to="/" className="text-muted-foreground underline">Back to overview</Link>
            </div>
          </>
        )}
      </section>
    </main>
  );
}
