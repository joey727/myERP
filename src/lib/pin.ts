import * as Crypto from "expo-crypto";

const PIN_PREFIX = "v1$";
const ITERATIONS = 1000;

function randomSalt(): string {
  const bytes = Crypto.getRandomBytes(8);
  return Array.from(bytes)
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");
}

export async function hashPin(pin: string): Promise<string> {
  const salt = randomSalt();
  let value = `${salt}:${pin}`;
  for (let i = 0; i < ITERATIONS; i++) {
    value = await Crypto.digestStringAsync(Crypto.CryptoDigestAlgorithm.SHA256, value);
  }
  return `${PIN_PREFIX}${salt}$${value}`;
}

export function isPinHashed(stored: string): boolean {
  return stored.startsWith(PIN_PREFIX);
}

export async function verifyPin(pin: string, stored: string): Promise<boolean> {
  if (!stored) return false;
  if (!isPinHashed(stored)) return stored === pin;

  const [salt, expected] = stored.slice(PIN_PREFIX.length).split("$");
  if (!salt || !expected) return false;

  let value = `${salt}:${pin}`;
  for (let i = 0; i < ITERATIONS; i++) {
    value = await Crypto.digestStringAsync(Crypto.CryptoDigestAlgorithm.SHA256, value);
  }
  return value === expected;
}