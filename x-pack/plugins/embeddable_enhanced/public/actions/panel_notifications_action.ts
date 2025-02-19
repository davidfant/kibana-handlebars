/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import { UiActionsActionDefinition as ActionDefinition } from '@kbn/ui-actions-plugin/public';
import { ViewMode } from '@kbn/embeddable-plugin/public';
import { EnhancedEmbeddableContext, EnhancedEmbeddable } from '../types';

export const txtOneDrilldown = i18n.translate(
  'xpack.embeddableEnhanced.actions.panelNotifications.oneDrilldown',
  {
    defaultMessage: 'Panel has 1 drilldown',
  }
);

export const txtManyDrilldowns = (count: number) =>
  i18n.translate('xpack.embeddableEnhanced.actions.panelNotifications.manyDrilldowns', {
    defaultMessage: 'Panel has {count} drilldowns',
    values: {
      count: String(count),
    },
  });

export const ACTION_PANEL_NOTIFICATIONS = 'ACTION_PANEL_NOTIFICATIONS';

/**
 * This action renders in "edit" mode number of events (dynamic action) a panel
 * has attached to it.
 */
export class PanelNotificationsAction implements ActionDefinition<EnhancedEmbeddableContext> {
  public readonly id = ACTION_PANEL_NOTIFICATIONS;
  public type = ACTION_PANEL_NOTIFICATIONS;

  private getEventCount(embeddable: EnhancedEmbeddable): number {
    return embeddable.enhancements.dynamicActions.state.get().events.length;
  }

  public getIconType = ({ embeddable }: EnhancedEmbeddableContext) => '';

  public readonly getDisplayName = ({ embeddable }: EnhancedEmbeddableContext) => {
    return String(this.getEventCount(embeddable));
  };

  public couldBecomeCompatible({ embeddable }: EnhancedEmbeddableContext) {
    return Boolean(!!embeddable.getInput && embeddable.getRoot);
  }

  public subscribeToCompatibilityChanges = (
    { embeddable }: EnhancedEmbeddableContext,
    onChange: (isCompatible: boolean, action: PanelNotificationsAction) => void
  ) => {
    // There is no notification for when a dynamic action is added or removed, so we subscribe to the embeddable root instead as a proxy.
    return embeddable
      .getRoot()
      .getInput$()
      .subscribe(() => {
        onChange(
          embeddable.getInput().viewMode === ViewMode.EDIT && this.getEventCount(embeddable) > 0,
          this
        );
      });
  };

  public readonly getDisplayNameTooltip = ({ embeddable }: EnhancedEmbeddableContext) => {
    const count = this.getEventCount(embeddable);
    return !count ? '' : count === 1 ? txtOneDrilldown : txtManyDrilldowns(count);
  };

  public readonly isCompatible = async ({ embeddable }: EnhancedEmbeddableContext) => {
    if (!embeddable?.getInput) return false;
    if (embeddable.getInput().viewMode !== ViewMode.EDIT) return false;
    return this.getEventCount(embeddable) > 0;
  };

  public readonly execute = async () => {};
}
