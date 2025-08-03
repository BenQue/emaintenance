export interface AssignmentRule {
  id: string;
  name: string;
  priority: number;
  isActive: boolean;
  assetTypes: string[];
  categories: string[];
  locations: string[];
  priorities: ('LOW' | 'MEDIUM' | 'HIGH' | 'URGENT')[];
  assignToId: string;
  assignTo: {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
  };
  createdAt: string;
  updatedAt: string;
}

export interface CreateAssignmentRuleRequest {
  name: string;
  priority?: number;
  isActive?: boolean;
  assetTypes: string[];
  categories: string[];
  locations: string[];
  priorities: string[];
  assignToId: string;
}

export interface UpdateAssignmentRuleRequest {
  name?: string;
  priority?: number;
  isActive?: boolean;
  assetTypes?: string[];
  categories?: string[];
  locations?: string[];
  priorities?: string[];
  assignToId?: string;
}

export interface AssignmentRuleFilter {
  isActive?: boolean;
  assignToId?: string;
  page?: number;
  limit?: number;
}

export interface User {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  role: 'EMPLOYEE' | 'TECHNICIAN' | 'SUPERVISOR' | 'ADMIN';
}

export const PRIORITY_OPTIONS = [
  { value: 'LOW', label: '低' },
  { value: 'MEDIUM', label: '中' },
  { value: 'HIGH', label: '高' },
  { value: 'URGENT', label: '紧急' }
] as const;

export const CATEGORY_OPTIONS = [
  { value: '电气', label: '电气故障' },
  { value: '机械', label: '机械故障' },
  { value: '设备', label: '设备维护' },
  { value: '清洁', label: '清洁保养' },
  { value: '其他', label: '其他问题' }
] as const;