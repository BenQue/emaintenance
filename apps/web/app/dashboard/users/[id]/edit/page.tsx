'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useParams } from 'next/navigation';
import { UserForm } from '../../../../../components/users/UserForm';
import { useUserManagementStore } from '../../../../../lib/stores/user-management-store';
import { UpdateUserInput, User } from '../../../../../lib/services/user-service';

export default function EditUserPage() {
  const router = useRouter();
  const params = useParams();
  const userId = params.id as string;
  
  const { updateUser, getUserById } = useUserManagementStore();
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingUser, setIsLoadingUser] = useState(true);

  useEffect(() => {
    const loadUser = async () => {
      if (!userId) return;
      
      try {
        setIsLoadingUser(true);
        const userData = await getUserById(userId);
        setUser(userData);
      } catch (error) {
        console.error('Failed to load user:', error);
        router.push('/dashboard/users');
      } finally {
        setIsLoadingUser(false);
      }
    };

    loadUser();
  }, [userId, getUserById, router]);

  const handleSubmit = async (userData: UpdateUserInput) => {
    if (!user) return;
    
    setIsLoading(true);
    try {
      await updateUser(user.id, userData);
      router.push('/dashboard/users?updated=true');
    } catch (error) {
      console.error('Failed to update user:', error);
      // Error handling will be displayed by the form or store
    } finally {
      setIsLoading(false);
    }
  };

  const handleCancel = () => {
    router.push('/dashboard/users');
  };

  if (isLoadingUser) {
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
          <span>编辑用户</span>
        </div>
        
        <h1 className="text-2xl font-bold text-gray-900">编辑用户</h1>
        <p className="mt-2 text-gray-600">
          修改用户 <span className="font-medium">{user.firstName} {user.lastName}</span> 的信息和权限设置
        </p>
      </div>

      <UserForm
        user={user}
        onSubmit={handleSubmit}
        onCancel={handleCancel}
        isLoading={isLoading}
      />
    </div>
  );
}