/**
 * Intelligent Time Manager - Weekly Hour Map Scheduling Engine
 * Supports:
 * - Multi-hour tasks (>= 60m) spanning consecutive hour cells.
 * - Sub-hour tasks (< 60m) packed up to 60 minutes per cell.
 * - Circadian sleep intervals (default 22:00 - 06:00 across all 7 days).
 * - Exact color coding:
 *     Grey   = Empty or upcoming/scheduled task time (not yet evaluated)
 *     Green  = Completed task time
 *     Red    = Genuinely missed/overdue task time ONLY
 *     Sleep  = Circadian sleep block
 * - Conflict prevention & validation with nearby slot suggestions:
 *     "This time is occupied. Available nearby hours are: 11:00, 14:00, 16:00."
 * - Automatic nearest-slot assignment forward from current/creation time.
 */

export interface ScheduledItem {
  id: string;
  taskId?: string;
  title: string;
  durationMinutes: number;
  startHour: number;
  startMinute?: number;
  status: "pending" | "in_progress" | "completed" | "missed";
  isSleep?: boolean;
  color?: string;
  deadline?: string;
}

export interface HourCellDetail {
  date: Date;
  dateKey: string;      // YYYY-MM-DD
  dayLabel: string;     // Mon, Tue, etc.
  hour: number;         // 0 - 23
  timeRangeLabel: string; // e.g. "15:00 – 16:00"
  items: ScheduledItem[];
  totalBookedMinutes: number;
  remainingFreeMinutes: number;
  status: "empty" | "sleep" | "completed" | "missed" | "scheduled";
  tone: string;         // Tailwind class
  label: string;        // Title tooltip
}

export interface SleepConfig {
  startHour: number;    // e.g. 22
  endHour: number;      // e.g. 6
  enabled: boolean;
}

export interface SlotValidationResult {
  isValid: boolean;
  message?: string;
  nearbyHours?: number[];
}

export const DEFAULT_SLEEP_CONFIG: SleepConfig = {
  startHour: 22,
  endHour: 6,
  enabled: true,
};

/**
 * Checks if a specific hour falls into the sleep window.
 * Handles overnight wraps (e.g. 22:00 to 06:00 -> 22, 23, 0, 1, 2, 3, 4, 5).
 */
export function isSleepHour(hour: number, sleep: SleepConfig = DEFAULT_SLEEP_CONFIG): boolean {
  if (!sleep.enabled) return false;
  if (sleep.startHour > sleep.endHour) {
    // Overnight: e.g. 22 to 6 -> hour >= 22 OR hour < 6
    return hour >= sleep.startHour || hour < sleep.endHour;
  }
  return hour >= sleep.startHour && hour < sleep.endHour;
}

export const formatLocalDate = (d: Date): string => {
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};

/**
 * Determines whether an uncompleted task in an hour slot is genuinely missed/overdue.
 * A task is missed/overdue ONLY if:
 * 1. The slot's date and hour have completely passed relative to now, OR
 * 2. The task has a deadline that has already expired.
 */
export function isSlotOverdue(date: Date, hour: number, deadline?: string, now: Date = new Date()): boolean {
  // Check if cell hour has completely passed
  const slotEndTime = new Date(date);
  slotEndTime.setHours(hour + 1, 0, 0, 0);

  if (slotEndTime.getTime() <= now.getTime()) {
    return true;
  }

  // If slot is in the future, it is an upcoming slot.
  // A deadline can only mark a slot overdue if the deadline date matches this cell's date
  // and the deadline time on that date has already passed.
  if (deadline) {
    const deadlineTime = new Date(deadline);
    if (!isNaN(deadlineTime.getTime())) {
      const cellDateStr = formatLocalDate(date);
      const deadlineDateStr = formatLocalDate(deadlineTime);
      if (deadlineDateStr === cellDateStr && deadlineTime.getTime() < now.getTime()) {
        return true;
      }
    }
  }

  return false;
}

