/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { FtrConfigProviderContext, GenericFtrProviderContext } from '@kbn/test';
import { createLogger, LogLevel, LogsSynthtraceEsClient } from '@kbn/apm-synthtrace';
import { FtrProviderContext as InheritedFtrProviderContext } from '../../ftr_provider_context';

export default async function createTestConfig({ readConfigFile }: FtrConfigProviderContext) {
  const functionalConfig = await readConfigFile(require.resolve('../../config.base.js'));
  const services = functionalConfig.get('services');
  const pageObjects = functionalConfig.get('pageObjects');

  return {
    ...functionalConfig.getAll(),
    testFiles: [require.resolve('.')],
    services: {
      ...services,
      logSynthtraceEsClient: (context: InheritedFtrProviderContext) => {
        return new LogsSynthtraceEsClient({
          client: context.getService('es'),
          logger: createLogger(LogLevel.info),
          refreshAfterIndex: true,
        });
      },
    },
    pageObjects,
  };
}

export type CreateTestConfig = Awaited<ReturnType<typeof createTestConfig>>;

export type ObsLogsExplorerServices = CreateTestConfig['services'];
export type ObsLogsExplorerPageObject = CreateTestConfig['pageObjects'];

export type FtrProviderContext = GenericFtrProviderContext<
  ObsLogsExplorerServices,
  ObsLogsExplorerPageObject
>;
