import { z } from "zod";

export const addUserSchema = z.object({
  name: z.string().min(2, "Name is required"),
  username: z.string().optional(),
  email: z.email("Invalid email"),
  password: z.string().min(8, "Password must be at least 8 characters"),
  
  phone: z
    .string()
    .regex(/^01\d{9}$/, "Invalid phone number")
    .or(z.literal("")),
  alt_phone: z
    .string()
    .regex(/^01\d{9}$/, "Invalid phone number")
    .optional()
    .or(z.literal("")),
  whatsapp: z
    .string()
    .regex(/^01\d{9}$/, "Invalid phone number")
    .optional()
    .or(z.literal("")),
  role: z.enum(["admin", "staff"]),
  status: z.enum(["active", "inactive", "banned"]).optional().or(z.literal("active")),
  gender: z.enum(['male','female','other']).optional().or(z.literal("male")),
  birthday: z.string().optional(),
  division: z.string().optional().or(z.literal("")),
  district: z.string().optional().or(z.literal("")),
  city: z.string().optional().or(z.literal("")),
  area: z.string().optional().or(z.literal("")),
  post_code: z.string().optional().or(z.literal("")),
  road: z.string().optional().or(z.literal("")),
  house: z.string().optional().or(z.literal("")),
});
