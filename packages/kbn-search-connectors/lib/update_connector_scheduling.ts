/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { ElasticsearchClient } from '@kbn/core/server';
import { i18n } from '@kbn/i18n';
import { isNotFoundException } from '../utils/identify_exceptions';

import { SchedulingConfiguraton } from '../types/connectors';
import { ConnectorsAPIUpdateResponse } from '../types/connectors_api';

export const updateConnectorScheduling = async (
  client: ElasticsearchClient,
  connectorId: string,
  scheduling: SchedulingConfiguraton
) => {
  try {
    const result = await client.transport.request<ConnectorsAPIUpdateResponse>({
      method: 'PUT',
      path: `/_connector/${connectorId}/_scheduling`,
      body: {
        scheduling,
      },
    });
    return result;
  } catch (err) {
    if (isNotFoundException(err)) {
      throw new Error(
        i18n.translate('searchConnectors.server.connectors.scheduling.error', {
          defaultMessage: 'Could not find document',
        })
      );
    }

    throw err;
  }
};
