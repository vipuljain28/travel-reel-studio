import { z } from "zod";
export const StoryboardSchema = z.object({
  title: z.string().min(1),
  hook: z.string().min(1),
  duration: z.number().positive(),
  selectedAssets: z.array(z.object({ mediaId: z.string().min(1), score: z.number(), reason: z.string() })).min(1),
  timeline: z.array(z.object({
    mediaId: z.string().min(1),
    start: z.number().nonnegative(),
    duration: z.number().positive(),
    text: z.string(),
    transition: z.enum(["cut", "fade"]),
  })).min(1),
  caption: z.string().min(1),
  cta: z.string().min(1),
});
export type Storyboard = z.infer<typeof StoryboardSchema>;
export function parseStoryboard(input: unknown): Storyboard {
  return StoryboardSchema.parse(input);
}
