
import { defineSchema } from "convex/server";
import { convexMapsTableSchema } from "./models/maps/schema";

export default defineSchema({
  maps: convexMapsTableSchema,
});