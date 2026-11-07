export function fillOtpDigits(current: string[], value: string, index: number) {
  const incoming = value.replace(/\D/g, '');
  if (!incoming) return null;
  const start = incoming.length >= current.length ? 0 : index;
  const digits = [...current];
  for (let i = 0; i < incoming.length && start + i < digits.length; i++) digits[start + i] = incoming[i];
  return { digits, focusIndex: Math.min(start + incoming.length, digits.length - 1) };
}

export function deleteOtpDigit(current: string[], index: number) {
  const focusIndex = current[index] || index === 0 ? index : index - 1;
  return { digits: current.map((digit, i) => i === focusIndex ? '' : digit), focusIndex };
}
