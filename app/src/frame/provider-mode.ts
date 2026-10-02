/** M0 switch; the provider contract and implementations arrive in M2. */
export function providerMode(hasDesktopBridge: boolean, override?: string): 'fake' | 'claude' {
  return override === 'fake' || !hasDesktopBridge ? 'fake' : 'claude';
}
