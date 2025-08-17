import { create } from 'zustand';
import { devtools } from 'zustand/middleware';
import { userService, User, UserListQuery, CreateUserInput, UpdateUserInput, BulkUserOperation } from '../services/user-service';

interface UserManagementState {
  // Data
  users: User[];
  selectedUsers: Set<string>;
  currentUser: User | null;
  total: number;
  page: number;
  limit: number;
  
  // Filters and search
  filters: UserListQuery;
  searchQuery: string;

  // Loading states
  isLoading: boolean;
  isCreating: boolean;
  isUpdating: boolean;
  isDeleting: boolean;
  isBulkOperating: boolean;
  isInitialized: boolean;

  // Error handling
  error: string | null;

  // Actions - Data fetching
  fetchUsers: (query?: UserListQuery) => Promise<void>;
  fetchUserById: (id: string) => Promise<void>;
  getUserById: (id: string) => Promise<User>;
  refreshUsers: () => Promise<void>;

  // Actions - User management
  createUser: (userData: CreateUserInput) => Promise<User>;
  updateUser: (id: string, userData: UpdateUserInput) => Promise<User>;
  updateUserRole: (id: string, role: User['role']) => Promise<User>;
  updateUserStatus: (id: string, isActive: boolean) => Promise<User>;
  deleteUser: (id: string) => Promise<User>;

  // Actions - Bulk operations
  bulkOperation: (operation: BulkUserOperation) => Promise<void>;

  // Actions - Selection
  selectUser: (userId: string) => void;
  deselectUser: (userId: string) => void;
  selectAll: () => void;
  deselectAll: () => void;
  toggleUserSelection: (userId: string) => void;

  // Actions - Search and filters
  setSearchQuery: (query: string) => void;
  setFilters: (filters: Partial<UserListQuery>) => void;
  clearFilters: () => void;

  // Actions - UI state
  setCurrentUser: (user: User | null) => void;
  clearError: () => void;
}

