// ── SkillLint Design System ────────────────────────────────────────────────
// Single source of truth for all visual decisions.
// All components must pull from here — no raw hex values in component files.

// ── Fonts ──────────────────────────────────────────────────────────────────
export const font = {
  sans: "'DM Sans', sans-serif",
  mono: "'JetBrains Mono', monospace",
};

// ── Color Palette ──────────────────────────────────────────────────────────
// Background scale — darkest to lightest surface
export const color = {
  // Backgrounds
  bg:        "#080808",   // app root, body
  bgLanding: "#0e0e0e",   // landing page background
  surface0:  "#0a0a0a",   // drop zone, lowest raised surface
  surface1:  "#0c0c0c",   // inputs, cards, code inline bg
  surface2:  "#0f0f0f",   // inline code pill
  surface3:  "#111",      // disabled buttons
  surface4:  "#141414",   // subtle rule lines, nav border on landing
  surface5:  "#161616",   // progress bar tracks
  surface6:  "#1a1a1a",   // secondary button bg, mid-weight borders
  surface7:  "#1e1e1e",   // standard border, input border
  surface8:  "#222",      // dashed borders, hover border

  // Text scale — lightest to dimmest
  text1: "#f0f0f0",   // landing primary headings
  text2: "#e8e8e8",   // app headings
  text3: "#e0e0e0",   // app body text
  text4: "#ccc",      // input text, key input text
  text5: "#bbb",      // nav wordmark
  text6: "#aaa",      // tertiary content, stat numbers
  text7: "#999",      // file name in report header
  text8: "#888",      // muted body text
  text9: "#777",      // category labels, nav ghost button
  textA: "#666",      // faint labels, ghost button text
  textB: "#555",      // very faint labels (eyebrow, helper text)
  textC: "#444",      // ultra-dim italic accent
  textD: "#333",      // nearly invisible, drag icon
  textInverse: "#080808",  // text on light (primary button)

  // Brand
  brand: "#81F7E5",   // primary brand accent

  // Semantic / accent
  green:  "#4ade80",   // score good (≥80), success, file loaded
  amber:  "#fbbf24",   // score medium (≥60), warning
  orange: "#fb923c",   // score failing (≥40)
  red:    "#f87171",   // score critical, error text

  // Semantic backgrounds (tinted surfaces)
  borderError: "#2a0f0f",  // error card border (dark red tint)
  bgWarning: "#0d0b08",   // warning card bg
  bgError:   "#100808",   // error card bg
  bgGood:    "#0a120a",   // drag-over, success tint
  bgTopFix:  "#0c0c0a",   // top-priority fix card

  // Button surfaces
  btnPrimary:        "#e0e0e0",  // primary button bg (resting)
  btnPrimaryHover:   "#ffffff",  // primary button bg (hover)
  btnPrimaryText:    "#080808",  // primary button label
  btnSecondaryBg:    "#111",     // secondary/disabled button bg
  btnSecondaryBorder:"#1e1e1e",  // secondary border
  btnSecondaryText:  "#666",     // secondary label
  btnGhostBg:        "none",     // ghost (no background)
  btnGhostBorder:    "#1e1e1e",  // ghost border
  btnGhostText:      "#666",     // ghost label
  btnGhostHoverBorder:"#333",    // ghost hover border
  btnGhostHoverText:  "#999",    // ghost hover label

  // Hover states — interactive surfaces
  hoverSurface:     "#111",      // menu item / row bg on hover
  hoverText:        "#ccc",      // text on hover
  hoverBorder:      "#333",      // border on hover (ghost buttons, cards)
  hoverInputBorder: "#2a2a2a",   // input / textarea border on hover
  hoverCardBorder:  "#282828",   // card border on hover
  hoverDropZone:    "#0f0f0f",   // drop zone bg on hover (no drag)
  hoverDropBorder:  "#333",      // drop zone border on hover (no drag)
  hoverDanger:      "#fca5a5",   // danger item text on hover
  hoverDangerBg:    "#1a0a0a",   // danger item bg on hover
  hoverDangerBorder:"#f87171",   // danger border on hover

  // Score display — monochrome system
  // Scores communicate through brightness and underline only. No color coding.
  scoreNum:     "#d0d0d0",  // big score number (arc, static card)
  scoreDenom:   "#888",     // "/100" text
  scoreCaption: "#999",     // "STRUCTURE SCORE", arc badge label
  barFill:      "#484848",  // all category bars — same regardless of score
  barTrack:     "#252525",  // bar track background
  scoreHi:      "#aaa",     // score ≥80 number
  scoreMid:     "#888",     // score 60–79 number
  scoreLo:      "#787878",  // score <60 number — passes WCAG AA (4.54:1 vs #080808)
  underlineMid: "#7a5c1a",  // muted amber underline for score 60–79
  underlineLo:  "#7a3535",  // muted red underline for score <60
};

