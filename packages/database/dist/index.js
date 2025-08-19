"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __exportStar = (this && this.__exportStar) || function(m, exports) {
    for (var p in m) if (p !== "default" && !Object.prototype.hasOwnProperty.call(exports, p)) __createBinding(exports, m, p);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.NotificationType = exports.FaultCode = exports.Priority = exports.WorkOrderStatus = exports.UserRole = exports.prisma = void 0;
const client_1 = require("@prisma/client");
const globalForPrisma = globalThis;
exports.prisma = globalForPrisma.prisma ??
    new client_1.PrismaClient({
        log: ['query', 'error', 'warn'],
    });
if (process.env.NODE_ENV !== 'production')
    globalForPrisma.prisma = exports.prisma;
// Export Prisma client types
__exportStar(require("@prisma/client"), exports);
var UserRole;
(function (UserRole) {
    UserRole["EMPLOYEE"] = "EMPLOYEE";
    UserRole["TECHNICIAN"] = "TECHNICIAN";
    UserRole["SUPERVISOR"] = "SUPERVISOR";
    UserRole["ADMIN"] = "ADMIN";
})(UserRole || (exports.UserRole = UserRole = {}));
var WorkOrderStatus;
(function (WorkOrderStatus) {
    WorkOrderStatus["PENDING"] = "PENDING";
    WorkOrderStatus["IN_PROGRESS"] = "IN_PROGRESS";
    WorkOrderStatus["WAITING_PARTS"] = "WAITING_PARTS";
    WorkOrderStatus["WAITING_EXTERNAL"] = "WAITING_EXTERNAL";
    WorkOrderStatus["COMPLETED"] = "COMPLETED";
    WorkOrderStatus["CANCELLED"] = "CANCELLED";
})(WorkOrderStatus || (exports.WorkOrderStatus = WorkOrderStatus = {}));
var Priority;
(function (Priority) {
    Priority["LOW"] = "LOW";
    Priority["MEDIUM"] = "MEDIUM";
    Priority["HIGH"] = "HIGH";
    Priority["URGENT"] = "URGENT";
})(Priority || (exports.Priority = Priority = {}));
var FaultCode;
(function (FaultCode) {
    FaultCode["MECHANICAL_FAILURE"] = "MECHANICAL_FAILURE";
    FaultCode["ELECTRICAL_FAILURE"] = "ELECTRICAL_FAILURE";
    FaultCode["SOFTWARE_ISSUE"] = "SOFTWARE_ISSUE";
    FaultCode["WEAR_AND_TEAR"] = "WEAR_AND_TEAR";
    FaultCode["USER_ERROR"] = "USER_ERROR";
    FaultCode["PREVENTIVE_MAINTENANCE"] = "PREVENTIVE_MAINTENANCE";
    FaultCode["EXTERNAL_FACTOR"] = "EXTERNAL_FACTOR";
    FaultCode["OTHER"] = "OTHER";
})(FaultCode || (exports.FaultCode = FaultCode = {}));
var NotificationType;
(function (NotificationType) {
    NotificationType["WORK_ORDER_ASSIGNED"] = "WORK_ORDER_ASSIGNED";
    NotificationType["WORK_ORDER_UPDATED"] = "WORK_ORDER_UPDATED";
    NotificationType["SYSTEM_ALERT"] = "SYSTEM_ALERT";
})(NotificationType || (exports.NotificationType = NotificationType = {}));
exports.default = exports.prisma;
