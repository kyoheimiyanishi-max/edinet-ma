import { readFileSync, writeFileSync, existsSync, mkdirSync } from "fs";
import { join } from "path";

// ---- Types ----

export interface MeetingMinute {
  id: string;
  title: string;
  date: string;
  participants: string[];
  projectId: string;
  projectName: string;
  content: string;
  decisions: string[];
  actionItems: ActionItem[];
  createdAt: string;
  updatedAt: string;
}

export interface ActionItem {
  task: string;
  assignee: string;
  deadline: string;
  status: "未着手" | "進行中" | "完了";
}

export type MeetingMinuteInput = Omit<
  MeetingMinute,
  "id" | "createdAt" | "updatedAt"
>;

export const ACTION_STATUSES = ["未着手", "進行中", "完了"] as const;

// ---- Storage ----

const DATA_DIR = join(process.cwd(), "data");
const DATA_FILE = join(DATA_DIR, "minutes.json");

function ensureDataFile(): void {
  if (!existsSync(DATA_DIR)) mkdirSync(DATA_DIR, { recursive: true });
  if (!existsSync(DATA_FILE)) writeFileSync(DATA_FILE, "[]", "utf-8");
}

function readAll(): MeetingMinute[] {
  ensureDataFile();
  return JSON.parse(readFileSync(DATA_FILE, "utf-8")) as MeetingMinute[];
}

function writeAll(minutes: MeetingMinute[]): void {
  ensureDataFile();
  writeFileSync(DATA_FILE, JSON.stringify(minutes, null, 2), "utf-8");
}

// ---- CRUD ----

export function getAllMinutes(): MeetingMinute[] {
  return readAll();
}

export function getMinute(id: string): MeetingMinute | undefined {
  return readAll().find((m) => m.id === id);
}

export function createMinute(input: MeetingMinuteInput): MeetingMinute {
  const minutes = readAll();
  const minute: MeetingMinute = {
    ...input,
    id: crypto.randomUUID(),
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
  minutes.push(minute);
  writeAll(minutes);
  return minute;
}

export function updateMinute(
  id: string,
  input: Partial<MeetingMinuteInput>,
): MeetingMinute | null {
  const minutes = readAll();
  const idx = minutes.findIndex((m) => m.id === id);
  if (idx === -1) return null;
  minutes[idx] = {
    ...minutes[idx],
    ...input,
    updatedAt: new Date().toISOString(),
  };
  writeAll(minutes);
  return minutes[idx];
}

export function deleteMinute(id: string): boolean {
  const minutes = readAll();
  const filtered = minutes.filter((m) => m.id !== id);
  if (filtered.length === minutes.length) return false;
  writeAll(filtered);
  return true;
}

// ---- Search ----

export function searchMinutes(query?: string): MeetingMinute[] {
  const all = readAll();
  if (!query) return all;
  const q = query.toLowerCase();
  return all.filter(
    (m) =>
      m.title.toLowerCase().includes(q) ||
      m.content.toLowerCase().includes(q) ||
      m.projectName.toLowerCase().includes(q) ||
      m.participants.some((p) => p.toLowerCase().includes(q)) ||
      m.decisions.some((d) => d.toLowerCase().includes(q)) ||
      m.actionItems.some(
        (a) =>
          a.task.toLowerCase().includes(q) ||
          a.assignee.toLowerCase().includes(q),
      ),
  );
}

// ---- Queries ----

export function getMinutesByProject(projectId: string): MeetingMinute[] {
  return readAll().filter((m) => m.projectId === projectId);
}

export function getMinutesByParticipant(name: string): MeetingMinute[] {
  const q = name.toLowerCase();
  return readAll().filter((m) =>
    m.participants.some((p) => p.toLowerCase().includes(q)),
  );
}
