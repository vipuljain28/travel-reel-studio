import type { TemplateId } from "@trs/shared";

export interface TemplateConfig {
  id: TemplateId;
  clipSeconds: number;
  transition: "cut" | "fade";
  hookSeconds: number;
  captionPosition: "center" | "bottom" | "top";
  audioVolume: number;
}

export const TEMPLATE_CONFIG: Record<TemplateId, TemplateConfig> = {
  "viral-travel": { id: "viral-travel", clipSeconds: 1.8, transition: "cut", hookSeconds: 2.2, captionPosition: "center", audioVolume: 0.4 },
  "luxury-cinematic": { id: "luxury-cinematic", clipSeconds: 3.6, transition: "fade", hookSeconds: 3, captionPosition: "bottom", audioVolume: 0.28 },
  "hotel-review": { id: "hotel-review", clipSeconds: 2.6, transition: "cut", hookSeconds: 2.4, captionPosition: "bottom", audioVolume: 0.32 },
  "personal-story": { id: "personal-story", clipSeconds: 2.8, transition: "fade", hookSeconds: 2.6, captionPosition: "center", audioVolume: 0.3 },
};
