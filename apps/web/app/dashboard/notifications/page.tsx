'use client';

import React, { useEffect } from 'react';
import { useNotificationStore } from '../../../lib/stores/notification-store';
import NotificationsList from '../../../components/notifications/NotificationsList';

export default function NotificationsPage() {
  const { stats, loadStats, statsLoading } = useNotificationStore();

  useEffect(() => {
    loadStats();
  }, [loadStats]);

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">通知中心</h1>
        <p className="mt-2 text-gray-600">
          查看工单分配、状态更新和系统通知
        </p>
      </div>

      {/* Stats */}
      {stats && !statsLoading && (
        <div className="mb-8 grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-white overflow-hidden shadow rounded-lg">
            <div className="p-5">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <div className="w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center">
                    <span className="text-white text-sm font-medium">{stats.total}</span>
                  </div>
                </div>
                <div className="ml-5 w-0 flex-1">
                  <dl>
                    <dt className="text-sm font-medium text-gray-500 truncate">
                      总通知数
                    </dt>
                    <dd className="text-lg font-medium text-gray-900">
                      {stats.total}
                    </dd>
                  </dl>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-white overflow-hidden shadow rounded-lg">
            <div className="p-5">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <div className="w-8 h-8 bg-orange-500 rounded-full flex items-center justify-center">
                    <span className="text-white text-sm font-medium">{stats.unread}</span>
                  </div>
                </div>
                <div className="ml-5 w-0 flex-1">
                  <dl>
                    <dt className="text-sm font-medium text-gray-500 truncate">
                      未读通知
                    </dt>
                    <dd className="text-lg font-medium text-gray-900">
                      {stats.unread}
                    </dd>
                  </dl>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-white overflow-hidden shadow rounded-lg">
            <div className="p-5">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <div className="w-8 h-8 bg-green-500 rounded-full flex items-center justify-center">
                    <span className="text-white text-sm font-medium">
                      {stats.byType.WORK_ORDER_ASSIGNED}
                    </span>
                  </div>
                </div>
                <div className="ml-5 w-0 flex-1">
                  <dl>
                    <dt className="text-sm font-medium text-gray-500 truncate">
                      工单分配
                    </dt>
                    <dd className="text-lg font-medium text-gray-900">
                      {stats.byType.WORK_ORDER_ASSIGNED}
                    </dd>
                  </dl>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Notifications List */}
      <div className="bg-white shadow rounded-lg p-6">
        <NotificationsList />
      </div>
    </div>
  );
}