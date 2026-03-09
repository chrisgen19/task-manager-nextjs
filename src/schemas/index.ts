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

export const taskSchema = z.object({
  title: z.string().min(1, "Title is required").max(255),
  description: z.string().optional().default(""),
  jiraUrl: z.string().url("Invalid URL").optional().or(z.literal("")).default(""),
  priority: z.number().int().min(0).max(3).default(1),
  status: z.number().int().min(0).max(4).default(1),
  dueDate: z.string().nullable().optional(),
});

export const updateUserSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters").max(100).optional(),
  email: z.string().email("Invalid email address").optional(),
  currentPassword: z.string().optional(),
  newPassword: z.string().min(8, "Password must be at least 8 characters").optional(),
});

export type RegisterInput = z.input<typeof registerSchema>;
export type LoginInput = z.input<typeof loginSchema>;
export type TaskInput = z.output<typeof taskSchema>;
export type UpdateUserInput = z.input<typeof updateUserSchema>;
