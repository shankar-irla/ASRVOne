import { z } from "zod";

export const emailSchema = z.string().trim().toLowerCase().email().max(254);
export const passwordSchema = z.string().min(12).max(128).regex(/[A-Z]/, "Include one uppercase letter.").regex(/[a-z]/, "Include one lowercase letter.").regex(/[0-9]/, "Include one number.");

export const registrationSchema = z.object({
  name: z.string().trim().min(2).max(140),
  email: emailSchema,
  phone: z.string().trim().max(40).optional().default(""),
  college: z.string().trim().max(180).optional().default(""),
  year: z.string().trim().max(40).optional().default(""),
  branch: z.string().trim().max(120).optional().default(""),
  skills: z.string().trim().max(1000).optional().default(""),
  experience: z.string().trim().max(1000).optional().default(""),
  program: z.string().trim().max(180).default("Java + DSA Placement Batch — One to LeetCode"),
  batch: z.string().trim().max(180).optional().default("Next available batch"),
  message: z.string().trim().max(4000).optional().default(""),
  website: z.string().max(0).optional().default(""),
});

export const loginSchema = z.object({ email: emailSchema, password: z.string().min(1).max(128) });
export const registerAccountSchema = z.object({
  email: emailSchema,
  password: passwordSchema,
  displayName: z.string().trim().min(2).max(140),
  college: z.string().trim().max(180).optional(),
});