// ── Typography Scale ────────────────────────────────────────────────────────
export const text = {
  // Font sizes
  size: {
    xs:   "9px",   // report sub-labels
    sm:   "10px",  // eyebrow badges, bar track labels, meta
    base: "11px",  // nav buttons, category scores, mono labels
    md:   "12px",  // key helper text, report file name, small mono
    lg:   "13px",  // body copy, textarea, buttons
    xl:   "14px",  // category names in static panel, form labels
    xl2:  "15px",  // landing sub paragraph
    xl3:  "16px",  // file name loaded, landing sub-large
    xl4:  "20px",  // score denominator (/100)
    xl5:  "22px",  // stat numbers
    xl6:  "36px",  // upload h1 (compact)
    xl7:  "52px",  // static score number
    xl8:  "56px",  // upload h1 (full)
    xl9:  "58px",  // landing h1
    xl10: "72px",  // landing mock report score
  },
  // Font weights
  weight: {
    light:    "200",
    thin:     "300",
    regular:  "400",
    medium:   "500",
    semibold: "600",
    bold:     "700",
  },
  // Line heights
  leading: {
    tight:   1,
    snug:    1.1,
    normal:  1.5,
    relaxed: 1.6,
    loose:   1.7,
    airy:    1.8,
  },
  // Letter spacing
  tracking: {
    tight:   "-0.03em",
    normal:  "0",
    sm:      "0.02em",
    md:      "0.04em",
    lg:      "0.06em",
    xl:      "0.08em",
    wide:    "0.1em",
    wider:   "0.12em",
    widest:  "0.18em",
    ultra:   "0.2em",
  },
};

// ── Spacing Scale ───────────────────────────────────────────────────────────
// Used for padding, margin, gap
export const space = {
  1:  "4px",
  2:  "6px",
  3:  "8px",
  4:  "10px",
  5:  "12px",
  6:  "14px",
  7:  "16px",
  8:  "20px",
  9:  "24px",
  10: "28px",
  11: "32px",
  12: "40px",
  13: "48px",
  14: "52px",
  15: "60px",
  16: "64px",
  17: "72px",
  18: "80px",
};

// ── Border Radius ───────────────────────────────────────────────────────────
export const radius = {
  sm:  "3px",
  md:  "4px",
  lg:  "6px",
  xl:  "8px",
};

// ── Borders ─────────────────────────────────────────────────────────────────
export const border = {
  subtle:   `1px solid ${color.surface4}`,   // #141414 — lightest rule
  faint:    `1px solid ${color.surface6}`,   // #1a1a1a — mid rule
  default:  `1px solid ${color.surface7}`,   // #1e1e1e — standard
  strong:   `1px solid ${color.surface8}`,   // #222
  dashed:   `1px dashed ${color.surface8}`,  // drop zone
  warning:  `3px solid ${color.amber}`,      // warning left accent
  errorLeft:`3px solid ${color.red}`,
  greenLeft:`3px solid ${color.green}`,
};

// ── Component Tokens ─────────────────────────────────────────────────────────
// Pre-composed style objects for shared UI patterns

export const nav = {
  height: "60px",
  background: color.bg,
  borderBottom: border.subtle,
  padding: "0 48px",
};

export const navLanding = {
  height: "56px",
  background: color.bgLanding,
  borderBottom: `1px solid ${color.surface4}`,
  padding: "0 48px",
};