/**
 * Calculates the valid scheduling target dates for a task based on the current date/time.
 * Rule:
 * 1. For the current week:
 *    - RECURRING tasks (multiple days selected): ALL selected days are written to the current
 *      week grid, including past days. The user explicitly chose those days for their weekly
 *      schedule — the grid should show them. (Past-day sessions simply won't auto-start.)
 *    - ONE-OFF tasks (single day selected):
 *        - Days before today are skipped.
 *        - Today is only included if the slot hasn't already passed (startMinutes >= nowMinutes).
 *        - If today's slot has already passed, fallback to tomorrow.
 * 2. For the next week (when includeNextWeek = true):
 *    - All selected days are scheduled starting from the beginning of next week (Mon → Sun).
 */
export function getValidScheduleDates(
  selectedDateKeys: string[],
  startMinutes: number,
  now: Date = new Date(),
  includeNextWeek: boolean = true
): { currentWeekDates: string[]; nextWeekDates: string[]; allDates: string[] } {
  const currentDayKey = formatLocalDate(now);
  const nowMinutes = now.getHours() * 60 + now.getMinutes();
  const isRecurring = selectedDateKeys.length > 1;

  const currentWeekDates: string[] = [];
  const nextWeekDates: string[] = [];

  for (const dKey of selectedDateKeys) {
    // 1. Current week evaluation
    if (isRecurring) {
      // For recurring tasks: always include ALL selected days in the current week grid.
      // The user chose these days — show them on the dashboard regardless of time-of-day.
      currentWeekDates.push(dKey);
    } else {
      // One-off task: respect the "don't schedule in the past" rule
      if (dKey > currentDayKey) {
        currentWeekDates.push(dKey);
      } else if (dKey === currentDayKey) {
        if (startMinutes >= nowMinutes) {
          currentWeekDates.push(dKey);
        }
        // If startMinutes < nowMinutes: passed today → fallback below handles tomorrow
      }
      // If dKey < currentDayKey: past day for single task → skip
    }

    // 2. Next week evaluation (always uses the 7-day offset from the selected day)
    if (includeNextWeek) {
      const [y, m, d] = dKey.split("-").map(Number);
      const nextDate = new Date(y, m - 1, d + 7);
      const nextKey = formatLocalDate(nextDate);
      nextWeekDates.push(nextKey);
    }
  }

  // One-off only: if the single selected day's slot has already passed, fallback to tomorrow
  if (!isRecurring && currentWeekDates.length === 0) {
    const tomorrow = new Date(now);
    tomorrow.setDate(now.getDate() + 1);
    const tomorrowKey = formatLocalDate(tomorrow);
    currentWeekDates.push(tomorrowKey);
  }

  const allDates = [...currentWeekDates, ...nextWeekDates];
  return { currentWeekDates, nextWeekDates, allDates };
}


/**
 * Validates whether a task of given duration can be scheduled starting at startHour on dateKey.
 * For >= 60m: requires requiredHours consecutive free cells.
 * For < 60m: checks if target cell has >= durationMinutes free.
 */
export function validateSlot(
  dateKey: string,
  startHour: number,
  durationMinutes: number,
  cellMap: Map<string, HourCellDetail>,
  sleep: SleepConfig = DEFAULT_SLEEP_CONFIG
): SlotValidationResult {
  if (startHour < 0 || startHour > 23) {
    return { isValid: false, message: "Hour must be between 0 and 23." };
  }

  const hoursNeeded = Math.ceil(durationMinutes / 60);

  // Check bounds within the 24-hour day
  if (startHour + hoursNeeded > 24) {
    const nearby = findNearbyAvailableHours(dateKey, startHour, durationMinutes, cellMap, sleep);
    const nearbyStr = nearby.map((h) => `${String(h).padStart(2, "0")}:00`).join(", ");
    return {
      isValid: false,
      message: `Duration extends past midnight.${nearby.length > 0 ? ` Available nearby hours are: ${nearbyStr}.` : ""}`,
      nearbyHours: nearby,
    };
  }

  let occupied = false;
  if (durationMinutes < 60) {
    const cellKey = `${dateKey}_${startHour}`;
    const cell = cellMap.get(cellKey);
    const sleepBlock = isSleepHour(startHour, sleep);
    if (sleepBlock || (cell && cell.remainingFreeMinutes < durationMinutes)) {
      occupied = true;
    }
  } else {
    // Multi-hour task: check each consecutive hour
    for (let h = startHour; h < startHour + hoursNeeded; h++) {
      const cellKey = `${dateKey}_${h}`;
      const cell = cellMap.get(cellKey);
      const sleepBlock = isSleepHour(h, sleep);
      if (sleepBlock || (cell && cell.totalBookedMinutes > 0)) {
        occupied = true;
        break;
      }
    }
  }

  if (occupied) {
    const nearby = findNearbyAvailableHours(dateKey, startHour, durationMinutes, cellMap, sleep);
    const nearbyStr = nearby.length > 0
      ? ` Available nearby hours are: ${nearby.map((h) => `${String(h).padStart(2, "0")}:00`).join(", ")}.`
      : " No alternative hours found today.";
    return {
      isValid: false,
      message: `This time is occupied.${nearbyStr}`,
      nearbyHours: nearby,
    };
  }

  return { isValid: true };
}

