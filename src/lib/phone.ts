/**
 * Cleans a phone number to only digits, max 13 chars (BR format: 55 + DDD + number)
 */
export function cleanPhone(phone: string): string {
  return phone.replace(/\D/g, '').slice(0, 13);
}

/**
 * Generates a WhatsApp link that works both in browsers and iframes
 */
export function whatsappLink(phone: string, text?: string): string {
  const clean = cleanPhone(phone);
  if (!clean) return '#';
  const base = `https://wa.me/${clean}`;
  return text ? `${base}?text=${encodeURIComponent(text)}` : base;
}
