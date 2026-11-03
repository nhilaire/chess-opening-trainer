// Dark background and wood board of the earlier web app (docs/PRD.md "Look, sound and feel").
export const colors = {
  background: '#312e2b',
  surface: '#45413c',
  text: '#F5F3EF',
  muted: '#B8B2A7',
  accent: '#81B64C',
  accentText: '#1E1C1A',
  danger: '#E8735A',
  success: '#81B64C',
} as const;

export const board = {
  light: '#f0d9b5',
  dark: '#b58863',
  lastMove: 'rgba(255, 255, 0, 0.4)',
  selected: 'rgba(20, 85, 30, 0.5)',
  arrow: '#15781B',
} as const;

export const spacing = { xs: 4, sm: 8, md: 16, lg: 24, xl: 40 } as const;

export const font = { title: 34, heading: 24, body: 17, small: 14 } as const;
