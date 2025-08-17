import { create } from 'zustand';
import { devtools } from 'zustand/middleware';
import {
  WorkOrder,
  WorkOrderWithStatusHistory,
  WorkOrderStatusHistoryItem,
  UpdateWorkOrderStatusRequest,
  PaginatedWorkOrders,
  WorkOrderWithResolution,
  CreateResolutionRequest,
  ResolutionRecord,
  Priority,
} from '../types/work-order';
import { workOrderService } from '../services/work-order-service';

interface CreateWorkOrderData {
  assetId: string;
  title: string;
  category: string;
  reason: string;
  location?: string;
  priority: Priority;
  description?: string;
  photos?: File[];
}

interface WorkOrderState {
  // State
  assignedWorkOrders: WorkOrder[];
  currentWorkOrder: WorkOrderWithStatusHistory | null;
  currentWorkOrderWithResolution: WorkOrderWithResolution | null;
  statusHistory: WorkOrderStatusHistoryItem[];
  loading: boolean;
  creating: boolean;
  error: string | null;
  createError: string | null;
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };

  // Actions
  loadAssignedWorkOrders: (page?: number, limit?: number) => Promise<void>;
  loadWorkOrderWithHistory: (id: string) => Promise<void>;
  loadWorkOrderWithResolution: (id: string) => Promise<void>;
  loadWorkOrderStatusHistory: (id: string) => Promise<void>;
  updateWorkOrderStatus: (id: string, statusUpdate: UpdateWorkOrderStatusRequest) => Promise<void>;
  completeWorkOrder: (id: string, resolutionData: CreateResolutionRequest) => Promise<void>;
  uploadResolutionPhotos: (id: string, photos: File[]) => Promise<string[]>;
  fetchWorkOrderPhotos: (id: string) => Promise<any[]>;
  createWorkOrder: (workOrderData: CreateWorkOrderData) => Promise<WorkOrder>;
  clearCurrentWorkOrder: () => void;
  clearError: () => void;
  clearCreateError: () => void;
  setLoading: (loading: boolean) => void;
}

