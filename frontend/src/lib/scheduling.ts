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

  // Check deadline
  if (deadline) {
    const deadlineTime = new Date(deadline);
    if (!isNaN(deadlineTime.getTime()) && deadlineTime.getTime() < now.getTime()) {
      return true;
    }
  }

  return false;
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
