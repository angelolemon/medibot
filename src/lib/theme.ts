function hexToRgb(hex: string): [number, number, number] {
  const h = hex.replace('#', '')
  return [
    parseInt(h.substring(0, 2), 16),
    parseInt(h.substring(2, 4), 16),
    parseInt(h.substring(4, 6), 16),
  ]
}

export function hexToLightBg(hex: string, amount = 0.08): string {
  const [r, g, b] = hexToRgb(hex)
  const mix = (c: number) => Math.round(c * amount + 255 * (1 - amount))
  return `#${[mix(r), mix(g), mix(b)].map(c => c.toString(16).padStart(2, '0')).join('')}`
}

export function applyOrgTheme(primaryColor: string | null, accentColor: string | null) {
  const root = document.documentElement.style

  if (primaryColor && /^#[0-9a-fA-F]{6}$/.test(primaryColor)) {
    root.setProperty('--color-primary', primaryColor)
    root.setProperty('--color-primary-light', hexToLightBg(primaryColor, 0.08))
    root.setProperty('--color-primary-mid', hexToLightBg(primaryColor, 0.4))
  } else {
    root.removeProperty('--color-primary')
    root.removeProperty('--color-primary-light')
    root.removeProperty('--color-primary-mid')
  }

  if (accentColor && /^#[0-9a-fA-F]{6}$/.test(accentColor)) {
    root.setProperty('--color-teal', accentColor)
    root.setProperty('--color-teal-light', hexToLightBg(accentColor, 0.08))
  } else {
    root.removeProperty('--color-teal')
    root.removeProperty('--color-teal-light')
  }
}

export function clearOrgTheme() {
  const root = document.documentElement.style
  root.removeProperty('--color-primary')
  root.removeProperty('--color-primary-light')
  root.removeProperty('--color-primary-mid')
  root.removeProperty('--color-teal')
  root.removeProperty('--color-teal-light')
}
