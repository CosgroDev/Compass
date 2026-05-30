'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  LayoutDashboard,
  Search,
  BookOpen,
  FileText,
  Library,
  Download,
  Settings,
  Compass,
} from 'lucide-react'

const navItems = [
  { label: 'Dashboard', href: '/dashboard', icon: LayoutDashboard, active: true },
  { label: 'Search', href: '/search', icon: Search, active: false },
  { label: 'Requirements', href: '/requirements', icon: BookOpen, active: false },
  { label: 'Documents', href: '/documents', icon: FileText, active: true },
  { label: 'Knowledge Sources', href: '/knowledge-sources', icon: Library, active: true },
  { label: 'Exports', href: '/exports', icon: Download, active: false },
  { label: 'Admin', href: '/admin/users', icon: Settings, active: true },
]

export function Sidebar() {
  const pathname = usePathname()

  return (
    <aside className="fixed inset-y-0 left-0 w-60 bg-[#00171f] flex flex-col z-30">
      {/* Logo */}
      <div className="flex items-center gap-2.5 px-5 py-5 border-b border-white/10">
        <Compass className="h-6 w-6 text-[#00a8e8]" />
        <div>
          <p className="text-white font-semibold text-sm leading-tight">FoodRisk</p>
          <p className="text-[#00a8e8] font-bold text-sm leading-tight">Compass</p>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-3 py-4 space-y-0.5 overflow-y-auto">
        {navItems.map((item) => {
          const Icon = item.icon
          const isActive = pathname === item.href || pathname.startsWith(item.href + '/')
          const isEnabled = item.active

          if (!isEnabled) {
            return (
              <div
                key={item.label}
                className="flex items-center gap-3 px-3 py-2 rounded-md text-white/30 cursor-not-allowed"
                title="Coming soon"
              >
                <Icon className="h-4 w-4 flex-shrink-0" />
                <span className="text-sm">{item.label}</span>
              </div>
            )
          }

          return (
            <Link
              key={item.label}
              href={item.href}
              className={`flex items-center gap-3 px-3 py-2 rounded-md transition-colors ${
                isActive
                  ? 'bg-[#003459] text-white'
                  : 'text-white/70 hover:text-white hover:bg-white/10'
              }`}
            >
              <Icon className="h-4 w-4 flex-shrink-0" />
              <span className="text-sm">{item.label}</span>
            </Link>
          )
        })}
      </nav>

      {/* Footer */}
      <div className="px-5 py-4 border-t border-white/10">
        <p className="text-white/30 text-xs">v0.1.0 · Sprint 3</p>
      </div>
    </aside>
  )
}
