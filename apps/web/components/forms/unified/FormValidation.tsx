"use client"

// React Hook Form 验证规则 (不使用 zod)
export const commonValidationRules = {
  email: {
    required: "邮箱为必填项",
    pattern: {
      value: /^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i,
      message: "请输入有效的邮箱地址"
    }
  },
  
  password: {
    required: "密码为必填项",
    minLength: {
      value: 8,
      message: "密码至少8位"
    },
    maxLength: {
      value: 100,
      message: "密码不能超过100位"
    }
  },
    
  required: (fieldName: string) => ({
    required: `${fieldName}为必填项`
  }),
    
  phoneNumber: {
    required: "手机号码为必填项",
    pattern: {
      value: /^1[3-9]\d{9}$/,
      message: "请输入有效的手机号码"
    }
  },
    
  positiveNumber: {
    required: "此项为必填",
    min: {
      value: 0.01,
      message: "请输入正数"
    }
  },
    
  nonNegativeNumber: {
    min: {
      value: 0,
      message: "不能为负数"
    }
  },
    
  date: {
    required: "请选择日期"
  },
    
  select: (fieldName: string) => ({
    required: `请选择${fieldName}`
  }),
    
  textarea: (fieldName: string, minLength = 1, maxLength = 1000) => ({
    required: `${fieldName}为必填项`,
    minLength: {
      value: minLength,
      message: `${fieldName}至少${minLength}个字符`
    },
    maxLength: {
      value: maxLength,
      message: `${fieldName}不能超过${maxLength}个字符`
    }
  }),
}

// 工单相关验证规则
export const workOrderValidationRules = {
  title: commonValidationRules.required("工单标题"),
  description: commonValidationRules.textarea("工单描述", 10, 2000),
  priority: commonValidationRules.select("优先级"),
  category: commonValidationRules.select("分类"),
  assigneeId: commonValidationRules.select("指派技术员"),
  assetId: commonValidationRules.select("关联资产"),
  status: commonValidationRules.select("状态"),
  resolution: commonValidationRules.textarea("解决方案", 10, 1000),
  completionNotes: commonValidationRules.textarea("完成备注", 1, 500),
}

// 资产相关验证规则
export const assetValidationRules = {
  name: commonValidationRules.required("资产名称"),
  code: commonValidationRules.required("资产编码"),
  category: commonValidationRules.select("资产类别"),
  location: commonValidationRules.required("资产位置"),
  description: commonValidationRules.textarea("资产描述", 1, 500),
  status: commonValidationRules.select("资产状态"),
}

// 用户相关验证规则
export const userValidationRules = {
  name: commonValidationRules.required("姓名"),
  email: commonValidationRules.email,
  phone: commonValidationRules.phoneNumber,
  role: commonValidationRules.select("角色"),
  department: commonValidationRules.required("部门"),
}

// 分配规则验证
export const assignmentRuleValidationRules = {
  name: commonValidationRules.required("规则名称"),
  description: commonValidationRules.textarea("规则描述", 1, 300),
  condition: commonValidationRules.select("条件"),
  assigneeId: commonValidationRules.select("指派技术员"),
  priority: commonValidationRules.positiveNumber,
}

// 表单错误信息格式化
export function formatValidationErrors(errors: any): string {
  if (!errors || typeof errors !== 'object') {
    return "表单验证失败"
  }
  
  const errorMessages = Object.values(errors)
    .map((error: any) => error?.message || "未知错误")
    .filter(Boolean)
  
  return errorMessages.length > 0 
    ? errorMessages.join("; ") 
    : "表单验证失败"
}

// 表单状态管理辅助函数
export function getFormErrorState(errors: any) {
  return {
    hasErrors: Object.keys(errors).length > 0,
    errorCount: Object.keys(errors).length,
    firstError: Object.values(errors)[0] as any,
  }
}

// 实时验证配置
export const validationConfig = {
  mode: 'onChange' as const,
  reValidateMode: 'onChange' as const,
  criteriaMode: 'firstError' as const,
  shouldFocusError: true,
  shouldUnregister: false,
}

