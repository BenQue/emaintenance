'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { UserList } from '../../../components/users/UserList';
import { UserFilters, UserFilterValues } from '../../../components/users/UserFilters';
import { useUserManagementStore } from '../../../lib/stores/user-management-store';
import { useAuthStore } from '../../../lib/stores/auth-store';
import { User } from '../../../lib/services/user-service';
import { Button } from '../../../components/ui/button';
import { Breadcrumb, BreadcrumbItem, BreadcrumbLink, BreadcrumbList, BreadcrumbPage, BreadcrumbSeparator } from "@/components/ui/breadcrumb";
import { PlusIcon, DownloadIcon, SettingsIcon, FolderOpenIcon } from "lucide-react";

export default function UsersPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { fetchUsers } = useUserManagementStore();
  const { user } = useAuthStore();
  const [filters, setFilters] = useState<UserFilterValues>({});
  
  // 检查是否是管理员
  const isAdmin = user?.role === 'ADMIN';

  // Show success messages
  useEffect(() => {
    if (searchParams.get('created')) {
      // You could show a toast notification here
      console.log('User created successfully');
    }
    if (searchParams.get('updated')) {
      console.log('User updated successfully');
    }
    if (searchParams.get('deleted')) {
      console.log('User deleted successfully');
    }
  }, [searchParams]);

  const handleFilterChange = useCallback((newFilters: UserFilterValues) => {
    setFilters(newFilters);
    // Convert empty strings to undefined for API call
    const cleanFilters = Object.fromEntries(
      Object.entries(newFilters).filter(([_, value]) => value !== '' && value !== undefined)
    );
    fetchUsers({ ...cleanFilters, page: 1, limit: 10 });
  }, [fetchUsers]);

  const handleFilterReset = useCallback(() => {
    setFilters({});
    fetchUsers({ page: 1, limit: 10 });
  }, [fetchUsers]);

  const handleCreateUser = useCallback(() => {
    router.push('/dashboard/users/create');
  }, [router]);

  const handleImportUsers = useCallback(() => {
    router.push('/dashboard/users/import');
  }, [router]);

  const handleEditUser = useCallback((user: User) => {
    router.push(`/dashboard/users/${user.id}/edit`);
  }, [router]);

  const handleViewUser = useCallback((user: User) => {
    router.push(`/dashboard/users/${user.id}`);
  }, [router]);

  return (
    <div className="flex flex-1 flex-col">
      {/* Page Header */}
      <div className="flex flex-col gap-4 p-4 md:gap-8 md:p-6">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div className="space-y-2">
            <div>
              <h1 className="text-3xl font-bold tracking-tight">用户管理</h1>
              <p className="text-muted-foreground">
                管理系统用户，包括角色分配和权限控制
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm">
              <DownloadIcon className="mr-2 h-4 w-4" />
              导出用户
            </Button>
            {isAdmin && (
              <Button
                variant="outline"
                size="sm"
                onClick={handleImportUsers}
              >
                <FolderOpenIcon className="mr-2 h-4 w-4" />
                批量导入
              </Button>
            )}
            <Button variant="outline" size="sm">
              <SettingsIcon className="mr-2 h-4 w-4" />
              用户设置
            </Button>
            <Button size="sm" onClick={handleCreateUser}>
              <PlusIcon className="mr-2 h-4 w-4" />
              新建用户
            </Button>
          </div>
        </div>

        {/* Page Content */}
        <div className="space-y-6">
          {/* Filters */}
          <UserFilters
            onFilterChange={handleFilterChange}
            onReset={handleFilterReset}
          />

          {/* User List */}
          <div className="bg-card rounded-lg border">
            <div className="p-6">
              <UserList
                onEditUser={handleEditUser}
                onViewUser={handleViewUser}
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}