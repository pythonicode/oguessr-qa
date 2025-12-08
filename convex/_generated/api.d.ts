/* eslint-disable */
/**
 * Generated `api` utility.
 *
 * THIS CODE IS AUTOMATICALLY GENERATED.
 *
 * To regenerate, run `npx convex dev`.
 * @module
 */

import type * as helpers_countries from "../helpers/countries.js";
import type * as helpers_zod from "../helpers/zod.js";
import type * as models_maps_actions_batchProcessLiveloxClasses from "../models/maps/actions/batchProcessLiveloxClasses.js";
import type * as models_maps_actions_clearWhiteMapTiles from "../models/maps/actions/clearWhiteMapTiles.js";
import type * as models_maps_actions_helpers from "../models/maps/actions/helpers.js";
import type * as models_maps_actions_index from "../models/maps/actions/index.js";
import type * as models_maps_actions_processLiveloxClass from "../models/maps/actions/processLiveloxClass.js";
import type * as models_maps_actions_processLiveloxClassInternal from "../models/maps/actions/processLiveloxClassInternal.js";
import type * as models_maps_actions_processLiveloxClasses from "../models/maps/actions/processLiveloxClasses.js";
import type * as models_maps_mutations_addMapFlag from "../models/maps/mutations/addMapFlag.js";
import type * as models_maps_mutations_clearMapDiscipline from "../models/maps/mutations/clearMapDiscipline.js";
import type * as models_maps_mutations_clearMapFlags from "../models/maps/mutations/clearMapFlags.js";
import type * as models_maps_mutations_createMap from "../models/maps/mutations/createMap.js";
import type * as models_maps_mutations_createMapInternal from "../models/maps/mutations/createMapInternal.js";
import type * as models_maps_mutations_deleteMap from "../models/maps/mutations/deleteMap.js";
import type * as models_maps_mutations_deleteMapsByClassId from "../models/maps/mutations/deleteMapsByClassId.js";
import type * as models_maps_mutations_index from "../models/maps/mutations/index.js";
import type * as models_maps_mutations_restoreMap from "../models/maps/mutations/restoreMap.js";
import type * as models_maps_mutations_setMapDiscipline from "../models/maps/mutations/setMapDiscipline.js";
import type * as models_maps_queries_getFlaggedMapCount from "../models/maps/queries/getFlaggedMapCount.js";
import type * as models_maps_queries_getMapById from "../models/maps/queries/getMapById.js";
import type * as models_maps_queries_getNextFlaggedMap from "../models/maps/queries/getNextFlaggedMap.js";
import type * as models_maps_queries_getNextMap from "../models/maps/queries/getNextMap.js";
import type * as models_maps_queries_getNextUnreviewedMap from "../models/maps/queries/getNextUnreviewedMap.js";
import type * as models_maps_queries_getRandomMaps from "../models/maps/queries/getRandomMaps.js";
import type * as models_maps_queries_getUnreviewedMapCount from "../models/maps/queries/getUnreviewedMapCount.js";
import type * as models_maps_queries_hasNearbyMap from "../models/maps/queries/hasNearbyMap.js";
import type * as models_maps_queries_index from "../models/maps/queries/index.js";

import type {
  ApiFromModules,
  FilterApi,
  FunctionReference,
} from "convex/server";

declare const fullApi: ApiFromModules<{
  "helpers/countries": typeof helpers_countries;
  "helpers/zod": typeof helpers_zod;
  "models/maps/actions/batchProcessLiveloxClasses": typeof models_maps_actions_batchProcessLiveloxClasses;
  "models/maps/actions/clearWhiteMapTiles": typeof models_maps_actions_clearWhiteMapTiles;
  "models/maps/actions/helpers": typeof models_maps_actions_helpers;
  "models/maps/actions/index": typeof models_maps_actions_index;
  "models/maps/actions/processLiveloxClass": typeof models_maps_actions_processLiveloxClass;
  "models/maps/actions/processLiveloxClassInternal": typeof models_maps_actions_processLiveloxClassInternal;
  "models/maps/actions/processLiveloxClasses": typeof models_maps_actions_processLiveloxClasses;
  "models/maps/mutations/addMapFlag": typeof models_maps_mutations_addMapFlag;
  "models/maps/mutations/clearMapDiscipline": typeof models_maps_mutations_clearMapDiscipline;
  "models/maps/mutations/clearMapFlags": typeof models_maps_mutations_clearMapFlags;
  "models/maps/mutations/createMap": typeof models_maps_mutations_createMap;
  "models/maps/mutations/createMapInternal": typeof models_maps_mutations_createMapInternal;
  "models/maps/mutations/deleteMap": typeof models_maps_mutations_deleteMap;
  "models/maps/mutations/deleteMapsByClassId": typeof models_maps_mutations_deleteMapsByClassId;
  "models/maps/mutations/index": typeof models_maps_mutations_index;
  "models/maps/mutations/restoreMap": typeof models_maps_mutations_restoreMap;
  "models/maps/mutations/setMapDiscipline": typeof models_maps_mutations_setMapDiscipline;
  "models/maps/queries/getFlaggedMapCount": typeof models_maps_queries_getFlaggedMapCount;
  "models/maps/queries/getMapById": typeof models_maps_queries_getMapById;
  "models/maps/queries/getNextFlaggedMap": typeof models_maps_queries_getNextFlaggedMap;
  "models/maps/queries/getNextMap": typeof models_maps_queries_getNextMap;
  "models/maps/queries/getNextUnreviewedMap": typeof models_maps_queries_getNextUnreviewedMap;
  "models/maps/queries/getRandomMaps": typeof models_maps_queries_getRandomMaps;
  "models/maps/queries/getUnreviewedMapCount": typeof models_maps_queries_getUnreviewedMapCount;
  "models/maps/queries/hasNearbyMap": typeof models_maps_queries_hasNearbyMap;
  "models/maps/queries/index": typeof models_maps_queries_index;
}>;

/**
 * A utility for referencing Convex functions in your app's public API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = api.myModule.myFunction;
 * ```
 */
export declare const api: FilterApi<
  typeof fullApi,
  FunctionReference<any, "public">
>;

/**
 * A utility for referencing Convex functions in your app's internal API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = internal.myModule.myFunction;
 * ```
 */
export declare const internal: FilterApi<
  typeof fullApi,
  FunctionReference<any, "internal">
>;

export declare const components: {};
