import { INestApplicationContext } from '@nestjs/common';
import { NestApplicationContextOptions } from '@nestjs/common/interfaces/nest-application-context-options.interface';
import { isFunction } from '@nestjs/common/utils/shared.utils';
import { ApplicationConfig } from './application-config';
import { ExceptionsZone } from './errors/exceptions-zone';
import { NestContainer } from './injector/container';
import { Injector } from './injector/injector';
import { InstanceLoader } from './injector/instance-loader';
import { GraphInspector } from './inspector/graph-inspector';
import { NoopGraphInspector } from './inspector/noop-graph-inspector';
import { UuidFactory, UuidFactoryMode } from './inspector/uuid-factory';
import { MetadataScanner } from './metadata-scanner';
import { NestApplicationContext } from './nest-application-context';
import { DependenciesScanner } from './scanner';

/**
 * @publicApi
 */
export class NestFactoryStatic {
  /**
   * Creates an instance of NestApplicationContext.
   *
   * @param moduleCls Entry (root) application module class
   * @param options Optional Nest application configuration
   *
   * @returns A promise that, when resolved,
   * contains a reference to the NestApplicationContext instance.
   */
  public async createApplicationContext(
    moduleCls: any,
    options?: NestApplicationContextOptions,
  ): Promise<INestApplicationContext> {
    const container = new NestContainer();
    const graphInspector = this.createGraphInspector(options, container);

    const applicationConfig = undefined;

    /**
     * 核心职能：中央式资源调度 Container 网络
     */
    await this.initialize(
      moduleCls,
      container,
      graphInspector,
      applicationConfig,
      options,
    );

    const modules = container.getModules().values();
    const root = modules.next().value;

    const context = this.createNestInstance<NestApplicationContext>(
      new NestApplicationContext(container, options, root),
    );

    /**
     * 调用 Hooks 执行初始化操作
     */
    return context.init();
  }

  private createNestInstance<T>(instance: T): T {
    return this.createProxy(instance);
  }

  private async initialize(
    module: any,
    container: NestContainer,
    graphInspector: GraphInspector,
    config = new ApplicationConfig(),
    options: NestApplicationContextOptions = {},
  ) {
    UuidFactory.mode = UuidFactoryMode.Random;

    const injector = new Injector({ preview: options.preview });
    const instanceLoader = new InstanceLoader(
      container,
      injector,
      graphInspector,
    );
    const metadataScanner = new MetadataScanner();
    const dependenciesScanner = new DependenciesScanner(
      container,
      metadataScanner,
      graphInspector,
      config,
    );

    await ExceptionsZone.asyncRun(async () => {
      await dependenciesScanner.scan(module);
      await instanceLoader.createInstancesOfDependencies();
    });
  }

  private createProxy(target: any) {
    const proxy = this.createExceptionProxy();
    return new Proxy(target, {
      get: proxy,
      // 事实上禁止覆盖
      set: proxy,
    });
  }

  private createExceptionProxy() {
    return (receiver: Record<string, any>, prop: string) => {
      if (!(prop in receiver)) {
        return;
      }
      if (isFunction(receiver[prop])) {
        return this.createExceptionZone(receiver, prop);
      }
      return receiver[prop];
    };
  }

  private createExceptionZone(
    receiver: Record<string, any>,
    prop: string,
  ): Function {
    return (...args: unknown[]) => {
      let result: unknown;
      ExceptionsZone.run(() => {
        result = receiver[prop](...args);
      });

      return result;
    };
  }

  private createGraphInspector(
    appOptions: NestApplicationContextOptions,
    container: NestContainer,
  ) {
    return appOptions?.snapshot
      ? new GraphInspector(container)
      : NoopGraphInspector;
  }
}

/**
 * Use NestFactory to create an application instance.
 *
 * ### Specifying an entry module
 *
 * Pass the required *root module* for the application via the module parameter.
 * By convention, it is usually called `ApplicationModule`.  Starting with this
 * module, Nest assembles the dependency graph and begins the process of
 * Dependency Injection and instantiates the classes needed to launch your
 * application.
 *
 * @publicApi
 */
export const NestFactory = new NestFactoryStatic();