/**
 * Searches for nearby available start hours that can fit the task's duration.
 */
export function findNearbyAvailableHours(
  dateKey: string,
  targetHour: number,
  durationMinutes: number,
  cellMap: Map<string, HourCellDetail>,
  sleep: SleepConfig = DEFAULT_SLEEP_CONFIG
): number[] {
  const hoursNeeded = Math.max(1, Math.ceil(durationMinutes / 60));
  const candidates: { hour: number; distance: number }[] = [];

  for (let h = 0; h <= 24 - hoursNeeded; h++) {
    if (h === targetHour) continue;

    let canFit = true;
    if (durationMinutes < 60) {
      const cell = cellMap.get(`${dateKey}_${h}`);
      if (isSleepHour(h, sleep) || (cell && cell.remainingFreeMinutes < durationMinutes)) {
        canFit = false;
      }
    } else {
      for (let span = h; span < h + hoursNeeded; span++) {
        const cell = cellMap.get(`${dateKey}_${span}`);
        if (isSleepHour(span, sleep) || (cell && cell.totalBookedMinutes > 0)) {
          canFit = false;
          break;
        }
      }
    }

    if (canFit) {
      candidates.push({ hour: h, distance: Math.abs(h - targetHour) });
    }
  }

  // Sort by closest distance to requested hour
  candidates.sort((a, b) => a.distance - b.distance);
  return candidates.slice(0, 3).map((c) => c.hour).sort((a, b) => a - b);
}

/**
 * Finds the nearest available slot searching forward from fromHour.
 */
export function findNearestAvailableSlot(
  dateKey: string,
  fromHour: number,
  durationMinutes: number,
  cellMap: Map<string, HourCellDetail>,
  sleep: SleepConfig = DEFAULT_SLEEP_CONFIG
): number | null {
  const hoursNeeded = Math.max(1, Math.ceil(durationMinutes / 60));

  // Search forward from fromHour to 24 - hoursNeeded
  for (let h = fromHour; h <= 24 - hoursNeeded; h++) {
    let canFit = true;
    if (durationMinutes < 60) {
      const cell = cellMap.get(`${dateKey}_${h}`);
      if (isSleepHour(h, sleep) || (cell && cell.remainingFreeMinutes < durationMinutes)) {
        canFit = false;
      }
    } else {
      for (let span = h; span < h + hoursNeeded; span++) {
        const cell = cellMap.get(`${dateKey}_${span}`);
        if (isSleepHour(span, sleep) || (cell && cell.totalBookedMinutes > 0)) {
          canFit = false;
          break;
        }
      }
    }

    if (canFit) {
      return h;
    }
  }

  // Wrap-around search earlier in the day if fromHour was late
  for (let h = 0; h < fromHour && h <= 24 - hoursNeeded; h++) {
    let canFit = true;
    if (durationMinutes < 60) {
      const cell = cellMap.get(`${dateKey}_${h}`);
      if (isSleepHour(h, sleep) || (cell && cell.remainingFreeMinutes < durationMinutes)) {
        canFit = false;
      }
    } else {
      for (let span = h; span < h + hoursNeeded; span++) {
        const cell = cellMap.get(`${dateKey}_${span}`);
        if (isSleepHour(span, sleep) || (cell && cell.totalBookedMinutes > 0)) {
          canFit = false;
          break;
        }
      }
    }

    if (canFit) {
      return h;
    }
  }

  return null;
}

