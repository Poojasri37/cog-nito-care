export type LocalAccountRole = "patient" | "caregiver";

export type LocalAccount = {
  id: string;
  role: LocalAccountRole;
  email: string;
  name: string;
  patientName: string;
  preferredName: string;
  caregiverName?: string;
  dataOwnerId: string;
  inviteCode?: string;
  passwordSalt: string;
  passwordHash: string;
};

export type LocalSession =
  | { role: "demo" }
  | { role: LocalAccountRole; accountId: string; dataOwnerId: string };

const ACCOUNTS_KEY = "carecompanion-local-accounts-v1";
const SESSION_KEY = "carecompanion-local-session-v1";

function readAccounts(): LocalAccount[] {
  const raw = localStorage.getItem(ACCOUNTS_KEY);
  if (!raw) return [];
  const value: unknown = JSON.parse(raw);
  if (!Array.isArray(value)) throw new Error("Saved local accounts are invalid.");
  return value as LocalAccount[];
}

function hashPassword(salt: string, password: string): Promise<string> {
  return crypto.subtle.digest("SHA-256", new TextEncoder().encode(`${salt}:${password}`)).then((hash) =>
    Array.from(new Uint8Array(hash), (byte) => byte.toString(16).padStart(2, "0")).join(""),
  );
}

function makeInviteCode(): string {
  const bytes = crypto.getRandomValues(new Uint8Array(4));
  return Array.from(bytes, (byte) => (byte % 36).toString(36)).join("").toUpperCase();
}

export function getLocalSession(): LocalSession | null {
  const raw = localStorage.getItem(SESSION_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as LocalSession;
  } catch {
    localStorage.removeItem(SESSION_KEY);
    return null;
  }
}

export function setLocalSession(session: LocalSession): void {
  localStorage.setItem(SESSION_KEY, JSON.stringify(session));
}

export function clearLocalSession(): void {
  localStorage.removeItem(SESSION_KEY);
}

export async function createLocalAccount(input: {
  role: LocalAccountRole;
  email: string;
  password: string;
  name: string;
  patientName?: string;
  preferredName?: string;
  caregiverName?: string;
  inviteCode?: string;
}): Promise<{ account: LocalAccount; inviteCode?: string }> {
  const accounts = readAccounts();
  const email = input.email.trim().toLowerCase();
  if (accounts.some((account) => account.email === email)) {
    throw new Error("An account with this email already exists in this browser.");
  }

  const owner = input.role === "caregiver"
    ? accounts.find((account) => account.role === "patient" && account.inviteCode === input.inviteCode?.trim().toUpperCase())
    : undefined;
  if (input.role === "caregiver" && !owner) {
    throw new Error("That patient code was not found in this browser. Create the patient account here first.");
  }

  const id = crypto.randomUUID();
  const salt = crypto.randomUUID();
  const account: LocalAccount = {
    id,
    role: input.role,
    email,
    name: input.name.trim(),
    patientName: owner?.patientName ?? input.patientName!.trim(),
    preferredName: owner?.preferredName ?? input.preferredName!.trim(),
    caregiverName: input.role === "caregiver" ? input.name.trim() : input.caregiverName?.trim(),
    dataOwnerId: owner?.id ?? id,
    inviteCode: input.role === "patient" ? makeInviteCode() : undefined,
    passwordSalt: salt,
    passwordHash: await hashPassword(salt, input.password),
  };

  accounts.push(account);
  if (owner) owner.caregiverName = input.name.trim();
  localStorage.setItem(ACCOUNTS_KEY, JSON.stringify(accounts));
  setLocalSession({ role: account.role, accountId: account.id, dataOwnerId: account.dataOwnerId });
  return { account, inviteCode: account.inviteCode };
}

export async function loginLocalAccount(email: string, password: string, role: LocalAccountRole): Promise<LocalAccount> {
  const normalizedEmail = email.trim().toLowerCase();
  const account = readAccounts().find((item) => item.email === normalizedEmail && item.role === role);
  if (!account || (await hashPassword(account.passwordSalt, password)) !== account.passwordHash) {
    throw new Error("The email or password is incorrect for this account type.");
  }
  setLocalSession({ role: account.role, accountId: account.id, dataOwnerId: account.dataOwnerId });
  return account;
}

export function getCurrentLocalAccount(): LocalAccount | null {
  const session = getLocalSession();
  if (!session || session.role === "demo") return null;
  return readAccounts().find((account) => account.id === session.accountId) ?? null;
}
