'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Users, Building2, Shield } from 'lucide-react'

const adminNav = [
  { label: 'Users', href: '/admin/users', icon: Users },
  { label: 'Sites', href: '/admin/sites', icon: Building2 },
]

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()

  return (
    <div className="max-w-6xl mx-auto">
      {/* Admin header */}
      <div className="flex items-center gap-3 mb-6">
        <div className="p-2 bg-[#003459]/10 rounded-lg">
          <Shield className="h-5 w-5 text-[#003459]" />
        </div>
        <div>
          <h1 className="text-2xl font-semibold text-[#00171f]">Administration</h1>
          <p className="text-gray-500 text-sm">Manage users, sites and organisation settings.</p>
        </div>
      </div>

      {/* Sub-navigation */}
      <div className="flex gap-1 border-b border-gray-200 mb-6">
        {adminNav.map((item) => {
          const Icon = item.icon
          const isActive = pathname === item.href
          return (
            <Link
              key={item.label}
              href={item.href}
              className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 -mb-px transition-colors ${
                isActive
                  ? 'border-[#003459] text-[#003459]'
                  : 'border-transparent text-gray-500 hover:text-[#00171f] hover:border-gray-300'
              }`}
            >
              <Icon className="h-4 w-4" />
              {item.label}
            </Link>
          )
        })}
      </div>

      {children}
    </div>
  )
}
