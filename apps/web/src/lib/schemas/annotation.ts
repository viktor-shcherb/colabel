import { z } from "zod";

const labelValueSchema = z.union([z.array(z.string()), z.null()]);

export const labelsSchema = z.array(z.record(z.string(), labelValueSchema));

export const saveAnnotationSchema = z.object({
  projectId: z.string().uuid(),
  itemIndex: z.number().int().min(0),
  labels: labelsSchema,
});

export type Labels = z.infer<typeof labelsSchema>;
export type SaveAnnotationInput = z.infer<typeof saveAnnotationSchema>;
