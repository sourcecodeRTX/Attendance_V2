import { z } from "zod";

export const loginSchema = z.object({
  email: z.string().email("Invalid email address"),
  password: z.string().min(1, "Password is required"),
  rememberMe: z.boolean().optional(),
});

export type LoginInput = z.infer<typeof loginSchema>;

export const registerSchema = z
  .object({
    email: z.string().email("Invalid email address"),
    password: z
      .string()
      .min(8, "Password must be at least 8 characters")
      .regex(/[A-Z]/, "Password must contain at least one uppercase letter")
      .regex(/[0-9]/, "Password must contain at least one number"),
    confirmPassword: z.string(),
    displayName: z.string().min(2, "Name must be at least 2 characters"),
    className: z.string().min(1, "Class name is required"),
    section: z.string().min(1, "Section is required"),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Passwords do not match",
    path: ["confirmPassword"],
  });

export type RegisterInput = z.infer<typeof registerSchema>;

export const forgotPasswordSchema = z.object({
  email: z.string().email("Invalid email address"),
});

export type ForgotPasswordInput = z.infer<typeof forgotPasswordSchema>;

export const studentSchema = z.object({
  roll: z.coerce.number().int().positive("Roll number must be positive"),
  name: z.string().min(1, "Name is required").max(100, "Name is too long"),
  section: z.string().optional(),
  department: z.string().optional(),
});

export type StudentInput = z.infer<typeof studentSchema>;

export const subjectSchema = z.object({
  name: z.string().min(1, "Subject name is required").max(100, "Name is too long"),
  code: z.string().max(20, "Code is too long").optional(),
  teacherName: z.string().max(100, "Teacher name is too long").optional(),
});

export type SubjectInput = z.infer<typeof subjectSchema>;

export const cloudCodeSchema = z
  .string()
  .length(8, "Code must be 8 characters")
  .regex(/^[A-Za-z0-9]+$/, "Code must contain only letters and numbers");

export const profileSchema = z.object({
  displayName: z.string().min(2, "Name must be at least 2 characters"),
  className: z.string().min(1, "Class name is required"),
  section: z.string().min(1, "Section is required"),
});

export type ProfileInput = z.infer<typeof profileSchema>;

export const changePasswordSchema = z
  .object({
    currentPassword: z.string().min(1, "Current password is required"),
    newPassword: z
      .string()
      .min(8, "Password must be at least 8 characters")
      .regex(/[A-Z]/, "Password must contain at least one uppercase letter")
      .regex(/[0-9]/, "Password must contain at least one number"),
    confirmNewPassword: z.string(),
  })
  .refine((data) => data.newPassword === data.confirmNewPassword, {
    message: "Passwords do not match",
    path: ["confirmNewPassword"],
  });

export type ChangePasswordInput = z.infer<typeof changePasswordSchema>;
