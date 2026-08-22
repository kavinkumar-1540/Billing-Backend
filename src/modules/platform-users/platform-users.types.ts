export interface PlatformUserListItem {
  companyMemberId: string;
  userId: string;
  name: string;
  email: string;
  roleId: string;
  roleName: string;
  companyId: string;
  companyName: string;
  isActive: boolean;
  lastLoginAt?: Date;
}
