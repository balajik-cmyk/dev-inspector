import type { BoundingBox } from "../../core/types";

export type DevInspectorFirebaseConfig = {
  apiKey: string;
  authDomain: string;
  projectId: string;
  appId: string;
  storageBucket?: string;
  messagingSenderId?: string;
};

export type CommentPinData = {
  elementPath: string;
  selectorHint: string;
  boundingBox: BoundingBox;
};

export type CommentAuthor = {
  uid: string;
  email: string;
};

export type CommentReply = {
  id: string;
  body: string;
  author: CommentAuthor;
  createdAt: number;
  editedAt?: number;
};

export type CommentReaction = {
  uid: string;
  emoji: string;
};

export type Comment = {
  id: string;
  pageId: string;
  body: string;
  author: CommentAuthor;
  createdAt: number;
  editedAt?: number;
  resolved: boolean;
  pin: CommentPinData | null;
  replyCount: number;
  replies: CommentReply[];
  reactions: CommentReaction[];
};

export type CommentAuthUser = {
  uid: string;
  email: string;
};

export const MAX_REPLIES_PER_COMMENT = 10;
export const MAX_COMMENT_LENGTH = 2000;
export const MAX_REPLY_LENGTH = 1000;
export const DEFAULT_ALLOWED_EMAIL_DOMAIN = "birdeye.com";
export const DEFAULT_FUNCTIONS_REGION = "us-central1";
export const DEFAULT_HIDE_SHORTCUT = "Shift+C";
/** Dev / emulator only — accepted when `commentsMockOtp` is true. */
export const DEFAULT_MOCK_OTP = "000000";

export const REACTION_EMOJIS = ["👍", "❤️", "🎉", "👀", "🚀"] as const;
