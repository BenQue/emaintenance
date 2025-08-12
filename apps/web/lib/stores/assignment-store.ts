import { create } from 'zustand';
import { devtools } from 'zustand/middleware';
import { AssignmentRule, User, CreateAssignmentRuleRequest, UpdateAssignmentRuleRequest } from '../types/assignment';
import { assignmentService } from '../services/assignment-service';

interface AssignmentState {
  // Rules
  rules: AssignmentRule[];
  currentRule: AssignmentRule | null;
  rulesLoading: boolean;
  rulesError: string | null;
  
  // Technicians
  technicians: User[];
  techniciansLoading: boolean;
  techniciansError: string | null;
  
  // Pagination
  totalRules: number;
  currentPage: number;
  pageLimit: number;
  
  // Actions
  loadRules: (page?: number) => Promise<void>;
  loadRuleById: (id: string) => Promise<void>;
  createRule: (data: CreateAssignmentRuleRequest) => Promise<void>;
  updateRule: (id: string, data: UpdateAssignmentRuleRequest) => Promise<void>;
  deleteRule: (id: string) => Promise<void>;
  loadTechnicians: () => Promise<void>;
  setCurrentRule: (rule: AssignmentRule | null) => void;
  setCurrentPage: (page: number) => void;
  clearError: () => void;
}

export const useAssignmentStore = create<AssignmentState>()(
  devtools(
    (set, get) => ({
      // Initial state
      rules: [],
      currentRule: null,
      rulesLoading: false,
      rulesError: null,
      technicians: [],
      techniciansLoading: false,
      techniciansError: null,
      totalRules: 0,
      currentPage: 1,
      pageLimit: 10,

      // Actions
      loadRules: async (page = 1) => {
        set({ rulesLoading: true, rulesError: null });
        try {
          const { rules, total } = await assignmentService.getRules({
            page,
            limit: get().pageLimit,
          });
          set({
            rules,
            totalRules: total,
            currentPage: page,
            rulesLoading: false,
          });
        } catch (error) {
          set({
            rulesError: error instanceof Error ? error.message : 'Failed to load rules',
            rulesLoading: false,
          });
        }
      },

      loadRuleById: async (id: string) => {
        set({ rulesLoading: true, rulesError: null });
        try {
          const rule = await assignmentService.getRuleById(id);
          set({
            currentRule: rule,
            rulesLoading: false,
          });
        } catch (error) {
          set({
            rulesError: error instanceof Error ? error.message : 'Failed to load rule',
            rulesLoading: false,
          });
        }
      },

      createRule: async (data: CreateAssignmentRuleRequest) => {
        set({ rulesLoading: true, rulesError: null });
        try {
          await assignmentService.createRule(data);
          // Reload rules to get updated list
          await get().loadRules(get().currentPage);
        } catch (error) {
          set({
            rulesError: error instanceof Error ? error.message : 'Failed to create rule',
            rulesLoading: false,
          });
          throw error; // Re-throw to handle in component
        }
      },

      updateRule: async (id: string, data: UpdateAssignmentRuleRequest) => {
        set({ rulesLoading: true, rulesError: null });
        try {
          const updatedRule = await assignmentService.updateRule(id, data);
          set((state) => ({
            rules: state.rules.map((rule) =>
              rule.id === id ? updatedRule : rule
            ),
            currentRule: state.currentRule?.id === id ? updatedRule : state.currentRule,
            rulesLoading: false,
          }));
        } catch (error) {
          set({
            rulesError: error instanceof Error ? error.message : 'Failed to update rule',
            rulesLoading: false,
          });
          throw error;
        }
      },

      deleteRule: async (id: string) => {
        set({ rulesLoading: true, rulesError: null });
        try {
          await assignmentService.deleteRule(id);
          set((state) => ({
            rules: state.rules.filter((rule) => rule.id !== id),
            currentRule: state.currentRule?.id === id ? null : state.currentRule,
            rulesLoading: false,
          }));
        } catch (error) {
          set({
            rulesError: error instanceof Error ? error.message : 'Failed to delete rule',
            rulesLoading: false,
          });
          throw error;
        }
      },

      loadTechnicians: async () => {
        set({ techniciansLoading: true, techniciansError: null });
        try {
          const technicians = await assignmentService.getTechnicians();
          set({
            technicians: Array.isArray(technicians) ? technicians : [],
            techniciansLoading: false,
          });
        } catch (error) {
          console.error('Failed to load technicians:', error);
          set({
            technicians: [], // Ensure technicians is always an array
            techniciansError: error instanceof Error ? error.message : 'Failed to load technicians',
            techniciansLoading: false,
          });
        }
      },

      setCurrentRule: (rule: AssignmentRule | null) => {
        set({ currentRule: rule });
      },

      setCurrentPage: (page: number) => {
        set({ currentPage: page });
      },

      clearError: () => {
        set({ rulesError: null, techniciansError: null });
      },
    }),
    {
      name: 'assignment-store',
    }
  )
);