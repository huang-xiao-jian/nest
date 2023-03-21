import { LoggerService, LogLevel } from '../services/logger.service';

/**
 * @publicApi
 */
export class NestApplicationContextOptions {
  /**
   * Specifies the logger to use.  Pass `false` to turn off logging.
   */
  logger?: LoggerService | LogLevel[] | false;

  /**
   * Whether to run application in the preview mode.
   * In the preview mode, providers/controllers are not instantiated & resolved.
   *
   * @default false
   */
  preview?: boolean;

  /**
   * Whether to generate a serialized graph snapshot.
   *
   * @default false
   */
  snapshot?: boolean;
}