/**
 * Builds the complete 7x24 weekly hour matrix.
 */
export function buildWeeklyHourGrid(
  days: Date[],
  scheduledItemsByDay: Record<string, ScheduledItem[]>,
  sleep: SleepConfig = DEFAULT_SLEEP_CONFIG,
  now: Date = new Date()
): Map<string, HourCellDetail> {
  const cellMap = new Map<string, HourCellDetail>();

  // 1. Initialize all 7x24 cells as empty or sleep
  for (const date of days) {
    const dateKey = formatLocalDate(date);
    const dayLabel = date.toLocaleDateString("en-US", { weekday: "short" });

    for (let hour = 0; hour < 24; hour++) {
      const cellKey = `${dateKey}_${hour}`;
      const isSleep = isSleepHour(hour, sleep);
      const timeRangeLabel = `${String(hour).padStart(2, "0")}:00 – ${String((hour + 1) % 24).padStart(2, "0")}:00`;

      if (isSleep) {
        cellMap.set(cellKey, {
          date,
          dateKey,
          dayLabel,
          hour,
          timeRangeLabel,
          items: [{
            id: `sleep_${cellKey}`,
            title: "Sleep (Circadian Rest)",
            durationMinutes: 60,
            startHour: hour,
            status: "completed",
            isSleep: true,
            color: "#312E81",
          }],
          totalBookedMinutes: 60,
          remainingFreeMinutes: 0,
          status: "sleep",
          tone: "bg-[#EEF2FF] border border-[#C7D2FE]/60",
          label: `Sleep (${timeRangeLabel})`,
        });
      } else {
        cellMap.set(cellKey, {
          date,
          dateKey,
          dayLabel,
          hour,
          timeRangeLabel,
          items: [],
          totalBookedMinutes: 0,
          remainingFreeMinutes: 60,
          status: "empty",
          tone: "bg-[#F1F1F1]",
          label: `Empty (${timeRangeLabel})`,
        });
      }
    }
  }

  // 2. Distribute scheduled items into the grid
  for (const date of days) {
    const dateKey = formatLocalDate(date);
    const rawItems = scheduledItemsByDay[dateKey] || [];

    for (const item of rawItems) {
      if (item.isSleep) continue;

      const duration = Math.max(5, item.durationMinutes || 30);
      const startH = Math.max(0, Math.min(23, item.startHour ?? 9));

      if (duration >= 60) {
        // Multi-hour task: spans multiple consecutive 60m blocks
        const hoursToSpan = Math.ceil(duration / 60);
        let remainingMinutes = duration;

        for (let span = 0; span < hoursToSpan && startH + span < 24; span++) {
          const targetHour = startH + span;
          const cellKey = `${dateKey}_${targetHour}`;
          const cell = cellMap.get(cellKey);
          if (!cell || cell.status === "sleep") continue;

          const minutesForThisHour = Math.min(60, remainingMinutes);
          remainingMinutes -= minutesForThisHour;

          cell.items.push({
            ...item,
            durationMinutes: minutesForThisHour,
            startHour: targetHour,
          });
          cell.totalBookedMinutes = Math.min(60, cell.totalBookedMinutes + minutesForThisHour);
          cell.remainingFreeMinutes = Math.max(0, 60 - cell.totalBookedMinutes);
        }
      } else {
        // Sub-hour task (< 60 min): combine into target hour if capacity permits
        const cellKey = `${dateKey}_${startH}`;
        const cell = cellMap.get(cellKey);
        if (cell && cell.status !== "sleep") {
          const minutesToAdd = Math.min(duration, cell.remainingFreeMinutes);
          if (minutesToAdd > 0) {
            cell.items.push({
              ...item,
              durationMinutes: minutesToAdd,
              startHour: startH,
            });
            cell.totalBookedMinutes = Math.min(60, cell.totalBookedMinutes + minutesToAdd);
            cell.remainingFreeMinutes = Math.max(0, 60 - cell.totalBookedMinutes);
          }
        }
      }
    }
  }

  // 3. Compute final cell tone, status, and summary labels
  for (const cell of cellMap.values()) {
    if (cell.status === "sleep") continue;

    if (cell.items.length === 0) {
      cell.status = "empty";
      cell.tone = "bg-[#F1F1F1]";
      cell.label = `Empty (${cell.timeRangeLabel}) · 60m free`;
      continue;
    }

    // Check completion and overdue states across all items in this cell
    const allCompleted = cell.items.every((it) => it.status === "completed");
    const anyMissed = cell.items.some((it) => {
      if (it.status === "completed") return false;
      return isSlotOverdue(cell.date, cell.hour, it.deadline, now);
    });

    if (allCompleted) {
      cell.status = "completed";
      cell.tone = "bg-[#BFE8C8]"; // Clean light green
    } else if (anyMissed) {
      cell.status = "missed";
      cell.tone = "bg-[#F4B8B8]"; // Clean soft red ONLY for genuine overdue/missed
    } else {
      // Scheduled / upcoming task: MUST remain grey/neutral by default!
      cell.status = "scheduled";
      cell.tone = "bg-[#E2E8F0] border border-[#CBD5E1]"; // Professional distinct grey for scheduled
    }

    const itemsSummary = cell.items
      .map((it) => `${it.title} (${it.durationMinutes}m)`)
      .join(", ");
    const freeText = cell.remainingFreeMinutes > 0 ? ` · ${cell.remainingFreeMinutes}m free` : "";
    cell.label = `${itemsSummary} [${cell.status.toUpperCase()}]${freeText}`;
  }

  return cellMap;
}

