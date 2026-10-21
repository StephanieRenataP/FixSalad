import { describe, expect, it } from 'vitest';
import { namaValid, whatsAppValid } from '../pengambil';

describe('form pengambil (SPEC.md §7.5)', () => {
  it('nama minimal 2 karakter, spasi tidak dihitung', () => {
    expect(namaValid('Ren')).toBe(true);
    expect(namaValid('Al')).toBe(true);
    expect(namaValid(' A ')).toBe(false);
    expect(namaValid('')).toBe(false);
  });

  it('menerima 08… dan +628… dengan pemisah yang biasa diketik', () => {
    expect(whatsAppValid('081234567890')).toBe(true);
    expect(whatsAppValid('0812-3456-7890')).toBe(true);
    expect(whatsAppValid('+62 812 3456 7890')).toBe(true);
    expect(whatsAppValid('081234567')).toBe(true); // 9 digit, batas bawah
  });

  it('menolak awalan lain dan panjang di luar 9–15 digit', () => {
    expect(whatsAppValid('62812345678')).toBe(false); // tanpa +
    expect(whatsAppValid('071234567890')).toBe(false); // bukan 08
    expect(whatsAppValid('08123456')).toBe(false); // 8 digit
    expect(whatsAppValid('0812345678901234')).toBe(false); // 16 digit
    expect(whatsAppValid('0812abc67890')).toBe(false);
  });
});
