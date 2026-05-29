'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Compass, AlertCircle } from 'lucide-react'

export default function LoginPage() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [forgotSent, setForgotSent] = useState(false)
  const [showForgot, setShowForgot] = useState(false)

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setLoading(true)
    const supabase = createClient()
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) {
      setError(error.message)
      setLoading(false)
      return
    }
    router.push('/dashboard')
    router.refresh()
  }

  async function handleForgotPassword(e: React.FormEvent) {
    e.preventDefault()
    if (!email) { setError('Enter your email address first.'); return }
    setLoading(true)
    setError('')
    const supabase = createClient()
    await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/auth/reset`,
    })
    setForgotSent(true)
    setLoading(false)
  }

  return (
    <div className="min-h-screen bg-[#00171f] flex items-center justify-center p-4">
      <div className="w-full max-w-sm">
        {/* Logo */}
        <div className="flex flex-col items-center mb-8">
          <div className="flex items-center gap-2 mb-2">
            <Compass className="h-8 w-8 text-[#00a8e8]" />
            <span className="text-white text-2xl font-bold">FoodRisk <span className="text-[#00a8e8]">Compass</span></span>
          </div>
          <p className="text-white/50 text-sm">Find Requirements. Understand Impact. Prove Compliance.</p>
        </div>

        <div className="bg-white rounded-xl shadow-2xl p-8">
          <h1 className="text-lg font-semibold text-[#00171f] mb-6">Sign in to your account</h1>

          {forgotSent ? (
            <div className="text-center py-4">
              <p className="text-sm text-gray-700">Password reset email sent. Check your inbox.</p>
              <button onClick={() => { setForgotSent(false); setShowForgot(false) }} className="mt-4 text-sm text-[#007ea7] hover:underline">
                Back to sign in
              </button>
            </div>
          ) : (
            <form onSubmit={showForgot ? handleForgotPassword : handleLogin} className="space-y-4">
              {error && (
                <div className="flex items-start gap-2 p-3 bg-red-50 border border-red-200 rounded-lg">
                  <AlertCircle className="h-4 w-4 text-red-500 mt-0.5 flex-shrink-0" />
                  <p className="text-sm text-red-700">{error}</p>
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Email address</label>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#007ea7] focus:border-transparent"
                  placeholder="you@company.com"
                />
              </div>

              {!showForgot && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Password</label>
                  <input
                    type="password"
                    required
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#007ea7] focus:border-transparent"
                    placeholder="••••••••"
                  />
                </div>
              )}

              <button
                type="submit"
                disabled={loading}
                className="w-full bg-[#003459] text-white py-2.5 px-4 rounded-lg text-sm font-medium hover:bg-[#004070] transition-colors disabled:opacity-50"
              >
                {loading ? 'Please wait…' : showForgot ? 'Send reset email' : 'Sign in'}
              </button>

              <div className="text-center">
                <button
                  type="button"
                  onClick={() => { setShowForgot(!showForgot); setError('') }}
                  className="text-sm text-[#007ea7] hover:underline"
                >
                  {showForgot ? 'Back to sign in' : 'Forgot password?'}
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  )
}
