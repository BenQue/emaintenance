# E-Maintenance System Project Overview

## Project Purpose
Enterprise equipment maintenance management system (企业设备维修管理程序) - A comprehensive full-stack application with microservices architecture providing complete equipment maintenance work order management, user role-based access control, KPI monitoring, and mobile support.

## Current Status
- **Core Functionality Completion**: 85%
- **Test Coverage**: 63% (526 test files)
- **UI Redesign**: Complete (based on shadcn/ui v4)
- **Mobile Integration**: Flutter 3.22+ support
- **Production Readiness**: 75%

## System Architecture
- **Monorepo Management**: Turborepo-based with shared packages
- **Frontend**: Next.js 14+ with App Router and React 18+
- **Mobile**: Flutter 3.22+ cross-platform application  
- **Backend**: Microservices architecture (Node.js/Express)
  - user-service (Port 3001)
  - work-order-service (Port 3002) 
  - asset-service (Port 3003)
- **Database**: Centralized PostgreSQL 16+ with Prisma ORM
- **Authentication**: JWT-based stateless with RBAC
- **Caching**: Redis integration

## Key Features
1. **Work Order Management**: Create, assign, track maintenance requests
2. **User & Permission Management**: JWT auth with role-based access (EMPLOYEE, TECHNICIAN, SUPERVISOR, ADMIN)
3. **KPI Dashboard**: Real-time work order statistics and performance tracking
4. **Asset Management**: Equipment info, QR codes, maintenance history
5. **Mobile Support**: Flutter native app with offline work and QR scanning