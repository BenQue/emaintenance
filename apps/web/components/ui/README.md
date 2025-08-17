# UI Components Documentation

This directory contains the shadcn/ui components for the E-Maintenance System, integrated with BizLink brand colors.

## Components Overview

### Basic Components

#### Button
Modern button component with variants and sizes.

```tsx
import { Button } from "@/components/ui/button"

// Basic usage
<Button>Click me</Button>

// With variants
<Button variant="destructive">Delete</Button>
<Button variant="outline">Cancel</Button>
<Button variant="secondary">Secondary</Button>

// With sizes
<Button size="sm">Small</Button>
<Button size="lg">Large</Button>

// As child (for links)
<Button asChild>
  <a href="/dashboard">Dashboard</a>
</Button>
```

#### Card
Container component for content sections.

```tsx
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "@/components/ui/card"

<Card>
  <CardHeader>
    <CardTitle>Card Title</CardTitle>
    <CardDescription>Card description text</CardDescription>
  </CardHeader>
  <CardContent>
    <p>Card content goes here</p>
  </CardContent>
  <CardFooter>
    <Button>Action</Button>
  </CardFooter>
</Card>
```

#### Input
Form input component with error state support.

```tsx
import { Input } from "@/components/ui/input"

// Basic input
<Input placeholder="Enter text..." />

// With error state (backward compatibility)
<Input error placeholder="Invalid input" />

// Form integration
<Input 
  name="email"
  type="email"
  placeholder="your@email.com"
  aria-invalid={!!errors.email}
/>
```

#### Label
Accessible label component using Radix UI.

```tsx
import { Label } from "@/components/ui/label"

<Label htmlFor="email">Email Address</Label>
<Input id="email" type="email" />
```

#### Badge
Status and category indicator component.

```tsx
import { Badge } from "@/components/ui/badge"

<Badge>Default</Badge>
<Badge variant="secondary">Secondary</Badge>
<Badge variant="destructive">Error</Badge>
<Badge variant="outline">Outline</Badge>
```

### Advanced Components

#### Dialog
Modal dialog component using Radix UI.

```tsx
import { 
  Dialog, 
  DialogTrigger, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogDescription,
  DialogFooter 
} from "@/components/ui/dialog"

<Dialog>
  <DialogTrigger asChild>
    <Button>Open Dialog</Button>
  </DialogTrigger>
  <DialogContent>
    <DialogHeader>
      <DialogTitle>Dialog Title</DialogTitle>
      <DialogDescription>
        Dialog description text here.
      </DialogDescription>
    </DialogHeader>
    <div>Dialog content</div>
    <DialogFooter>
      <Button variant="outline">Cancel</Button>
      <Button>Confirm</Button>
    </DialogFooter>
  </DialogContent>
</Dialog>
```

#### Form
React Hook Form integration with validation.

```tsx
import { useForm } from "react-hook-form"
import { 
  Form, 
  FormControl, 
  FormDescription, 
  FormField, 
  FormItem, 
  FormLabel, 
  FormMessage 
} from "@/components/ui/form"

const form = useForm()

<Form {...form}>
  <form onSubmit={form.handleSubmit(onSubmit)}>
    <FormField
      control={form.control}
      name="username"
      render={({ field }) => (
        <FormItem>
          <FormLabel>Username</FormLabel>
          <FormControl>
            <Input placeholder="Enter username" {...field} />
          </FormControl>
          <FormDescription>
            This is your public display name.
          </FormDescription>
          <FormMessage />
        </FormItem>
      )}
    />
  </form>
</Form>
```

#### Table
Data table component with proper semantics.

```tsx
import {
  Table,
  TableBody,
  TableCaption,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"

<Table>
  <TableCaption>A list of recent work orders.</TableCaption>
  <TableHeader>
    <TableRow>
      <TableHead>ID</TableHead>
      <TableHead>Title</TableHead>
      <TableHead>Status</TableHead>
    </TableRow>
  </TableHeader>
  <TableBody>
    <TableRow>
      <TableCell>WO-001</TableCell>
      <TableCell>Repair equipment</TableCell>
      <TableCell>
        <Badge variant="secondary">In Progress</Badge>
      </TableCell>
    </TableRow>
  </TableBody>
</Table>
```

#### Alert
Notification and alert component.

```tsx
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { AlertCircle } from "lucide-react"

<Alert>
  <AlertCircle className="h-4 w-4" />
  <AlertTitle>Error</AlertTitle>
  <AlertDescription>
    Your session has expired. Please log in again.
  </AlertDescription>
</Alert>

<Alert variant="destructive">
  <AlertTitle>Critical Alert</AlertTitle>
  <AlertDescription>
    System maintenance required immediately.
  </AlertDescription>
</Alert>
```

#### Select
Dropdown selection component using Radix UI.

