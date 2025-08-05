'use client';

import { useAuthStore } from '../../lib/stores/auth-store';
import { UserMenu } from './UserMenu';
import Link from 'next/link';

export function Navigation() {
  const { user } = useAuthStore();

  if (!user) return null;

  const getNavLinks = () => {
    const baseLinks = [
      { href: '/dashboard', label: '仪表板', roles: ['SUPERVISOR', 'ADMIN'] },
      { href: '/dashboard/work-orders', label: '工单管理', roles: ['EMPLOYEE', 'TECHNICIAN', 'SUPERVISOR', 'ADMIN'] },
      { href: '/dashboard/my-tasks', label: '我的任务', roles: ['TECHNICIAN'] },
      { href: '/dashboard/assets', label: '资产管理', roles: ['SUPERVISOR', 'ADMIN'] },
      { href: '/dashboard/users', label: '用户管理', roles: ['SUPERVISOR', 'ADMIN'] },
      { href: '/dashboard/notifications', label: '通知中心', roles: ['EMPLOYEE', 'TECHNICIAN', 'SUPERVISOR', 'ADMIN'] },
    ];

    return baseLinks.filter(link => link.roles.includes(user.role));
  };

  return (
    <nav className="bg-white shadow-sm border-b border-gray-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          <div className="flex items-center">
            <Link href="/dashboard" className="text-xl font-semibold text-gray-900">
              设备维护管理系统
            </Link>
          </div>
          
          <div className="flex items-center space-x-4">
            {getNavLinks().map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className="text-gray-700 hover:text-gray-900 px-3 py-2 rounded-md text-sm font-medium transition-colors"
              >
                {link.label}
              </Link>
            ))}
            
            <UserMenu />
          </div>
        </div>
      </div>
    </nav>
  );
}