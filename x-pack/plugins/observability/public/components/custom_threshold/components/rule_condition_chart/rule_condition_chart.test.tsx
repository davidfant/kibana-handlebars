/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { act } from 'react-dom/test-utils';
import { DataView } from '@kbn/data-views-plugin/common';
import { mountWithIntl, nextTick } from '@kbn/test-jest-helpers';
import { Comparator, Aggregators } from '../../../../../common/custom_threshold_rule/types';
import { useKibana } from '../../../../utils/kibana_react';
import { kibanaStartMock } from '../../../../utils/kibana_react.mock';
import { MetricExpression } from '../../types';
import { getBufferThreshold, RuleConditionChart } from './rule_condition_chart';

jest.mock('../../../../utils/kibana_react');

const useKibanaMock = useKibana as jest.Mock;

const mockKibana = () => {
  useKibanaMock.mockReturnValue({
    ...kibanaStartMock.startContract(),
  });
};

describe('Rule condition chart', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockKibana();
  });
  async function setup(expression: MetricExpression, dataView?: DataView) {
    const wrapper = mountWithIntl(
      <RuleConditionChart
        metricExpression={expression}
        dataView={dataView}
        filterQuery={''}
        groupBy={[]}
        error={{}}
        timeRange={{ from: 'now-15m', to: 'now' }}
      />
    );

    const update = async () =>
      await act(async () => {
        await nextTick();
        wrapper.update();
      });

    await update();

    return { wrapper, update };
  }

  it('should display no data message', async () => {
    const expression: MetricExpression = {
      metrics: [
        {
          name: 'A',
          aggType: Aggregators.COUNT,
        },
      ],
      timeSize: 1,
      timeUnit: 'm',
      sourceId: 'default',
      threshold: [1],
      comparator: Comparator.GT_OR_EQ,
    };
    const { wrapper } = await setup(expression);
    expect(wrapper.find('[data-test-subj="thresholdRuleNoChartData"]').exists()).toBeTruthy();
  });
});

describe('getBufferThreshold', () => {
  const testData = [
    { threshold: undefined, buffer: '0.00' },
    { threshold: 0.1, buffer: '0.12' },
    { threshold: 0.01, buffer: '0.02' },
    { threshold: 0.001, buffer: '0.01' },
    { threshold: 0.00098, buffer: '0.01' },
    { threshold: 130, buffer: '143.00' },
  ];

  it.each(testData)('getBufferThreshold($threshold) = $buffer', ({ threshold, buffer }) => {
    expect(getBufferThreshold(threshold)).toBe(buffer);
  });
});
