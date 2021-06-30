import { Logger, ILoggerOptions } from "./logger";
import { LogLevelDesc } from "loglevel";

export class LoggerProvider {
  private static loggers: Map<string, Logger> = new Map();
  private static logLevel: LogLevelDesc = "warn";

  public static getOrCreate(loggerOptions: ILoggerOptions): Logger {
    // make sure log level is set to global default if otherwise wasn't provided
    loggerOptions.level = loggerOptions.level || LoggerProvider.logLevel;

    let logger: Logger | undefined = LoggerProvider.loggers.get(
      loggerOptions.label,
    );
    if (!logger) {
      logger = new Logger(loggerOptions);
      LoggerProvider.loggers.set(loggerOptions.label, logger);
    }
    return logger;
  }

  public static setLogLevel(
    logLevel: LogLevelDesc,
    applyToCachedLoggers = true,
  ): void {
    LoggerProvider.logLevel = logLevel;
    if (applyToCachedLoggers) {
      LoggerProvider.loggers.forEach((logger: Logger) =>
        logger.setLogLevel(logLevel as any),
      );
    }
  }
}
