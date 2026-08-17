import { ApiClient } from './services/apiClient';
import { UserProfile } from './types/user';

export function startApp(): void {
  const client = new ApiClient('https://api.nous.ai');
  const user: UserProfile = { id: 'usr_1', username: 'alex', role: 'admin' };
  client.fetchUser(user.id);
}
