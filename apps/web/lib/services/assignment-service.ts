import { apiClient, ApiResponse } from './api-client';
import {
  AssignmentRule,
  CreateAssignmentRuleRequest,
  UpdateAssignmentRuleRequest,
  AssignmentRuleFilter,
  User
} from '../types/assignment';

export class AssignmentService {
  // Assignment Rules API
  async createRule(data: CreateAssignmentRuleRequest): Promise<AssignmentRule> {
    const response = await apiClient.post<AssignmentRule>('/api/assignment-rules', data);
    return response.data;
  }

  async getRules(filter?: AssignmentRuleFilter): Promise<{
    rules: AssignmentRule[];
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  }> {
    const response = await apiClient.get<AssignmentRule[]>('/api/assignment-rules', filter);
    return {
      rules: response.data,
      ...response.pagination!,
    };
  }

  async getRuleById(id: string): Promise<AssignmentRule> {
    const response = await apiClient.get<AssignmentRule>(`/api/assignment-rules/${id}`);
    return response.data;
  }

  async updateRule(id: string, data: UpdateAssignmentRuleRequest): Promise<AssignmentRule> {
    const response = await apiClient.put<AssignmentRule>(`/api/assignment-rules/${id}`, data);
    return response.data;
  }

  async deleteRule(id: string): Promise<void> {
    await apiClient.delete(`/api/assignment-rules/${id}`);
  }

  // Technicians API (assuming these exist)
  async getTechnicians(): Promise<User[]> {
    try {
      const response = await apiClient.get<User[]>('/api/users', { role: 'TECHNICIAN' });
      return response.data;
    } catch (error) {
      // Fallback for demo purposes - in real implementation this would come from user service
      console.warn('Users API not available, using mock data');
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

  // Work Order Assignment API
  async assignWorkOrder(workOrderId: string, assignedToId: string): Promise<void> {
    await apiClient.put(`/api/work-orders/${workOrderId}/assign`, { assignedToId });
  }
}

export const assignmentService = new AssignmentService();
export default assignmentService;