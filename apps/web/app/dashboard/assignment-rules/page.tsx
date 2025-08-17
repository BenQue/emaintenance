'use client';

import React, { useState } from 'react';
import { useAssignmentStore } from '../../../lib/stores/assignment-store';
import { AssignmentRule, CreateAssignmentRuleRequest, UpdateAssignmentRuleRequest } from '../../../lib/types/assignment';
import AssignmentRulesList from '../../../components/assignment/AssignmentRulesList';
import AssignmentRuleForm from '../../../components/assignment/AssignmentRuleForm';

type ViewMode = 'list' | 'create' | 'edit';

export default function AssignmentRulesPage() {
  const { createRule, updateRule, deleteRule, rulesError, clearError } = useAssignmentStore();
  
  const [viewMode, setViewMode] = useState<ViewMode>('list');
  const [editingRule, setEditingRule] = useState<AssignmentRule | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const handleCreate = () => {
    setEditingRule(null);
    setViewMode('create');
    clearError();
    setSuccessMessage(null);
  };

  const handleEdit = (rule: AssignmentRule) => {
    setEditingRule(rule);
    setViewMode('edit');
    clearError();
    setSuccessMessage(null);
  };

  const handleDelete = async (rule: AssignmentRule) => {
    try {
      await deleteRule(rule.id);
      setSuccessMessage(`规则 "${rule.name}" 已删除`);
      setTimeout(() => setSuccessMessage(null), 3000);
    } catch (error) {
      console.error('Delete failed:', error);
    }
  };

  const handleSubmit = async (data: CreateAssignmentRuleRequest | UpdateAssignmentRuleRequest) => {
    try {
      if (viewMode === 'create') {
        await createRule(data as CreateAssignmentRuleRequest);
        setSuccessMessage('规则创建成功');
      } else if (viewMode === 'edit' && editingRule) {
        await updateRule(editingRule.id, data as UpdateAssignmentRuleRequest);
        setSuccessMessage('规则更新成功');
      }
      
      setViewMode('list');
      setEditingRule(null);
      setTimeout(() => setSuccessMessage(null), 3000);
    } catch (error) {
      console.error('Submit failed:', error);
      // Error will be shown by the store
    }
  };

  const handleCancel = () => {
    setViewMode('list');
    setEditingRule(null);
    clearError();
  };

  return (
    <div className="flex flex-1 flex-col">
      {/* Page Header */}
      <div className="flex flex-col gap-4 p-4 md:gap-8 md:p-6">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div className="space-y-2">
            <div>
              <h1 className="text-3xl font-bold tracking-tight">分配规则</h1>
              <p className="text-muted-foreground">
                {viewMode === 'list' 
                  ? '管理工单自动分配规则，确保每个任务都有明确的负责人'
                  : '配置匹配条件和指定技术员，系统将根据规则自动分配新的工单'
                }
              </p>
            </div>
          </div>
          
          {viewMode === 'list' && (
            <div className="flex items-center gap-2">
              <button
                onClick={handleCreate}
                className="bg-primary hover:bg-primary/90 text-primary-foreground px-4 py-2 rounded-md font-medium flex items-center gap-2 transition-colors"
              >
                创建规则
              </button>
            </div>
          )}
        </div>

        {/* Page Content */}
        <div className="space-y-6">

      {/* Success Message */}
      {successMessage && (
        <div className="mb-6 bg-green-50 border border-green-200 rounded-md p-4">
          <div className="text-green-800">{successMessage}</div>
        </div>
      )}

      {/* Error Message */}
      {rulesError && (
        <div className="mb-6 bg-red-50 border border-red-200 rounded-md p-4">
          <div className="text-red-800">
            <strong>错误:</strong> {rulesError}
          </div>
        </div>
      )}

      {/* Content */}
      <div className="bg-white shadow rounded-lg">
        {viewMode === 'list' ? (
          <div className="p-6">
            <AssignmentRulesList onEdit={handleEdit} onDelete={handleDelete} />
          </div>
        ) : (
          <div className="p-6">
            <AssignmentRuleForm
              rule={editingRule || undefined}
              onSubmit={handleSubmit}
              onCancel={handleCancel}
            />
          </div>
        )}
      </div>

          {/* Breadcrumb for non-list views */}
          {viewMode !== 'list' && (
            <nav className="mb-4">
              <button
                onClick={handleCancel}
                className="text-primary hover:text-primary/80 text-sm"
              >
                ← 返回规则列表
              </button>
            </nav>
          )}

          {/* Help Text */}
          {viewMode === 'list' && (
            <div className="bg-blue-50 border border-blue-200 rounded-md p-4">
              <h3 className="text-sm font-medium text-blue-800 mb-2">规则说明</h3>
              <ul className="text-sm text-blue-700 space-y-1">
                <li>• 规则按优先级从高到低顺序执行，数值越大优先级越高</li>
                <li>• 工单创建时会自动匹配激活的规则，找到第一个匹配的规则后停止</li>
                <li>• 至少需要指定一个匹配条件（类别、优先级、位置或设备类型）</li>
                <li>• 只有技术员角色的用户可以被指定为工单负责人</li>
              </ul>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}