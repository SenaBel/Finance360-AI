import { isMatch } from "date-fns";
import { z } from "zod";

export const generateAiReportSchema = z.object({
  month: z.string().refine((value) => !isMatch(value, "mm")),
});

export type GerateAiReportSchema = z.infer<typeof generateAiReportSchema>;
