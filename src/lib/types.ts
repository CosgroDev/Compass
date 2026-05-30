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
  is_system_owner: boolean
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

export interface Document {
  id: string
  tenant_id: string
  knowledge_source_id: string | null
  knowledge_asset_id: string | null
  title: string
  file_name: string
  file_type: string
  file_size_bytes: number | null
  storage_path: string
  status: string
  uploaded_by: string | null
  created_at: string
  updated_at: string
  // joined
  knowledge_sources?: Pick<KnowledgeSource, 'id' | 'name'> | null
  knowledge_assets?: Pick<KnowledgeAsset, 'id' | 'title' | 'version_label'> | null
  user_profiles?: Pick<UserProfile, 'id' | 'full_name'> | null
}

export interface DocumentProcessingJob {
  id: string
  document_id: string
  job_type: string
  status: string
  started_at: string | null
  completed_at: string | null
  error_message: string | null
  created_at: string
  document_processing_events?: DocumentProcessingEvent[]
}

export interface DocumentProcessingEvent {
  id: string
  job_id: string
  event_type: string
  message: string | null
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
