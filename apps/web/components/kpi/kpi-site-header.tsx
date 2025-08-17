"use client"

import { SidebarTrigger } from "@/components/ui/sidebar"
import { Separator } from "@/components/ui/separator"
import { NavigationLogo } from "@/components/ui/BizLinkLogo"

export function KPISiteHeader() {
  return (
    <header className="flex h-16 shrink-0 items-center gap-2 transition-[width,height] ease-linear group-has-[[data-collapsible=icon]]/sidebar-wrapper:h-12">
      <div className="flex items-center gap-2 px-4">
        <SidebarTrigger className="-ml-1" />
        <Separator orientation="vertical" className="mr-2 h-4" />
        <NavigationLogo />
        <div className="hidden sm:block text-left text-sm leading-tight">
          <div className="font-semibold text-bizlink-600">BizLink</div>
          <div className="text-xs text-muted-foreground">Enterprise Solutions</div>
        </div>
      </div>
      <div className="flex-1 text-center">
        <h1 className="text-xl font-semibold">E-Maintenance设备维护管理系统</h1>
      </div>
      <div className="px-4">
        {/* Right side placeholder */}
      </div>
    </header>
  )
}