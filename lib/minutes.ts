// ---- Types ----
//
// d6e is the source of truth for meeting minutes data — see
// `lib/d6e/repos/minutes.ts` for read/write operations. The exports
// below only provide the type system used by the repo and route handlers.

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
