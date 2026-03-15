import { z } from "zod";

export const registerSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters").max(100),
  email: z.string().email("Invalid email address"),
  password: z.string().min(8, "Password must be at least 8 characters"),
});

export const loginSchema = z.object({
  email: z.string().email("Invalid email address"),
  password: z.string().min(1, "Password is required"),
});

export const workboardSchema = z.object({
  name: z.string().min(1, "Name is required").max(100),
  key: z
    .string()
    .min(2, "Key must be 2–5 uppercase letters")
    .max(5, "Key must be 2–5 uppercase letters")
    .regex(/^[A-Z]+$/, "Key must be uppercase letters only"),
  description: z.string().optional().default(""),
});

export const taskSchema = z.object({
  title: z.string().min(1, "Title is required").max(255),
  description: z.string().optional().default(""),
  jiraUrl: z.string().url("Invalid URL").optional().or(z.literal("")).default(""),
  priority: z.number().int().min(0).max(3).default(1),
  status: z.number().int().min(0).max(4).default(1),
  dueDate: z.string().nullable().optional(),
  workboardId: z.string().min(1, "Workboard is required"),
  parentId: z.string().nullable().optional(),
});

export const subtaskSchema = z.object({
  title: z.string().min(1, "Title is required").max(255),
});

export const convertTaskSchema = z.object({
  type: z.enum(["to-subtask", "to-standalone"]),
  parentId: z.string().optional(),
});

export const reorderSubtasksSchema = z.object({
  subtaskIds: z.array(z.string()).min(1),
});

export const userPreferencesSchema = z.object({
  showSubtasks: z.boolean().optional(),
  theme: z.enum(["dark", "light"]).optional(),
  accentColor: z.enum(["blue", "indigo", "purple", "teal", "orange", "rose"]).optional(),
});

export const updateUserSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters").max(100).optional(),
  email: z.string().email("Invalid email address").optional(),
  currentPassword: z.string().optional(),
  newPassword: z.string().min(8, "Password must be at least 8 characters").optional(),
});

export type RegisterInput = z.input<typeof registerSchema>;
export type LoginInput = z.input<typeof loginSchema>;
export type WorkboardInput = z.output<typeof workboardSchema>;
export type TaskInput = z.output<typeof taskSchema>;
export type SubtaskInput = z.output<typeof subtaskSchema>;
export type ConvertTaskInput = z.output<typeof convertTaskSchema>;
export type ReorderSubtasksInput = z.output<typeof reorderSubtasksSchema>;
export type UserPreferencesInput = z.output<typeof userPreferencesSchema>;
export type UpdateUserInput = z.input<typeof updateUserSchema>;

export const commentSchema = z.object({
  content: z.string().min(1, "Comment cannot be empty").max(10000, "Comment is too long"),
});

export type CommentInput = z.output<typeof commentSchema>;

// ── Jira sync ─────────────────────────────────────────────────

export const jiraSyncSchema = z.object({
  workboardId: z.string().min(1),
  issueIds: z.array(z.string()).min(1).max(100),
});

export type JiraSyncInput = z.output<typeof jiraSyncSchema>;

// ── Upload constants ──────────────────────────────────────────
export const UPLOAD_MAX_SIZE = 10 * 1024 * 1024; // 10MB

export const UPLOAD_ALLOWED_TYPES = [
  "image/jpeg",
  "image/png",
  "image/gif",
  "image/webp",
  "image/svg+xml",
  "application/pdf",
  "text/plain",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
] as const;