// ─── Free Slot Finding & Range Calculation ───────────────────────────────────

export interface FreeSlotResult {
  startMinutes: number;
  endMinutes: number;
  startTime24: string;   // "10:00"
  endTime24: string;     // "10:30"
  startTime12: string;   // "10:00 AM"
  endTime12: string;     // "10:30 AM"
  formattedRange: string;// "10:00 AM - 10:30 AM"
}

export function formatMinutesTo12Hour(totalMinutes: number): string {
  const norm = ((totalMinutes % 1440) + 1440) % 1440;
  const hours = Math.floor(norm / 60);
  const minutes = norm % 60;
  const ampm = hours >= 12 ? "PM" : "AM";
  const h12 = hours % 12 === 0 ? 12 : hours % 12;
  return `${String(h12).padStart(2, "0")}:${String(minutes).padStart(2, "0")} ${ampm}`;
}

export function formatMinutesTo24Hour(totalMinutes: number): string {
  const norm = ((totalMinutes % 1440) + 1440) % 1440;
  const hours = Math.floor(norm / 60);
  const minutes = norm % 60;
  return `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}`;
}

export function parseTimeToMinutes(timeStr?: string | null): number {
  if (!timeStr || !timeStr.includes(":")) return 0;
  const parts = timeStr.trim().split(":");
  const h = parseInt(parts[0], 10);
  const m = parseInt(parts[1], 10);
  return (isNaN(h) ? 0 : h) * 60 + (isNaN(m) ? 0 : m);
}

export interface TimeInterval {
  start: number; // in minutes from midnight (0..1440)
  end: number;
  title?: string;
}

/**
 * Extracts occupied intervals from existing tasks and sleep configuration.
 */
