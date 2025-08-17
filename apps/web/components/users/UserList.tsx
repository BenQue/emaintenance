'use client';

import React, { useEffect, useState, useCallback, useMemo } from 'react';
import { useUserManagementStore } from '../../lib/stores/user-management-store';
import { User } from '../../lib/services/user-service';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { DataTable } from '../interactive/tables/DataTable';
import { ColumnDef } from '../interactive/tables/types';
import { ConfirmDialog } from '../interactive/dialogs/ConfirmDialog';
import { formatDate } from '../../lib/utils';

interface UserListProps {
  onEditUser?: (user: User) => void;
  onViewUser?: (user: User) => void;
}


export const UserList: React.FC<UserListProps> = ({ onEditUser, onViewUser }) => {
  const {
    users,
    total,
    page,
    limit,
    selectedUsers,
    isLoading,
    error,
    isInitialized,
    fetchUsers,
    updateUserStatus,
    deleteUser,
    bulkOperation,
  } = useUserManagementStore();

  const [selectedRows, setSelectedRows] = useState<User[]>([]);

  // Initialize data only once
  useEffect(() => {
    if (!isInitialized && !isLoading) {
      fetchUsers({ page: 1, limit: 10 });
    }
  }, [isInitialized, isLoading, fetchUsers]);

  const handleToggleStatus = useCallback(async (user: User) => {
    try {
      await updateUserStatus(user.id, !user.isActive);
      // TODO: Add proper success notification system
    } catch (error) {
      // TODO: Replace with proper error logging service and user notification
      if (process.env.NODE_ENV === 'development') {
        console.error('Failed to toggle user status:', error);
      }
      // Add user-friendly error notification here
    }
  }, [updateUserStatus]);

  const handleDeleteUser = useCallback(async (user: User) => {
    try {
      await deleteUser(user.id);
      // TODO: Add proper success notification system
    } catch (error) {
      // TODO: Replace with proper error logging service and user notification
      if (process.env.NODE_ENV === 'development') {
        console.error('Failed to delete user:', error);
      }
      // Add user-friendly error notification here
    }
  }, [deleteUser]);

  const handleBulkStatusToggle = useCallback(async (isActive: boolean) => {
    if (selectedRows.length === 0) return;

    const userIds = selectedRows.map(user => user.id);
    const operation = isActive ? 'activate' : 'deactivate';
    
    try {
      await bulkOperation({ userIds, operation });
      setSelectedRows([]);
      // TODO: Add proper success notification system
    } catch (error) {
      // TODO: Replace with proper error logging service and user notification
      if (process.env.NODE_ENV === 'development') {
        console.error(`Failed to ${operation} users:`, error);
      }
      // Add user-friendly error notification here
    }
  }, [selectedRows, bulkOperation]);

  // Define table columns
  const columns: ColumnDef<User>[] = useMemo(() => [
    {
      id: 'name',
      header: '姓名',
      cell: (user) => `${user.firstName} ${user.lastName}`,
      sortable: true,
    },
    {
      id: 'email',
      header: '邮箱',
      cell: (user) => user.email,
      sortable: true,
    },
    {
      id: 'role',
      header: '角色',
      cell: (user) => {
        const roleMap = {
          ADMIN: '管理员',
          SUPERVISOR: '主管',
          TECHNICIAN: '技术员',
          EMPLOYEE: '员工',
        };
        return (
          <Badge variant="outline">
            {roleMap[user.role as keyof typeof roleMap] || user.role}
          </Badge>
        );
      },
      sortable: true,
    },
    {
      id: 'status',
      header: '状态',
      cell: (user) => (
        <Badge variant={user.isActive ? 'default' : 'secondary'}>
          {user.isActive ? '活跃' : '禁用'}
        </Badge>
      ),
      sortable: true,
    },
    {
      id: 'createdAt',
      header: '创建时间',
      cell: (user) => formatDate(user.createdAt),
      sortable: true,
    },
  ], []);

  if (error) {
    return (
      <div className="bg-destructive/10 border border-destructive/20 rounded-md p-4">
        <div className="flex">
          <div className="ml-3">
            <h3 className="text-sm font-medium text-destructive">加载用户时出错</h3>
            <div className="mt-2 text-sm text-destructive/80">{error}</div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Bulk Actions */}
      {selectedRows.length > 0 && (
        <div className="bg-primary/10 border border-primary/20 rounded-md p-4">
          <div className="flex items-center justify-between">
            <span className="text-sm text-primary">
              已选择 {selectedRows.length} 个用户
            </span>
            <div className="flex gap-2">
              <ConfirmDialog
                trigger={
                  <Button
                    size="sm"
                    variant="outline"
                    className="text-green-600 hover:text-green-700 dark:text-green-400 dark:hover:text-green-300"
                  >
                    批量激活
                  </Button>
                }
                title="批量激活用户"
                description={`确定要激活选中的 ${selectedRows.length} 个用户吗？`}
                onConfirm={() => handleBulkStatusToggle(true)}
              />
              <ConfirmDialog
                trigger={
                  <Button
                    size="sm"
                    variant="outline"
                    className="text-yellow-600 hover:text-yellow-700 dark:text-yellow-400 dark:hover:text-yellow-300"
                  >
                    批量停用
                  </Button>
                }
                title="批量停用用户"
                description={`确定要停用选中的 ${selectedRows.length} 个用户吗？`}
                onConfirm={() => handleBulkStatusToggle(false)}
              />
              <Button
                size="sm"
                variant="outline"
                onClick={() => setSelectedRows([])}
                className="text-muted-foreground hover:text-foreground"
              >
                取消选择
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Data Table */}
      <DataTable
        data={users}
        columns={columns}
        selection={true}
        searchable={false}
        onSelectionChange={setSelectedRows}
        onRowClick={onViewUser}
        loading={isLoading}
        emptyMessage="没有找到用户"
      />
    </div>
  );
};