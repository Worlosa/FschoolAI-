// navConfig.js — The only file to touch when adding or rearranging pages.
// NAV defines which page lives in each direction from a given page.
// DOT_GRID defines the 3×3 visual map shown in PageDots.
// LABEL maps page keys to display names used in the header.

export const NAV = {
  work:        { right: "assignment", left: "canvas",      up: "identity",    down: "toolkit" },
  assignment:  { left: "work",        down: "study" },
  study:       { up: "assignment" },
  files:       { right: "identity"  },
  canvas:      { right: "work" },
  toolkit:     { up: "work" },
  identity:    { down: "work",        right: "leaderboard", left: "files" },
  leaderboard: { left: "identity" },
};

export const DOT_GRID = [
  ["files",  "identity",   "leaderboard"],
  ["canvas", "work",       "assignment" ],
  [null,     "toolkit",    "study"      ],
];

export const LABEL = {
  work:        "Work",
  canvas:      "Courses",
  assignment:  "Assignment",
  study:       "Study",
  files:       "Files",
  toolkit:     "Toolkit",
  identity:    "Identity",
  leaderboard: "Leaderboard",
};
