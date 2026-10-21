// Validasi form data pengambil di /checkout (SPEC.md §7.5). Tanpa login —
// nama dipanggil kasir saat pesanan siap, nomor WhatsApp untuk kontak.

export function namaValid(nama: string): boolean {
  return nama.trim().length >= 2;
}

/** Buang spasi, strip, titik, dan kurung yang biasa diketik user: "0812-3456 7890". */
export function normalisasiWhatsApp(no: string): string {
  return no.replace(/[\s\-.()]/g, '');
}

/** Format Indonesia: `08…` atau `+628…`, total 9–15 digit (tanpa tanda +). */
export function whatsAppValid(no: string): boolean {
  return /^(?:08\d{7,13}|\+628\d{6,12})$/.test(normalisasiWhatsApp(no));
}
