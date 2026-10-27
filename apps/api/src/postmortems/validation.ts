import { z } from "zod";

export const savePostmortemSchema = z.strictObject({ draft: z.string().max(30000) });
export const publishPostmortemSchema = z.strictObject({ notifySubscribers: z.boolean().optional() });
