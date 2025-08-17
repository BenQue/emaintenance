"use client"

import { useState } from 'react'
import Link from 'next/link'
import { LockIcon, MailIcon, EyeIcon, EyeOffIcon } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { NavigationLogo } from '@/components/ui/BizLinkLogo'
import { useAuthStore } from '@/lib/stores/auth-store'
import { cn } from '@/lib/utils'

interface LoginFormBlockProps {
  className?: string
  onLoginSuccess?: () => void
}

export function LoginFormBlock({ className, onLoginSuccess }: LoginFormBlockProps) {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState('')

  const { login } = useAuthStore()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    setError('')

    try {
      await login({ identifier: email, password })
      onLoginSuccess?.()
    } catch (err: any) {
      setError(err.message || '登录失败，请重试')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className={cn(
      "min-h-screen flex items-center justify-center bg-gradient-to-br from-bizlink-50 to-bizlink-100 p-4",
      className
    )}>
      <div className="w-full max-w-md space-y-8">
        {/* Header with logo and branding */}
        <div className="text-center">
          <div className="flex justify-center mb-6">
            <div className="p-4 bg-white rounded-lg shadow-sm">
              <NavigationLogo />
            </div>
          </div>
          <h1 className="text-3xl font-bold text-bizlink-700 mb-2">
            E-Maintenance
          </h1>
          <p className="text-bizlink-600">
            企业设备维护管理系统
          </p>
        </div>

        {/* Login form card */}
        <Card className="border-0 shadow-xl bg-white/95 backdrop-blur-sm">
          <CardHeader className="space-y-1 pb-4">
            <CardTitle className="text-2xl font-semibold text-center text-gray-900">
              欢迎回来
            </CardTitle>
            <CardDescription className="text-center text-gray-600">
              请输入您的凭据以访问系统
            </CardDescription>
          </CardHeader>
          
          <CardContent className="space-y-4">
            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Email field */}
              <div className="space-y-2">
                <Label htmlFor="email" className="text-sm font-medium text-gray-700">
                  邮箱地址
                </Label>
                <div className="relative">
                  <MailIcon className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                  <Input
                    id="email"
                    type="email"
                    placeholder="请输入邮箱地址"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="pl-10 h-12 border-gray-200 focus:border-bizlink-500 focus:ring-bizlink-500"
                    required
                    disabled={isLoading}
                  />
                </div>
              </div>

              {/* Password field */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label htmlFor="password" className="text-sm font-medium text-gray-700">
                    密码
                  </Label>
                  <Link 
                    href="/forgot-password" 
                    className="text-sm text-bizlink-600 hover:text-bizlink-700 font-medium"
                  >
                    忘记密码？
                  </Link>
                </div>
                <div className="relative">
                  <LockIcon className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                  <Input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    placeholder="请输入密码"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="pl-10 pr-10 h-12 border-gray-200 focus:border-bizlink-500 focus:ring-bizlink-500"
                    required
                    disabled={isLoading}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-3 h-4 w-4 text-gray-400 hover:text-gray-600"
                    disabled={isLoading}
                  >
                    {showPassword ? <EyeOffIcon /> : <EyeIcon />}
                  </button>
                </div>
              </div>

              {/* Error message */}
              {error && (
                <div className="p-3 text-sm text-functional-error bg-red-50 border border-red-200 rounded-md">
                  {error}
                </div>
              )}

              {/* Submit button */}
              <Button
                type="submit"
                className="w-full h-12 bg-bizlink-500 hover:bg-bizlink-600 focus:ring-bizlink-500 text-white font-medium shadow-md transition-all duration-200"
                disabled={isLoading}
              >
                {isLoading ? (
                  <div className="flex items-center space-x-2">
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    <span>登录中...</span>
                  </div>
                ) : (
                  '登录'
                )}
              </Button>
            </form>

            {/* Footer links */}
            <div className="pt-4 border-t border-gray-100">
              <p className="text-center text-sm text-gray-600">
                需要帮助？{' '}
                <Link 
                  href="/support" 
                  className="text-bizlink-600 hover:text-bizlink-700 font-medium"
                >
                  联系技术支持
                </Link>
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Footer branding */}
        <div className="text-center text-sm text-bizlink-600/70">
          <p>&copy; 2024 BizLink Enterprise Solutions. All rights reserved.</p>
        </div>
      </div>
    </div>
  )
}

// Layout wrapper for login page
export function LoginPageLayout() {
  return (
    <div className="min-h-screen bg-gray-50">
      <LoginFormBlock 
        onLoginSuccess={() => {
          // Redirect handled by auth store
          window.location.href = '/dashboard'
        }}
      />
    </div>
  )
}