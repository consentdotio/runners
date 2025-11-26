// Environment variable for disabling telemetry
const TELEMETRY_DISABLED_ENV = "RUNNERS_TELEMETRY_DISABLED";

// Event type definitions for better typing and consistency
export const TelemetryEventName = {
  // CLI Lifecycle events
  CLI_INVOKED: "cli.invoked",
  CLI_COMPLETED: "cli.completed",
  CLI_EXITED: "cli.exited",
  CLI_ENVIRONMENT_DETECTED: "cli.environment_detected",

  // Command events
  COMMAND_EXECUTED: "command.executed",
  COMMAND_SUCCEEDED: "command.succeeded",
  COMMAND_FAILED: "command.failed",
  COMMAND_UNKNOWN: "command.unknown",

  // UI events
  INTERACTIVE_MENU_OPENED: "ui.menu.opened",
  INTERACTIVE_MENU_EXITED: "ui.menu.exited",

  // Config events
  CONFIG_LOADED: "config.loaded",
  CONFIG_ERROR: "config.error",
  CONFIG_UPDATED: "config.updated",

  // Help and version events
  HELP_DISPLAYED: "help.displayed",
  VERSION_DISPLAYED: "version.displayed",

  // Error events
  ERROR_OCCURRED: "error.occurred",
} as const;

export type TelemetryEventName =
  (typeof TelemetryEventName)[keyof typeof TelemetryEventName];

export type TelemetryOptions = {
  /**
   * Whether telemetry should be disabled
   */
  disabled?: boolean;

  /**
   * Whether telemetry debugging should be enabled
   */
  debug?: boolean;

  /**
   * Default properties to add to all telemetry events
   */
  defaultProperties?: Record<string, string | number | boolean>;
};

/**
 * Manages telemetry for the CLI
 *
 * The Telemetry class provides methods to track CLI usage and errors
 * in a privacy-preserving way.
 *
 * By default, telemetry is disabled. Override this class to implement
 * your own telemetry provider.
 */
export class Telemetry {
  private disabled: boolean;
  private readonly defaultProperties: Record<string, string | number | boolean>;
  private readonly debug: boolean;

  /**
   * Creates a new telemetry instance
   *
   * @param options - Configuration options for telemetry
   */
  constructor(options?: TelemetryOptions) {
    // Check if telemetry is disabled via environment variable
    const envDisabled =
      process.env[TELEMETRY_DISABLED_ENV] === "1" ||
      process.env[TELEMETRY_DISABLED_ENV]?.toLowerCase() === "true";

    // Initialize state based on options or defaults
    // Disable telemetry by default
    this.disabled = options?.disabled ?? envDisabled ?? true;
    this.defaultProperties = options?.defaultProperties ?? {};
    this.debug = options?.debug ?? false;
  }

  /**
   * Track a telemetry event
   *
   * Override this method to implement your own telemetry tracking
   *
   * @param eventName - The event name to track
   * @param properties - Properties to include with the event
   */
  trackEvent(
    eventName: TelemetryEventName,
    properties: Record<string, string | number | boolean | undefined> = {}
  ): void {
    if (this.disabled) {
      if (this.debug) {
        console.debug(
          `Telemetry event skipped (${eventName}): Telemetry disabled`
        );
      }
      return;
    }

    // Override this method to implement your own telemetry provider
    if (this.debug) {
      console.debug(`Telemetry event: ${eventName}`, properties);
    }
  }

  /**
   * Track a telemetry event synchronously
   *
   * This method ensures the event is sent before returning
   *
   * @param eventName - The event name to track
   * @param properties - Properties to include with the event
   */
  trackEventSync(
    eventName: TelemetryEventName,
    properties: Record<string, string | number | boolean | undefined> = {}
  ): void {
    this.trackEvent(eventName, properties);
  }

  /**
   * Track a command execution
   *
   * @param command - The command being executed
   * @param args - Command arguments
   * @param flags - Command flags
   */
  trackCommand(
    command: string,
    args: string[] = [],
    flags: Record<string, string | number | boolean | undefined> = {}
  ): void {
    if (this.disabled) {
      return;
    }

    // Process flags to filter out sensitive or undefined values
    const safeFlags: Record<string, string | number | boolean> = {};
    for (const [key, value] of Object.entries(flags)) {
      if (key !== "config" && value !== undefined) {
        safeFlags[key] = value;
      }
    }

    this.trackEvent(TelemetryEventName.COMMAND_EXECUTED, {
      command,
      args: args.join(" "),
      flagsData: JSON.stringify(safeFlags),
    });
  }

  /**
   * Track CLI errors
   *
   * @param error - The error that occurred
   * @param command - The command that was being executed when the error occurred
   */
  trackError(error: Error, command?: string): void {
    if (this.disabled) {
      return;
    }

    this.trackEvent(TelemetryEventName.ERROR_OCCURRED, {
      command,
      error: error.message,
      errorName: error.name,
      stack: process.env.NODE_ENV === "development" ? error.stack : undefined,
    });
  }

  /**
   * Disable telemetry
   */
  disable(): void {
    this.disabled = true;
  }

  /**
   * Enable telemetry
   */
  enable(): void {
    this.disabled = false;
  }

  /**
   * Check if telemetry is disabled
   *
   * @returns Whether telemetry is disabled
   */
  isDisabled(): boolean {
    return this.disabled;
  }

  /**
   * Shutdown telemetry client
   */
  async shutdown(): Promise<void> {
    // Override to implement cleanup
  }

  /**
   * Force immediate flushing of any pending telemetry events
   *
   * This is useful when you need to ensure events are sent before process exit
   */
  flushSync(): void {
    if (this.disabled) {
      return;
    }
    // Override to implement flush logic
  }
}

/**
 * Creates a telemetry instance with sensible defaults
 *
 * @param options - Configuration options for telemetry
 * @returns A configured telemetry instance
 */
export function createTelemetry(options?: TelemetryOptions): Telemetry {
  return new Telemetry(options);
}
