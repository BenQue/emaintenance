import { toast } from 'sonner';

export const showToast = {
  success: (message: string, description?: string) => {
    toast.success(message, {
      description,
      duration: 4000,
    });
  },

  error: (message: string, description?: string) => {
    toast.error(message, {
      description,
      duration: 5000,
    });
  },

  info: (message: string, description?: string) => {
    toast.info(message, {
      description,
      duration: 4000,
    });
  },

  warning: (message: string, description?: string) => {
    toast.warning(message, {
      description,
      duration: 4000,
    });
  },

  loading: (message: string) => {
    return toast.loading(message);
  },

  promise: <T>(
    promise: Promise<T>,
    {
      loading,
      success,
      error,
    }: {
      loading: string;
      success: string | ((data: T) => string);
      error: string | ((error: any) => string);
    }
  ) => {
    return toast.promise(promise, {
      loading,
      success,
      error,
    });
  },
};

// Form-specific toast utilities
export const formToast = {
  saveSuccess: (entityName: string) => {
    showToast.success(
      `${entityName}保存成功`,
      '数据已成功保存到系统中'
    );
  },

  saveError: (entityName: string, error?: string) => {
    // Sanitize error message to prevent XSS and avoid exposing sensitive info
    const sanitizedError = error ? 
      error.replace(/[<>]/g, '').slice(0, 200) : 
      '请检查输入信息并重试';
    
    showToast.error(
      `${entityName}保存失败`,
      sanitizedError
    );
  },

  updateSuccess: (entityName: string) => {
    showToast.success(
      `${entityName}更新成功`,
      '数据已成功更新'
    );
  },

  updateError: (entityName: string, error?: string) => {
    const sanitizedError = error ? 
      error.replace(/[<>]/g, '').slice(0, 200) : 
      '请检查输入信息并重试';
    
    showToast.error(
      `${entityName}更新失败`,
      sanitizedError
    );
  },

  deleteSuccess: (entityName: string) => {
    showToast.success(
      `${entityName}删除成功`,
      '数据已从系统中移除'
    );
  },

  deleteError: (entityName: string, error?: string) => {
    const sanitizedError = error ? 
      error.replace(/[<>]/g, '').slice(0, 200) : 
      '删除操作失败，请重试';
    
    showToast.error(
      `${entityName}删除失败`,
      sanitizedError
    );
  },

  validationError: (message: string = '请检查表单输入') => {
    showToast.error(
      '表单验证失败',
      message
    );
  },

  submitProgress: (message: string) => {
    return showToast.loading(message);
  },
};