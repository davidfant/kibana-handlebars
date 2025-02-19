/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ThreatMatchRuleCreateProps } from '@kbn/security-solution-plugin/common/api/detection_engine';
import { getRuleForAlertTesting } from './get_rule_for_alert_testing';

/**
 * This is a typical alert testing rule that is easy for most basic testing of output of Threat Match alerts.
 * It starts out in an enabled true state. The 'from' is set very far back to test the basics of alert
 * creation for Threat Match and testing by getting all the alerts at once.
 * @param ruleId The optional ruleId which is threshold-rule by default.
 * @param enabled Enables the rule on creation or not. Defaulted to true.
 */
export const getThreatMatchRuleForAlertTesting = (
  index: string[],
  ruleId = 'threat-match-rule',
  enabled = true
): ThreatMatchRuleCreateProps => ({
  ...getRuleForAlertTesting(index, ruleId, enabled),
  type: 'threat_match',
  language: 'kuery',
  query: '*:*',
  threat_query: '*:*',
  threat_language: 'kuery',
  threat_mapping: [
    // We match host.name against host.name
    {
      entries: [
        {
          field: 'host.name',
          value: 'host.name',
          type: 'mapping',
        },
      ],
    },
  ],
  threat_index: index, // match against same index for simplicity
});
