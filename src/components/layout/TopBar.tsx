'use client'

import { useRouter } from 'next/navigation'
import { Bell, ChevronDown, LogOut, User } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { useState } from 'react'

interface TopBarProps {
  tenantName?: string
  userFullName?: string
  userEmail?: string
}

export function TopBar({ tenantName, userFullName, userEmail }: TopBarProps) {
  const router = useRouter()
  const [menuOpen, setMenuOpen] = useState(false)

  async function handleSignOut() {
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push('/login')
  }

  return (
    <header className="fixed top-0 left-60 right-0 h-14 bg-white border-b border-gray-200 flex items-center justify-between px-6 z-20">
      {/* Left: tenant context */}
      <div className="flex items-center gap-2">
        {tenantName && (
          <span className="text-sm text-gray-500">
            <span className="font-medium text-[#00171f]">{tenantName}</span>
          </span>
        )}
      </div>

      {/* Right: notifications + user */}
      <div className="flex items-center gap-3">
        <button className="relative p-1.5 text-gray-400 hover:text-[#00171f] transition-colors" title="Notifications">
          <Bell className="h-5 w-5" />
        </button>

        <div className="relative">
          <button
            onClick={() => setMenuOpen(!menuOpen)}
            className="flex items-center gap-2 pl-3 pr-2 py-1.5 rounded-md hover:bg-gray-100 transition-colors"
          >
            <div className="h-7 w-7 rounded-full bg-[#003459] flex items-center justify-center">
              <User className="h-4 w-4 text-white" />
            </div>
            <div className="text-left">
              <p className="text-sm font-medium text-[#00171f] leading-tight">
                {userFullName ?? userEmail ?? 'User'}
              </p>
            </div>
            <ChevronDown className="h-4 w-4 text-gray-400" />
          </button>

          {menuOpen && (
            <div className="absolute right-0 mt-1 w-48 bg-white border border-gray-200 rounded-lg shadow-lg py-1 z-50">
              <div className="px-4 py-2 border-b border-gray-100">
                <p className="text-xs text-gray-500 truncate">{userEmail}</p>
              </div>
              <button
                onClick={handleSignOut}
                className="w-full flex items-center gap-2 px-4 py-2 text-sm text-red-600 hover:bg-red-50 transition-colors"
              >
                <LogOut className="h-4 w-4" />
                Sign out
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  )
}
