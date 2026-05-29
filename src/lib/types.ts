export type Role =
  | 'platform_admin'
  | 'tenant_admin'
  | 'compliance_manager'
  | 'contributor'
  | 'viewer'
  | 'external_auditor'

export interface Tenant {
  id: string
  name: string
  slug: string
  status: string
  created_at: string
}

export interface Site {
  id: string
  tenant_id: string
  name: string
  site_code: string | null
  status: string
  created_at: string
}

export interface UserProfile {
  id: string
  tenant_id: string | null
  full_name: string | null
  role: Role
  status: string
  created_at: string
}

export interface KnowledgeSource {
  id: string
  name: string
  source_type: string
  description: string | null
  owner: string | null
  requires_license: boolean
  status: string
  created_at: string
  knowledge_assets?: KnowledgeAsset[]
}

export interface KnowledgeAsset {
  id: string
  knowledge_source_id: string
  title: string
  version_label: string
  issue_date: string | null
  effective_date: string | null
  status: string
  is_active: boolean
  created_at: string
}

export interface TenantKnowledgeAccess {
  id: string
  tenant_id: string
  knowledge_source_id: string
  access_status: string
  proof_file_path: string | null
  approved_at: string | null
  created_at: string
}
