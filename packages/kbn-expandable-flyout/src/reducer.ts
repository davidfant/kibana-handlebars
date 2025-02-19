/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { createReducer } from '@reduxjs/toolkit';
import {
  openPanelsAction,
  openLeftPanelAction,
  openRightPanelAction,
  closePanelsAction,
  closeLeftPanelAction,
  closePreviewPanelAction,
  closeRightPanelAction,
  previousPreviewPanelAction,
  openPreviewPanelAction,
  urlChangedAction,
} from './actions';
import { initialState } from './state';

export const reducer = createReducer(initialState, (builder) => {
  builder.addCase(openPanelsAction, (state, { payload: { preview, left, right } }) => {
    state.preview = preview ? [preview] : [];
    state.right = right;
    state.left = left;
    state.needsSync = true;
  });

  builder.addCase(openLeftPanelAction, (state, { payload }) => {
    state.left = payload;
    state.needsSync = true;
  });

  builder.addCase(openRightPanelAction, (state, { payload }) => {
    state.right = payload;
    state.needsSync = true;
  });

  builder.addCase(openPreviewPanelAction, (state, { payload }) => {
    state.preview.push(payload);
    state.needsSync = true;
  });

  builder.addCase(previousPreviewPanelAction, (state) => {
    state.preview.pop();
    state.needsSync = true;
  });

  builder.addCase(closePanelsAction, (state) => {
    state.preview = [];
    state.right = undefined;
    state.left = undefined;
    state.needsSync = true;
  });

  builder.addCase(closeLeftPanelAction, (state) => {
    state.left = undefined;
    state.needsSync = true;
  });

  builder.addCase(closeRightPanelAction, (state) => {
    state.right = undefined;
    state.needsSync = true;
  });

  builder.addCase(closePreviewPanelAction, (state) => {
    state.preview = [];
    state.needsSync = true;
  });

  builder.addCase(urlChangedAction, (state, { payload: { preview, left, right } }) => {
    state.needsSync = false;
    state.preview = preview ? [preview] : [];
    state.left = left;
    state.right = right;

    return state;
  });
});
