export function readPort(name: string, fallback: number): number {
  const port = Number(Bun.env[name] ?? fallback);
  return Number.isFinite(port) ? port : fallback;
}

export function readPositiveInt(name: string, fallback: number): number {
  const raw = Bun.env[name];
  if (!raw) {
    return fallback;
  }

  const value = Number(raw);
  if (!Number.isInteger(value) || value <= 0) {
    return fallback;
  }

  return value;
}

export function readOptionalPositiveInt(name: string): number | undefined {
  const raw = Bun.env[name];
  if (!raw) {
    return undefined;
  }

  const value = Number(raw);
  if (!Number.isInteger(value) || value <= 0) {
    return undefined;
  }

  return value;
}
