import { NoOp } from "convex-helpers/server/customFunctions";
import { zCustomMutation, zCustomQuery, zCustomAction } from "convex-helpers/server/zod4";
import { query as convexQuery } from "../_generated/server";
import { mutation as convexMutation } from "../_generated/server";
import { action as convexAction } from "../_generated/server";
import { internalQuery as convexInternalQuery } from "../_generated/server";
import { internalMutation as convexInternalMutation } from "../_generated/server";
import { internalAction as convexInternalAction } from "../_generated/server";

export const zQuery = zCustomQuery(convexQuery, NoOp);
export const zMutation = zCustomMutation(convexMutation, NoOp);
export const zAction = zCustomAction(convexAction, NoOp);
export const zInternalQuery = zCustomQuery(convexInternalQuery, NoOp);
export const zInternalMutation = zCustomMutation(convexInternalMutation, NoOp);
export const zInternalAction = zCustomAction(convexInternalAction, NoOp);