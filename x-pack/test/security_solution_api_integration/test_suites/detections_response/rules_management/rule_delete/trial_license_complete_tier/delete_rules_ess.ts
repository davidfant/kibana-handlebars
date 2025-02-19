/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';
import { Rule } from '@kbn/alerting-plugin/common';
import { BaseRuleParams } from '@kbn/security-solution-plugin/server/lib/detection_engine/rule_schema';
import { DETECTION_ENGINE_RULES_URL } from '@kbn/security-solution-plugin/common/constants';
import {
  createRule,
  createAlertsIndex,
  deleteAllRules,
  deleteAllAlerts,
  getSimpleRule,
  removeServerGeneratedProperties,
  createRuleThroughAlertingEndpoint,
  getRuleSavedObjectWithLegacyInvestigationFields,
  getRuleSavedObjectWithLegacyInvestigationFieldsEmptyArray,
} from '../../../utils';

import { FtrProviderContext } from '../../../../../ftr_provider_context';

export default ({ getService }: FtrProviderContext): void => {
  const supertest = getService('supertest');
  const log = getService('log');
  const es = getService('es');

  describe('@ess delete_rules - ESS specific logic', () => {
    describe('deleting rules', () => {
      describe('legacy investigation fields', () => {
        let ruleWithLegacyInvestigationField: Rule<BaseRuleParams>;
        let ruleWithLegacyInvestigationFieldEmptyArray: Rule<BaseRuleParams>;

        beforeEach(async () => {
          await deleteAllAlerts(supertest, log, es);
          await deleteAllRules(supertest, log);
          await createAlertsIndex(supertest, log);
          ruleWithLegacyInvestigationField = await createRuleThroughAlertingEndpoint(
            supertest,
            getRuleSavedObjectWithLegacyInvestigationFields()
          );
          ruleWithLegacyInvestigationFieldEmptyArray = await createRuleThroughAlertingEndpoint(
            supertest,
            getRuleSavedObjectWithLegacyInvestigationFieldsEmptyArray()
          );
          await createRule(supertest, log, {
            ...getSimpleRule('rule-with-investigation-field'),
            name: 'Test investigation fields object',
            investigation_fields: { field_names: ['host.name'] },
          });
        });

        afterEach(async () => {
          await deleteAllRules(supertest, log);
        });

        it('deletes rule with investigation fields as array', async () => {
          const { body } = await supertest
            .delete(
              `${DETECTION_ENGINE_RULES_URL}?rule_id=${ruleWithLegacyInvestigationField.params.ruleId}`
            )
            .set('kbn-xsrf', 'true')
            .set('elastic-api-version', '2023-10-31')
            .expect(200);

          const bodyToCompare = removeServerGeneratedProperties(body);
          expect(bodyToCompare.investigation_fields).to.eql({
            field_names: ['client.address', 'agent.name'],
          });
        });

        it('deletes rule with investigation fields as empty array', async () => {
          const { body } = await supertest
            .delete(
              `${DETECTION_ENGINE_RULES_URL}?rule_id=${ruleWithLegacyInvestigationFieldEmptyArray.params.ruleId}`
            )
            .set('kbn-xsrf', 'true')
            .set('elastic-api-version', '2023-10-31')
            .expect(200);

          const bodyToCompare = removeServerGeneratedProperties(body);
          expect(bodyToCompare.investigation_fields).to.eql(undefined);
        });

        it('deletes rule with investigation fields as intended object type', async () => {
          const { body } = await supertest
            .delete(`${DETECTION_ENGINE_RULES_URL}?rule_id=rule-with-investigation-field`)
            .set('kbn-xsrf', 'true')
            .set('elastic-api-version', '2023-10-31')
            .expect(200);

          const bodyToCompare = removeServerGeneratedProperties(body);
          expect(bodyToCompare.investigation_fields).to.eql({ field_names: ['host.name'] });
        });
      });
    });
  });
};
