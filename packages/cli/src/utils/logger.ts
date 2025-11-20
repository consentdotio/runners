import * as p from "@clack/prompts";
import color from "picocolors";

// Define standard log levels
export type LogLevel = "error" | "warn" | "info" | "debug";
export const validLogLevels: LogLevel[] = ["error", "warn", "info", "debug"];
export type CliLogger = Logger & CliExtensions;

// Define CLI-specific extension levels with their method signatures
export interface CliExtensions {
  message: (message: string, ...args: unknown[]) => void;
  note: (message: string, ...args: unknown[]) => void;
  outro: (message: string, ...args: unknown[]) => void;
  success: (message: string, ...args: unknown[]) => void;
  failed: (message: string, ...args: unknown[]) => void;
}

interface Logger {
  error: (message: string, ...args: unknown[]) => void;
  warn: (message: string, ...args: unknown[]) => void;
  info: (message: string, ...args: unknown[]) => void;
  debug: (message: string, ...args: unknown[]) => void;
}

const formatArgs = (args: unknown[]): string => {
  if (args.length === 0) {
    return "";
  }
  return `\n${args.map((arg) => `  - ${JSON.stringify(arg, null, 2)}`).join("\n")}`;
};

/**
 * Formats a log message with appropriate styling based on log level
 *
 * @param logLevel - The log level to format for
 * @param message - The message to format
 * @param args - Additional arguments to format
 * @returns The formatted message string
 */
export const formatLogMessage = (
  logLevel: LogLevel | string,
  message: unknown,
  args: unknown[] = []
): string => {
  const messageStr = typeof message === "string" ? message : String(message);
  const formattedArgs = formatArgs(args);

  switch (logLevel) {
    case "error": {
      return `${color.bgRed(color.black(" error "))} ${messageStr}${formattedArgs}`;
    }
    case "warn": {
      return `${color.bgYellow(color.black(" warning "))} ${messageStr}${formattedArgs}`;
    }
    case "info": {
      return `${color.bgGreen(color.black(" info "))} ${messageStr}${formattedArgs}`;
    }
    case "debug": {
      return `${color.bgBlack(color.white(" debug "))} ${messageStr}${formattedArgs}`;
    }
    case "success": {
      return `${color.bgGreen(color.white(" success "))} ${messageStr}${formattedArgs}`;
    }
    case "failed": {
      return `${color.bgRed(color.white(" failed "))} ${messageStr}${formattedArgs}`;
    }
    default: {
      // Handle unexpected levels
      const levelStr = logLevel as string;
      return `[${levelStr.toUpperCase()}] ${messageStr}${formattedArgs}`;
    }
  }
};

/**
 * Logs a message with the appropriate clack prompt styling
 * Can be used before logger initialization
 *
 * @param logLevel - The log level to use
 * @param message - The message to log
 * @param args - Additional arguments to include
 */
export const logMessage = (
  logLevel: LogLevel | "success" | "failed" | string,
  message: unknown,
  ...args: unknown[]
): void => {
  const formattedMessage = formatLogMessage(logLevel, message, args);

  switch (logLevel) {
    case "error":
      p.log.error(formattedMessage);
      break;
    case "warn":
      p.log.warn(formattedMessage);
      break;
    case "info":
    case "debug":
      p.log.info(formattedMessage);
      break;
    case "success":
    case "failed":
      p.outro(formattedMessage);
      break;
    default:
      p.log.message(formattedMessage);
  }
};

// This function creates a logger instance based on the provided level
// It includes the custom log handler for clack integration.
export const createCliLogger = (level: LogLevel): CliLogger => {
  const shouldLog = (logLevel: LogLevel): boolean => {
    const levels: LogLevel[] = ["error", "warn", "info", "debug"];
    const currentLevelIndex = levels.indexOf(level);
    const messageLevelIndex = levels.indexOf(logLevel);
    return messageLevelIndex <= currentLevelIndex;
  };

  const baseLogger: Logger = {
    error: (message: string, ...args: unknown[]) => {
      if (shouldLog("error")) {
        logMessage("error", message, ...args);
      }
    },
    warn: (message: string, ...args: unknown[]) => {
      if (shouldLog("warn")) {
        logMessage("warn", message, ...args);
      }
    },
    info: (message: string, ...args: unknown[]) => {
      if (shouldLog("info")) {
        logMessage("info", message, ...args);
      }
    },
    debug: (message: string, ...args: unknown[]) => {
      if (shouldLog("debug")) {
        logMessage("debug", message, ...args);
      }
    },
  };

  // Extend the logger with CLI-specific methods
  const extendedLogger = baseLogger as CliLogger;

  // Add message method (plain text without prefix)
  extendedLogger.message = (message: string) => {
    p.log.message(message);
  };

  // Add note method (creates a note box)
  extendedLogger.note = (message: string, ...args: unknown[]) => {
    const messageStr = typeof message === "string" ? message : String(message);
    const title =
      args.length > 0 && typeof args[0] === "string" ? args[0] : undefined;
    //@ts-expect-error
    p.note(messageStr, title, {
      format: (line: string) => line,
    });
  };

  // Add success method (final message)
  extendedLogger.success = (message: string, ...args: unknown[]) => {
    logMessage("success", message, ...args);
  };

  // Add failed method (final message)
  extendedLogger.failed = (message: string, ...args: unknown[]) => {
    logMessage("failed", message, ...args);
    process.exit(0);
  };

  // Add outro method (uses plain message)
  extendedLogger.outro = (message: string) => {
    p.outro(message);
  };

  return extendedLogger;
};
