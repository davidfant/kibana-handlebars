/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useMemo, useState } from 'react';
import {
  EuiFlexGroup,
  EuiFlexItem,
  EuiPopover,
  EuiContextMenu,
  EuiButton,
  EuiIcon,
  EuiPortal,
} from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n-react';

import type { Agent, AgentPolicy } from '../../../../types';
import {
  AgentReassignAgentPolicyModal,
  AgentUnenrollAgentModal,
  AgentUpgradeAgentModal,
} from '../../components';
import { useLicense } from '../../../../hooks';
import { LICENSE_FOR_SCHEDULE_UPGRADE, AGENTS_PREFIX } from '../../../../../../../common/constants';
import { ExperimentalFeaturesService } from '../../../../services';

import { getCommonTags } from '../utils';

import { AgentRequestDiagnosticsModal } from '../../components/agent_request_diagnostics_modal';

import type { SelectionMode } from './types';
import { TagsAddRemove } from './tags_add_remove';

export interface Props {
  shownAgents: number;
  inactiveShownAgents: number;
  totalManagedAgentIds: string[];
  inactiveManagedAgentIds: string[];
  selectionMode: SelectionMode;
  currentQuery: string;
  selectedAgents: Agent[];
  visibleAgents: Agent[];
  refreshAgents: (args?: { refreshTags?: boolean }) => void;
  allTags: string[];
  agentPolicies: AgentPolicy[];
}

