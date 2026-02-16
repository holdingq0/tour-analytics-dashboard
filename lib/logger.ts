/**
 * Условный логгер для development/production
 */

const isDev = process.env.NODE_ENV !== 'production';

type LogLevel = 'debug' | 'info' | 'warn' | 'error';

interface LoggerConfig {
    prefix?: string;
    enabled?: boolean;
}

class Logger {
    private prefix: string;
    private enabled: boolean;

    constructor(config: LoggerConfig = {}) {
        this.prefix = config.prefix || '';
        this.enabled = config.enabled ?? isDev;
    }

    private formatMessage(level: LogLevel, message: string): string {
        const timestamp = new Date().toISOString();
        const prefix = this.prefix ? `[${this.prefix}] ` : '';
        return `${timestamp} [${level.toUpperCase()}] ${prefix}${message}`;
    }

    debug(...args: any[]): void {
        if (!this.enabled) return;
        console.log(this.formatMessage('debug', args[0]), ...args.slice(1));
    }

    info(...args: any[]): void {
        if (!this.enabled) return;
        console.info(this.formatMessage('info', args[0]), ...args.slice(1));
    }

    warn(...args: any[]): void {
        // Warnings always show
        console.warn(this.formatMessage('warn', args[0]), ...args.slice(1));
    }

    error(...args: any[]): void {
        // Errors always show
        console.error(this.formatMessage('error', args[0]), ...args.slice(1));
    }

    // Emoji-based logging for parsing
    tour(message: string): void {
        this.info(`🎫 ${message}`);
    }

    stats(message: string): void {
        this.info(`📊 ${message}`);
    }

    money(message: string): void {
        this.info(`💰 ${message}`);
    }

    success(message: string): void {
        this.info(`✅ ${message}`);
    }

    skip(message: string): void {
        this.debug(`⚠️ ${message}`);
    }

    end(message: string): void {
        this.info(`🏁 ${message}`);
    }
}

// Default logger instance
export const logger = new Logger({ prefix: 'TourAnalytics' });

// Parser-specific logger
export const parseLogger = new Logger({ prefix: 'Parser' });

// Create custom logger
export function createLogger(config: LoggerConfig): Logger {
    return new Logger(config);
}

export default logger;
