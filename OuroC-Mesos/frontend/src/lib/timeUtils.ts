/**
 * Time utility functions for parsing and converting interval formats
 */

/**
 * Parse YY:MM:DD:hh:mm:ss format to total seconds
 *
 * @param interval - Time interval in format YY:MM:DD:hh:mm:ss
 * @returns Total seconds or null if invalid
 *
 * @example
 * parseIntervalToSeconds("00:00:00:00:00:10") // 10 seconds (for demo)
 * parseIntervalToSeconds("00:01:00:00:00:00") // 2592000 seconds (30 days/1 month)
 * parseIntervalToSeconds("00:00:07:00:00:00") // 604800 seconds (7 days/1 week)
 */
export function parseIntervalToSeconds(interval: string): number | null {
  // Validate format YY:MM:DD:hh:mm:ss
  const regex = /^(\d{2}):(\d{2}):(\d{2}):(\d{2}):(\d{2}):(\d{2})$/;
  const match = interval.match(regex);

  if (!match) {
    return null;
  }

  const [, years, months, days, hours, minutes, seconds] = match.map(Number);

  // Convert everything to seconds
  // Note: We approximate months as 30 days and years as 365 days
  const totalSeconds =
    years * 365 * 24 * 60 * 60 +
    months * 30 * 24 * 60 * 60 +
    days * 24 * 60 * 60 +
    hours * 60 * 60 +
    minutes * 60 +
    seconds;

  return totalSeconds;
}

/**
 * Check if an interval is longer than one day
 *
 * @param intervalSeconds - Interval in seconds
 * @returns true if interval > 1 day
 */
export function isIntervalLongerThanOneDay(intervalSeconds: number): boolean {
  const ONE_DAY_SECONDS = 24 * 60 * 60;
  return intervalSeconds > ONE_DAY_SECONDS;
}

/**
 * Format seconds into human-readable string
 *
 * @param seconds - Total seconds
 * @returns Human-readable string
 *
 * @example
 * formatSecondsToHumanReadable(10) // "10 seconds"
 * formatSecondsToHumanReadable(3600) // "1 hour"
 * formatSecondsToHumanReadable(86400) // "1 day"
 */
export function formatSecondsToHumanReadable(seconds: number): string {
  if (seconds < 60) {
    return `${seconds} second${seconds !== 1 ? "s" : ""}`;
  }

  if (seconds < 3600) {
    const minutes = Math.floor(seconds / 60);
    return `${minutes} minute${minutes !== 1 ? "s" : ""}`;
  }

  if (seconds < 86400) {
    const hours = Math.floor(seconds / 3600);
    return `${hours} hour${hours !== 1 ? "s" : ""}`;
  }

  if (seconds < 2592000) {
    const days = Math.floor(seconds / 86400);
    return `${days} day${days !== 1 ? "s" : ""}`;
  }

  const months = Math.floor(seconds / 2592000);
  return `${months} month${months !== 1 ? "s" : ""}`;
}

/**
 * Validate interval format
 *
 * @param interval - Interval string
 * @returns Error message or null if valid
 */
export function validateInterval(interval: string): string | null {
  const regex = /^(\d{2}):(\d{2}):(\d{2}):(\d{2}):(\d{2}):(\d{2})$/;

  if (!regex.test(interval)) {
    return "Invalid format. Use YY:MM:DD:hh:mm:ss";
  }

  const seconds = parseIntervalToSeconds(interval);

  if (seconds === null) {
    return "Invalid interval";
  }

  if (seconds === 0) {
    return "Interval must be greater than 0";
  }

  // Minimum interval: 10 seconds (for demo purposes)
  if (seconds < 10) {
    return "Minimum interval is 10 seconds";
  }

  // Maximum interval: 5 years
  const MAX_SECONDS = 5 * 365 * 24 * 60 * 60;
  if (seconds > MAX_SECONDS) {
    return "Maximum interval is 5 years";
  }

  return null;
}

/**
 * Get example intervals for UI hints
 */
export const EXAMPLE_INTERVALS = {
  tenSeconds: "00:00:00:00:00:10", // For demo
  oneMinute: "00:00:00:00:01:00",
  oneHour: "00:00:00:01:00:00",
  oneDay: "00:00:01:00:00:00",
  oneWeek: "00:00:07:00:00:00",
  oneMonth: "00:01:00:00:00:00",
  threeMonths: "00:03:00:00:00:00",
  oneYear: "01:00:00:00:00:00",
};
