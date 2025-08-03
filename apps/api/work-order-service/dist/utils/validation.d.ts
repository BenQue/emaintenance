import { z } from 'zod';
export declare const PrioritySchema: any;
export declare const WorkOrderStatusSchema: any;
export declare const CreateWorkOrderSchema: any;
export declare const UpdateWorkOrderSchema: any;
export declare const WorkOrderQuerySchema: any;
export declare const AssignWorkOrderSchema: any;
export declare const UpdateWorkOrderStatusSchema: any;
export declare const FileUploadSchema: any;
export declare const IdParamSchema: any;
export type CreateWorkOrderInput = z.infer<typeof CreateWorkOrderSchema>;
export type UpdateWorkOrderInput = z.infer<typeof UpdateWorkOrderSchema>;
export type WorkOrderQueryInput = z.infer<typeof WorkOrderQuerySchema>;
export type AssignWorkOrderInput = z.infer<typeof AssignWorkOrderSchema>;
export type UpdateWorkOrderStatusInput = z.infer<typeof UpdateWorkOrderStatusSchema>;
export type FileUploadInput = z.infer<typeof FileUploadSchema>;
export type IdParamInput = z.infer<typeof IdParamSchema>;
//# sourceMappingURL=validation.d.ts.map