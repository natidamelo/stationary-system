export class UserPayload {
  id!: string;
  email!: string;
  fullName!: string;
  department?: string;
  role?: { id?: string; name: string };
  isActive?: boolean;
  tenantId!: string;
}
