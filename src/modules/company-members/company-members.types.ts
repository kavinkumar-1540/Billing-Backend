export interface CompanyUserListItem {
  companyMemberId: string;
  userId: string;
  name: string;
  email: string;
  roleId: string;
  roleName: string;
  isActive: boolean;
  lastLoginAt?: Date;
}
