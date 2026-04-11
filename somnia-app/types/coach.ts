/** A single message in the AI coach conversation. */
export interface CoachMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: number;
}

/** Coach session metadata. */
export interface CoachSession {
  id: string;
  date: string;
  messages: CoachMessage[];
  module: string;
}
