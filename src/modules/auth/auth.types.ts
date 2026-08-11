export interface AccessTokenPayload {
  sub: string; // userId
  type: 'access';
}

export interface RefreshTokenPayload {
  sub: string; // userId
  type: 'refresh';
}

export interface AuthenticatedUser {
  userId: string;
  email: string;
  name: string;
}

export interface RequestCompanyContext {
  companyId: string;
  roleId: string;
  roleName: string;
  permissions: string[];
}
