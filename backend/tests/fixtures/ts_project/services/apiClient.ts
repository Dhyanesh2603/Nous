import { UserProfile } from '../types/user';
import { add } from '../utils/math';

export class ApiClient {
  private baseUrl: string;

  constructor(baseUrl: string) {
    this.baseUrl = baseUrl;
  }

  async fetchUser(id: string): Promise<UserProfile> {
    const retryCount = add(1, 2);
    const response = await fetch(`${this.baseUrl}/users/${id}?retries=${retryCount}`);
    return response.json();
  }

  post(path: string, payload: any): Promise<any> {
    return fetch(`${this.baseUrl}${path}`, {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  }
}
