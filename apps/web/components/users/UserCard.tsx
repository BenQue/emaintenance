import React, { memo, useCallback } from 'react';
import { User } from '../../lib/services/user-service';
import { Card, CardContent, CardHeader } from '../ui/card';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { Avatar, AvatarFallback } from '../ui/avatar';
import { STATUS_VARIANTS } from '../data-display/types';
import { User as UserIcon, Mail, IdCard, Calendar } from 'lucide-react';
import { cn } from '@/lib/utils';

interface UserCardProps {
  user: User;
  isSelected: boolean;
  onToggleSelection: (userId: string) => void;
  onView?: (user: User) => void;
  onEdit?: (user: User) => void;
  onToggleStatus: (user: User) => void;
  onDelete: (user: User) => void;
}

const ROLE_VARIANTS = {
  ADMIN: 'destructive' as const,
  SUPERVISOR: 'default' as const,
  TECHNICIAN: 'secondary' as const,
  EMPLOYEE: 'outline' as const,
};

const ROLE_LABELS = {
  ADMIN: '管理员',
  SUPERVISOR: '主管',
  TECHNICIAN: '技术员',
  EMPLOYEE: '员工',
};

const UserCard: React.FC<UserCardProps> = memo(({
  user,
  isSelected,
  onToggleSelection,
  onView,
  onEdit,
  onToggleStatus,
  onDelete,
}) => {
  const handleToggleSelection = useCallback(() => {
    onToggleSelection(user.id);
  }, [onToggleSelection, user.id]);

  const handleView = useCallback(() => {
    onView?.(user);
  }, [onView, user]);

  const handleEdit = useCallback(() => {
    onEdit?.(user);
  }, [onEdit, user]);

  const handleToggleStatus = useCallback(() => {
    onToggleStatus(user);
  }, [onToggleStatus, user]);

  const handleDelete = useCallback(() => {
    onDelete(user);
  }, [onDelete, user]);

  const getUserInitials = () => {
    return `${user.firstName?.[0] || ''}${user.lastName?.[0] || ''}`.toUpperCase();
  };

  return (
    <Card className={cn(
      "transition-all duration-200 hover:shadow-md hover:scale-[1.01]",
      isSelected && "ring-2 ring-primary",
      !user.isActive && "opacity-75"
    )}>
      <CardHeader className="pb-3">
        <div className="flex items-center space-x-3">
          <input
            type="checkbox"
            checked={isSelected}
            onChange={handleToggleSelection}
            className="h-4 w-4 text-primary focus:ring-primary border-border rounded"
          />
          
          <Avatar className="h-10 w-10">
            <AvatarFallback className="bg-primary/10 text-primary font-medium">
              {getUserInitials()}
            </AvatarFallback>
          </Avatar>
          
          <div className="flex-1 min-w-0">
            <div className="flex items-center space-x-2 mb-1">
              <h3 className="text-sm font-semibold text-foreground truncate">
                {user.firstName} {user.lastName}
              </h3>
              <Badge variant={ROLE_VARIANTS[user.role]} className="text-xs">
                {ROLE_LABELS[user.role]}
              </Badge>
            </div>
            
            <div className="flex items-center space-x-2 text-xs text-muted-foreground">
              <UserIcon className="h-3 w-3" />
              <span>@{user.username}</span>
            </div>
          </div>

          <div className="flex items-center space-x-1">
            {!user.isActive && (
              <Badge variant="destructive" className="text-xs">
                已停用
              </Badge>
            )}
          </div>
        </div>
      </CardHeader>

      <CardContent className="pt-0">
        <div className="space-y-2 mb-4">
          <div className="flex items-center space-x-2 text-sm text-muted-foreground">
            <Mail className="h-3 w-3" />
            <span className="truncate">{user.email}</span>
          </div>
          
          {user.employeeId && (
            <div className="flex items-center space-x-2 text-sm text-muted-foreground">
              <IdCard className="h-3 w-3" />
              <span>工号: {user.employeeId}</span>
            </div>
          )}
          
          <div className="flex items-center space-x-2 text-xs text-muted-foreground">
            <Calendar className="h-3 w-3" />
            <span>创建: {new Date(user.createdAt).toLocaleDateString('zh-CN')}</span>
          </div>
        </div>

        <div className="flex items-center justify-end space-x-2">
          <Button
            size="sm"
            variant="outline"
            onClick={handleView}
            className="h-8 px-3 text-xs"
          >
            查看
          </Button>
          <Button
            size="sm"
            variant="outline"
            onClick={handleEdit}
            className="h-8 px-3 text-xs"
          >
            编辑
          </Button>
          <Button
            size="sm"
            variant={user.isActive ? "outline" : "default"}
            onClick={handleToggleStatus}
            className="h-8 px-3 text-xs"
          >
            {user.isActive ? '停用' : '激活'}
          </Button>
          <Button
            size="sm"
            variant="destructive"
            onClick={handleDelete}
            className="h-8 px-3 text-xs"
          >
            删除
          </Button>
        </div>
      </CardContent>
    </Card>
  );
});

UserCard.displayName = 'UserCard';

export { UserCard };