```tsx
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"

<Select>
  <SelectTrigger className="w-[180px]">
    <SelectValue placeholder="Select a status" />
  </SelectTrigger>
  <SelectContent>
    <SelectItem value="pending">Pending</SelectItem>
    <SelectItem value="progress">In Progress</SelectItem>
    <SelectItem value="completed">Completed</SelectItem>
  </SelectContent>
</Select>
```

## Brand Colors

The components use BizLink brand colors:

- **Primary**: `#1E88E5` (BizLink Blue)
- **Success**: `#2E7D32` (Green)
- **Warning**: `#F57C00` (Orange)  
- **Error**: `#C62828` (Red)
- **Info**: `#0097A7` (Cyan)

### Using Brand Colors

```tsx
// Tailwind classes
<Button className="bg-bizlink-500 hover:bg-bizlink-600">
  BizLink Blue Button
</Button>

<div className="text-functional-success">
  Success message
</div>

<Badge className="bg-functional-warning text-white">
  Warning
</Badge>
```

## TypeScript Support

All components are fully typed with TypeScript:

```tsx
import type { ButtonProps } from "@/components/ui/button"
import type { CardProps } from "@/components/ui/card"

// Component props are properly typed
const CustomButton: React.FC<ButtonProps> = (props) => {
  return <Button {...props} />
}
```

## Accessibility

All components follow accessibility best practices:

- Proper ARIA attributes
- Keyboard navigation support
- Screen reader compatibility
- Focus management
- Color contrast compliance

## Migration Notes

### From Legacy Components

The new shadcn/ui components maintain backward compatibility:

```tsx
// Legacy usage still works
<Button variant="default" size="lg">Button</Button>

// New features available
<Button asChild>
  <Link href="/dashboard">Dashboard</Link>
</Button>
```

### Breaking Changes

- `Card` now uses a flex layout by default
- `Input` error styling now uses `aria-invalid` instead of `error` prop (both supported)
- `Badge` now uses `span` instead of `div` (semantic improvement)

## Best Practices

1. **Import from the ui directory**: Always import from `@/components/ui/*`
2. **Use variants**: Leverage built-in variants instead of custom classes
3. **Compose complex components**: Build complex UI by composing these base components
4. **Follow the form pattern**: Use the `Form` components for all form implementations
5. **Brand consistency**: Use BizLink colors for primary actions and brand elements

## Dark/Light Theme System

This application includes a comprehensive dark/light theme system built with shadcn/ui and next-themes.

### Features

- **Automatic System Theme Detection**: Respects user's system preference
- **Manual Theme Toggle**: Users can manually switch between light, dark, and system themes
- **Persistent Theme Selection**: Theme preference is saved in localStorage
- **BizLink Brand Integration**: Custom color palette that works in both themes
- **Smooth Transitions**: Seamless switching between themes

### Components

#### ThemeProvider
Located at `components/ui/theme-provider.tsx`
- Wraps the entire application
- Provides theme context to all components
- Configured with `attribute="class"` for CSS class-based theming

#### ThemeToggle
Located at `components/ui/theme-toggle.tsx`
- Dropdown menu with light/dark/system options
- Sun/moon icons with smooth transitions
- Accessible with screen reader support
- Chinese interface (浅色/深色/系统)

### Usage

The theme system is automatically available throughout the application:

```tsx
// Theme toggle is already integrated in:
// 1. User menu dropdown (desktop)
// 2. Mobile navigation header

import { ThemeToggle } from '@/components/ui/theme-toggle';

// Use anywhere in your components
<ThemeToggle />
```

### Theme Configuration

#### CSS Variables (globals.css)
- `:root` - Light theme variables
- `.dark` - Dark theme variables
- All colors use HSL format for better manipulation

#### Tailwind Configuration
- `darkMode: ["class"]` enables class-based dark mode
- Custom BizLink brand colors with dark mode variants
- Sidebar, chart, and functional color support

### BizLink Brand Colors

#### Light Theme
- Primary: `#1E88E5` (BizLink Blue)
- Background: White
- Sidebar: Light gray

#### Dark Theme  
- Primary: Lighter blue for better contrast
- Background: Dark gray
- Sidebar: Darker with proper contrast ratios
- Borders: Softer gray (`240 3.7% 25%`) for reduced eye strain

### Best Practices for Theming

1. **Use CSS Variables**: Always use `hsl(var(--variable))` instead of hardcoded colors
2. **Test Both Themes**: Ensure all components work in both light and dark modes
3. **Accessibility**: Maintain proper contrast ratios in both themes
4. **Brand Consistency**: Use BizLink brand colors defined in the theme system

### Technical Implementation

The theme system uses:
- **next-themes**: For theme management and persistence
- **CSS Custom Properties**: For theme variables
- **Tailwind CSS**: For utility-first styling with dark mode support
- **Class-based switching**: `.dark` class toggles theme

## Development

To add new shadcn/ui components:

1. Use the shadcn/ui MCP service to get component source
2. Update imports to use relative paths (`../../lib/utils`)
3. Add display names for backward compatibility
4. Test with existing usage patterns
5. Update this documentation