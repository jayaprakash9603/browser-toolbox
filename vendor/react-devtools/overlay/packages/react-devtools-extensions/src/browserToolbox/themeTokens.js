/**
 * Maps React DevTools THEME_STYLES keys to Browser Toolbox design tokens.
 * Profiler commit gradients and Suspense lane colors keep upstream literals.
 */

const PRESERVED_LIGHT = {
  '--color-commit-did-not-render-fill': '#cfd1d5',
  '--color-commit-did-not-render-fill-text': '#000000',
  '--color-commit-did-not-render-pattern': '#cfd1d5',
  '--color-commit-did-not-render-pattern-text': '#333333',
  '--color-commit-gradient-0': '#37afa9',
  '--color-commit-gradient-1': '#63b19e',
  '--color-commit-gradient-2': '#80b393',
  '--color-commit-gradient-3': '#97b488',
  '--color-commit-gradient-4': '#abb67d',
  '--color-commit-gradient-5': '#beb771',
  '--color-commit-gradient-6': '#cfb965',
  '--color-commit-gradient-7': '#dfba57',
  '--color-commit-gradient-8': '#efbb49',
  '--color-commit-gradient-9': '#febc38',
  '--color-commit-gradient-text': '#000000',
  '--color-suspense-default': '#0088fa',
  '--color-transition-default': '#6a51b2',
  '--color-suspense-server': '#62bc6a',
  '--color-transition-server': '#3f7844',
  '--color-suspense-other': '#f3ce49',
  '--color-transition-other': '#917b2c',
  '--color-suspense-errored': '#d57066',
  '--color-search-match': 'yellow',
  '--color-search-match-current': '#f7923b',
};

const PRESERVED_DARK = {
  '--color-commit-did-not-render-fill': '#777d88',
  '--color-commit-did-not-render-fill-text': '#000000',
  '--color-commit-did-not-render-pattern': '#666c77',
  '--color-commit-did-not-render-pattern-text': '#ffffff',
  '--color-commit-gradient-0': '#37afa9',
  '--color-commit-gradient-1': '#63b19e',
  '--color-commit-gradient-2': '#80b393',
  '--color-commit-gradient-3': '#97b488',
  '--color-commit-gradient-4': '#abb67d',
  '--color-commit-gradient-5': '#beb771',
  '--color-commit-gradient-6': '#cfb965',
  '--color-commit-gradient-7': '#dfba57',
  '--color-commit-gradient-8': '#efbb49',
  '--color-commit-gradient-9': '#febc38',
  '--color-commit-gradient-text': '#000000',
  '--color-suspense-default': '#61dafb',
  '--color-transition-default': '#6a51b2',
  '--color-suspense-server': '#62bc6a',
  '--color-transition-server': '#3f7844',
  '--color-suspense-other': '#f3ce49',
  '--color-transition-other': '#917b2c',
  '--color-suspense-errored': '#d57066',
  '--color-search-match': 'yellow',
  '--color-search-match-current': '#f7923b',
};

