type LogLevel = "debug" | "info" | "warn" | "error";

const ORDER: Record<LogLevel, number> = { debug: 10, info: 20, warn: 30, error: 40 };

const configured = (process.env.LOG_LEVEL as LogLevel | undefined) ?? (process.env.NODE_ENV === "production" ? "info" : "debug");
const threshold = ORDER[configured] ?? ORDER.info;

function safeSerialize(meta: unknown): string {
  try {
    return JSON.stringify(meta);
  } catch {
    return String(meta);
  }
}

function emit(level: LogLevel, message: string, meta?: unknown): void {
  if (ORDER[level] < threshold) return;
  const parts = [`[${new Date().toISOString()}]`, `[${level.toUpperCase()}]`, message];
  if (meta !== undefined) parts.push(safeSerialize(meta));
  const line = parts.join(" ");
  queueMicrotask(() => {
    try {
      process.stdout.write(line + "\n");
    } catch {
      /* logging must never throw */
    }
  });
}

export const logger = {
  debug: (message: string, meta?: unknown) => emit("debug", message, meta),
  info: (message: string, meta?: unknown) => emit("info", message, meta),
  warn: (message: string, meta?: unknown) => emit("warn", message, meta),
  error: (message: string, meta?: unknown) => emit("error", message, meta),
};