export const useUserManagementStore = create<UserManagementState>()(
  devtools(
    (set, get) => ({
      // Initial state
      users: [],
      selectedUsers: new Set(),
      currentUser: null,
      total: 0,
      page: 1,
      limit: 20,
      
      filters: {},
      searchQuery: '',

      isLoading: false,
      isCreating: false,
      isUpdating: false,
      isDeleting: false,
      isBulkOperating: false,
      isInitialized: false,

      error: null,

      // Data fetching actions
      fetchUsers: async (query) => {
        const currentState = get();
        
        // Prevent duplicate requests
        if (currentState.isLoading) {
          return;
        }
        
        set({ isLoading: true, error: null });
        try {
          const finalQuery = { ...currentState.filters, ...query };
          const response = await userService.getUsers(finalQuery);
          
          // Only update if data has actually changed
          const hasDataChanged = 
            JSON.stringify(currentState.users) !== JSON.stringify(response.users) ||
            currentState.total !== response.total ||
            currentState.page !== response.page;
            
          if (hasDataChanged) {
            set({
              users: response.users,
              total: response.total,
              page: response.page,
              limit: response.limit,
              filters: finalQuery,
              isLoading: false,
              isInitialized: true,
            });
          } else {
            set({ isLoading: false, isInitialized: true });
          }
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : 'Failed to fetch users';
          set({ error: errorMessage, isLoading: false });
          throw error;
        }
      },

      fetchUserById: async (id) => {
        set({ isLoading: true, error: null });
        try {
          const user = await userService.getUserById(id);
          set({ currentUser: user, isLoading: false });
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : 'Failed to fetch user';
          set({ error: errorMessage, isLoading: false });
          throw error;
        }
      },

      getUserById: async (id) => {
        try {
          return await userService.getUserById(id);
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : 'Failed to fetch user';
          set({ error: errorMessage });
          throw error;
        }
      },

      refreshUsers: async () => {
        const { filters } = get();
        await get().fetchUsers(filters);
      },

      // User management actions
      createUser: async (userData) => {
        set({ isCreating: true, error: null });
        try {
          const newUser = await userService.createUser(userData);
          
          // Add user to current list if it matches current filters
          const { users } = get();
          set({
            users: [newUser, ...users],
            total: get().total + 1,
            isCreating: false,
          });

          return newUser;
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : 'Failed to create user';
          set({ error: errorMessage, isCreating: false });
          throw error;
        }
      },

      updateUser: async (id, userData) => {
        set({ isUpdating: true, error: null });
        try {
          const updatedUser = await userService.updateUser(id, userData);
          
          // Update user in current list
          const { users } = get();
          const updatedUsers = users.map(user => 
            user.id === id ? updatedUser : user
          );
          
          set({
            users: updatedUsers,
            currentUser: get().currentUser?.id === id ? updatedUser : get().currentUser,
            isUpdating: false,
          });

          return updatedUser;
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : 'Failed to update user';
          set({ error: errorMessage, isUpdating: false });
          throw error;
        }
      },

      updateUserRole: async (id, role) => {
        set({ isUpdating: true, error: null });
        try {
          const updatedUser = await userService.updateUserRole(id, role);
          
          // Update user in current list
          const { users } = get();
          const updatedUsers = users.map(user => 
            user.id === id ? updatedUser : user
          );
          
          set({
            users: updatedUsers,
            currentUser: get().currentUser?.id === id ? updatedUser : get().currentUser,
            isUpdating: false,
          });

          return updatedUser;
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : 'Failed to update user role';
          set({ error: errorMessage, isUpdating: false });
          throw error;
        }
      },

      updateUserStatus: async (id, isActive) => {
        set({ isUpdating: true, error: null });
        try {
          const updatedUser = await userService.updateUserStatus(id, isActive);
          
          // Update user in current list
          const { users } = get();
          const updatedUsers = users.map(user => 
            user.id === id ? updatedUser : user
          );
          
          set({
            users: updatedUsers,
            currentUser: get().currentUser?.id === id ? updatedUser : get().currentUser,
            isUpdating: false,
          });

          return updatedUser;
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : 'Failed to update user status';
          set({ error: errorMessage, isUpdating: false });
          throw error;
        }
      },

      deleteUser: async (id) => {
        set({ isDeleting: true, error: null });
        try {
          const deletedUser = await userService.deleteUser(id);
          
          // Remove user from current list
          const { users, selectedUsers } = get();
          const updatedUsers = users.filter(user => user.id !== id);
          const updatedSelectedUsers = new Set(selectedUsers);
          updatedSelectedUsers.delete(id);
          
          set({
            users: updatedUsers,
            selectedUsers: updatedSelectedUsers,
            total: Math.max(0, get().total - 1),
            currentUser: get().currentUser?.id === id ? null : get().currentUser,
            isDeleting: false,
          });

          return deletedUser;
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : 'Failed to delete user';
          set({ error: errorMessage, isDeleting: false });
          throw error;
        }
      },

      // Bulk operations
      bulkOperation: async (operation) => {
        set({ isBulkOperating: true, error: null });
        try {
          const result = await userService.bulkOperation(operation);
          
          // Refresh users list to reflect changes
          await get().refreshUsers();
          
          // Clear selection
          set({ selectedUsers: new Set(), isBulkOperating: false });

          // Show results in a notification or return for component handling
          if (result.failed > 0) {
            const errorMessage = `Bulk operation completed with ${result.failed} failures: ${result.errors.join(', ')}`;
            set({ error: errorMessage });
          }
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : 'Failed to perform bulk operation';
          set({ error: errorMessage, isBulkOperating: false });
          throw error;
        }
      },

      // Selection actions
      selectUser: (userId) => {
        const { selectedUsers } = get();
        const newSelectedUsers = new Set(selectedUsers);
        newSelectedUsers.add(userId);
        set({ selectedUsers: newSelectedUsers });
      },

      deselectUser: (userId) => {
        const { selectedUsers } = get();
        const newSelectedUsers = new Set(selectedUsers);
        newSelectedUsers.delete(userId);
        set({ selectedUsers: newSelectedUsers });
      },

      selectAll: () => {
        const { users } = get();
        const allUserIds = users.map(user => user.id);
        set({ selectedUsers: new Set(allUserIds) });
      },

      deselectAll: () => {
        set({ selectedUsers: new Set() });
      },

      toggleUserSelection: (userId) => {
        const { selectedUsers } = get();
        if (selectedUsers.has(userId)) {
          get().deselectUser(userId);
        } else {
          get().selectUser(userId);
        }
      },

      // Search and filter actions
      setSearchQuery: (query) => {
        set({ searchQuery: query });
      },

      setFilters: (newFilters) => {
        const { filters } = get();
        set({ filters: { ...filters, ...newFilters } });
      },

      clearFilters: () => {
        set({ filters: {}, searchQuery: '' });
      },

      // UI state actions
      setCurrentUser: (user) => {
        set({ currentUser: user });
      },

      clearError: () => {
        set({ error: null });
      },
    }),
    {
      name: 'user-management-store',
    }
  )
);