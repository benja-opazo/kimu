// Inline SVG icons (Lucide, MIT). Stroke icons that inherit currentColor.

const svg = inner => `<svg class="icon" viewBox="0 0 24 24" aria-hidden="true">${inner}</svg>`;

export const moon = svg('<path d="M12 3a6.4 6.4 0 0 0 9 9 9 9 0 1 1-9-9Z"/>');
export const sun  = svg(
  '<circle cx="12" cy="12" r="4"/><path d="M12 2v2"/><path d="M12 20v2"/>' +
  '<path d="m4.93 4.93 1.41 1.41"/><path d="m17.66 17.66 1.41 1.41"/>' +
  '<path d="M2 12h2"/><path d="M20 12h2"/>' +
  '<path d="m6.34 17.66-1.41 1.41"/><path d="m19.07 4.93-1.41 1.41"/>'
);
export const palette = svg(
  '<circle cx="13.5" cy="6.5" r=".5" fill="currentColor"/>' +
  '<circle cx="17.5" cy="10.5" r=".5" fill="currentColor"/>' +
  '<circle cx="8.5" cy="7.5" r=".5" fill="currentColor"/>' +
  '<circle cx="6.5" cy="12.5" r=".5" fill="currentColor"/>' +
  '<path d="M12 2C6.5 2 2 6.5 2 12s4.5 10 10 10c.926 0 1.648-.746 1.648-1.688 0-.437-.18-.835-.437-1.125-.29-.289-.438-.652-.438-1.125a1.64 1.64 0 0 1 1.668-1.668h1.996c3.051 0 5.555-2.503 5.555-5.554C21.965 6.012 17.461 2 12 2Z"/>'
);

// Admonition icons (Lucide). Keyed by GitHub alert type.
export const admonitionIcons = {
  note:      svg('<circle cx="12" cy="12" r="10"/><path d="M12 16v-4"/><path d="M12 8h.01"/>'),
  tip:       svg('<path d="M15 14c.2-1 .7-1.7 1.5-2.5C17.7 10.2 18 9 18 8a6 6 0 0 0-12 0c0 1 .3 2.2 1.5 3.5.8.8 1.3 1.5 1.5 2.5"/><path d="M9 18h6"/><path d="M10 22h4"/>'),
  important: svg('<path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/><path d="M12 7v4"/><path d="M12 15h.01"/>'),
  warning:   svg('<path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z"/><path d="M12 9v4"/><path d="M12 17h.01"/>'),
  caution:   svg('<path d="M12 16h.01"/><path d="M12 8v4"/><path d="M15.3 2H8.7L2 8.7v6.6L8.7 22h6.6L22 15.3V8.7z"/>'),
};
