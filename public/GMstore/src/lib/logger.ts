enum LogLevel {
  DEBUG = 0,
  INFO = 1,
  WARN = 2,
  ERROR = 3,
}

const currentLevel = (() => {
  const env = process.env.LOG_LEVEL;
  if (env !== undefined) {
    const n = Number(env);
    if (!isNaN(n)) return n;
  }
  return LogLevel.INFO;
})();

function log(level: LogLevel, message: string, meta?: object) {
  if (level < currentLevel) return;
  const entry = JSON.stringify({
    t: new Date().toISOString(),
    l: LogLevel[level],
    m: message,
    ...meta,
  });
  if (level >= LogLevel.ERROR) {
    process.stderr.write(entry + "\n");
  } else {
    console.log(entry);
  }
}

export const logger = {
  debug: (m: string, meta?: object) => log(LogLevel.DEBUG, m, meta),
  info: (m: string, meta?: object) => log(LogLevel.INFO, m, meta),
  warn: (m: string, meta?: object) => log(LogLevel.WARN, m, meta),
  error: (m: string, meta?: object) => log(LogLevel.ERROR, m, meta),
};
