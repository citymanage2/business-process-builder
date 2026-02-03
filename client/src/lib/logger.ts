/**
 * Client-side logging system for debugging and error tracking
 * Captures console logs, errors, API requests, and user actions
 */

export interface LogEntry {
  timestamp: string;
  level: "log" | "info" | "warn" | "error" | "api" | "action";
  message: string;
  data?: any;
  stack?: string;
  url?: string;
}

class Logger {
  private logs: LogEntry[] = [];
  private maxLogs = 1000; // Keep last 1000 logs
  private originalConsole: {
    log: typeof console.log;
    info: typeof console.info;
    warn: typeof console.warn;
    error: typeof console.error;
  };

  constructor() {
    // Save original console methods
    this.originalConsole = {
      log: console.log.bind(console),
      info: console.info.bind(console),
      warn: console.warn.bind(console),
      error: console.error.bind(console),
    };

    // Intercept console methods
    this.interceptConsole();

    // Intercept unhandled errors
    this.interceptErrors();

    // Intercept fetch requests
    this.interceptFetch();
  }

  private interceptConsole() {
    console.log = (...args: any[]) => {
      this.originalConsole.log(...args);
      this.addLog("log", this.formatArgs(args));
    };

    console.info = (...args: any[]) => {
      this.originalConsole.info(...args);
      this.addLog("info", this.formatArgs(args));
    };

    console.warn = (...args: any[]) => {
      this.originalConsole.warn(...args);
      this.addLog("warn", this.formatArgs(args));
    };

    console.error = (...args: any[]) => {
      this.originalConsole.error(...args);
      this.addLog("error", this.formatArgs(args), args[0]?.stack);
    };
  }

  private interceptErrors() {
    window.addEventListener("error", (event) => {
      this.addLog(
        "error",
        `Uncaught error: ${event.message}`,
        event.error?.stack,
        event.filename
      );
    });

    window.addEventListener("unhandledrejection", (event) => {
      this.addLog(
        "error",
        `Unhandled promise rejection: ${event.reason}`,
        event.reason?.stack
      );
    });
  }

  private interceptFetch() {
    const originalFetch = window.fetch;
    window.fetch = async (...args: Parameters<typeof fetch>) => {
      const url = typeof args[0] === "string" ? args[0] : (args[0] as Request).url;
      const method = args[1]?.method || "GET";
      
      this.addLog("api", `${method} ${url}`, JSON.stringify(args[1] || {}));

      try {
        const response = await originalFetch(...args);
        const clone = response.clone();
        
        // Log response (but don't block on reading body)
        clone.text().then(body => {
          this.addLog("api", `${method} ${url} → ${response.status}`, JSON.stringify({
            status: response.status,
            statusText: response.statusText,
            body: body.substring(0, 500), // First 500 chars
          }));
        }).catch(() => {
          // Ignore errors reading body
        });

        return response;
      } catch (error) {
        this.addLog("error", `${method} ${url} failed`, (error as Error).stack);
        throw error;
      }
    };
  }

  private formatArgs(args: any[]): string {
    return args
      .map((arg) => {
        if (typeof arg === "object") {
          try {
            return JSON.stringify(arg, null, 2);
          } catch {
            return String(arg);
          }
        }
        return String(arg);
      })
      .join(" ");
  }

  private addLog(
    level: LogEntry["level"],
    message: string,
    stack?: string,
    url?: string
  ) {
    const entry: LogEntry = {
      timestamp: new Date().toISOString(),
      level,
      message,
      stack,
      url,
    };

    this.logs.push(entry);

    // Keep only last maxLogs entries
    if (this.logs.length > this.maxLogs) {
      this.logs.shift();
    }
  }

  public logAction(action: string, data?: any) {
    this.addLog("action", action, undefined, undefined);
    if (data) {
      this.addLog("action", JSON.stringify(data, null, 2));
    }
  }

  public getLogs(): LogEntry[] {
    return [...this.logs];
  }

  public clearLogs() {
    this.logs = [];
  }

  public downloadLogs() {
    const logsData = {
      timestamp: new Date().toISOString(),
      userAgent: navigator.userAgent,
      url: window.location.href,
      logs: this.logs,
    };

    const blob = new Blob([JSON.stringify(logsData, null, 2)], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `logs-${new Date().toISOString().replace(/[:.]/g, "-")}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }
}

// Create singleton instance
export const logger = new Logger();

// Export for use in components
export default logger;