// ── Clerk Appearance ─────────────────────────────────────────────────────────
// Dark-theme appearance object for ClerkProvider.
// Maps Clerk element tokens to design system colors.
export const clerkAppearance = {
  layout: {
    logoPlacement: "none",
    showOptionalFields: false,
    socialButtonsVariant: "blockButton",
  },
  variables: {
    // Base palette Clerk uses to derive component colors
    colorBackground:       color.surface1,   // modal card bg: #0c0c0c
    colorInputBackground:  color.surface0,   // input bg: #0a0a0a
    colorText:             color.text2,      // primary text: #e8e8e8
    colorTextSecondary:    color.text9,      // secondary text: #777
    colorInputText:        color.text4,      // input text: #ccc
    colorPrimary:          color.btnPrimary, // primary action: #e0e0e0
    colorDanger:           color.red,
    colorSuccess:          color.green,
    colorNeutral:          color.text9,
    fontFamily:            font.mono,
    fontFamilyButtons:     font.mono,
    fontSize:              text.size.lg,     // 13px base
    borderRadius:          radius.md,        // 4px
  },
  elements: {
    // Modal shell
    rootBox: {
      boxShadow: "none",
    },
    card: {
      background:   color.surface1,
      border:       border.faint,
      borderRadius: radius.xl,
      boxShadow:    "0 0 0 1px #1a1a1a, 0 24px 48px rgba(0,0,0,0.6)",
      padding:      "40px",
    },
    // Header
    headerTitle: {
      color:       color.text2,
      fontFamily:  font.sans,
      fontSize:    "20px",
      fontWeight:  text.weight.thin,
      letterSpacing: text.tracking.tight,
    },
    headerSubtitle: {
      color:      color.text9,
      fontFamily: font.sans,
      fontSize:   text.size.xl,
    },
    // Social buttons
    socialButtonsBlockButton: {
      background:   color.surface0,
      border:       border.faint,
      borderRadius: radius.md,
      color:        color.text8,
      fontFamily:   font.mono,
      fontSize:     text.size.base,
      letterSpacing:text.tracking.lg,
      transition:   "all 0.15s",
    },
    socialButtonsBlockButton__hover: {
      background:  color.surface4,
      borderColor: color.surface8,
    },
    socialButtonsBlockButtonText: {
      color:       color.text7,
      fontFamily:  font.mono,
      fontSize:    text.size.base,
      letterSpacing: text.tracking.lg,
    },
    // Divider
    dividerLine: {
      background: color.surface6,
    },
    dividerText: {
      color:      color.textA,
      fontFamily: font.mono,
      fontSize:   text.size.sm,
    },
    // Form fields
    formFieldLabel: {
      color:        color.textA,
      fontFamily:   font.mono,
      fontSize:     text.size.base,
      letterSpacing:text.tracking.xl,
      textTransform:"uppercase",
    },
    formFieldInput: {
      background:   color.surface0,
      border:       border.faint,
      borderRadius: radius.md,
      color:        color.text4,
      fontFamily:   font.mono,
      fontSize:     text.size.lg,
      height:       "44px",
      outline:      "none",
      transition:   "border-color 0.15s",
    },
    formFieldInputShowPasswordButton: {
      color: color.text9,
    },
    // Primary action button
    formButtonPrimary: {
      background:   color.btnPrimary,
      color:        color.btnPrimaryText,
      borderRadius: radius.lg,
      fontFamily:   font.mono,
      fontSize:     text.size.lg,
      fontWeight:   text.weight.bold,
      letterSpacing:text.tracking.wide,
      height:       "52px",
      border:       "none",
      textTransform:"uppercase",
      boxShadow:    "none",
      transition:   "background 0.15s",
    },
    formButtonPrimary__hover: {
      background: color.btnPrimaryHover,
    },
    // Reset / secondary action
    formButtonReset: {
      color:      color.textA,
      fontFamily: font.mono,
      fontSize:   text.size.base,
    },
    // Footer links
    footerActionLink: {
      color:        color.text7,
      fontFamily:   font.mono,
      fontSize:     text.size.base,
      letterSpacing:text.tracking.lg,
    },
    footerActionText: {
      color:      color.textA,
      fontFamily: font.mono,
      fontSize:   text.size.base,
    },
    footer: {
      background: color.surface0,
      borderTop:  border.subtle,
    },
    // Internal links (sign up / forgot password)
    internalLink: {
      color: color.text7,
    },
    // Close button
    modalCloseButton: {
      color:  color.textA,
      top:    "16px",
      right:  "16px",
    },
    // Alerts / errors inside modal
    alert: {
      background:   color.bgError,
      border:       `1px solid #2a0f0f`,
      borderRadius: radius.md,
    },
    alertText: {
      color:      color.red,
      fontFamily: font.mono,
      fontSize:   text.size.base,
    },
    identityPreview: {
      background:   color.surface0,
      border:       border.faint,
      borderRadius: radius.md,
    },
    identityPreviewText: {
      color:      color.text8,
      fontFamily: font.mono,
      fontSize:   text.size.base,
    },
    identityPreviewEditButton: {
      color: color.textA,
    },
    // OTP input
    otpCodeFieldInput: {
      background:   color.surface0,
      border:       border.faint,
      borderRadius: radius.md,
      color:        color.text4,
      fontFamily:   font.mono,
      fontSize:     "20px",
    },
    // User button (nav avatar)
    userButtonAvatarBox: {
      width:        "28px",
      height:       "28px",
      borderRadius: radius.md,
    },
    userButtonPopoverCard: {
      background:   color.surface1,
      border:       border.faint,
      borderRadius: radius.xl,
      boxShadow:    "0 8px 32px rgba(0,0,0,0.6)",
    },
    userButtonPopoverActionButton: {
      color:      color.text8,
      fontFamily: font.mono,
      fontSize:   text.size.base,
    },
    userButtonPopoverActionButtonText: {
      color:      color.text8,
      fontFamily: font.mono,
      fontSize:   text.size.base,
    },
    userButtonPopoverActionButtonIcon: {
      color: color.textA,
    },
    userButtonPopoverFooter: {
      display: "none",
    },
  },
};
