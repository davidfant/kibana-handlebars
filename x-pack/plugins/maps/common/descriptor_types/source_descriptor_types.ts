/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/* eslint-disable @typescript-eslint/consistent-type-definitions */

import { FeatureCollection } from 'geojson';
import type { Query } from '@kbn/es-query';
import type { ESQLColumn } from '@kbn/es-types';
import { SortDirection } from '@kbn/data-plugin/common/search';
import {
  AGG_TYPE,
  GRID_RESOLUTION,
  MASK_OPERATOR,
  RENDER_AS,
  SCALING_TYPES,
  MVT_FIELD_TYPE,
  SOURCE_TYPES,
} from '../constants';

export type AbstractSourceDescriptor = {
  id?: string;
  type: string;
};

export type EMSTMSSourceDescriptor = AbstractSourceDescriptor & {
  // id: EMS TMS layer id. Used when !isAutoSelect
  isAutoSelect: boolean;
  lightModeDefault: string;
};

export type EMSFileSourceDescriptor = AbstractSourceDescriptor & {
  // id: EMS file id
  id: string;
  tooltipProperties: string[];
};

export type ESQLSourceDescriptor = AbstractSourceDescriptor & {
  /*
   * Source UUID
   */
  id: string;
  esql: string;
  columns: ESQLColumn[];
  /*
   * Date field used to narrow ES|QL requests by global time range
   */
  dateField?: string;
  /*
   * Geo field used to narrow ES|QL requests by visible map area
   */
  geoField?: string;
  narrowByGlobalSearch: boolean;
  narrowByGlobalTime: boolean;
  narrowByMapBounds: boolean;
  applyForceRefresh: boolean;
};

export type AbstractESSourceDescriptor = AbstractSourceDescriptor & {
  // id: UUID
  id: string;
  indexPatternId: string;
  geoField?: string;
  applyGlobalQuery: boolean;
  applyGlobalTime: boolean;
  applyForceRefresh: boolean;
};

type AbstractAggDescriptor = {
  type: AGG_TYPE;
  label?: string;
  mask?: {
    operator: MASK_OPERATOR;
    value: number;
  };
};

export type CountAggDescriptor = AbstractAggDescriptor & {
  type: AGG_TYPE.COUNT;
};

export type FieldedAggDescriptor = AbstractAggDescriptor & {
  type:
    | AGG_TYPE.UNIQUE_COUNT
    | AGG_TYPE.MAX
    | AGG_TYPE.MIN
    | AGG_TYPE.SUM
    | AGG_TYPE.AVG
    | AGG_TYPE.TERMS;
  field?: string;
};

export type PercentileAggDescriptor = AbstractAggDescriptor & {
  type: AGG_TYPE.PERCENTILE;
  field?: string;
  percentile?: number;
};

export type AggDescriptor = CountAggDescriptor | FieldedAggDescriptor | PercentileAggDescriptor;

export type AbstractESAggSourceDescriptor = AbstractESSourceDescriptor & {
  metrics: AggDescriptor[];
};

export type ESGeoGridSourceDescriptor = AbstractESAggSourceDescriptor & {
  geoField: string;
  requestType: RENDER_AS;
  resolution: GRID_RESOLUTION;
};

export type ESGeoLineSourceDescriptor = AbstractESAggSourceDescriptor & {
  geoField: string;
  groupByTimeseries: boolean;
  lineSimplificationSize: number;
  splitField?: string;
  sortField?: string;
};

export type ESSearchSourceDescriptor = AbstractESSourceDescriptor & {
  geoField: string;
  filterByMapBounds: boolean;
  tooltipProperties: string[];
  sortField: string;
  sortOrder: SortDirection;
  scalingType: SCALING_TYPES;
  topHitsGroupByTimeseries: boolean;
  topHitsSplitField: string;
  topHitsSize: number;
};

export type ESPewPewSourceDescriptor = AbstractESAggSourceDescriptor & {
  sourceGeoField: string;
  destGeoField: string;
};

export type AbstractESJoinSourceDescriptor = AbstractESAggSourceDescriptor & {
  whereQuery?: Query;
};

export type ESDistanceSourceDescriptor = AbstractESJoinSourceDescriptor & {
  distance: number; // km
  geoField: string;
  type: SOURCE_TYPES.ES_DISTANCE_SOURCE;
};

export type ESTermSourceDescriptor = AbstractESJoinSourceDescriptor & {
  term: string; // term field name
  size?: number;
  type: SOURCE_TYPES.ES_TERM_SOURCE;
};

// This is for symmetry with other sources only.
// It takes no additional configuration since  all params are in the .yml.
export type KibanaTilemapSourceDescriptor = AbstractSourceDescriptor;

export type WMSSourceDescriptor = AbstractSourceDescriptor & {
  serviceUrl: string;
  layers: string;
  styles: string;
};

export type XYZTMSSourceDescriptor = AbstractSourceDescriptor & {
  urlTemplate: string;
};

export type MVTFieldDescriptor = {
  name: string;
  type: MVT_FIELD_TYPE;
};

export type TiledSingleLayerVectorSourceSettings = {
  urlTemplate: string;
  layerName: string;

  // These are the min/max zoom levels of the availability of the a particular layerName in the tileset at urlTemplate.
  // These are _not_ the visible zoom-range of the data on a map.
  // These are important so mapbox does not issue invalid requests based on the zoom level.

  // Tiled layer data cannot be displayed at lower levels of zoom than that they are stored in the tileset.
  // e.g. building footprints at level 14 cannot be displayed at level 0.
  minSourceZoom: number;
  // Tiled layer data can be displayed at higher levels of zoom than that they are stored in the tileset.
  // e.g. EMS basemap data from level 14 is at most detailed resolution and can be displayed at higher levels
  maxSourceZoom: number;

  fields: MVTFieldDescriptor[];
};

export type TiledSingleLayerVectorSourceDescriptor = AbstractSourceDescriptor &
  TiledSingleLayerVectorSourceSettings & {
    tooltipProperties: string[];
  };

export type InlineFieldDescriptor = {
  name: string;
  label?: string;
  type: 'string' | 'number';
};

export type GeojsonFileSourceDescriptor = {
  __fields?: InlineFieldDescriptor[];
  __featureCollection: FeatureCollection;
  areResultsTrimmed: boolean;
  tooltipContent: string | null;
  name: string;
  type: string;
};

export type TableSourceDescriptor = {
  id: string;
  type: SOURCE_TYPES.TABLE_SOURCE;
  __rows: Array<{ [key: string]: string | number }>;
  __columns: InlineFieldDescriptor[];
  term: string;
};

export type JoinSourceDescriptor =
  | ESDistanceSourceDescriptor
  | ESTermSourceDescriptor
  | TableSourceDescriptor;
