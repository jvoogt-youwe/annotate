import { put, list, del } from "@vercel/blob";
import { randomBytes, scryptSync, timingSafeEqual } from "crypto";

export interface Client {
  id: string;
  name: string;
  passwordHash: string;
  createdAt: string;
}

export const LEGACY_CLIENT_ID = "legacy";
export const LEGACY_CLIENT_NAME = "Legacy";

function genId() {
  return Math.random().toString(36).slice(2, 9);
}

// Generates a short, easy-to-relay password (e.g. "k3m9-p7qz").
function generatePassword() {
  return `${randomBytes(4).toString("hex")}-${randomBytes(4).toString("hex")}`;
}

export function hashPassword(plain: string): string {
  const salt = randomBytes(16).toString("hex");
  const hash = scryptSync(plain, salt, 64).toString("hex");
  return `${salt}:${hash}`;
}

export function verifyPassword(plain: string, stored: string): boolean {
  const [salt, hash] = stored.split(":");
  if (!salt || !hash) return false;
  const candidate = scryptSync(plain, salt, 64).toString("hex");
  const a = Buffer.from(candidate, "hex");
  const b = Buffer.from(hash, "hex");
  if (a.length !== b.length) return false;
  return timingSafeEqual(a, b);
}

export async function listClients(): Promise<Client[]> {
  try {
    const { blobs } = await list({ prefix: "clients/", token: process.env.BLOB_READ_WRITE_TOKEN });
    const clients = await Promise.all(
      blobs.map(async b => {
        try {
          const r = await fetch(b.url, { cache: "no-store" });
          return r.ok ? await r.json() : null;
        } catch { return null; }
      })
    );
    return clients.filter(Boolean) as Client[];
  } catch {
    return [];
  }
}

export async function getClient(id: string): Promise<Client | null> {
  if (id === LEGACY_CLIENT_ID) return null;
  const clients = await listClients();
  return clients.find(c => c.id === id) ?? null;
}

export async function verifyClientPassword(plain: string): Promise<Client | null> {
  const clients = await listClients();
  for (const client of clients) {
    if (verifyPassword(plain, client.passwordHash)) return client;
  }
  return null;
}

export async function createClient(name: string, plainPassword?: string): Promise<{ client: Client; password: string }> {
  const password = plainPassword?.trim() || generatePassword();
  const client: Client = {
    id: genId(),
    name: name.trim(),
    passwordHash: hashPassword(password),
    createdAt: new Date().toISOString(),
  };
  await put(`clients/${client.id}.json`, JSON.stringify(client), {
    access: "public",
    contentType: "application/json",
    token: process.env.BLOB_READ_WRITE_TOKEN,
  });
  return { client, password };
}

async function saveClient(client: Client) {
  await put(`clients/${client.id}.json`, JSON.stringify(client), {
    access: "public",
    contentType: "application/json",
    token: process.env.BLOB_READ_WRITE_TOKEN,
    allowOverwrite: true,
  });
}

export async function resetClientPassword(id: string): Promise<{ password: string } | null> {
  const client = await getClient(id);
  if (!client) return null;
  const password = generatePassword();
  await saveClient({ ...client, passwordHash: hashPassword(password) });
  return { password };
}

export async function setClientPassword(id: string, newPlainPassword: string): Promise<boolean> {
  const client = await getClient(id);
  if (!client || !newPlainPassword.trim()) return false;
  await saveClient({ ...client, passwordHash: hashPassword(newPlainPassword.trim()) });
  return true;
}

export async function renameClient(id: string, name: string): Promise<boolean> {
  const client = await getClient(id);
  if (!client || !name.trim()) return false;
  await saveClient({ ...client, name: name.trim() });
  return true;
}

export async function deleteClientRecord(id: string): Promise<void> {
  const { blobs } = await list({ prefix: `clients/${id}.json`, token: process.env.BLOB_READ_WRITE_TOKEN });
  if (blobs[0]) await del([blobs[0].url], { token: process.env.BLOB_READ_WRITE_TOKEN });
}
