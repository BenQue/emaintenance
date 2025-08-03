'use client';

import React from 'react';
import { UserList } from '../../../components/users/UserList';

export default function UsersPage() {
  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">用户管理</h1>
        <p className="mt-2 text-gray-600">
          管理系统用户，包括角色分配和权限控制
        </p>
      </div>

      <div className="bg-white rounded-lg shadow">
        <div className="p-6">
          <UserList />
        </div>
      </div>
    </div>
  );
}