export const useWorkOrderStore = create<WorkOrderState>()(
  devtools(
    (set, get) => ({
      // Initial state
      assignedWorkOrders: [],
      currentWorkOrder: null,
      currentWorkOrderWithResolution: null,
      statusHistory: [],
      loading: false,
      creating: false,
      error: null,
      createError: null,
      pagination: {
        page: 1,
        limit: 20,
        total: 0,
        totalPages: 0,
      },

      // Actions
      loadAssignedWorkOrders: async (page = 1, limit = 20) => {
        set({ loading: true, error: null });
        try {
          const result = await workOrderService.getAssignedWorkOrders(page, limit);
          set({
            assignedWorkOrders: result.workOrders,
            pagination: {
              page: result.page,
              limit: result.limit,
              total: result.total,
              totalPages: result.totalPages,
            },
            loading: false,
          });
        } catch (error) {
          set({
            error: error instanceof Error ? error.message : 'Failed to load assigned work orders',
            loading: false,
          });
        }
      },

      loadWorkOrderWithHistory: async (id: string) => {
        set({ loading: true, error: null });
        try {
          console.log(`[DEBUG] WorkOrderStore.loadWorkOrderWithHistory: Loading work order ID: ${id}`);
          const workOrder = await workOrderService.getWorkOrderWithHistory(id);
          
          console.log(`[DEBUG] WorkOrderStore.loadWorkOrderWithHistory: Received work order data:`, {
            id: workOrder?.id,
            title: workOrder?.title,
            category: workOrder?.category,
            reason: workOrder?.reason,
            assetId: workOrder?.asset?.id,
            assetName: workOrder?.asset?.name,
            hasStatusHistory: !!workOrder?.statusHistory,
            statusHistoryCount: workOrder?.statusHistory?.length || 0,
          });
          
          set({
            currentWorkOrder: workOrder,
            statusHistory: workOrder.statusHistory,
            loading: false,
          });
        } catch (error) {
          console.error(`[ERROR] WorkOrderStore.loadWorkOrderWithHistory: Failed to load work order ID ${id}:`, error);
          set({
            error: error instanceof Error ? error.message : 'Failed to load work order',
            loading: false,
          });
        }
      },

      loadWorkOrderStatusHistory: async (id: string) => {
        set({ loading: true, error: null });
        try {
          const statusHistory = await workOrderService.getWorkOrderStatusHistory(id);
          set({
            statusHistory,
            loading: false,
          });
        } catch (error) {
          set({
            error: error instanceof Error ? error.message : 'Failed to load status history',
            loading: false,
          });
        }
      },

      updateWorkOrderStatus: async (id: string, statusUpdate: UpdateWorkOrderStatusRequest) => {
        set({ loading: true, error: null });
        try {
          const updatedWorkOrder = await workOrderService.updateWorkOrderStatus(id, statusUpdate);
          
          // Update the work order in the list
          const { assignedWorkOrders } = get();
          const updatedList = assignedWorkOrders.map(wo => 
            wo.id === id ? updatedWorkOrder : wo
          );
          
          // Update current work order if it's the same one
          const { currentWorkOrder } = get();
          const updatedCurrentWorkOrder = currentWorkOrder?.id === id 
            ? { ...currentWorkOrder, ...updatedWorkOrder }
            : currentWorkOrder;

          set({
            assignedWorkOrders: updatedList,
            currentWorkOrder: updatedCurrentWorkOrder,
            loading: false,
          });

          // Reload status history if current work order is updated
          if (currentWorkOrder?.id === id) {
            get().loadWorkOrderStatusHistory(id);
          }
        } catch (error) {
          set({
            error: error instanceof Error ? error.message : 'Failed to update work order status',
            loading: false,
          });
        }
      },

      loadWorkOrderWithResolution: async (id: string) => {
        set({ loading: true, error: null });
        try {
          console.log(`[DEBUG] WorkOrderStore.loadWorkOrderWithResolution: Loading work order resolution for ID: ${id}`);
          const workOrder = await workOrderService.getWorkOrderWithResolution(id);
          
          console.log(`[DEBUG] WorkOrderStore.loadWorkOrderWithResolution: Received work order resolution data:`, {
            id: workOrder?.id,
            title: workOrder?.title,
            category: workOrder?.category,
            reason: workOrder?.reason,
            assetId: workOrder?.asset?.id,
            assetName: workOrder?.asset?.name,
            hasResolution: !!workOrder?.resolutionRecord,
          });
          
          set({
            currentWorkOrderWithResolution: workOrder,
            loading: false,
          });
        } catch (error) {
          console.error(`[ERROR] WorkOrderStore.loadWorkOrderWithResolution: Failed to load work order resolution for ID ${id}:`, error);
          set({
            error: error instanceof Error ? error.message : 'Failed to load work order with resolution',
            loading: false,
          });
        }
      },

      completeWorkOrder: async (id: string, resolutionData: CreateResolutionRequest) => {
        set({ loading: true, error: null });
        try {
          const completedWorkOrder = await workOrderService.completeWorkOrder(id, resolutionData);
          
          // Update the work order in the list
          const { assignedWorkOrders } = get();
          const updatedList = assignedWorkOrders.map(wo => 
            wo.id === id ? completedWorkOrder : wo
          );
          
          set({
            assignedWorkOrders: updatedList,
            currentWorkOrderWithResolution: completedWorkOrder,
            loading: false,
          });
        } catch (error) {
          set({
            error: error instanceof Error ? error.message : 'Failed to complete work order',
            loading: false,
          });
        }
      },

      uploadResolutionPhotos: async (id: string, photos: File[]): Promise<string[]> => {
        set({ loading: true, error: null });
        try {
          const result = await workOrderService.uploadResolutionPhotos(id, photos);
          
          // Update the current work order with resolution if it's the same one
          const { currentWorkOrderWithResolution } = get();
          if (currentWorkOrderWithResolution?.id === id) {
            set({
              currentWorkOrderWithResolution: {
                ...currentWorkOrderWithResolution,
                resolutionRecord: result.resolutionRecord,
              },
            });
          }
          
          set({ loading: false });
          return result.uploadedPhotos;
        } catch (error) {
          set({
            error: error instanceof Error ? error.message : 'Failed to upload resolution photos',
            loading: false,
          });
          throw error;
        }
      },

      fetchWorkOrderPhotos: async (id: string): Promise<any[]> => {
        try {
          const photos = await workOrderService.getWorkOrderPhotos(id);
          return photos;
        } catch (error) {
          console.error('Failed to fetch work order photos:', error);
          throw error;
        }
      },

      clearCurrentWorkOrder: () => {
        set({
          currentWorkOrder: null,
          currentWorkOrderWithResolution: null,
          statusHistory: [],
        });
      },

      createWorkOrder: async (workOrderData: CreateWorkOrderData): Promise<WorkOrder> => {
        console.log('[DEBUG] WorkOrderStore.createWorkOrder: Starting creation with data:', workOrderData);
        set({ creating: true, createError: null });
        try {
          const createdWorkOrder = await workOrderService.createWorkOrder(workOrderData);
          console.log('[DEBUG] WorkOrderStore.createWorkOrder: Successfully created work order:', createdWorkOrder.id);
          
          // Optionally refresh the work order list to include the new work order
          // This depends on whether the user should see their own created work orders
          
          set({ creating: false });
          return createdWorkOrder;
        } catch (error) {
          console.error('[DEBUG] WorkOrderStore.createWorkOrder: Error occurred:', error);
          const errorMessage = error instanceof Error ? error.message : 'Failed to create work order';
          set({
            createError: errorMessage,
            creating: false,
          });
          throw error;
        }
      },

      clearError: () => {
        set({ error: null });
      },

      clearCreateError: () => {
        set({ createError: null });
      },

      setLoading: (loading: boolean) => {
        set({ loading });
      },
    }),
    {
      name: 'work-order-store',
    }
  )
);