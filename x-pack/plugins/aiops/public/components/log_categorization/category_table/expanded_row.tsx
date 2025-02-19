/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { FC } from 'react';
import { EuiText, EuiSpacer, useEuiTheme } from '@elastic/eui';
import { i18n } from '@kbn/i18n';

import { css } from '@emotion/react';
import type { Category } from '../../../../common/api/log_categorization/types';
import { FormattedPatternExamples, FormattedRegex, FormattedTokens } from '../format_category';

interface ExpandedRowProps {
  category: Category;
}

export const ExpandedRow: FC<ExpandedRowProps> = ({ category }) => {
  const { euiTheme } = useEuiTheme();
  const cssExpandedRow = css({
    marginRight: euiTheme.size.xxl,
    width: '100%',
  });

  return (
    <div css={cssExpandedRow}>
      <EuiSpacer />

      <Section
        title={i18n.translate('xpack.aiops.logCategorization.expandedRow.title.tokens', {
          defaultMessage: 'Tokens',
        })}
      >
        <FormattedTokens category={category} />
      </Section>

      <Section
        title={i18n.translate('xpack.aiops.logCategorization.expandedRow.title.regex', {
          defaultMessage: 'Regex',
        })}
      >
        <FormattedRegex category={category} />
      </Section>

      <Section
        title={i18n.translate('xpack.aiops.logCategorization.expandedRow.title.examples', {
          defaultMessage: 'Examples',
        })}
      >
        <FormattedPatternExamples category={category} />
      </Section>
    </div>
  );
};

const Section: FC<{ title: string }> = ({ title, children }) => {
  return (
    <>
      <EuiText size="s">
        <strong>{title}</strong>
      </EuiText>
      <EuiSpacer size="xs" />
      {children}
      <EuiSpacer />
    </>
  );
};
