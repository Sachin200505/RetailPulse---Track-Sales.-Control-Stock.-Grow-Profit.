import { api } from '@/lib/api';

export type UserRole = 'owner' | 'admin' | 'staff' | 'cashier';

export interface AppUser {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  isActive: boolean;
  createdAt: string;
}

const mapUser = (u: any): AppUser => ({
  id: u._id || u.id,
  name: u.name,
  email: u.email,
  role: u.role as UserRole,
  isActive: u.isActive ?? true,
  createdAt: u.createdAt || u.created_at,
});

export const userService = {
  async getUsers(): Promise<AppUser[]> {
    const data = await api.get<any[]>('/api/admin/users');
    return (data || []).map(mapUser);
  },

  async createUser(payload: { name: string; email: string; password: string; role: UserRole }): Promise<AppUser> {
    const data = await api.post<any>('/api/admin/users', payload);
    return mapUser(data);
  },

  async updateRole(userId: string, role: UserRole): Promise<AppUser> {
    const data = await api.patch<any>(`/api/admin/users/${userId}/role`, { role });
    return mapUser(data);
  },

  async toggleStatus(userId: string): Promise<AppUser> {
    const data = await api.patch<any>(`/api/admin/users/${userId}/status`, {});
    return mapUser(data);
  },

  async resetPassword(userId: string, password: string): Promise<void> {
    await api.patch(`/api/admin/users/${userId}/password`, { password });
  },

  async updateUser(userId: string, payload: { name?: string; email?: string }): Promise<AppUser> {
    const data = await api.patch<any>(`/api/admin/users/${userId}`, payload);
    return mapUser(data);
  },

  async deleteUser(userId: string): Promise<void> {
    await api.del(`/api/admin/users/${userId}`);
  },
};
