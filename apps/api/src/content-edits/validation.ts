import { z } from "zod";

export const editTitleSchema = z.strictObject({ title: z.string().trim().min(1).max(200) });
export const editMessageSchema = z.strictObject({ message: z.string().trim().min(1).max(10000) });