export function getOccupiedIntervalsFromTasks(
  tasks: Array<{
    id?: string;
    title?: string;
    estimatedMinutes?: number;
    deadline?: string;
    startTime?: string;
    endTime?: string;
  }> = [],
  dateStr?: string,
  sleepConfig: SleepConfig = DEFAULT_SLEEP_CONFIG
): TimeInterval[] {
  const intervals: TimeInterval[] = [];

  // 1. Add sleep intervals
  if (sleepConfig.enabled) {
    if (sleepConfig.startHour > sleepConfig.endHour) {
      intervals.push({ start: sleepConfig.startHour * 60, end: 1440, title: "Sleep" });
      intervals.push({ start: 0, end: sleepConfig.endHour * 60, title: "Sleep" });
    } else {
      intervals.push({ start: sleepConfig.startHour * 60, end: sleepConfig.endHour * 60, title: "Sleep" });
    }
  }

  const targetDateStr = dateStr || formatLocalDate(new Date());

  // 2. Add task intervals
  for (const t of tasks) {
    const duration = Math.max(5, t.estimatedMinutes || 30);

    // Explicit startTime
    if (t.startTime && typeof t.startTime === "string" && t.startTime.includes(":")) {
      const startM = parseTimeToMinutes(t.startTime);
      const endM = t.endTime ? parseTimeToMinutes(t.endTime) : startM + duration;
      intervals.push({ start: startM, end: endM, title: t.title });
      continue;
    }

    // Deadline matching target date
    if (t.deadline && typeof t.deadline === "string" && t.deadline.slice(0, 10) === targetDateStr) {
      if (t.deadline.includes("T")) {
        const d = new Date(t.deadline);
        const deadlineM = d.getHours() * 60 + d.getMinutes();
        const startM = Math.max(0, deadlineM - duration);
        intervals.push({ start: startM, end: deadlineM, title: t.title });
      }
    }
  }

  intervals.sort((a, b) => a.start - b.start);
  return intervals;
}

/**
 * Checks if interval [startM, endM] conflicts with any occupied interval.
 */
export function checkIntervalConflict(
  startM: number,
  endM: number,
  occupied: TimeInterval[]
): boolean {
  for (const occ of occupied) {
    if (startM < occ.end && endM > occ.start) {
      return true;
    }
  }
  return false;
}

/**
 * Finds the nearest available free time slot big enough to fit durationMinutes.
 * Searches forward starting from preferredStartMinutes (if provided) or from current time.
 */
export function findNearestFreeSlot(
  durationMinutes: number,
  existingTasks: any[] = [],
  preferredStartMinutes?: number | null,
  referenceDate: Date = new Date(),
  sleepConfig: SleepConfig = DEFAULT_SLEEP_CONFIG
): FreeSlotResult {
  const duration = Math.max(5, durationMinutes || 30);
  const dateStr = formatLocalDate(referenceDate);
  const occupied = getOccupiedIntervalsFromTasks(existingTasks, dateStr, sleepConfig);

  let searchStart = 9 * 60; // 09:00 AM

  if (preferredStartMinutes !== undefined && preferredStartMinutes !== null && !isNaN(preferredStartMinutes)) {
    searchStart = preferredStartMinutes;
  } else {
    // Current time rounded up to next 15 minutes
    const currentM = referenceDate.getHours() * 60 + referenceDate.getMinutes();
    const roundedM = Math.ceil(currentM / 15) * 15;
    searchStart = Math.max(9 * 60, roundedM);
  }

  const step = 15;
  const maxMinute = (sleepConfig.enabled ? sleepConfig.startHour : 24) * 60;

  // Search forward
  for (let m = searchStart; m + duration <= maxMinute; m += step) {
    if (!checkIntervalConflict(m, m + duration, occupied)) {
      return buildSlotResult(m, m + duration);
    }
  }

  // Wrap around earlier in the day
  for (let m = 9 * 60; m + duration <= searchStart; m += step) {
    if (!checkIntervalConflict(m, m + duration, occupied)) {
      return buildSlotResult(m, m + duration);
    }
  }

  // Best effort fallback
  return buildSlotResult(9 * 60, 9 * 60 + duration);
}

function buildSlotResult(startMinutes: number, endMinutes: number): FreeSlotResult {
  const s24 = formatMinutesTo24Hour(startMinutes);
  const e24 = formatMinutesTo24Hour(endMinutes);
  const s12 = formatMinutesTo12Hour(startMinutes);
  const e12 = formatMinutesTo12Hour(endMinutes);
  return {
    startMinutes,
    endMinutes,
    startTime24: s24,
    endTime24: e24,
    startTime12: s12,
    endTime12: e12,
    formattedRange: `${s12} - ${e12}`,
  };
}
