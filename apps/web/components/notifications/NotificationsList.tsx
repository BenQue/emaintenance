'use client';

import React, { useEffect } from 'react';
import { useNotificationStore } from '../../lib/stores/notification-store';
import { NOTIFICATION_TYPE_LABELS } from '../../lib/types/notification';

export default function NotificationsList() {
  const {
    notifications,
    notificationsLoading,
    notificationsError,
    totalNotifications,
    currentPage,
    pageLimit,
    loadNotifications,
    markAsRead,
    markAllAsRead,
    setCurrentPage,
    clearError,
  } = useNotificationStore();

  useEffect(() => {
    loadNotifications(currentPage);
  }, [loadNotifications, currentPage]);

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
  };

  const handleMarkAsRead = async (id: string) => {
    await markAsRead(id);
  };

  const handleMarkAllAsRead = async () => {
    await markAllAsRead();
  };

  const totalPages = Math.ceil(totalNotifications / pageLimit);
  const unreadCount = notifications.filter(n => !n.isRead).length;

  if (notificationsLoading && notifications.length === 0) {
    return (
      <div className="flex justify-center items-center py-8">
        <div className="text-gray-500">加载中...</div>
      </div>
    );
  }

  if (notificationsError) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-md p-4">
        <div className="text-red-800">
          <strong>错误:</strong> {notificationsError}
        </div>
        <button
          onClick={() => {
            clearError();
            loadNotifications(currentPage);
          }}
          className="mt-2 text-sm text-red-600 hover:text-red-800 underline"
        >
          重试
        </button>
      </div>
    );
  }

  if (notifications.length === 0) {
    return (
      <div className="text-center py-8">
        <div className="text-gray-500 mb-4">暂无通知</div>
        <p className="text-sm text-gray-400">
          当有新的工单分配或状态更新时，您会在这里收到通知
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header Actions */}
      <div className="flex justify-between items-center">
        <div className="text-sm text-gray-600">
          共 {totalNotifications} 条通知，{unreadCount} 条未读
        </div>
        {unreadCount > 0 && (
          <button
            onClick={handleMarkAllAsRead}
            className="text-sm text-blue-600 hover:text-blue-800 font-medium"
          >
            全部标为已读
          </button>
        )}
      </div>

      {/* Notifications List */}
      <div className="bg-white shadow overflow-hidden sm:rounded-md">
        <ul className="divide-y divide-gray-200">
          {notifications.map((notification) => (
            <li
              key={notification.id}
              className={`px-6 py-4 hover:bg-gray-50 ${
                !notification.isRead ? 'bg-blue-50' : ''
              }`}
            >
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center">
                    <h3 className={`text-sm font-medium ${
                      !notification.isRead ? 'text-gray-900' : 'text-gray-700'
                    }`}>
                      {notification.title}
                    </h3>
                    {!notification.isRead && (
                      <span className="ml-2 inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                        新
                      </span>
                    )}
                    <span className="ml-2 inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                      {NOTIFICATION_TYPE_LABELS[notification.type]}
                    </span>
                  </div>
                  
                  <p className={`mt-1 text-sm ${
                    !notification.isRead ? 'text-gray-900' : 'text-gray-600'
                  }`}>
                    {notification.message}
                  </p>
                  
                  {notification.workOrder && (
                    <div className="mt-2">
                      <a
                        href={`/dashboard/work-orders/${notification.workOrderId}`}
                        className="text-sm text-blue-600 hover:text-blue-800"
                      >
                        查看工单: {notification.workOrder.title}
                      </a>
                    </div>
                  )}
                  
                  <div className="mt-1 text-xs text-gray-400">
                    {new Date(notification.createdAt).toLocaleString('zh-CN')}
                  </div>
                </div>
                
                {!notification.isRead && (
                  <div className="ml-4">
                    <button
                      onClick={() => handleMarkAsRead(notification.id)}
                      className="text-sm text-blue-600 hover:text-blue-800 font-medium"
                    >
                      标为已读
                    </button>
                  </div>
                )}
              </div>
            </li>
          ))}
        </ul>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between">
          <div className="text-sm text-gray-700">
            显示 {(currentPage - 1) * pageLimit + 1} 到{' '}
            {Math.min(currentPage * pageLimit, totalNotifications)} 条，共 {totalNotifications} 条通知
          </div>
          <div className="flex space-x-1">
            <button
              onClick={() => handlePageChange(currentPage - 1)}
              disabled={currentPage === 1}
              className="px-3 py-1 text-sm border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              上一页
            </button>
            
            {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
              <button
                key={page}
                onClick={() => handlePageChange(page)}
                className={`px-3 py-1 text-sm border rounded-md ${
                  page === currentPage
                    ? 'bg-blue-600 text-white border-blue-600'
                    : 'border-gray-300 hover:bg-gray-50'
                }`}
              >
                {page}
              </button>
            ))}
            
            <button
              onClick={() => handlePageChange(currentPage + 1)}
              disabled={currentPage === totalPages}
              className="px-3 py-1 text-sm border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              下一页
            </button>
          </div>
        </div>
      )}
    </div>
  );
}