import { studioTheme, type AgStudioTheme, type AgStudioThemeParams } from 'ag-studio';
import { useMemo } from 'react';

import { useTokenColors } from '../../../components/use-token-color.ts';
import { TEXT_FACE } from '../../../theme/typefaces.ts';

const SANS = TEXT_FACE;
const NONE = 'none' as const;

/** The tokens the theme reads, resolved for the charts, which draw on a canvas. */
const TOKENS = {
  paper: '--paper',
  surface: '--surface',
  sunken: '--sunken',
  ink: '--ink',
  ink2: '--ink-2',
  line: '--line',
  accent: '--accent',
  bar: '--band-low',
  medium: '--band-medium',
  high: '--band-high',
  veryLow: '--band-very-low',
} as const;

type Colors = Record<keyof typeof TOKENS, string>;

/** Studio's frame, panels and widgets: cards with 12 px corners on the page, one accent. */
function frameParams(c: Colors): Partial<AgStudioThemeParams> {
  return {
    browserColorScheme: 'inherit',
    fontFamily: SANS,
    fontSize: 14,
    accentColor: c.accent,
    backgroundColor: c.surface,
    foregroundColor: c.ink,
    textColor: c.ink,
    subtleTextColor: c.ink2,
    borderColor: c.line,
    borderRadius: 8,
    rowHoverColor: c.sunken,
    invalidColor: c.accent,
    menuBackgroundColor: c.surface,
    menuTextColor: c.ink,
    menuShadow: NONE,
    popupShadow: NONE,
    dropdownShadow: NONE,
    dialogShadow: NONE,
    tooltipBackgroundColor: c.ink,
    tooltipTextColor: c.paper,
    toggleButtonOnBackgroundColor: c.accent,
    focusShadow: { radius: 2, spread: 2, color: c.accent },
    studioWrapperBackgroundColor: c.paper,
    studioWrapperBorderRadius: 0,
    studioPanelContainerBackgroundColor: c.surface,
    studioPanelContainerBorderRadius: 12,
    studioPanelItemBorderRadius: 6,
    studioPanelDividerColor: c.line,
    studioCanvasBackgroundColor: c.paper,
    studioCanvasFontFamily: SANS,
    studioWidgetBackgroundColor: c.surface,
    studioWidgetBorder: { width: 1, color: c.line },
    studioWidgetBorderRadius: 12,
    studioWidgetShadow: NONE,
    studioWidgetToolbarShadow: NONE,
    studioWidgetSelectedBorderColor: c.accent,
    studioWidgetTitleFontFamily: SANS,
    studioWidgetTitleFontSize: 15,
    studioWidgetTitleFontWeight: 500,
    studioWidgetTitleTextColor: c.ink,
    studioWidgetCaptionTextColor: c.ink2,
    studioWidgetSubtitleTextColor: c.ink2,
    studioToggleButtonActiveBackgroundColor: c.accent,
    studioToggleButtonActiveBorderColor: c.accent,
    studioToggleButtonActiveColor: c.accent,
  };
}

/** The tables and charts inside the widgets, as the explorer's own table and histogram. */
function dataParams(c: Colors): Partial<AgStudioThemeParams> {
  return {
    gridFontFamily: SANS,
    gridCellFontFamily: SANS,
    gridHeaderFontFamily: SANS,
    gridHeaderFontSize: 12,
    gridHeaderTextColor: c.ink2,
    gridHeaderBackgroundColor: c.sunken,
    gridDataBackgroundColor: c.surface,
    gridOddRowBackgroundColor: c.surface,
    gridRowHoverColor: c.sunken,
    gridRowBorder: { width: 1, color: c.line },
    gridHeaderRowBorder: { width: 1, color: c.line },
    gridWrapperBorderRadius: 0,
    gridRowHeight: 40,
    chartFontFamily: SANS,
    chartTextColor: c.ink,
    // One colour for every bar: Studio offers no colour per bar of a widget, only a palette. The
    // rest of the palette, for series a reader or the analyst adds, keeps to the bands and the ink.
    chartPaletteFills1Color: c.bar,
    chartPaletteFills2Color: c.high,
    chartPaletteFills3Color: c.medium,
    chartPaletteFills4Color: c.veryLow,
    chartPaletteFills5Color: c.ink2,
    chartPaletteFills6Color: c.ink,
  };
}

/** The Studio theme built from the design tokens; rebuilt when the light or dark theme changes. */
export function useStudioTheme(): AgStudioTheme {
  const colors = useTokenColors(TOKENS);
  return useMemo(
    () => studioTheme.withParams({ ...frameParams(colors), ...dataParams(colors) }),
    [colors],
  );
}
