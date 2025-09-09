# Code Conventions and Patterns

## Naming Conventions
- **Variables & Functions**: camelCase (e.g., `getUserData`, `workOrderStatus`)
- **Components & Classes**: PascalCase (e.g., `WorkOrderCard`, `UserController`)  
- **Constants**: UPPER_SNAKE_CASE (e.g., `DATABASE_URL`, `JWT_SECRET`)
- **File Names**: kebab-case for components (e.g., `work-order-card.tsx`), PascalCase for classes (e.g., `UserService.ts`)
- **Database Fields**: snake_case in Prisma schema, camelCase in TypeScript

## Project Structure Patterns

### Monorepo Organization
```
apps/
├── web/           # Next.js web application
├── mobile/        # Flutter mobile application
└── api/           # Microservices
    ├── user-service/
    ├── work-order-service/
    └── asset-service/

packages/
├── database/      # Shared Prisma schema
├── shared/        # Shared utilities and types  
├── typescript-config/
└── eslint-config/
```

### Backend Service Pattern (Controller-Service-Repository)
```
src/
├── controllers/   # HTTP request handlers
├── services/      # Business logic layer
├── repositories/  # Data access layer (Prisma)
├── routes/        # Express route definitions
├── utils/         # Shared utilities
├── types/         # TypeScript definitions
└── __tests__/     # Integration tests
```

### Frontend Component Organization
```
apps/web/components/
├── ui/            # Base UI components (buttons, cards)
├── layout/        # Layout components (navigation, headers)
├── work-orders/   # Feature-specific components
├── assets/        # Asset management components
├── kpi/           # Dashboard components
└── forms/         # Reusable form components
```

## TypeScript Patterns

### Strict Mode Configuration
- `strict: true` enabled in all tsconfig files
- `strictNullChecks: true` for null safety
- Explicit type annotations required for function parameters
- No `any` types allowed in production code

### Common Type Patterns
```typescript
// API Response Types
interface ApiResponse<T> {
  success: boolean;
  data: T;
  message?: string;
}

// Zustand Store Pattern
interface StoreState {
  // State
  data: T[];
  loading: boolean;
  error: string | null;
  
  // Actions  
  loadData: () => Promise<void>;
  updateData: (id: string, data: Partial<T>) => Promise<void>;
}

// Validation Schema Pattern (Zod)
const createUserSchema = z.object({
  email: z.string().email(),
  name: z.string().min(1),
  role: z.enum(['EMPLOYEE', 'TECHNICIAN', 'SUPERVISOR', 'ADMIN'])
});
```

## React Patterns

### Component Structure
```typescript
// Functional component with TypeScript
interface ComponentProps {
  data: WorkOrder;
  onUpdate: (id: string) => void;
}

export function WorkOrderCard({ data, onUpdate }: ComponentProps) {
  // Component logic
  return (
    // JSX
  );
}
```

### State Management with Zustand
```typescript
// Domain-specific stores
const useWorkOrderStore = create<WorkOrderState>()(
  devtools((set, get) => ({
    // State
    workOrders: [],
    loading: false,
    
    // Actions
    loadWorkOrders: async () => {
      // Implementation
    }
  }))
);
```

### shadcn/ui Component Usage
```typescript
// Always include type annotations for Select handlers
<Select onValueChange={(value: string) => setValue(value)}>
  <SelectContent>
    <SelectItem value="option">Option</SelectItem>
  </SelectContent>
</Select>
```

## API Patterns

### Controller Pattern
```typescript
export class UserController {
  private userService: UserService;
  
  constructor() {
    this.userService = new UserService();
  }
  
  getUsers = async (req: Request, res: Response) => {
    try {
      // Validation
      const validationResult = userListQuerySchema.safeParse(req.query);
      
      // Service call
      const result = await this.userService.getUsers(validationResult.data);
      
      // Response
      res.json(createSuccessResponse(result));
    } catch (error) {
      // Error handling
    }
  };
}
```

### Service Layer Pattern  
```typescript
export class UserService {
  private userRepository: UserRepository;
  
  constructor() {
    this.userRepository = new UserRepository();
  }
  
  async getUsers(params: GetUsersParams) {
    // Business logic
    return await this.userRepository.findUsers(params);
  }
}
```

### Repository Pattern
```typescript
export class UserRepository {
  async findUsers(params: FindUsersParams) {
    return await prisma.user.findMany({
      where: {
        // Query conditions
      },
      select: {
        // Selected fields
      }
    });
  }
}
```

## Testing Patterns

### Jest Test Structure
```typescript
describe('UserService', () => {
  let userService: UserService;
  
  beforeEach(() => {
    userService = new UserService();
  });
  
  it('should create user successfully', async () => {
    // Test implementation
  });
});
```

### React Component Testing
```typescript
import { render, screen } from '@testing-library/react';
import { WorkOrderCard } from './WorkOrderCard';

describe('WorkOrderCard', () => {
  it('renders work order information', () => {
    render(<WorkOrderCard data={mockWorkOrder} onUpdate={jest.fn()} />);
    expect(screen.getByText(mockWorkOrder.title)).toBeInTheDocument();
  });
});
```

## Error Handling Patterns

### API Error Responses
```typescript
// Consistent error response format
interface ErrorResponse {
  success: false;
  message: string;
  code: number;
  details?: any;
}

// Validation error formatting
const formatValidationErrors = (error: ZodError) => {
  return error.errors.map(err => `${err.path.join('.')}: ${err.message}`).join(', ');
};
```

## Security Patterns

### JWT Authentication
```typescript
// Token validation middleware
const authenticateToken = (req: Request, res: Response, next: NextFunction) => {
  const token = req.headers.authorization?.replace('Bearer ', '');
  
  if (!token) {
    return res.status(401).json(createErrorResponse('Access token required', 401));
  }
  
  // Token verification logic
};
```

### Role-Based Access Control
```typescript
// RBAC middleware
const requireRole = (roles: UserRole[]) => {
  return (req: Request, res: Response, next: NextFunction) => {
    const userRole = (req as any).user.role;
    
    if (!roles.includes(userRole)) {
      return res.status(403).json(createErrorResponse('Insufficient permissions', 403));
    }
    
    next();
  };
};
```