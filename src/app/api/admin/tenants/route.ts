import { createClient } from '@/lib/supabase/server'
import { createClient as createAdminClient } from '@supabase/supabase-js'
import { NextRequest, NextResponse } from 'next/server'

async function getSystemOwnerOrFail() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  const { data: profile } = await supabase
    .from('user_profiles')
    .select('is_system_owner')
    .eq('id', user.id)
    .single()

  return profile?.is_system_owner ? user : null
}

const admin = () => createAdminClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function POST(req: NextRequest) {
  const user = await getSystemOwnerOrFail()
  if (!user) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const { name, slug } = await req.json()
  if (!name?.trim() || !slug?.trim()) return NextResponse.json({ error: 'Name and slug are required' }, { status: 400 })

  const { data, error } = await admin()
    .from('tenants')
    .insert({ name: name.trim(), slug: slug.trim() })
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 400 })
  return NextResponse.json({ tenant: data })
}

export async function PATCH(req: NextRequest) {
  const user = await getSystemOwnerOrFail()
  if (!user) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const { id, name, slug, status } = await req.json()
  if (!id) return NextResponse.json({ error: 'Missing tenant id' }, { status: 400 })

  const updates: Record<string, string> = {}
  if (name !== undefined) updates.name = name.trim()
  if (slug !== undefined) updates.slug = slug.trim()
  if (status !== undefined) updates.status = status

  const { data, error } = await admin()
    .from('tenants')
    .update(updates)
    .eq('id', id)
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 400 })
  return NextResponse.json({ tenant: data })
}
