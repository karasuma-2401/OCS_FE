/**
 * Utility to convert Vietnamese currency amounts (VND) into spoken Vietnamese words.
 * Example: 500000 -> "Năm trăm nghìn đồng"
 */

const DIGITS = ['không', 'một', 'hai', 'ba', 'bốn', 'năm', 'sáu', 'bảy', 'tám', 'chín'];

function readThreeDigits(n: number, isFirstGroup: boolean): string {
  const hundreds = Math.floor(n / 100);
  const tens = Math.floor((n % 100) / 10);
  const ones = n % 10;

  const parts: string[] = [];

  if (hundreds > 0 || !isFirstGroup) {
    parts.push(DIGITS[hundreds], 'trăm');
  }

  if (tens > 1) {
    parts.push(DIGITS[tens], 'mươi');
    if (ones === 1) {
      parts.push('mốt');
    } else if (ones === 5) {
      parts.push('lăm');
    } else if (ones > 0) {
      parts.push(DIGITS[ones]);
    }
  } else if (tens === 1) {
    parts.push('mười');
    if (ones === 5) {
      parts.push('lăm');
    } else if (ones > 0) {
      parts.push(DIGITS[ones]);
    }
  } else {
    // tens === 0
    if (ones > 0) {
      if (hundreds > 0 || !isFirstGroup) {
        parts.push('linh', DIGITS[ones]);
      } else {
        parts.push(DIGITS[ones]);
      }
    }
  }

  return parts.join(' ');
}

export function formatVndInWords(amountInput: number | string | undefined | null): string {
  if (amountInput === undefined || amountInput === null || amountInput === '') {
    return 'Không đồng';
  }

  const num = typeof amountInput === 'number' ? Math.floor(amountInput) : Math.floor(Number(amountInput));
  if (!Number.isFinite(num) || num <= 0) {
    return 'Không đồng';
  }

  const UNITS = ['', 'nghìn', 'triệu', 'tỷ', 'nghìn tỷ'];

  let remaining = num;
  const groups: number[] = [];

  while (remaining > 0) {
    groups.push(remaining % 1000);
    remaining = Math.floor(remaining / 1000);
  }

  const words: string[] = [];
  for (let i = groups.length - 1; i >= 0; i--) {
    const groupVal = groups[i];
    if (groupVal === 0) continue;

    const isFirstGroup = i === groups.length - 1;
    const groupWords = readThreeDigits(groupVal, isFirstGroup);
    words.push(groupWords);
    if (UNITS[i]) {
      words.push(UNITS[i]);
    }
  }

  if (words.length === 0) {
    return 'Không đồng';
  }

  const rawSentence = words.join(' ').trim() + ' đồng';
  return rawSentence.charAt(0).toUpperCase() + rawSentence.slice(1);
}
