import Image from 'next/image'
import { cn } from '@/lib/utils'

interface BizLinkLogoProps {
  height?: number
  className?: string
  variant?: 'default' | 'compact' | 'large'
  priority?: boolean
}

export const BizLinkLogo = ({ 
  height, 
  className = '',
  variant = 'default',
  priority = false
}: BizLinkLogoProps) => {
  // 根据变体设置默认高度
  const defaultHeight = {
    compact: 24,
    default: 32,
    large: 60
  }[variant]

  const logoHeight = height || defaultHeight
  const logoWidth = logoHeight * 4.2 // 基于实际 Logo 宽高比

  return (
    <Image
      src="/docs/Bizlink_Logo_RGB.png"
      alt="BizLink"
      height={logoHeight}
      width={logoWidth}
      className={cn(
        'object-contain',
        'transition-opacity duration-200 hover:opacity-80',
        className
      )}
      priority={priority}
    />
  )
}

// 导航栏专用 Logo 组件
export const NavigationLogo = ({ className }: { className?: string }) => (
  <BizLinkLogo 
    variant="default" 
    className={cn('h-8', className)} 
    priority 
  />
)

// 登录页面专用 Logo 组件
export const LoginLogo = ({ className }: { className?: string }) => (
  <BizLinkLogo 
    variant="large" 
    className={cn('h-15', className)} 
    priority 
  />
)

// 移动端紧凑型 Logo
export const CompactLogo = ({ className }: { className?: string }) => (
  <BizLinkLogo 
    variant="compact" 
    className={cn('h-6', className)} 
    priority 
  />
)