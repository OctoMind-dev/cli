import {
  configure,
  FormattedValues,
  getConsoleSink,
  getLogger,
  getTextFormatter,
  LogLevel,
} from "@logtape/logtape";

export const logger = getLogger("octomind");

const ansiColors = {
  red: "\x1B[31m",
  green: "\x1B[32m",
  yellow: "\x1B[33m",
  blue: "\x1B[34m",
  magenta: "\x1B[35m",
  cyan: "\x1B[36m",
  // use native terminal colors
  none: "",
};

const levelColors: Record<
  LogLevel | string,
  (typeof ansiColors)[keyof typeof ansiColors]
> = {
  trace: ansiColors.none,
  debug: ansiColors.none,
  info: ansiColors.none,
  warning: ansiColors.yellow,
  error: ansiColors.red,
  fatal: ansiColors.red,
};

export const configureLogger = async (): Promise<void> =>
  configure({
    sinks: {
      console: getConsoleSink({
        formatter: getTextFormatter({
          timestamp: "disabled",
          level: "full",
          format: (values: FormattedValues): string => {
            return levelColors[values.level] + values.message;
          },
        }),
      }),
    },
    loggers: [
      {
        category: ["logtape", "meta"],
        sinks: ["console"],
        lowestLevel: "warning",
      },
      {
        category: "octomind",
        lowestLevel: (process.env.LOG_LEVEL as LogLevel) || "warning",
        sinks: ["console"],
      },
    ],
  });
