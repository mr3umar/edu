import pino, { LevelWithSilentOrString } from 'pino'

// var streams = [
//         { stream: process.stdout, level: 'info' }, 
//         { stream: process.stderr, level: 'log' },
//         { stream: process.stderr, level: 'warn' },
//         { stream: process.stderr, level: 'error' },
//         { stream: process.stderr, level: 'debug' },
// ]

const logger = pino({
        level: 'debug',
        transport: {
                target: 'pino-pretty',   
                options: {
                  colorize: true,
                  translateTime: 'HH:MM:ss',
                  ignore: 'pid,hostname',
                }
              },
// }, pino.multistream(streams));
}, );

type LogLevel = 'fatal' | 'error' | 'warn' | 'info' | 'debug' | 'trace';
function logWithMetadata(level: LogLevel, ...args: any[]) {
  const formatted = args.map(arg =>
    typeof arg === 'object' ? JSON.stringify(arg) : String(arg)
  ).join(', ');

  logger[level](formatted);
}

console.log = (...args) => logWithMetadata('info', ...args);
console.info = (...args) => logWithMetadata('info', ...args);
console.warn = (...args) => logWithMetadata('warn', ...args);
console.error = (...args) => logWithMetadata('error', ...args);
console.debug = (...args) => logWithMetadata('debug', ...args);
