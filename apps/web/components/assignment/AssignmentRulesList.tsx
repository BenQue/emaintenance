'use client';

import React, { useEffect, useState } from 'react';
import { useAssignmentStore } from '../../lib/stores/assignment-store';
import { AssignmentRule } from '../../lib/types/assignment';

interface AssignmentRulesListProps {
  onEdit: (rule: AssignmentRule) => void;
  onDelete: (rule: AssignmentRule) => void;
}

export default function AssignmentRulesList({ onEdit, onDelete }: AssignmentRulesListProps) {
  const {
    rules,
    rulesLoading,
    rulesError,
    totalRules,
    currentPage,
    pageLimit,
    loadRules,
    setCurrentPage,
  } = useAssignmentStore();

  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);

  useEffect(() => {
    loadRules(currentPage);
  }, [loadRules, currentPage]);

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
  };

  const handleDelete = (rule: AssignmentRule) => {
    if (deleteConfirm === rule.id) {
      onDelete(rule);
      setDeleteConfirm(null);
    } else {
      setDeleteConfirm(rule.id);
    }
  };

  const totalPages = Math.ceil(totalRules / pageLimit);

  if (rulesLoading && rules.length === 0) {
    return (
      <div className="flex justify-center items-center py-8">
        <div className="text-gray-500">加载中...</div>
      </div>
    );
  }

  if (rulesError) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-md p-4">
        <div className="text-red-800">
          <strong>错误:</strong> {rulesError}
        </div>
        <button
          onClick={() => loadRules(currentPage)}
          className="mt-2 text-sm text-red-600 hover:text-red-800 underline"
        >
          重试
        </button>
      </div>
    );
  }

  if (rules.length === 0) {
    return (
      <div className="text-center py-8">
        <div className="text-gray-500 mb-4">暂无分配规则</div>
        <p className="text-sm text-gray-400">
          点击"创建规则"按钮添加第一个自动分配规则
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Rules Table */}
      <div className="bg-white shadow overflow-hidden sm:rounded-md">
        <ul className="divide-y divide-gray-200">
          {rules.map((rule) => (
            <li key={rule.id} className="px-6 py-4">
              <div className="flex items-center justify-between">
                <div className="flex-1">
                  <div className="flex items-center">
                    <h3 className="text-lg font-medium text-gray-900">
                      {rule.name}
                    </h3>
                    <span
                      className={`ml-2 inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                        rule.isActive
                          ? 'bg-green-100 text-green-800'
                          : 'bg-gray-100 text-gray-800'
                      }`}
                    >
                      {rule.isActive ? '启用' : '禁用'}
                    </span>
                    <span className="ml-2 inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                      优先级: {rule.priority}
                    </span>
                  </div>
                  
                  <div className="mt-2">
                    <p className="text-sm text-gray-600">
                      指定技术员: {rule.assignTo.firstName} {rule.assignTo.lastName}
                    </p>
                    
                    <div className="mt-1 flex flex-wrap gap-4 text-sm text-gray-500">
                      {rule.categories.length > 0 && (
                        <span>类别: {rule.categories.join(', ')}</span>
                      )}
                      {rule.priorities.length > 0 && (
                        <span>优先级: {rule.priorities.join(', ')}</span>
                      )}
                      {rule.locations.length > 0 && (
                        <span>位置: {rule.locations.join(', ')}</span>
                      )}
                      {rule.assetTypes.length > 0 && (
                        <span>设备类型: {rule.assetTypes.join(', ')}</span>
                      )}
                    </div>
                  </div>
                  
                  <div className="mt-1 text-xs text-gray-400">
                    创建时间: {new Date(rule.createdAt).toLocaleString('zh-CN')}
                  </div>
                </div>
                
                <div className="flex items-center space-x-2">
                  <button
                    onClick={() => onEdit(rule)}
                    className="text-blue-600 hover:text-blue-800 text-sm font-medium"
                  >
                    编辑
                  </button>
                  <button
                    onClick={() => handleDelete(rule)}
                    className={`text-sm font-medium ${
                      deleteConfirm === rule.id
                        ? 'text-red-800 bg-red-100 px-2 py-1 rounded'
                        : 'text-red-600 hover:text-red-800'
                    }`}
                  >
                    {deleteConfirm === rule.id ? '确认删除' : '删除'}
                  </button>
                  {deleteConfirm === rule.id && (
                    <button
                      onClick={() => setDeleteConfirm(null)}
                      className="text-gray-600 hover:text-gray-800 text-sm"
                    >
                      取消
                    </button>
                  )}
                </div>
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
            {Math.min(currentPage * pageLimit, totalRules)} 条，共 {totalRules} 条记录
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