export const AgentBulkActions: React.FunctionComponent<Props> = ({
  shownAgents,
  inactiveShownAgents,
  totalManagedAgentIds,
  inactiveManagedAgentIds,
  selectionMode,
  currentQuery,
  selectedAgents,
  visibleAgents,
  refreshAgents,
  allTags,
  agentPolicies,
}) => {
  const licenseService = useLicense();
  const isLicenceAllowingScheduleUpgrade = licenseService.hasAtLeast(LICENSE_FOR_SCHEDULE_UPGRADE);

  // Bulk actions menu states
  const [isMenuOpen, setIsMenuOpen] = useState<boolean>(false);
  const closeMenu = () => setIsMenuOpen(false);
  const onClickMenu = () => setIsMenuOpen(!isMenuOpen);

  // Actions states
  const [isReassignFlyoutOpen, setIsReassignFlyoutOpen] = useState<boolean>(false);
  const [isUnenrollModalOpen, setIsUnenrollModalOpen] = useState<boolean>(false);
  const [updateModalState, setUpgradeModalState] = useState({
    isOpen: false,
    isScheduled: false,
    isUpdating: false,
  });
  const [isTagAddVisible, setIsTagAddVisible] = useState<boolean>(false);
  const [isRequestDiagnosticsModalOpen, setIsRequestDiagnosticsModalOpen] =
    useState<boolean>(false);

  // update the query removing the "managed" agents
  const selectionQuery = useMemo(() => {
    if (totalManagedAgentIds.length) {
      const excludedKuery = `${AGENTS_PREFIX}.agent.id : (${totalManagedAgentIds
        .map((id) => `"${id}"`)
        .join(' or ')})`;
      return `${currentQuery} AND NOT (${excludedKuery})`;
    } else {
      return currentQuery;
    }
  }, [currentQuery, totalManagedAgentIds]);

  const totalActiveAgents = shownAgents - inactiveShownAgents;

  // exclude inactive agents from the count
  const agentCount =
    selectionMode === 'manual'
      ? selectedAgents.length
      : totalActiveAgents - (totalManagedAgentIds?.length - inactiveManagedAgentIds?.length);

  // Check if user is working with only inactive agents
  const atLeastOneActiveAgentSelected =
    selectionMode === 'manual'
      ? !!selectedAgents.find((agent) => agent.active)
      : agentCount > 0 && shownAgents > inactiveShownAgents;
  const agents = selectionMode === 'manual' ? selectedAgents : selectionQuery;

  const [tagsPopoverButton, setTagsPopoverButton] = useState<HTMLElement>();
  const { diagnosticFileUploadEnabled } = ExperimentalFeaturesService.get();

  const menuItems = [
    {
      name: (
        <FormattedMessage
          id="xpack.fleet.agentBulkActions.addRemoveTags"
          data-test-subj="agentBulkActionsAddRemoveTags"
          defaultMessage="Add / remove tags"
        />
      ),
      icon: <EuiIcon type="tag" size="m" />,
      disabled: !atLeastOneActiveAgentSelected,
      onClick: (event: any) => {
        setTagsPopoverButton((event.target as Element).closest('button')!);
        setIsTagAddVisible(!isTagAddVisible);
      },
    },
    {
      name: (
        <FormattedMessage
          id="xpack.fleet.agentBulkActions.reassignPolicy"
          data-test-subj="agentBulkActionsReassign"
          defaultMessage="Assign to new policy"
        />
      ),
      icon: <EuiIcon type="pencil" size="m" />,
      disabled: !atLeastOneActiveAgentSelected,
      onClick: () => {
        closeMenu();
        setIsReassignFlyoutOpen(true);
      },
    },
    {
      name: (
        <FormattedMessage
          id="xpack.fleet.agentBulkActions.unenrollAgents"
          data-test-subj="agentBulkActionsUnenroll"
          defaultMessage="Unenroll {agentCount, plural, one {# agent} other {# agents}}"
          values={{
            agentCount,
          }}
        />
      ),
      icon: <EuiIcon type="trash" size="m" />,
      disabled: !atLeastOneActiveAgentSelected,
      onClick: () => {
        closeMenu();
        setIsUnenrollModalOpen(true);
      },
    },
    {
      name: (
        <FormattedMessage
          id="xpack.fleet.agentBulkActions.upgradeAgents"
          data-test-subj="agentBulkActionsUpgrade"
          defaultMessage="Upgrade {agentCount, plural, one {# agent} other {# agents}}"
          values={{
            agentCount,
          }}
        />
      ),
      icon: <EuiIcon type="refresh" size="m" />,
      disabled: !atLeastOneActiveAgentSelected,
      onClick: () => {
        closeMenu();
        setUpgradeModalState({ isOpen: true, isScheduled: false, isUpdating: false });
      },
    },
    {
      name: (
        <FormattedMessage
          id="xpack.fleet.agentBulkActions.scheduleUpgradeAgents"
          data-test-subj="agentBulkActionsScheduleUpgrade"
          defaultMessage="Schedule upgrade for {agentCount, plural, one {# agent} other {# agents}}"
          values={{
            agentCount,
          }}
        />
      ),
      icon: <EuiIcon type="timeRefresh" size="m" />,
      disabled: !atLeastOneActiveAgentSelected || !isLicenceAllowingScheduleUpgrade,
      onClick: () => {
        closeMenu();
        setUpgradeModalState({ isOpen: true, isScheduled: true, isUpdating: false });
      },
    },
  ];

  menuItems.push({
    name: (
      <FormattedMessage
        id="xpack.fleet.agentBulkActions.restartUpgradeAgents"
        data-test-subj="agentBulkActionsRestartUpgrade"
        defaultMessage="Restart upgrade {agentCount, plural, one {# agent} other {# agents}}"
        values={{
          agentCount,
        }}
      />
    ),
    icon: <EuiIcon type="refresh" size="m" />,
    disabled: !atLeastOneActiveAgentSelected,
    onClick: () => {
      closeMenu();
      setUpgradeModalState({ isOpen: true, isScheduled: false, isUpdating: true });
    },
  });

  if (diagnosticFileUploadEnabled) {
    menuItems.push({
      name: (
        <FormattedMessage
          id="xpack.fleet.agentBulkActions.requestDiagnostics"
          data-test-subj="agentBulkActionsRequestDiagnostics"
          defaultMessage="Request diagnostics for {agentCount, plural, one {# agent} other {# agents}}"
          values={{
            agentCount,
          }}
        />
      ),
      icon: <EuiIcon type="download" size="m" />,
      disabled: !atLeastOneActiveAgentSelected,
      onClick: () => {
        closeMenu();
        setIsRequestDiagnosticsModalOpen(true);
      },
    });
  }

  const panels = [
    {
      id: 0,
      items: menuItems,
    },
  ];

  const getSelectedTagsFromAgents = useMemo(
    () => getCommonTags(agents, visibleAgents ?? [], agentPolicies),
    [agents, visibleAgents, agentPolicies]
  );

  return (
    <>
      {isReassignFlyoutOpen && (
        <EuiPortal>
          <AgentReassignAgentPolicyModal
            agents={agents}
            onClose={() => {
              setIsReassignFlyoutOpen(false);
              refreshAgents();
            }}
          />
        </EuiPortal>
      )}
      {isUnenrollModalOpen && (
        <EuiPortal>
          <AgentUnenrollAgentModal
            agents={agents}
            agentCount={agentCount}
            onClose={() => {
              setIsUnenrollModalOpen(false);
              refreshAgents({ refreshTags: true });
            }}
          />
        </EuiPortal>
      )}
      {updateModalState.isOpen && (
        <EuiPortal>
          <AgentUpgradeAgentModal
            agents={agents}
            agentCount={agentCount}
            isScheduled={updateModalState.isScheduled}
            isUpdating={updateModalState.isUpdating}
            onClose={() => {
              setUpgradeModalState({ isOpen: false, isScheduled: false, isUpdating: false });
              refreshAgents();
            }}
          />
        </EuiPortal>
      )}
      {isTagAddVisible && (
        <TagsAddRemove
          agents={Array.isArray(agents) ? agents.map((agent) => agent.id) : agents}
          allTags={allTags ?? []}
          selectedTags={getSelectedTagsFromAgents}
          button={tagsPopoverButton!}
          onTagsUpdated={() => {
            refreshAgents({ refreshTags: true });
          }}
          onClosePopover={() => {
            setIsTagAddVisible(false);
            closeMenu();
          }}
        />
      )}
      {isRequestDiagnosticsModalOpen && (
        <EuiPortal>
          <AgentRequestDiagnosticsModal
            agents={agents}
            agentCount={agentCount}
            onClose={() => {
              setIsRequestDiagnosticsModalOpen(false);
            }}
          />
        </EuiPortal>
      )}
      <EuiFlexGroup gutterSize="m" alignItems="center">
        <EuiFlexItem grow={false}>
          <EuiPopover
            id="agentBulkActionsMenu"
            button={
              <EuiButton
                fill
                iconType="arrowDown"
                iconSide="right"
                onClick={onClickMenu}
                data-test-subj="agentBulkActionsButton"
              >
                <FormattedMessage
                  id="xpack.fleet.agentBulkActions.actions"
                  defaultMessage="Actions"
                />
              </EuiButton>
            }
            isOpen={isMenuOpen}
            closePopover={closeMenu}
            panelPaddingSize="none"
            anchorPosition="downLeft"
          >
            <EuiContextMenu initialPanelId={0} panels={panels} />
          </EuiPopover>
        </EuiFlexItem>
      </EuiFlexGroup>
    </>
  );
};
