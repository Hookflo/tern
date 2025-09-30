export type TemplateCategory = 'payment' | 'auth' | 'ecommerce';

export interface TemplateField {
  id: string;
  name: string;
  type: 'string' | 'number' | 'boolean' | 'object' | 'array';
  required: boolean;
  description?: string;
  defaultValue?: unknown;
}

export interface BaseTemplate {
  id: string; // e.g., payment_v1
  category: TemplateCategory;
  version: string; // semver
  fields: TemplateField[];
}

export interface UserSchemaField {
  id: string; // references BaseTemplate.fields.id or custom
  name: string;
  type: TemplateField['type'];
  required: boolean;
  enabled: boolean;
  defaultValue?: unknown;
}

export interface FieldMapping {
  schemaFieldId: string; // links to UserSchemaField.id
  providerPath: string; // dot-notation path (a.b.c)
  transform?: string; // simple DSL e.g., divide:100
}

export interface ProviderMapping {
  provider: string; // e.g., 'stripe'
  fieldMappings: FieldMapping[];
}

export interface UserSchema {
  id: string;
  userId: string;
  baseTemplateId: string;
  category: TemplateCategory;
  fields: UserSchemaField[];
  providerMappings: ProviderMapping[];
  createdAt: Date;
  updatedAt: Date;
}

export interface NormalizedPayloadMeta {
  provider: string;
  schemaId: string;
  schemaVersion: string; // baseTemplateId
  transformedAt: Date;
}

export interface NormalizedResult {
  normalized: Record<string, unknown>;
  meta: NormalizedPayloadMeta;
}

export interface CreateSchemaInput {
  userId: string;
  baseTemplateId: string;
  category: TemplateCategory;
  fields: UserSchemaField[];
  providerMappings: ProviderMapping[];
}

export interface UpdateSchemaInput {
  fields?: UserSchemaField[];
  providerMappings?: ProviderMapping[];
}

export interface ProviderInfoField {
  path: string;
  type?: TemplateField['type'];
  description?: string;
}

export interface ProviderInfo {
  id: string;
  name: string;
  category: TemplateCategory;
  samplePaths?: ProviderInfoField[];
}

export interface TransformParams {
  rawPayload: unknown;
  provider: string;
  schemaId: string;
}
