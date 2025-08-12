import { apiClient, workOrderServiceClient, userServiceClient, ApiResponse } from './api-client';
import {
  AssignmentRule,
  CreateAssignmentRuleRequest,
  UpdateAssignmentRuleRequest,
  AssignmentRuleFilter,
  User
} from '../types/assignment';

export class AssignmentService {
  // Assignment Rules API - Use work-order-service (port 3002)
  async createRule(data: CreateAssignmentRuleRequest): Promise<AssignmentRule> {
    const response = await workOrderServiceClient.post<AssignmentRule>('/api/assignment-rules', data);
    return response.data;
  }

  async getRules(filter?: AssignmentRuleFilter): Promise<{
    rules: AssignmentRule[];
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  }> {
    const response = await workOrderServiceClient.get<AssignmentRule[]>('/api/assignment-rules', filter);
    return {
      rules: response.data,
      ...response.pagination!,
    };
  }

  async getRuleById(id: string): Promise<AssignmentRule> {
    const response = await workOrderServiceClient.get<AssignmentRule>(`/api/assignment-rules/${id}`);
    return response.data;
  }

  async updateRule(id: string, data: UpdateAssignmentRuleRequest): Promise<AssignmentRule> {
    const response = await workOrderServiceClient.put<AssignmentRule>(`/api/assignment-rules/${id}`, data);
    return response.data;
  }

  async deleteRule(id: string): Promise<void> {
    await workOrderServiceClient.delete(`/api/assignment-rules/${id}`);
  }

  // Technicians API - Use user-service (port 3001)
  async getTechnicians(): Promise<User[]> {
    try {
      const response = await userServiceClient.get<User[]>('/api/users/role/TECHNICIAN');
      return response.data || [];
    } catch (error) {
      console.warn('Failed to load technicians from API, using fallback data:', error);
      // Fallback for demo purposes - in real implementation this would come from user service
      return [
        {
          id: 'tech1',
          firstName: '张',
          lastName: '三',
          email: 'zhang.san@example.com',
          role: 'TECHNICIAN'
        },
        {
          id: 'tech2',
          firstName: '李',
          lastName: '四',
          email: 'li.si@example.com',
          role: 'TECHNICIAN'
        }
      ];
    }
  }

  // Work Order Assignment API - Use work-order-service (port 3002)
  async assignWorkOrder(workOrderId: string, assignedToId: string): Promise<void> {
    await workOrderServiceClient.put(`/api/work-orders/${workOrderId}/assign`, { assignedToId });
  }
}

export const assignmentService = new AssignmentService();
export default assignmentService;