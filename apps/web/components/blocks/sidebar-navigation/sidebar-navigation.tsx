"use client"

import { useState, useEffect } from "react"
import { 
  LayoutDashboardIcon, 
  ClipboardListIcon, 
  ServerIcon, 
  SettingsIcon, 
  UsersIcon, 
  BellIcon,
  ChevronsUpDownIcon,
  LogOutIcon,
  UserIcon,
  MenuIcon,
  SunIcon,
  MoonIcon,
  CogIcon
} from "lucide-react"
import Link from "next/link"
import { usePathname, useRouter } from "next/navigation"
import { useTheme } from "next-themes"

import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarInset,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarProvider,
  SidebarRail,
  SidebarTrigger,
  useSidebar,
} from "@/components/ui/sidebar"
import { NavigationLogo } from "@/components/ui/BizLinkLogo"
import { useAuthStore } from "@/lib/stores/auth-store"
import { useNotificationStore } from "@/lib/stores/notification-store"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"

// Navigation data structure
interface NavItem {
  href: string
  label: string
  roles: Array<'EMPLOYEE' | 'TECHNICIAN' | 'SUPERVISOR' | 'ADMIN'>
  icon: React.ComponentType<{ className?: string }>
  primary?: boolean
  badge?: string
}

const navigationData: NavItem[] = [
  {
    href: '/dashboard/my-tasks',
    label: '我的任务',
    roles: ['TECHNICIAN'],
    primary: true,
    icon: ClipboardListIcon,
  },
  {
    href: '/dashboard',
    label: '仪表面板',
    roles: ['SUPERVISOR', 'ADMIN'],
    icon: LayoutDashboardIcon,
  },
  {
    href: '/dashboard/work-orders',
    label: '工单管理',
    roles: ['EMPLOYEE', 'TECHNICIAN', 'SUPERVISOR', 'ADMIN'],
    icon: ClipboardListIcon,
  },
  {
    href: '/dashboard/assets',
    label: '设备管理',
    roles: ['SUPERVISOR', 'ADMIN'],
    icon: ServerIcon,
  },
  {
    href: '/dashboard/assignment-rules',
    label: '分配规则',
    roles: ['SUPERVISOR', 'ADMIN'],
    icon: SettingsIcon,
  },
  {
    href: '/dashboard/users',
    label: '用户管理',
    roles: ['SUPERVISOR', 'ADMIN'],
    icon: UsersIcon,
  },
  {
    href: '/dashboard/settings',
    label: '系统设置',
    roles: ['SUPERVISOR', 'ADMIN'],
    icon: CogIcon,
  },
  {
    href: '/dashboard/notifications',
    label: '通知中心',
    roles: ['EMPLOYEE', 'TECHNICIAN', 'SUPERVISOR', 'ADMIN'],
    icon: BellIcon,
    badge: '3',
  },
]

