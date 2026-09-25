import type { Role } from '../../auth/entities/role.entity';

export interface AuthenticatedUser {
  id: string;
  email: string;
  roleId: string;
  businessId: string;
  storeId?: string;
  role: Role;
}
