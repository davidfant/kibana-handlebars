/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';
// @ts-expect-error we have to check types with "allowJs: false" for now, causing this import to fail
import { REPO_ROOT } from '@kbn/repo-info';
import fs from 'fs';
import path from 'path';

import type { JobType, MlSavedObjectType } from '@kbn/ml-plugin/common/types/saved_objects';
import type { Job, Datafeed } from '@kbn/ml-plugin/common/types/anomaly_detection_jobs';
import type { DataFrameAnalyticsConfig } from '@kbn/ml-data-frame-analytics-utils';
import { WebElementWrapper } from '@kbn/ftr-common-functional-ui-services';
import type { FtrProviderContext } from '../../ftr_provider_context';

type SyncFlyoutObjectType =
  | 'MissingObjects'
  | 'UnmatchedObjects'
  | 'ObjectsMissingDatafeed'
  | 'ObjectsUnmatchedDatafeed';

export function MachineLearningStackManagementJobsProvider({
  getService,
  getPageObjects,
}: FtrProviderContext) {
  const retry = getService('retry');
  const testSubjects = getService('testSubjects');
  const toasts = getService('toasts');
  const log = getService('log');

  const PageObjects = getPageObjects(['common']);

  return {
    async openSyncFlyout() {
      await retry.tryForTime(5000, async () => {
        await testSubjects.click('mlStackMgmtSyncButton', 1000);
        await testSubjects.existOrFail('mlJobMgmtSyncFlyout');
      });
    },

    async closeSyncFlyout() {
      await retry.tryForTime(5000, async () => {
        await testSubjects.click('mlJobMgmtSyncFlyoutCloseButton', 1000);
        await testSubjects.missingOrFail('mlJobMgmtSyncFlyout');
      });
    },

    async assertSyncFlyoutSyncButtonEnabled(expectedValue: boolean) {
      const isEnabled = await testSubjects.isEnabled('mlJobMgmtSyncFlyoutSyncButton');
      expect(isEnabled).to.eql(
        expectedValue,
        `Expected Stack Management job sync flyout "Synchronize" button to be '${
          expectedValue ? 'enabled' : 'disabled'
        }' (got '${isEnabled ? 'enabled' : 'disabled'}')`
      );
    },

    async getSyncFlyoutObjectCountFromTitle(objectType: SyncFlyoutObjectType): Promise<number> {
      const titleText = await testSubjects.getVisibleText(`mlJobMgmtSyncFlyout${objectType}Title`);

      const pattern = /^.* \((\d+)\)$/;
      const matches = titleText.match(pattern);
      expect(matches).to.not.eql(
        null,
        `Object title text should match pattern '${pattern}', got ${titleText}`
      );
      const count: number = +matches![1];

      return count;
    },

    async assertSyncFlyoutObjectCounts(expectedCounts: Map<SyncFlyoutObjectType, number>) {
      for (const [objectType, expectedCount] of expectedCounts) {
        const actualObjectCount = await this.getSyncFlyoutObjectCountFromTitle(objectType);
        expect(actualObjectCount).to.eql(
          expectedCount,
          `Expected ${objectType} count to be ${expectedCount}, got ${actualObjectCount}`
        );
      }
    },

    async executeSync() {
      await testSubjects.clickWhenNotDisabledWithoutRetry('mlJobMgmtSyncFlyoutSyncButton', {
        timeout: 5000,
      });

      // check and close success toast
      const resultToast = await toasts.getToastElement(1);
      const titleElement = await testSubjects.findDescendant('euiToastHeader', resultToast);
      const title: string = await titleElement.getVisibleText();
      expect(title).to.match(/^\d+ item[s]? synchronized$/);

      const dismissButton = await testSubjects.findDescendant('toastCloseButton', resultToast);
      await dismissButton.click();
    },

    async assertADJobRowSpaces(adJobId: string, expectedSpaces: string[]) {
      await this.refreshList();
      const spaces = await this.getSpacesFromTable(adJobId);
      expect(spaces!.sort()).to.eql(
        expectedSpaces.sort(),
        `Expected spaces for AD job '${adJobId}' to be '${JSON.stringify(
          expectedSpaces
        )}' (got '${JSON.stringify(spaces)}')`
      );
    },

    async assertDFAJobRowSpaces(dfaJobId: string, expectedSpaces: string[]) {
      await this.refreshList();
      const spaces = await this.getSpacesFromTable(dfaJobId);
      expect(spaces!.sort()).to.eql(
        expectedSpaces.sort(),
        `Expected spaces for DFA job '${dfaJobId}' to be '${JSON.stringify(
          expectedSpaces
        )}' (got '${JSON.stringify(spaces)}')`
      );
    },

    async refreshList() {
      await retry.tryForTime(5000, async () => {
        await testSubjects.click(`mlRefreshJobListButton loaded`, 1000);
        await testSubjects.existOrFail('mlRefreshJobListButton loaded', { timeout: 2000 });
      });
    },

    async openJobSpacesFlyout(mlSavedObjectType: MlSavedObjectType, jobId: string) {
      await retry.tryForTime(5000, async () => {
        await testSubjects.click(
          `mlSpacesManagementTable-${mlSavedObjectType} row-${jobId} > mlJobListRowManageSpacesButton`,
          1000
        );
        await testSubjects.existOrFail('share-to-space-flyout', { timeout: 2000 });
      });
    },

    async saveAndCloseSpacesFlyout() {
      await testSubjects.clickWhenNotDisabledWithoutRetry('sts-save-button', { timeout: 2000 });
      await testSubjects.missingOrFail('share-to-space-flyout', { timeout: 2000 });
    },

    async selectShareToSpacesMode(
      buttonTestSubj: 'shareToExplicitSpacesId' | 'shareToAllSpacesId'
    ) {
      await retry.tryForTime(5000, async () => {
        const button = await testSubjects.find(buttonTestSubj, 1000);
        await button.click();

        const isPressed = await button.getAttribute('aria-pressed');
        expect(isPressed).to.eql('true', `Button '${buttonTestSubj}' should be checked`);

        // sometimes the aria-pressed attribute of the button is set but it's not actually
        // selected, so we're also checking the class of the corresponding label
        const labelClasses = await button.getAttribute('class');
        expect(labelClasses).to.contain(
          'euiButtonGroupButton-isSelected',
          `Label for '${buttonTestSubj}' should be selected`
        );
      });
    },

    async selectShareToExplicitSpaces() {
      await this.selectShareToSpacesMode('shareToExplicitSpacesId');
    },

    async selectShareToAllSpaces() {
      await this.selectShareToSpacesMode('shareToAllSpacesId');
    },

    async isSpaceSelectionRowSelected(spaceId: string): Promise<boolean> {
      const state = await testSubjects.getAttribute(
        `sts-space-selector-row-${spaceId}`,
        'aria-checked',
        1000
      );
      return state === 'true';
    },

    async assertSpaceSelectionRowSelected(spaceId: string, shouldBeSelected: boolean) {
      const isSelected = await this.isSpaceSelectionRowSelected(spaceId);
      expect(isSelected).to.eql(
        shouldBeSelected,
        `Space selection row for '${spaceId}' should${shouldBeSelected ? '' : ' not'} be selected`
      );
    },

    async toggleSpaceSelectionRow(spaceId: string, shouldSelect: boolean) {
      const isSelected = await this.isSpaceSelectionRowSelected(spaceId);
      if (isSelected !== shouldSelect) {
        await testSubjects.click(`sts-space-selector-row-${spaceId}`, 1000);
      }
      await this.assertSpaceSelectionRowSelected(spaceId, shouldSelect);
    },

    async openImportFlyout() {
      await retry.tryForTime(5000, async () => {
        await testSubjects.click('mlJobsImportButton', 1000);
        await testSubjects.existOrFail('mlJobMgmtImportJobsFlyout');
      });
    },

    async openExportFlyout() {
      await retry.tryForTime(5000, async () => {
        await testSubjects.click('mlJobsExportButton', 1000);
        await testSubjects.existOrFail('mlJobMgmtExportJobsFlyout');
      });
    },

    async selectFileToImport(filePath: string, expectError: boolean = false) {
      log.debug(`Importing file '${filePath}' ...`);
      await PageObjects.common.setFileInputPath(filePath);

      if (expectError) {
        await testSubjects.existOrFail('~mlJobMgmtImportJobsFileReadErrorCallout');
      } else {
        await testSubjects.missingOrFail('~mlJobMgmtImportJobsFileReadErrorCallout');
        await testSubjects.existOrFail('mlJobMgmtImportJobsFileRead');
      }
    },

    async assertJobIdsExist(expectedJobIds: string[]) {
      const inputs = await testSubjects.findAll('mlJobMgmtImportJobIdInput');
      const actualJobIds = await Promise.all(inputs.map((i) => i.getAttribute('value')));

      expect(actualJobIds.sort()).to.eql(
        expectedJobIds.sort(),
        `Expected job ids to be '${JSON.stringify(expectedJobIds)}' (got '${JSON.stringify(
          actualJobIds
        )}')`
      );
    },

    async assertCorrectTitle(jobCount: number, jobType: JobType) {
      const dataTestSubj =
        jobType === 'anomaly-detector'
          ? 'mlJobMgmtImportJobsADTitle'
          : 'mlJobMgmtImportJobsDFATitle';
      const subj = await testSubjects.find(dataTestSubj);
      const title = (await subj.parseDomContent()).html();

      const jobTypeString =
        jobType === 'anomaly-detector' ? 'anomaly detection' : 'data frame analytics';

      const results = title.match(
        /(\d) (anomaly detection|data frame analytics) job[s]? read from file$/
      );
      expect(results).to.not.eql(null, `Expected regex results to not be null`);
      const foundCount = results![1];
      const foundJobTypeString = results![2];
      expect(foundCount).to.eql(
        jobCount,
        `Expected job count to be '${jobCount}' (got '${foundCount}')`
      );
      expect(foundJobTypeString).to.eql(
        jobTypeString,
        `Expected job count to be '${jobTypeString}' (got '${foundJobTypeString}')`
      );
    },

    async assertJobIdsSkipped(expectedJobIds: string[]) {
      const subj = await testSubjects.find('mlJobMgmtImportJobsCannotBeImportedCallout');
      const skippedJobTitles = await subj.findAllByTagName('h5');
      const actualJobIds = (
        await Promise.all(skippedJobTitles.map((i) => i.parseDomContent()))
      ).map((t) => t.html());

      expect(actualJobIds.sort()).to.eql(
        expectedJobIds.sort(),
        `Expected job ids to be '${JSON.stringify(expectedJobIds)}' (got '${JSON.stringify(
          actualJobIds
        )}')`
      );
    },

    async importJobs() {
      await testSubjects.clickWhenNotDisabledWithoutRetry('mlJobMgmtImportImportButton', {
        timeout: 5000,
      });

      // check and close success toast
      const resultToast = await toasts.getToastElement(1);
      const titleElement = await testSubjects.findDescendant('euiToastHeader', resultToast);
      const title: string = await titleElement.getVisibleText();
      expect(title).to.match(/^\d+ job[s]? successfully imported$/);

      const dismissButton = await testSubjects.findDescendant('toastCloseButton', resultToast);
      await dismissButton.click();

      // check that the flyout is closed
      await testSubjects.missingOrFail('mlJobMgmtImportJobsFlyout', { timeout: 60 * 1000 });
    },

    async assertReadErrorCalloutExists() {
      await testSubjects.existOrFail('~mlJobMgmtImportJobsFileReadErrorCallout');
    },

    async selectExportJobType(jobType: JobType) {
      if (jobType === 'anomaly-detector') {
        await testSubjects.click('mlJobMgmtExportJobsADTab');
        await testSubjects.existOrFail('mlJobMgmtExportJobsADJobList');
      } else {
        await testSubjects.click('mlJobMgmtExportJobsDFATab');
        await testSubjects.existOrFail('mlJobMgmtExportJobsDFAJobList');
      }
    },

    async selectExportJobSelectAll(jobType: JobType) {
      await testSubjects.click('mlJobMgmtExportJobsSelectAllButton');
      const subjLabel =
        jobType === 'anomaly-detector'
          ? 'mlJobMgmtExportJobsADJobList'
          : 'mlJobMgmtExportJobsDFAJobList';
      const subj = await testSubjects.find(subjLabel);
      const inputs = await subj.findAllByTagName('input');
      const allInputValues = await Promise.all(inputs.map((input) => input.getAttribute('value')));
      expect(allInputValues.every((i) => i === 'on')).to.eql(
        true,
        `Expected all inputs to be checked`
      );
    },

    async getDownload(filePath: string) {
      return retry.tryForTime(5000, async () => {
        expect(fs.existsSync(filePath)).to.eql(true, `File path ${filePath} should exist`);
        return fs.readFileSync(filePath).toString();
      });
    },

    getExportedFile(fileName: string) {
      return path.resolve(REPO_ROOT, `target/functional-tests/downloads/${fileName}.json`);
    },

    deleteExportedFiles(fileNames: string[]) {
      fileNames.forEach((file) => {
        try {
          fs.unlinkSync(this.getExportedFile(file));
        } catch (e) {
          // it might not have been there to begin with
        }
      });
    },

    async selectExportJobs() {
      await testSubjects.clickWhenNotDisabledWithoutRetry('mlJobMgmtExportExportButton', {
        timeout: 5000,
      });

      // check and close success toast
      const resultToast = await toasts.getToastElement(1);
      const titleElement = await testSubjects.findDescendant('euiToastHeader', resultToast);
      const title: string = await titleElement.getVisibleText();
      expect(title).to.match(/^Your file is downloading in the background$/);

      await toasts.dismissAllToastsWithChecks();

      // check that the flyout is closed
      await testSubjects.missingOrFail('mlJobMgmtExportJobsFlyout', { timeout: 60 * 1000 });
    },

    async assertExportedADJobsAreCorrect(expectedJobs: Array<{ job: Job; datafeed: Datafeed }>) {
      const file = JSON.parse(
        await this.getDownload(this.getExportedFile('anomaly_detection_jobs'))
      );
      const loadedFile = Array.isArray(file) ? file : [file];
      const sortedActualJobs = loadedFile.sort((a, b) => a.job.job_id.localeCompare(b.job.job_id));

      const sortedExpectedJobs = expectedJobs.sort((a, b) =>
        a.job.job_id.localeCompare(b.job.job_id)
      );
      expect(sortedActualJobs.length).to.eql(
        sortedExpectedJobs.length,
        `Expected length of exported jobs to be '${sortedExpectedJobs.length}' (got '${sortedActualJobs.length}')`
      );

      sortedExpectedJobs.forEach((expectedJob, i) => {
        expect(sortedActualJobs[i].job.job_id).to.eql(
          expectedJob.job.job_id,
          `Expected job id to be '${expectedJob.job.job_id}' (got '${sortedActualJobs[i].job.job_id}')`
        );
        expect(sortedActualJobs[i].job.analysis_config.detectors.length).to.eql(
          expectedJob.job.analysis_config.detectors.length,
          `Expected detectors length to be '${expectedJob.job.analysis_config.detectors.length}' (got '${sortedActualJobs[i].job.analysis_config.detectors.length}')`
        );
        expect(sortedActualJobs[i].job.analysis_config.detectors[0].function).to.eql(
          expectedJob.job.analysis_config.detectors[0].function,
          `Expected first detector function to be '${expectedJob.job.analysis_config.detectors[0].function}' (got '${sortedActualJobs[i].job.analysis_config.detectors[0].function}')`
        );
        expect(sortedActualJobs[i].datafeed.datafeed_id).to.eql(
          expectedJob.datafeed.datafeed_id,
          `Expected job id to be '${expectedJob.datafeed.datafeed_id}' (got '${sortedActualJobs[i].datafeed.datafeed_id}')`
        );
      });
    },

    async assertExportedDFAJobsAreCorrect(expectedJobs: DataFrameAnalyticsConfig[]) {
      const file = JSON.parse(
        await this.getDownload(this.getExportedFile('data_frame_analytics_jobs'))
      );
      const loadedFile = Array.isArray(file) ? file : [file];
      const sortedActualJobs = loadedFile.sort((a, b) => a.id.localeCompare(b.id));

      const sortedExpectedJobs = expectedJobs.sort((a, b) => a.id.localeCompare(b.id));

      expect(sortedActualJobs.length).to.eql(
        sortedExpectedJobs.length,
        `Expected length of exported jobs to be '${sortedExpectedJobs.length}' (got '${sortedActualJobs.length}')`
      );

      sortedExpectedJobs.forEach((expectedJob, i) => {
        expect(sortedActualJobs[i].id).to.eql(
          expectedJob.id,
          `Expected job id to be '${expectedJob.id}' (got '${sortedActualJobs[i].id}')`
        );
        const expectedType = Object.keys(expectedJob.analysis)[0];
        const actualType = Object.keys(sortedActualJobs[i].analysis)[0];
        expect(actualType).to.eql(
          expectedType,
          `Expected job type to be '${expectedType}' (got '${actualType}')`
        );
        expect(sortedActualJobs[i].dest.index).to.eql(
          expectedJob.dest.index,
          `Expected destination index to be '${expectedJob.dest.index}' (got '${sortedActualJobs[i].dest.index}')`
        );
      });
    },

    async waitForSpacesManagementTableToLoad(mlSavedObjectType: MlSavedObjectType) {
      await testSubjects.existOrFail('mlSpacesManagementTable', { timeout: 60 * 1000 });
      await testSubjects.existOrFail(`mlSpacesManagementTable-${mlSavedObjectType} loaded`, {
        timeout: 30 * 1000,
      });
    },

    async getSpaceManagementTableSearchInput(): Promise<WebElementWrapper> {
      const tableListContainer = await testSubjects.find('mlSpacesManagementTable');
      return await tableListContainer.findByClassName('euiFieldSearch');
    },

    async assertSpaceManagementTableSearchInputValue(expectedSearchValue: string) {
      const searchBarInput = await this.getSpaceManagementTableSearchInput();
      const actualSearchValue = await searchBarInput.getAttribute('value');
      expect(actualSearchValue).to.eql(
        expectedSearchValue,
        `Analytics search input value should be '${expectedSearchValue}' (got '${actualSearchValue}')`
      );
    },

    async getIdsFromTable() {
      const tableListContainer = await testSubjects.find('mlSpacesManagementTable');
      const rows = await tableListContainer.findAllByClassName('euiTableRow');

      const ids: string[] = [];
      for (const row of rows) {
        const cols = await row.findAllByClassName('euiTableRowCell euiTableRowCell--middle');
        if (cols.length) {
          ids.push(await cols[0].getVisibleText());
        }
      }
      return ids;
    },

    async getSpacesFromTable(id: string) {
      const tableListContainer = await testSubjects.find('mlSpacesManagementTable');
      const rows = await tableListContainer.findAllByClassName('euiTableRow');

      const spaces: string[] = [];
      const ids = await Promise.all(
        rows.map(async (r) =>
          (await r.findByTestSubject('mlSpaceManagementTableColumnId')).getVisibleText()
        )
      );

      const matchedRowIndex = ids.indexOf(id);
      if (matchedRowIndex === -1) {
        return [];
      }

      const row = rows[matchedRowIndex];
      const col = await row.findByTestSubject('mlSpaceManagementTableColumnSpaces');
      const spacesEl = await (
        await col.findByClassName('euiTableCellContent')
      ).findAllByClassName('euiAvatar--space');

      for (const el of spacesEl) {
        spaces.push((await el.getAttribute('data-test-subj')).replace('space-avatar-', ''));
      }

      return spaces;
    },

    async filterTableWithSearchString(
      mlSavedObjectType: MlSavedObjectType,
      filter: string,
      expectedRowCount: number = 1
    ) {
      await this.waitForSpacesManagementTableToLoad(mlSavedObjectType);
      const searchBarInput = await this.getSpaceManagementTableSearchInput();
      await searchBarInput.clearValueWithKeyboard();
      await searchBarInput.type(filter);
      await this.assertSpaceManagementTableSearchInputValue(filter);
      const ids = await this.getIdsFromTable();
      const filteredIds = ids.filter((id) => id === filter);

      expect(filteredIds).to.have.length(
        expectedRowCount,
        `Filtered DFA job table should have ${expectedRowCount} row(s) for filter '${filter}' (got matching items '${filteredIds}')`
      );
    },
  };
}
