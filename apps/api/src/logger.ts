const LEVELS = ['debug', 'info', 'warn', 'error'] as const;

export type LogLevel = (typeof LEVELS)[number];

/** Extra facts of a log line. Values must be plain data. */
type LogFields = Readonly<Record<string, string | number | boolean | null | undefined>>;

export interface Logger {
  debug(message: string, fields?: LogFields): void;
  info(message: string, fields?: LogFields): void;
  warn(message: string, fields?: LogFields): void;
  error(message: string, fields?: LogFields): void;
}

/**
 * A logger that writes one JSON object per line, the form log collectors expect.
 * Lines below `minimumLevel` are dropped.
 */
export function createLogger(
  minimumLevel: LogLevel,
  write: (line: string) => void = (line) => process.stdout.write(line),
): Logger {
  const log =
    (level: LogLevel) =>
    (message: string, fields: LogFields = {}) => {
      if (LEVELS.indexOf(level) >= LEVELS.indexOf(minimumLevel)) {
        write(`${JSON.stringify({ ...fields, time: new Date().toISOString(), level, message })}\n`);
      }
    };
  return { debug: log('debug'), info: log('info'), warn: log('warn'), error: log('error') };
}
