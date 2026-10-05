/** Locked livestock type photo rules — do not change layout to match random uploads. */
export const LIVESTOCK_PHOTO_WIDTH = 1920;
export const LIVESTOCK_PHOTO_HEIGHT = 1080;
export const LIVESTOCK_PHOTO_RATIO = "16:9";
export const LIVESTOCK_HERO_RATIO = "16:6";
/** Height of the 16:6 crop inside a 1920×1080 file — keep the animal inside this band. */
export const LIVESTOCK_HERO_SAFE_HEIGHT = 720;
export const LIVESTOCK_PHOTO_FIT = "cover" as const;
export const LIVESTOCK_PHOTO_FOCUS = "50% 50%";
export const LIVESTOCK_PHOTO_BG = "#f7f4ee";
export const LIVESTOCK_THUMB_MOBILE = 80;
export const LIVESTOCK_THUMB_DESKTOP = 96;
export const LIVESTOCK_TYPES_PUBLIC_DIR =
  "smmps/public/images/livestock/types";
export const LIVESTOCK_TYPES_GENERATED_DIR =
  "smmps/pictures/generated";