// 自定义验证器
export const customValidators = {
  // 验证文件大小 (bytes)
  fileSize: (maxSize: number) => (files: FileList | null) => {
    if (!files || files.length === 0) return true
    const file = files[0]
    return file.size <= maxSize || `文件大小不能超过 ${Math.round(maxSize / 1024 / 1024)} MB`
  },

  // 验证文件类型
  fileType: (allowedTypes: string[]) => (files: FileList | null) => {
    if (!files || files.length === 0) return true
    const file = files[0]
    return allowedTypes.includes(file.type) || `只支持 ${allowedTypes.join(', ')} 格式`
  },

  // 验证多个文件数量
  fileCount: (maxCount: number) => (files: FileList | null) => {
    if (!files) return true
    return files.length <= maxCount || `最多只能选择 ${maxCount} 个文件`
  },

  // 验证日期范围
  dateRange: (startDate: Date | null, endDate: Date | null) => (date: Date) => {
    if (!date) return true
    if (startDate && date < startDate) return `日期不能早于 ${startDate.toLocaleDateString()}`
    if (endDate && date > endDate) return `日期不能晚于 ${endDate.toLocaleDateString()}`
    return true
  },

  // 验证未来日期
  futureDate: (date: Date | null) => {
    if (!date) return true
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    return date >= today || '日期不能早于今天'
  },

  // 验证过去日期
  pastDate: (date: Date | null) => {
    if (!date) return true
    const today = new Date()
    today.setHours(23, 59, 59, 999)
    return date <= today || '日期不能晚于今天'
  },

  // 验证QR码格式 (简单)
  qrCode: (value: string) => {
    if (!value) return true
    return /^[A-Za-z0-9-_]{6,20}$/.test(value) || 'QR码格式无效，只能包含字母、数字、破折号和下划线，长度6-20位'
  },

  // 验证中文姓名
  chineseName: (value: string) => {
    if (!value) return true
    return /^[\u4e00-\u9fa5]{2,10}$/.test(value) || '请输入有效的中文姓名（2-10个字符）'
  },

  // 验证身份证号
  idCard: (value: string) => {
    if (!value) return true
    return /^[1-9]\d{5}(18|19|20)\d{2}((0[1-9])|(1[0-2]))(([0-2][1-9])|10|20|30|31)\d{3}[0-9Xx]$/.test(value) || '请输入有效的身份证号码'
  },
}

// 错误消息国际化（预留）
export const validationMessages = {
  required: '此项为必填',
  email: '请输入有效的邮箱地址',
  minLength: '输入长度不足',
  maxLength: '输入长度超限',
  pattern: '格式不正确',
  min: '数值过小',
  max: '数值过大',
  fileSize: '文件过大',
  fileType: '文件格式不支持',
}

// 验证错误提示样式配置
export const validationStyles = {
  errorBorder: 'border-red-500 focus:border-red-500 focus:ring-red-500',
  successBorder: 'border-green-500 focus:border-green-500 focus:ring-green-500',
  errorText: 'text-red-600 text-sm mt-1',
  successText: 'text-green-600 text-sm mt-1',
  errorIcon: 'text-red-500',
  successIcon: 'text-green-500',
}

// 表单字段验证辅助函数
export function validateField(value: any, rules: any): { isValid: boolean; error?: string } {
  if (!rules) return { isValid: true }

  // Required validation
  if (rules.required && (!value || (typeof value === 'string' && !value.trim()))) {
    return { isValid: false, error: rules.required }
  }

  // Only validate other rules if value exists
  if (!value && typeof value !== 'number') return { isValid: true }

  // MinLength validation
  if (rules.minLength && value.length < rules.minLength.value) {
    return { isValid: false, error: rules.minLength.message }
  }

  // MaxLength validation
  if (rules.maxLength && value.length > rules.maxLength.value) {
    return { isValid: false, error: rules.maxLength.message }
  }

  // Pattern validation
  if (rules.pattern && !rules.pattern.value.test(value)) {
    return { isValid: false, error: rules.pattern.message }
  }

  // Min value validation
  if (rules.min && Number(value) < rules.min.value) {
    return { isValid: false, error: rules.min.message }
  }

  // Max value validation
  if (rules.max && Number(value) > rules.max.value) {
    return { isValid: false, error: rules.max.message }
  }

  return { isValid: true }
}