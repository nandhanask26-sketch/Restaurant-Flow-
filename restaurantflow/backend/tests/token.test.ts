/// <reference types="jest" />
describe('Authoritative Daily Order Token Generator', () => {
  function formatToken(dateStr: string, seq: number): string {
    const dateCode = dateStr.replace(/-/g, '');
    const padded = String(seq).padStart(3, '0');
    return `RF-${dateCode}-${padded}`;
  }

  it('should format tokens in RF-YYYYMMDD-XXX format correctly', () => {
    const date = '2026-08-21';
    expect(formatToken(date, 1)).toBe('RF-20260821-001');
    expect(formatToken(date, 42)).toBe('RF-20260821-042');
    expect(formatToken(date, 128)).toBe('RF-20260821-128');
  });

  it('should produce strictly unique tokens for incrementing sequences', () => {
    const tokens = new Set<string>();
    const date = '2026-08-21';
    for (let i = 1; i <= 50; i++) {
      const token = formatToken(date, i);
      expect(tokens.has(token)).toBe(false);
      tokens.add(token);
    }
    expect(tokens.size).toBe(50);
  });
});
