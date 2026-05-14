import collectors from "@/data/collectors.json";

export type Attachment = {
  name: string;
  type: string; // MIME
  kind: "image" | "audio" | "file";
  dataUrl: string;
};

export type Message = {
  id: string;
  fromEmployeeId: string;
  fromName: string;
  toEmployeeId: string;
  toName: string;
  body: string;
  attachments: Attachment[];
  createdAt: string;
  read?: boolean;
};

export const MESSAGES_KEY = "wallet:messages:v1";
export const GROUP_KEY = "wallet:group:members"; // string[] employeeIds
export const COLLECTORS_EXTRA_KEY = "wallet:collectors:extra";

export type Collector = { supervisor: string; collector: string; employeeId: string };

export function getAllCollectors(): Collector[] {
  const base = collectors as Collector[];
  let extra: Collector[] = [];
  try {
    extra = JSON.parse(localStorage.getItem(COLLECTORS_EXTRA_KEY) || "[]");
  } catch {}
  const map = new Map<string, Collector>();
  [...base, ...extra].forEach((c) => map.set(c.employeeId, c));
  return Array.from(map.values());
}

export function readMessages(): Message[] {
  try {
    return JSON.parse(localStorage.getItem(MESSAGES_KEY) || "[]");
  } catch {
    return [];
  }
}
export function writeMessages(arr: Message[]) {
  localStorage.setItem(MESSAGES_KEY, JSON.stringify(arr));
}
export function addMessage(m: Message) {
  const all = readMessages();
  all.unshift(m);
  writeMessages(all);
}

export function getGroupMembers(): string[] {
  try {
    return JSON.parse(localStorage.getItem(GROUP_KEY) || "[]");
  } catch {
    return [];
  }
}
export function setGroupMembers(ids: string[]) {
  localStorage.setItem(GROUP_KEY, JSON.stringify(ids));
}
export function isInGroup(employeeId?: string) {
  if (!employeeId) return false;
  return getGroupMembers().includes(employeeId);
}
