import React from 'react';

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-gray-50">
      {/* Navigation placeholder - would be implemented in a real app */}
      <nav className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center">
              <h1 className="text-xl font-semibold text-gray-900">设备维护管理系统</h1>
            </div>
            <div className="flex items-center space-x-4">
              <a 
                href="/dashboard/assignment-rules" 
                className="text-gray-700 hover:text-gray-900 px-3 py-2 rounded-md text-sm font-medium"
              >
                分配规则
              </a>
              <a 
                href="/dashboard/work-orders" 
                className="text-gray-700 hover:text-gray-900 px-3 py-2 rounded-md text-sm font-medium"
              >
                工单管理
              </a>
              <a 
                href="/dashboard/notifications" 
                className="text-gray-700 hover:text-gray-900 px-3 py-2 rounded-md text-sm font-medium"
              >
                通知中心
              </a>
            </div>
          </div>
        </div>
      </nav>
      
      {/* Main content */}
      <main>{children}</main>
    </div>
  );
}