export interface UserProfile {
  id: string;
  username: string;
  role: 'admin' | 'member' | 'guest';
}

export type UserId = string;
