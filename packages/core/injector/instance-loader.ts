import { Injectable } from '@nestjs/common/interfaces/injectable.interface';
import { GraphInspector } from '../inspector/graph-inspector';
import { NestContainer } from './container';
import { Injector } from './injector';
import { Module } from './module';

export class InstanceLoader<TInjector extends Injector = Injector> {
  constructor(
    protected readonly container: NestContainer,
    protected readonly injector: TInjector,
    protected readonly graphInspector: GraphInspector,
  ) {}

  public async createInstancesOfDependencies(
    modules: Map<string, Module> = this.container.getModules(),
  ) {
    this.createPrototypes(modules);

    await this.createInstances(modules);
  }

  private createPrototypes(modules: Map<string, Module>) {
    modules.forEach(moduleRef => {
      this.createPrototypesOfProviders(moduleRef);
      this.createPrototypesOfInjectables(moduleRef);
      // this.createPrototypesOfControllers(moduleRef);
    });
  }

  private async createInstances(modules: Map<string, Module>) {
    await Promise.all(
      [...modules.values()].map(async moduleRef => {
        await this.createInstancesOfProviders(moduleRef);
        await this.createInstancesOfInjectables(moduleRef);
        // await this.createInstancesOfControllers(moduleRef);
      }),
    );
  }

  private createPrototypesOfProviders(moduleRef: Module) {
    const { providers } = moduleRef;
    providers.forEach(wrapper =>
      this.injector.loadPrototype<Injectable>(wrapper, providers),
    );
  }

  private async createInstancesOfProviders(moduleRef: Module) {
    const { providers } = moduleRef;
    const wrappers = [...providers.values()];
    await Promise.all(
      wrappers.map(async item => {
        await this.injector.loadProvider(item, moduleRef);
      }),
    );
  }

  // private createPrototypesOfControllers(moduleRef: Module) {
  //   const { controllers } = moduleRef;
  //   controllers.forEach(wrapper =>
  //     this.injector.loadPrototype<Controller>(wrapper, controllers),
  //   );
  // }

  // private async createInstancesOfControllers(moduleRef: Module) {
  //   const { controllers } = moduleRef;
  //   const wrappers = [...controllers.values()];
  //   await Promise.all(
  //     wrappers.map(async item => {
  //       await this.injector.loadController(item, moduleRef);
  //     }),
  //   );
  // }

  private createPrototypesOfInjectables(moduleRef: Module) {
    const { injectables } = moduleRef;
    injectables.forEach(wrapper =>
      this.injector.loadPrototype(wrapper, injectables),
    );
  }

  private async createInstancesOfInjectables(moduleRef: Module) {
    const { injectables } = moduleRef;
    const wrappers = [...injectables.values()];
    await Promise.all(
      wrappers.map(async item => {
        await this.injector.loadInjectable(item, moduleRef);
      }),
    );
  }
}
