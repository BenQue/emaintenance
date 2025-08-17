'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useParams } from 'next/navigation';
import { useUserManagementStore } from '../../../../lib/stores/user-management-store';
import { User } from '../../../../lib/services/user-service';
import { Card } from '../../../../components/ui/card';
import { Button } from '../../../../components/ui/button';
import { Badge } from '../../../../components/ui/badge';

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

export default function ViewUserPage() {
  const router = useRouter();
  const params = useParams();
  const userId = params.id as string;
  
  const { getUserById, updateUserStatus, deleteUser } = useUserManagementStore();
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isUpdating, setIsUpdating] = useState(false);

  useEffect(() => {
    const loadUser = async () => {
      if (!userId) return;
      
      try {
        setIsLoading(true);
        const userData = await getUserById(userId);
        setUser(userData);
      } catch (error) {
        console.error('Failed to load user:', error);
        router.push('/dashboard/users');
      } finally {
        setIsLoading(false);
      }
    };

    loadUser();
  }, [userId, getUserById, router]);

  const handleToggleStatus = async () => {
    if (!user) return;
    
    setIsUpdating(true);
    try {
      const updatedUser = await updateUserStatus(user.id, !user.isActive);
      setUser(updatedUser);
    } catch (error) {
      console.error('Failed to toggle user status:', error);
    } finally {
      setIsUpdating(false);
    }
  };

  const handleDeleteUser = async () => {
    if (!user) return;
    
    const confirmMessage = `确定要删除用户 ${user.firstName} ${user.lastName} 吗？此操作不可撤销。`;
    if (!window.confirm(confirmMessage)) return;

    setIsUpdating(true);
    try {
      await deleteUser(user.id);
      router.push('/dashboard/users?deleted=true');
    } catch (error) {
      console.error('Failed to delete user:', error);
      setIsUpdating(false);
    }
  };

  const handleEdit = () => {
    router.push(`/dashboard/users/${userId}/edit`);
  };

  if (isLoading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="flex justify-center items-center min-h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          <span className="ml-3 text-gray-600">加载用户信息中...</span>
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="bg-red-50 border border-red-200 rounded-md p-4">
          <div className="flex">
            <div className="ml-3">
              <h3 className="text-sm font-medium text-red-800">用户未找到</h3>
              <div className="mt-2 text-sm text-red-700">
                指定的用户不存在或您没有权限访问。
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-6">
        <div className="flex items-center space-x-2 text-sm text-gray-500 mb-4">
          <span 
            className="hover:text-blue-600 cursor-pointer"
            onClick={() => router.push('/dashboard')}
          >
            工作台
          </span>
          <span>/</span>
          <span 
            className="hover:text-blue-600 cursor-pointer"
            onClick={() => router.push('/dashboard/users')}
          >
            用户管理
          </span>
          <span>/</span>
          <span>查看用户</span>
        </div>
        
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">
              {user.firstName} {user.lastName}
            </h1>
            <p className="mt-2 text-gray-600">用户详细信息和账户状态</p>
          </div>
          
          <div className="flex items-center space-x-3">
            <Button
              variant="outline"
              onClick={handleEdit}
              disabled={isUpdating}
            >
              编辑用户
            </Button>
            <Button
              variant="outline"
              onClick={handleToggleStatus}
              disabled={isUpdating}
              className={user.isActive 
                ? "text-yellow-600 hover:text-yellow-700" 
                : "text-green-600 hover:text-green-700"
              }
            >
              {isUpdating ? '更新中...' : user.isActive ? '停用账户' : '激活账户'}
            </Button>
            <Button
              variant="outline"
              onClick={handleDeleteUser}
              disabled={isUpdating}
              className="text-red-600 hover:text-red-700"
            >
              删除用户
            </Button>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Information */}
        <div className="lg:col-span-2">
          <Card className="p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">基本信息</h2>
            
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-500 mb-1">
                  姓名
                </label>
                <p className="text-sm text-gray-900">
                  {user.firstName} {user.lastName}
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-500 mb-1">
                  邮箱地址
                </label>
                <p className="text-sm text-gray-900">{user.email}</p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-500 mb-1">
                  用户名
                </label>
                <p className="text-sm text-gray-900">@{user.username}</p>
              </div>

              {user.employeeId && (
                <div>
                  <label className="block text-sm font-medium text-gray-500 mb-1">
                    工号
                  </label>
                  <p className="text-sm text-gray-900">{user.employeeId}</p>
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-gray-500 mb-1">
                  创建时间
                </label>
                <p className="text-sm text-gray-900">
                  {new Date(user.createdAt).toLocaleString('zh-CN')}
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-500 mb-1">
                  最后更新
                </label>
                <p className="text-sm text-gray-900">
                  {new Date(user.updatedAt).toLocaleString('zh-CN')}
                </p>
              </div>
            </div>
          </Card>
        </div>

        {/* Status and Role */}
        <div className="space-y-6">
          <Card className="p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">角色和状态</h2>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-500 mb-2">
                  用户角色
                </label>
                <Badge className={ROLE_COLORS[user.role]}>
                  {ROLE_LABELS[user.role]}
                </Badge>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-500 mb-2">
                  账户状态
                </label>
                <Badge className={user.isActive 
                  ? "bg-green-100 text-green-800" 
                  : "bg-red-100 text-red-800"
                }>
                  {user.isActive ? '已激活' : '已停用'}
                </Badge>
              </div>
            </div>
          </Card>

          {/* Quick Actions */}
          <Card className="p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">快速操作</h2>
            
            <div className="space-y-3">
              <Button
                variant="outline"
                className="w-full text-left justify-start"
                onClick={handleEdit}
                disabled={isUpdating}
              >
                编辑用户信息
              </Button>
              
              <Button
                variant="outline"
                className={`w-full text-left justify-start ${
                  user.isActive 
                    ? "text-yellow-600 hover:text-yellow-700" 
                    : "text-green-600 hover:text-green-700"
                }`}
                onClick={handleToggleStatus}
                disabled={isUpdating}
              >
                {user.isActive ? '停用账户' : '激活账户'}
              </Button>

              <Button
                variant="outline"
                className="w-full text-left justify-start text-red-600 hover:text-red-700"
                onClick={handleDeleteUser}
                disabled={isUpdating}
              >
                删除用户
              </Button>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}