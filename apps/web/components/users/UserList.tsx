'use client';

import React, { useEffect, useState } from 'react';
import { useUserManagementStore } from '../../lib/stores/user-management-store';
import { User } from '../../lib/services/user-service';
import { Card } from '../ui/card';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';

interface UserListProps {
  onEditUser?: (user: User) => void;
  onViewUser?: (user: User) => void;
}

const ROLE_COLORS = {
  ADMIN: 'bg-red-100 text-red-800',
  SUPERVISOR: 'bg-blue-100 text-blue-800',
  TECHNICIAN: 'bg-green-100 text-green-800',
  EMPLOYEE: 'bg-gray-100 text-gray-800',
};

const ROLE_LABELS = {
  ADMIN: '管理员',
  SUPERVISOR: '主管',
  TECHNICIAN: '技术员',
  EMPLOYEE: '员工',
};

export const UserList: React.FC<UserListProps> = ({ onEditUser, onViewUser }) => {
  const {
    users,
    total,
    page,
    limit,
    selectedUsers,
    isLoading,
    error,
    fetchUsers,
    toggleUserSelection,
    selectAll,
    deselectAll,
    updateUserStatus,
    deleteUser,
  } = useUserManagementStore();

  const [currentPage, setCurrentPage] = useState(1);

  useEffect(() => {
    fetchUsers({ page: currentPage, limit });
  }, [currentPage, fetchUsers, limit]);

  const handlePageChange = (newPage: number) => {
    setCurrentPage(newPage);
    fetchUsers({ page: newPage, limit });
  };

  const handleToggleStatus = async (user: User) => {
    try {
      await updateUserStatus(user.id, !user.isActive);
    } catch (error) {
      console.error('Failed to toggle user status:', error);
    }
  };

  const handleDeleteUser = async (user: User) => {
    if (window.confirm(`确定要删除用户 ${user.firstName} ${user.lastName} 吗？`)) {
      try {
        await deleteUser(user.id);
      } catch (error) {
        console.error('Failed to delete user:', error);
      }
    }
  };

  const handleBulkStatusToggle = async (isActive: boolean) => {
    const userIds = Array.from(selectedUsers);
    if (userIds.length === 0) return;

    const operation = isActive ? 'activate' : 'deactivate';
    const confirmMessage = `确定要${isActive ? '激活' : '停用'} ${userIds.length} 个用户吗？`;
    
    if (window.confirm(confirmMessage)) {
      try {
        const { bulkOperation } = useUserManagementStore.getState();
        await bulkOperation({ userIds, operation });
      } catch (error) {
        console.error(`Failed to ${operation} users:`, error);
      }
    }
  };

  const totalPages = Math.ceil(total / limit);
  const hasSelection = selectedUsers.size > 0;
  const allCurrentPageSelected = users.every(user => selectedUsers.has(user.id));

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-md p-4">
        <div className="flex">
          <div className="ml-3">
            <h3 className="text-sm font-medium text-red-800">加载用户时出错</h3>
            <div className="mt-2 text-sm text-red-700">{error}</div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Bulk Actions */}
      {hasSelection && (
        <div className="bg-blue-50 border border-blue-200 rounded-md p-4">
          <div className="flex items-center justify-between">
            <span className="text-sm text-blue-700">
              已选择 {selectedUsers.size} 个用户
            </span>
            <div className="flex gap-2">
              <Button
                size="sm"
                variant="outline"
                onClick={() => handleBulkStatusToggle(true)}
                className="text-green-600 hover:text-green-700"
              >
                批量激活
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={() => handleBulkStatusToggle(false)}
                className="text-yellow-600 hover:text-yellow-700"
              >
                批量停用
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={deselectAll}
                className="text-gray-600 hover:text-gray-700"
              >
                取消选择
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <input
            type="checkbox"
            checked={allCurrentPageSelected && users.length > 0}
            onChange={() => allCurrentPageSelected ? deselectAll() : selectAll()}
            className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
            disabled={users.length === 0}
          />
          <span className="text-sm font-medium text-gray-700">
            全选当前页 ({users.length} 项)
          </span>
        </div>
        <div className="text-sm text-gray-500">
          共 {total} 个用户，第 {page} / {totalPages} 页
        </div>
      </div>

      {/* User List */}
      {isLoading ? (
        <div className="flex justify-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        </div>
      ) : users.length === 0 ? (
        <div className="text-center py-8 text-gray-500">
          没有找到用户
        </div>
      ) : (
        <div className="grid gap-4">
          {users.map((user) => (
            <Card key={user.id} className="p-4">
              <div className="flex items-center space-x-4">
                <input
                  type="checkbox"
                  checked={selectedUsers.has(user.id)}
                  onChange={() => toggleUserSelection(user.id)}
                  className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                />
                
                <div className="flex-1 min-w-0">
                  <div className="flex items-center space-x-2">
                    <h3 className="text-sm font-medium text-gray-900 truncate">
                      {user.firstName} {user.lastName}
                    </h3>
                    <Badge className={ROLE_COLORS[user.role]}>
                      {ROLE_LABELS[user.role]}
                    </Badge>
                    {!user.isActive && (
                      <Badge className="bg-red-100 text-red-800">
                        已停用
                      </Badge>
                    )}
                  </div>
                  
                  <div className="mt-1 flex items-center space-x-4 text-sm text-gray-500">
                    <span>{user.email}</span>
                    <span>@{user.username}</span>
                    {user.employeeId && (
                      <span>工号: {user.employeeId}</span>
                    )}
                  </div>
                  
                  <div className="mt-1 text-xs text-gray-400">
                    创建时间: {new Date(user.createdAt).toLocaleDateString('zh-CN')}
                  </div>
                </div>

                <div className="flex items-center space-x-2">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => onViewUser?.(user)}
                    className="text-blue-600 hover:text-blue-700"
                  >
                    查看
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => onEditUser?.(user)}
                    className="text-green-600 hover:text-green-700"
                  >
                    编辑
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleToggleStatus(user)}
                    className={user.isActive 
                      ? "text-yellow-600 hover:text-yellow-700" 
                      : "text-green-600 hover:text-green-700"
                    }
                  >
                    {user.isActive ? '停用' : '激活'}
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleDeleteUser(user)}
                    className="text-red-600 hover:text-red-700"
                  >
                    删除
                  </Button>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Button
              size="sm"
              variant="outline"
              onClick={() => handlePageChange(page - 1)}
              disabled={page <= 1 || isLoading}
            >
              上一页
            </Button>
            <span className="text-sm text-gray-700">
              第 {page} / {totalPages} 页
            </span>
            <Button
              size="sm"
              variant="outline"
              onClick={() => handlePageChange(page + 1)}
              disabled={page >= totalPages || isLoading}
            >
              下一页
            </Button>
          </div>
          
          <div className="text-sm text-gray-500">
            显示 {Math.min((page - 1) * limit + 1, total)} - {Math.min(page * limit, total)} / {total} 项
          </div>
        </div>
      )}
    </div>
  );
};