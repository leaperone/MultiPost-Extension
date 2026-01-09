/**
 * Enhanced logger utility with colors and performance tracking
 */

type LogLevel = 'info' | 'warn' | 'error' | 'debug' | 'success';

// ANSI color codes for terminal output
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  dim: '\x1b[2m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m',
  gray: '\x1b[90m',
};

class Logger {
  private timers: Map<string, number> = new Map();

  private getTimestamp(): string {
    return new Date().toISOString();
  }

  private colorize(text: string, color: keyof typeof colors): string {
    return `${colors[color]}${text}${colors.reset}`;
  }

  private log(level: LogLevel, message: string, ...args: unknown[]): void {
    const timestamp = this.colorize(this.getTimestamp(), 'gray');
    let levelText: string;
    let coloredMessage: string;

    switch (level) {
      case 'error':
        levelText = this.colorize('[ERROR]', 'red');
        coloredMessage = this.colorize(message, 'red');
        console.error(timestamp, levelText, coloredMessage, ...args);
        break;
      case 'warn':
        levelText = this.colorize('[WARN]', 'yellow');
        coloredMessage = this.colorize(message, 'yellow');
        console.warn(timestamp, levelText, coloredMessage, ...args);
        break;
      case 'debug':
        levelText = this.colorize('[DEBUG]', 'magenta');
        coloredMessage = this.colorize(message, 'dim');
        console.debug(timestamp, levelText, coloredMessage, ...args);
        break;
      case 'success':
        levelText = this.colorize('[SUCCESS]', 'green');
        coloredMessage = this.colorize(message, 'green');
        console.log(timestamp, levelText, coloredMessage, ...args);
        break;
      default:
        levelText = this.colorize('[INFO]', 'blue');
        console.log(timestamp, levelText, message, ...args);
    }
  }

  info(message: string, ...args: unknown[]): void {
    this.log('info', message, ...args);
  }

  warn(message: string, ...args: unknown[]): void {
    this.log('warn', message, ...args);
  }

  error(message: string, ...args: unknown[]): void {
    this.log('error', message, ...args);
  }

  debug(message: string, ...args: unknown[]): void {
    this.log('debug', message, ...args);
  }

  success(message: string, ...args: unknown[]): void {
    this.log('success', message, ...args);
  }

  /**
   * Start a performance timer
   */
  startTimer(label: string): void {
    this.timers.set(label, performance.now());
    this.debug(`⏱️  Timer started: ${label}`);
  }

  /**
   * End a performance timer and log the duration
   */
  endTimer(label: string): number {
    const startTime = this.timers.get(label);
    if (!startTime) {
      this.warn(`Timer "${label}" was not started`);
      return 0;
    }

    const duration = performance.now() - startTime;
    this.timers.delete(label);

    const durationStr = duration < 1000
      ? `${duration.toFixed(2)}ms`
      : `${(duration / 1000).toFixed(2)}s`;

    this.success(`⏱️  ${label}: ${this.colorize(durationStr, 'cyan')}`);
    return duration;
  }

  /**
   * Log with a specific emoji prefix
   */
  emoji(emoji: string, message: string, ...args: unknown[]): void {
    this.info(`${emoji} ${message}`, ...args);
  }

  /**
   * Log file size in human-readable format
   */
  fileSize(label: string, bytes: number): void {
    let size: string;
    if (bytes < 1024) {
      size = `${bytes} B`;
    } else if (bytes < 1024 * 1024) {
      size = `${(bytes / 1024).toFixed(2)} KB`;
    } else if (bytes < 1024 * 1024 * 1024) {
      size = `${(bytes / 1024 / 1024).toFixed(2)} MB`;
    } else {
      size = `${(bytes / 1024 / 1024 / 1024).toFixed(2)} GB`;
    }

    this.info(`📦 ${label}: ${this.colorize(size, 'cyan')}`);
  }
}

export const logger = new Logger();
