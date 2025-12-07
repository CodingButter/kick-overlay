import { useEffect } from 'react';

/**
 * Forces transparent background for OBS browser source.
 * Saves original values and restores them on cleanup.
 */
export function useTransparentBackground() {
  useEffect(() => {
    // Save original values
    const root = document.documentElement;
    const originalThemeBackground = root.style.getPropertyValue('--theme-background');
    const originalColorBackground = root.style.getPropertyValue('--color-background');

    // Override the CSS variable that controls background color
    root.style.setProperty('--color-background', 'transparent');
    root.style.setProperty('--theme-background', 'transparent');

    // Also set direct styles with !important
    document.body.style.setProperty('background-color', 'transparent', 'important');
    document.body.style.setProperty('background', 'none', 'important');
    root.style.setProperty('background-color', 'transparent', 'important');
    root.style.setProperty('background', 'none', 'important');

    // Also hide any root element background
    const rootEl = document.getElementById('root');
    if (rootEl) {
      rootEl.style.setProperty('background-color', 'transparent', 'important');
      rootEl.style.setProperty('background', 'none', 'important');
    }

    return () => {
      // Restore original theme values (or fetch fresh from API)
      if (originalThemeBackground) {
        root.style.setProperty('--theme-background', originalThemeBackground);
      }
      if (originalColorBackground) {
        root.style.setProperty('--color-background', originalColorBackground);
      }
      // Remove direct style overrides (CSS rules will take over)
      document.body.style.removeProperty('background-color');
      document.body.style.removeProperty('background');
      root.style.removeProperty('background-color');
      root.style.removeProperty('background');
      if (rootEl) {
        rootEl.style.removeProperty('background-color');
        rootEl.style.removeProperty('background');
      }
      // Force page reload to restore theme (since ThemeContext has already run)
      // This is a workaround - ideally ThemeContext would expose a re-apply method
      window.location.reload();
    };
  }, []);
}
