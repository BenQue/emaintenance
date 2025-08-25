export enum UserRole {
  EMPLOYEE = 'EMPLOYEE',
  TECHNICIAN = 'TECHNICIAN', 
  SUPERVISOR = 'SUPERVISOR',
  ADMIN = 'ADMIN',
}

export interface User {
  id: string;
  email: string;
  username: string;
  firstName: string;
  lastName: string;
  role: UserRole;
  employeeId?: string;
  isActive: boolean;
}

export const UserRoleLabels: Record<UserRole, string> = {
  [UserRole.EMPLOYEE]: '员工',
  [UserRole.TECHNICIAN]: '技术员',
  [UserRole.SUPERVISOR]: '主管',
  [UserRole.ADMIN]: '管理员',
};

// Helper function to check if user has required role or higher
export const hasRole = (userRole: UserRole, requiredRole: UserRole): boolean => {
  const roleHierarchy = {
    [UserRole.EMPLOYEE]: 1,
    [UserRole.TECHNICIAN]: 2,
    [UserRole.SUPERVISOR]: 3,
    [UserRole.ADMIN]: 4,
  };
  
  return roleHierarchy[userRole] >= roleHierarchy[requiredRole];
};

// Helper function to check if user is admin
export const isAdmin = (userRole: UserRole): boolean => {
  return userRole === UserRole.ADMIN;
};

// Helper function to get user's full name
export const getUserFullName = (user: Partial<User>): string => {
  return `${user.firstName || ''} ${user.lastName || ''}`.trim() || user.username || '未知用户';
};