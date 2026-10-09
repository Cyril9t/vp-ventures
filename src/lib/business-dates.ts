import "server-only";

function partsInZone(date: Date, timeZone: string) {
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hourCycle: "h23",
  }).formatToParts(date);
  const values = Object.fromEntries(parts.map((part) => [part.type, part.value]));
  return {
    year: Number(values.year), month: Number(values.month), day: Number(values.day),
    hour: Number(values.hour), minute: Number(values.minute), second: Number(values.second),
  };
}

function localMidnightAsUtc(year: number, month: number, day: number, timeZone: string) {
  const targetLocalAsUtc = Date.UTC(year, month - 1, day, 0, 0, 0);
  let guess = targetLocalAsUtc;
  for (let attempt = 0; attempt < 3; attempt += 1) {
    const local = partsInZone(new Date(guess), timeZone);
    const representedAsUtc = Date.UTC(local.year, local.month - 1, local.day, local.hour, local.minute, local.second);
    const nextGuess = targetLocalAsUtc - (representedAsUtc - guess);
    if (nextGuess === guess) break;
    guess = nextGuess;
  }
  return new Date(guess);
}

const businessTimeZone = () => process.env.BUSINESS_TIMEZONE || "Africa/Lagos";

export function startOfToday(now = new Date(), timeZone = businessTimeZone()) {
  const parts = partsInZone(now, timeZone);
  return localMidnightAsUtc(parts.year, parts.month, parts.day, timeZone);
}

export function endOfToday(now = new Date(), timeZone = businessTimeZone()) {
  const parts = partsInZone(now, timeZone);
  return localMidnightAsUtc(parts.year, parts.month, parts.day + 1, timeZone);
}
