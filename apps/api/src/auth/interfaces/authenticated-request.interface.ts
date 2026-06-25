import { Request } from 'express';

export interface AuthenticatedUser {
  userId: number; // или id, зависи како ти е во токенот
  email: string;
  role: string;
  companyId: number;
}

export interface AuthenticatedRequest extends Request {
  user: AuthenticatedUser;
}
