import { z } from "zod";

export const registerSchema = z
  .object({
    email: z.string().email("Adj meg érvényes e-mail címet"),
    password: z
      .string()
      .min(8, "A jelszó legalább 8 karakter legyen")
      .regex(/[A-Z]/, "Tartalmazzon nagybetűt")
      .regex(/[a-z]/, "Tartalmazzon kisbetűt")
      .regex(/\d/, "Tartalmazzon számot"),
    confirmPassword: z.string(),
    birthday: z.string(),
    role: z.enum(["student", "teacher"]),
    fullName: z
      .string()
      .min(2, "Adj meg legalább 2 karaktert")
      .max(60, "Maximum 60 karakter"),
    teacherBio: z
      .string()
      .max(400, "Legfeljebb 400 karakter")
      .optional()
      .or(z.literal("")),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "A jelszavak nem egyeznek",
    path: ["confirmPassword"],
  });

export const loginSchema = z.object({
  email: z.string().email("Adj meg érvényes e-mail címet"),
  password: z.string().min(1, "A jelszó megadása kötelező"),
});

export const inviteAcceptSchema = z.object({
  email: z.string().email().optional(),
  temporaryPassword: z.string().min(6, "Érvényes ideiglenes jelszó szükséges"),
  newPassword: z
    .string()
    .min(8, "Legalább 8 karakter"),
  confirmPassword: z.string(),
});

export type RegisterInput = z.infer<typeof registerSchema>;
export type LoginInput = z.infer<typeof loginSchema>;
export type InviteAcceptInput = z.infer<typeof inviteAcceptSchema>;

interface MockUser {
  email: string;
  password: string;
  role: RegisterInput["role"];
  fullName: string;
}

export const mockUsers: MockUser[] = [
  {
    email: "student.demo@wordnest.hu",
    password: "Wordnest123!",
    role: "student",
    fullName: "Demó Diák",
  },
  {
    email: "teacher.demo@wordnest.hu",
    password: "Wordnest123!",
    role: "teacher",
    fullName: "Demó Tanár",
  },
];

export async function mockRegisterUser(payload: RegisterInput) {
  console.info("Mock register", payload);
  await delay(800);
  return {
    userId: "mock-user-id",
    role: payload.role,
  };
}

export async function mockLogin(payload: LoginInput) {
  console.info("Mock login", payload);
  await delay(500);

  const normalizedEmail = payload.email.trim().toLowerCase();
  const matchingUser = mockUsers.find((user) => user.email === normalizedEmail);

  if (matchingUser) {
    if (payload.password !== matchingUser.password) {
      throw new Error("Érvénytelen jelszó a demó felhasználóhoz.");
    }

    return {
      accessToken: `${matchingUser.role}-mock-token`,
      role: matchingUser.role,
      fullName: matchingUser.fullName,
      email: matchingUser.email,
    } as const;
  }

  return {
    accessToken: "mock-token",
    role: "student",
  } as const;
}

export async function mockAcceptInvite(payload: InviteAcceptInput) {
  console.info("Mock accept invite", payload);
  await delay(700);
  return { success: true } as const;
}

function delay(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
