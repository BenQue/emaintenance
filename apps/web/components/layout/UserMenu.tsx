'use client';

import { useRouter } from 'next/navigation';
import { useAuthStore } from '../../lib/stores/auth-store';
import { LogOutIcon, UserIcon, Palette } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { ThemeToggle } from '@/components/ui/theme-toggle';

export function UserMenu() {
  const { user, logout } = useAuthStore();
  const router = useRouter();

  if (!user) return null;

  const handleLogout = () => {
    logout();
    router.push('/login');
  };

  const getRoleDisplayName = (role: string) => {
    const roleMap = {
      EMPLOYEE: '员工',
      TECHNICIAN: '技术员',
      SUPERVISOR: '主管',
      ADMIN: '管理员'
    };
    return roleMap[role as keyof typeof roleMap] || role;
  };

  const getInitials = () => {
    if (user.firstName && user.lastName) {
      return `${user.firstName.charAt(0)}${user.lastName.charAt(0)}`.toUpperCase();
    }
    if (user.firstName) {
      return user.firstName.charAt(0).toUpperCase();
    }
    if (user.lastName) {
      return user.lastName.charAt(0).toUpperCase();
    }
    if (user.username) {
      return user.username.charAt(0).toUpperCase();
    }
    return user.email?.charAt(0)?.toUpperCase() || 'U';
  };

  const getDisplayName = () => {
    if (user.firstName || user.lastName) {
      return `${user.firstName || ''} ${user.lastName || ''}`.trim();
    }
    return user.username || user.email;
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button 
          variant="ghost" 
          className="relative h-10 w-full justify-start gap-2 px-2"
        >
          <Avatar className="h-8 w-8">
            <AvatarImage 
              src={undefined} // No image URL available in current user model
              alt={getDisplayName()}
            />
            <AvatarFallback className="bg-bizlink-500 text-white text-sm font-medium">
              {getInitials()}
            </AvatarFallback>
          </Avatar>
          <div className="flex flex-col items-start text-left flex-1 min-w-0">
            <span className="text-sm font-medium truncate">
              {getDisplayName()}
            </span>
            <span className="text-xs text-muted-foreground truncate">
              {getRoleDisplayName(user.role)}
            </span>
          </div>
        </Button>
      </DropdownMenuTrigger>
      
      <DropdownMenuContent className="w-56" align="end" forceMount>
        <DropdownMenuLabel>
          <div className="flex flex-col space-y-1">
            <p className="text-sm font-medium leading-none">
              {getDisplayName()}
            </p>
            <p className="text-xs leading-none text-muted-foreground">
              {user.email}
            </p>
            <p className="text-xs leading-none text-bizlink-600">
              {getRoleDisplayName(user.role)}
            </p>
          </div>
        </DropdownMenuLabel>
        
        <DropdownMenuSeparator />
        
        <div className="px-2 py-1">
          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground flex items-center gap-2">
              <Palette className="h-4 w-4" />
              主题切换
            </span>
            <ThemeToggle />
          </div>
        </div>
        
        <DropdownMenuSeparator />
        
        <DropdownMenuItem 
          onClick={handleLogout}
          className="text-red-600 focus:text-red-600 focus:bg-red-50 cursor-pointer"
        >
          <LogOutIcon className="mr-2 h-4 w-4" />
          退出登录
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}