function sharedLight() {
  return {
    '--color-attribute-name': 'var(--syntax-tag)',
    '--color-attribute-name-not-editable': 'var(--foreground)',
    '--color-attribute-name-inverted': 'color-mix(in srgb, var(--foreground) 70%, transparent)',
    '--color-attribute-value': 'var(--syntax-string)',
    '--color-attribute-value-inverted': 'var(--primary-foreground)',
    '--color-attribute-editable-value': 'var(--syntax-string)',
    '--color-background': 'var(--background)',
    '--color-background-hover': 'color-mix(in srgb, var(--primary) 10%, transparent)',
    '--color-background-inactive': 'var(--muted)',
    '--color-background-invalid': 'color-mix(in srgb, var(--destructive) 12%, var(--background))',
    '--color-background-selected': 'var(--primary)',
    '--color-button-background': 'var(--card)',
    '--color-button-background-focus': 'var(--accent)',
    '--color-button-background-hover': 'color-mix(in srgb, var(--foreground) 12%, transparent)',
    '--color-button': 'var(--muted-foreground)',
    '--color-button-disabled': 'var(--border)',
    '--color-button-active': 'var(--primary)',
    '--color-button-focus': 'var(--foreground)',
    '--color-button-hover': 'var(--foreground)',
    '--color-border': 'var(--border)',
    '--color-component-name': 'var(--primary)',
    '--color-component-name-inverted': 'var(--primary-foreground)',
    '--color-component-badge-background': 'var(--muted)',
    '--color-component-badge-background-inverted': 'color-mix(in srgb, var(--primary-foreground) 25%, transparent)',
    '--color-component-badge-count': 'var(--muted-foreground)',
    '--color-component-badge-count-inverted': 'color-mix(in srgb, var(--primary-foreground) 70%, transparent)',
    '--color-console-error-badge-text': 'var(--destructive-foreground)',
    '--color-console-error-background': 'color-mix(in srgb, var(--destructive) 8%, var(--background))',
    '--color-console-error-border': 'color-mix(in srgb, var(--destructive) 25%, var(--border))',
    '--color-console-error-icon': 'var(--destructive)',
    '--color-console-error-text': 'var(--destructive)',
    '--color-console-warning-badge-text': 'var(--foreground)',
    '--color-console-warning-background': 'color-mix(in srgb, var(--warning) 12%, var(--background))',
    '--color-console-warning-border': 'color-mix(in srgb, var(--warning) 35%, var(--border))',
    '--color-console-warning-icon': 'var(--warning)',
    '--color-console-warning-text': 'color-mix(in srgb, var(--warning) 65%, var(--foreground))',
    '--color-context-background': 'color-mix(in srgb, var(--foreground) 92%, transparent)',
    '--color-context-background-hover': 'color-mix(in srgb, var(--primary) 18%, transparent)',
    '--color-context-background-selected': 'var(--primary)',
    '--color-context-border': 'var(--border)',
    '--color-context-text': 'var(--background)',
    '--color-context-text-selected': 'var(--primary-foreground)',
    '--color-dim': 'var(--muted-foreground)',
    '--color-dimmer': 'var(--border)',
    '--color-dimmest': 'var(--muted)',
    '--color-error-background': 'color-mix(in srgb, var(--destructive) 10%, var(--background))',
    '--color-error-border': 'color-mix(in srgb, var(--destructive) 30%, var(--border))',
    '--color-error-text': 'var(--destructive)',
    '--color-expand-collapse-toggle': 'var(--muted-foreground)',
    '--color-forget-badge-background': 'var(--primary)',
    '--color-forget-badge-background-inverted': 'color-mix(in srgb, var(--primary) 75%, black)',
    '--color-forget-text': 'var(--primary-foreground)',
    '--color-link': 'var(--primary)',
    '--color-modal-background': 'color-mix(in srgb, var(--background) 80%, transparent)',
    '--color-bridge-version-npm-background': 'var(--muted)',
    '--color-bridge-version-npm-text': 'var(--foreground)',
    '--color-bridge-version-number': 'var(--primary)',
    '--color-primitive-hook-badge-background': 'var(--muted)',
    '--color-primitive-hook-badge-text': 'var(--muted-foreground)',
    '--color-record-active': 'var(--destructive)',
    '--color-record-hover': 'color-mix(in srgb, var(--primary) 80%, white)',
    '--color-record-inactive': 'var(--primary)',
    '--color-resize-bar': 'var(--border)',
    '--color-resize-bar-active': 'var(--accent)',
    '--color-resize-bar-border': 'var(--border)',
    '--color-resize-bar-dot': 'var(--muted-foreground)',
    '--color-timebar-background': 'var(--muted)',
    '--color-selected-tree-highlight-active': 'color-mix(in srgb, var(--primary) 12%, transparent)',
    '--color-selected-tree-highlight-inactive': 'color-mix(in srgb, var(--foreground) 6%, transparent)',
    '--color-tab-selected-border': 'var(--primary)',
    '--color-text': 'var(--foreground)',
    '--color-text-invalid': 'var(--destructive)',
    '--color-text-selected': 'var(--primary-foreground)',
    '--color-toggle-background-invalid': 'var(--destructive)',
    '--color-toggle-background-on': 'var(--primary)',
    '--color-toggle-background-off': 'var(--border)',
    '--color-toggle-text': 'var(--primary-foreground)',
    '--color-warning-background': 'var(--destructive)',
    '--color-warning-background-hover': 'color-mix(in srgb, var(--destructive) 85%, black)',
    '--color-warning-text-color': 'var(--destructive-foreground)',
    '--color-warning-text-color-inverted': 'var(--destructive)',
    '--color-scroll-thumb': 'var(--scroll-thumb)',
    '--color-scroll-track': 'var(--scroll-track)',
    '--color-tooltip-background': 'color-mix(in srgb, var(--foreground) 92%, transparent)',
    '--color-tooltip-text': 'var(--background)',
    '--elevation-4': 'var(--shadow-card-hover)',
  };
}

function sharedDark() {
  const light = sharedLight();
  return {
    ...light,
    '--color-attribute-name': 'var(--syntax-keyword)',
    '--color-attribute-value': 'var(--syntax-string)',
    '--color-attribute-editable-value': 'var(--syntax-number)',
    '--color-component-name': 'color-mix(in srgb, var(--primary) 95%, white)',
    '--color-link': 'var(--primary)',
    '--color-context-background': 'color-mix(in srgb, var(--card) 96%, transparent)',
    '--color-context-text': 'var(--foreground)',
    '--color-tooltip-background': 'color-mix(in srgb, var(--card) 96%, transparent)',
    '--color-tooltip-text': 'var(--foreground)',
    '--elevation-4': 'var(--shadow-card-hover)',
  };
}

export function getLightThemeOverrides() {
  return {...sharedLight(), ...PRESERVED_LIGHT};
}

export function getDarkThemeOverrides() {
  return {...sharedDark(), ...PRESERVED_DARK};
}

/** Keys React DevTools expects on THEME_STYLES.light (for test coverage). */
export const THEME_STYLE_COLOR_KEYS = [
  ...Object.keys(sharedLight()),
  ...Object.keys(PRESERVED_LIGHT),
];

export function resolveAppBrowserTheme(devtoolsTheme) {
  const cfg = typeof window !== 'undefined' ? window.__BT_REACT_DEVTOOLS__ : null;
  const mode = cfg && cfg.theme;
  if (mode === 'light' || mode === 'dark') {
    return mode;
  }
  return devtoolsTheme === 'dark' ? 'dark' : 'light';
}
