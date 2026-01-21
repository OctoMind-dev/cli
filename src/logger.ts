import {
  configure,
  FormattedValues,
  getAnsiColorFormatter,
  getConsoleSink,
  getLogger,
  getTextFormatter,
  LogLevel,
} from "@logtape/logtape";
import { getPrettyFormatter } from "@logtape/pretty";

export const logger = getLogger("octomind");

const ansiColors = {
  black: "\x1B[30m",
  red: "\x1B[31m",
  green: "\x1B[32m",
  yellow: "\x1B[33m",
  blue: "\x1B[34m",
  magenta: "\x1B[35m",
  cyan: "\x1B[36m",
  white: "\x1B[37m",
};

const levelColors: Record<
  LogLevel | string,
  (typeof ansiColors)[keyof typeof ansiColors]
> = {
  debug: ansiColors.white,
  info: ansiColors.white,
  warning: ansiColors.yellow,
  error: ansiColors.red,
  trace: ansiColors.white,
  fatal: ansiColors.red,
};

export const configureLogger = async (): Promise<void> =>
  configure({
    sinks: {
      console: getConsoleSink({
        formatter: getTextFormatter({
          timestamp: "disabled",
          level: "full",

          format(values: FormattedValues): string {
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
      { category: "octomind", lowestLevel: "debug", sinks: ["console"] },
    ],
  });
