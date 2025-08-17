'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { UserForm } from '../../../../components/users/UserForm';
import { useUserManagementStore } from '../../../../lib/stores/user-management-store';
import { CreateUserInput } from '../../../../lib/services/user-service';

export default function CreateUserPage() {
  const router = useRouter();
  const { createUser } = useUserManagementStore();
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (userData: CreateUserInput) => {
    setIsLoading(true);
    try {
      await createUser(userData);
      router.push('/dashboard/users?created=true');
    } catch (error) {
      console.error('Failed to create user:', error);
      // Error handling will be displayed by the form or store
    } finally {
      setIsLoading(false);
    }
  };

  const handleCancel = () => {
    router.push('/dashboard/users');
  };

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
          <span>创建新用户</span>
        </div>
        
        <h1 className="text-2xl font-bold text-gray-900">创建新用户</h1>
        <p className="mt-2 text-gray-600">
          添加新的系统用户并分配相应的角色和权限
        </p>
      </div>

      <UserForm
        onSubmit={handleSubmit}
        onCancel={handleCancel}
        isLoading={isLoading}
      />
    </div>
  );
}