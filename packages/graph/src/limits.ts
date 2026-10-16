// The map's named values, one source for each (specs 003 and 004, plans).

/** The lowest folding threshold: a folder of fewer files folds (FR-004). */
export const FOLD_MIN_FILES = 2

/** The most boxes the map holds (FR-004). */
export const FOLD_TARGET = 24

/** The most file rows an open panel shows (FR-008). */
export const PANEL_ROW_LIMIT = 12

/** Below this coverage figure, the map shows a banner (FR-017). */
export const COVERAGE_PARTIAL_BELOW = 0.95

/** The files each of the summary's lists shows before "Show all" (`004` FR-004). */
export const SUMMARY_LIST_LENGTH = 10

/** The levels of a blast radius or dependency chain listed open (`004` FR-016). */
export const REACH_OPEN_LEVELS = 2

/**
 * One monospace character at the label's size, in pixels (plan D-04): labels
 * are set at 13px (the theme's `--text-path`, packages/ui globals.css), whose
 * monospace characters are 7.8px wide. Change both together.
 */
export const CHAR_WIDTH = 8

/** Space on each side of a label. */
export const BOX_PADDING = 16

/** A box's border, on each side. */
export const BOX_BORDER = 1

/** A box with no dependents. */
export const BOX_MIN_HEIGHT = 40

/**
 * Added each time a box's dependents double, so a box with more dependents
 * is always taller (FR-005) without one hub dwarfing the map.
 */
export const BOX_HEIGHT_PER_DOUBLING = 12

/** A count badge in a panel's header: one character at its size, and its padding. */
export const BADGE_CHAR_WIDTH = 7
export const BADGE_PADDING = 8

/** Space between the items of a panel's header. */
export const HEADER_GAP = 8

/** A row's tier swatch and the space after it. */
export const ROW_MEDIA_WIDTH = 18

/** A panel's header, and each of its rows. */
export const ROW_HEIGHT = 28
