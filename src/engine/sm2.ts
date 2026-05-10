export function calculateSM2(
  easeFactor: number,
  intervalDays: number,
  result: 0 | 1
): { newEaseFactor: number; newIntervalDays: number; newDueDate: number } {
  let newEaseFactor: number;
  let newIntervalDays: number;

  if (result === 0) {
    newIntervalDays = 1;
    newEaseFactor = Math.max(1.3, easeFactor - 0.2);
  } else {
    newIntervalDays = Math.ceil(intervalDays * easeFactor);
    newEaseFactor = easeFactor + 0.1;
  }

  const newDueDate = Math.floor(Date.now() / 1000) + newIntervalDays * 86400;

  return { newEaseFactor, newIntervalDays, newDueDate };
}
