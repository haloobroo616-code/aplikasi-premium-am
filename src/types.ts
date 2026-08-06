export type UserRole = 'Member' | 'Admin' | 'VVIP' | 'Premium';

export interface User {
  id: string;
  username: string;
  role: UserRole;
  limit: number;
  todayCount: number;
  lastReset: string; // ISO String
  points: number;
  referralCount: number;
  joinedAt: string;
}

export interface AuthResponse {
  user?: User;
  error?: string;
  token?: string;
}