// Team switcher component integrated into sidebar header
function TeamSwitcher() {
  const { user } = useAuthStore()
  const { state } = useSidebar()
  const isCollapsed = state === "collapsed"
  
  if (!user) return null

  if (isCollapsed) {
    return (
      <div className="flex items-center justify-center p-2">
        <div className="flex aspect-square w-8 items-center justify-center rounded-lg bg-bizlink-500 text-white">
          <ServerIcon className="size-4" />
        </div>
      </div>
    )
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger className="w-full rounded-lg border p-2 text-left shadow-sm transition-shadow hover:shadow-md">
        <div className="flex items-center gap-3">
          <div className="flex aspect-square w-8 items-center justify-center rounded-lg bg-bizlink-500 text-white">
            <ServerIcon className="size-4" />
          </div>
          <div className="flex flex-1 flex-col text-left text-sm leading-tight">
            <span className="font-semibold">设备维护管理</span>
          </div>
          <ChevronsUpDownIcon className="ml-auto size-4" />
        </div>
      </DropdownMenuTrigger>
      <DropdownMenuContent
        className="w-[--radix-dropdown-menu-trigger-width] min-w-56 rounded-lg"
        align="start"
        side="bottom"
        sideOffset={4}
      >
        <DropdownMenuLabel className="text-xs text-muted-foreground">
          当前系统
        </DropdownMenuLabel>
        <DropdownMenuItem className="gap-2 p-2">
          <div className="flex size-6 items-center justify-center rounded-sm border bg-bizlink-500">
            <ServerIcon className="size-4 text-white" />
          </div>
          设备维护管理
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

// Navigation menu component
function NavMain() {
  const { user } = useAuthStore()
  const pathname = usePathname()
  const { state } = useSidebar()
  const isCollapsed = state === "collapsed"

  if (!user) return null

  const filteredNavigation = navigationData.filter(item => 
    item.roles.includes(user.role)
  )

  return (
    <SidebarGroup>
      <SidebarGroupContent>
        <SidebarMenu>
          {filteredNavigation.map((item) => {
            const Icon = item.icon
            const isActive = pathname === item.href
            
            return (
              <SidebarMenuItem key={item.href}>
                <SidebarMenuButton 
                  asChild 
                  isActive={isActive}
                  className={cn(
                    "transition-all duration-200",
                    item.primary && [
                      "bg-bizlink-500 text-white hover:bg-bizlink-600",
                      "data-[active=true]:bg-bizlink-600 data-[active=true]:text-white",
                      "shadow-md"
                    ],
                    isActive && !item.primary && "font-medium",
                    isCollapsed && "justify-center px-2"
                  )}
                >
                  <Link href={item.href} className={cn(
                    "flex items-center",
                    isCollapsed ? "justify-center" : "gap-2"
                  )}>
                    <Icon className="size-4" />
                    {!isCollapsed && (
                      <>
                        <span className="flex-1 text-sm">{item.label}</span>
                        {item.badge && (
                          <Badge variant="secondary" className="ml-auto text-xs px-1">
                            {item.badge}
                          </Badge>
                        )}
                      </>
                    )}
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
            )
          })}
        </SidebarMenu>
      </SidebarGroupContent>
    </SidebarGroup>
  )
}

// User profile dropdown in sidebar footer
function NavUser() {
  const { user, logout } = useAuthStore()
  const { state } = useSidebar()
  const isCollapsed = state === "collapsed"

  if (!user) return null

  const initials = user.firstName && user.lastName
    ? `${user.firstName[0]}${user.lastName[0]}`.toUpperCase()
    : user.email.substring(0, 2).toUpperCase()

  const getRoleDisplayName = (role: string) => {
    const roleMap = {
      'ADMIN': '系统管理员',
      'SUPERVISOR': '主管',
      'TECHNICIAN': '技术员',
      'EMPLOYEE': '员工'
    }
    return roleMap[role as keyof typeof roleMap] || role
  }

  if (isCollapsed) {
    return (
      <DropdownMenu>
        <DropdownMenuTrigger className="flex items-center justify-center p-2 rounded-lg hover:bg-sidebar-accent">
          <Avatar className="size-8">
            <AvatarFallback className="bg-bizlink-500 text-white text-sm font-medium">
              {initials}
            </AvatarFallback>
          </Avatar>
        </DropdownMenuTrigger>
        <DropdownMenuContent
          className="min-w-56 rounded-lg"
          align="start"
          side="right"
          sideOffset={4}
        >
          <DropdownMenuLabel className="text-xs text-muted-foreground">
            用户菜单
          </DropdownMenuLabel>
          <DropdownMenuItem className="gap-2 p-2">
            <UserIcon className="size-4" />
            个人信息
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem 
            className="gap-2 p-2 text-destructive hover:text-destructive" 
            onClick={logout}
          >
            <LogOutIcon className="size-4" />
            退出登录
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    )
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger className="w-full rounded-lg border p-2 text-left shadow-sm transition-shadow hover:shadow-md data-[state=open]:shadow-md">
        <div className="flex items-center gap-3">
          <Avatar className="size-8">
            <AvatarFallback className="bg-bizlink-500 text-white text-sm font-medium">
              {initials}
            </AvatarFallback>
          </Avatar>
          <div className="flex flex-1 flex-col text-left text-sm leading-tight">
            <span className="font-semibold break-words leading-tight">
              {user.firstName && user.lastName 
                ? `${user.firstName} ${user.lastName}` 
                : user.email}
            </span>
            <span className="text-xs text-muted-foreground">
              {getRoleDisplayName(user.role)}
            </span>
          </div>
          <ChevronsUpDownIcon className="ml-auto size-4" />
        </div>
      </DropdownMenuTrigger>
      <DropdownMenuContent
        className="w-[--radix-dropdown-menu-trigger-width] min-w-56 rounded-lg"
        align="start"
        side="top"
        sideOffset={4}
      >
        <DropdownMenuLabel className="text-xs text-muted-foreground">
          用户菜单
        </DropdownMenuLabel>
        <DropdownMenuItem className="gap-2 p-2">
          <UserIcon className="size-4" />
          个人信息
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem 
          className="gap-2 p-2 text-destructive hover:text-destructive" 
          onClick={logout}
        >
          <LogOutIcon className="size-4" />
          退出登录
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

// Notification button with badge
function NotificationButton() {
  const router = useRouter()
  const { stats, loadStats } = useNotificationStore()
  
  // Load stats when component mounts
  useEffect(() => {
    loadStats()
  }, [loadStats])

  // Auto-refresh stats every 30 seconds
  useEffect(() => {
    const interval = setInterval(() => {
      loadStats()
    }, 30000)
    
    return () => clearInterval(interval)
  }, [loadStats])

  const unreadCount = stats?.unread || 0

  const handleNotificationClick = () => {
    router.push('/dashboard/notifications')
  }

  return (
    <Button 
      variant="ghost" 
      size="icon" 
      className="relative size-9"
      onClick={handleNotificationClick}
    >
      <BellIcon className="size-5" />
      {unreadCount > 0 && (
        <Badge 
          variant="destructive" 
          className="absolute -top-1 -right-1 size-5 flex items-center justify-center p-0 text-xs font-medium"
        >
          {unreadCount > 99 ? '99+' : unreadCount}
        </Badge>
      )}
      <span className="sr-only">通知中心 ({unreadCount} 条未读)</span>
    </Button>
  )
}

// Theme toggle button
function ThemeToggleButton() {
  const { theme, setTheme } = useTheme()
  const [mounted, setMounted] = useState(false)

  // useEffect to avoid hydration mismatch
  useEffect(() => {
    setMounted(true)
  }, [])

  if (!mounted) {
    return (
      <Button 
        variant="ghost" 
        size="icon" 
        className="size-9"
        disabled
      >
        <SunIcon className="size-5" />
        <span className="sr-only">切换主题</span>
      </Button>
    )
  }

  const toggleTheme = () => {
    setTheme(theme === 'dark' ? 'light' : 'dark')
  }

  return (
    <Button 
      variant="ghost" 
      size="icon" 
      className="size-9"
      onClick={toggleTheme}
      title={theme === 'dark' ? '切换到浅色模式' : '切换到深色模式'}
    >
      {theme === 'dark' ? (
        <SunIcon className="size-5" />
      ) : (
        <MoonIcon className="size-5" />
      )}
      <span className="sr-only">切换主题</span>
    </Button>
  )
}

// Complete Sidebar Block Layout
export function SidebarNavigationLayout({ children }: { children: React.ReactNode }) {
  const { user } = useAuthStore()
  const [sidebarOpen, setSidebarOpen] = useState(true)

  if (!user) return null

  return (
    <SidebarProvider open={sidebarOpen} onOpenChange={setSidebarOpen}>
      <div className="flex h-screen w-full bg-background">
        {/* Sidebar - Fixed width, not overlapping */}
        <div className={`flex-shrink-0 transition-all duration-200 ${sidebarOpen ? 'w-52' : 'w-16'} border-r bg-sidebar h-full`}>
          <div className="flex flex-col h-full p-2">
            {/* Team Switcher */}
            <div className="mb-4">
              <TeamSwitcher />
            </div>
            
            {/* Navigation Menu */}
            <div className="flex-1">
              <NavMain />
            </div>
            
            {/* User Menu */}
            <div className="mt-4">
              <NavUser />
            </div>
          </div>
        </div>

        {/* Main Content Area - Takes remaining space */}
        <div className="flex-1 min-w-0 flex flex-col">
          {/* Header */}
          <header className="relative flex h-16 shrink-0 items-center gap-4 border-b px-4 bg-background">
            {/* Left: Sidebar Toggle + Company Logo */}
            <div className="flex items-center gap-3 z-10">
              <Button 
                variant="ghost" 
                size="icon" 
                className="size-7 -ml-1"
                onClick={() => setSidebarOpen(!sidebarOpen)}
              >
                <MenuIcon className="size-4" />
              </Button>
              <div className="flex items-center gap-3">
                <NavigationLogo />
              </div>
            </div>
            
            {/* Center: Main Title - Absolutely centered */}
            <div className="absolute left-1/2 top-1/2 transform -translate-x-1/2 -translate-y-1/2">
              <div className="flex flex-col items-center">
                <h1 className="text-xl font-semibold whitespace-nowrap leading-tight">企业设备维护管理系统</h1>
                <p className="text-sm text-muted-foreground whitespace-nowrap leading-tight">E-Maintenance System</p>
              </div>
            </div>
            
            {/* Right: Action buttons */}
            <div className="flex items-center gap-2 ml-auto z-10">
              {/* Notification bell with badge */}
              <NotificationButton />
              
              {/* Theme toggle */}
              <ThemeToggleButton />
            </div>
          </header>

          {/* Main content with proper spacing */}
          <main className="flex-1 overflow-auto bg-background">
            <div className="p-4">
              {children || <div className="text-center p-8 text-gray-500">内容加载中...</div>}
            </div>
          </main>
        </div>
      </div>
    </SidebarProvider>
  )
}

// Export individual components for flexibility
export { NavMain, NavUser, TeamSwitcher }