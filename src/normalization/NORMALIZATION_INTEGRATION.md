## Normalization: Next.js + Supabase Integration Guide

This guide shows how to integrate Tern's normalization framework into a Next.js app and wire it to Supabase using a custom `StorageAdapter`. It also includes example API routes and UI usage to build a visual schema editor.

### What the framework exposes

- `Normalizer` class with methods:
  - `getBaseTemplates()`
  - `getProviders(category?)`
  - `createSchema(input)`
  - `updateSchema(schemaId, updates)`
  - `getSchema(schemaId)`
  - `transform({ rawPayload, provider, schemaId })`
  - `validateSchema(schema)`
- `StorageAdapter` interface to implement persistence
- `InMemoryStorageAdapter` for local/dev use

### Supabase schema (example)

```sql
-- webhook_schemas table
CREATE TABLE IF NOT EXISTS webhook_schemas (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  base_template_id text NOT NULL,
  category text NOT NULL,
  fields jsonb NOT NULL,
  provider_mappings jsonb NOT NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_schemas_user ON webhook_schemas(user_id);
CREATE INDEX IF NOT EXISTS idx_schemas_category ON webhook_schemas(category);
```

### Implement a Supabase adapter

Create `lib/supabaseStorageAdapter.ts` in your Next.js app:

```ts
// lib/supabaseStorageAdapter.ts
import { createClient } from '@supabase/supabase-js';
import type {
  BaseTemplate,
  CreateSchemaInput,
  UpdateSchemaInput,
  UserSchema,
} from '@tern/normalization';
import type { StorageAdapter } from '@tern/normalization';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY! // Service role for server-side adapters
);

export class SupabaseStorageAdapter implements StorageAdapter {
  async saveSchema(schema: UserSchema): Promise<void> {
    const { error } = await supabase.from('webhook_schemas').insert({
      id: schema.id,
      user_id: schema.userId,
      base_template_id: schema.baseTemplateId,
      category: schema.category,
      fields: schema.fields,
      provider_mappings: schema.providerMappings,
      created_at: schema.createdAt.toISOString(),
      updated_at: schema.updatedAt.toISOString(),
    });
    if (error) throw error;
  }

  async getSchema(id: string): Promise<UserSchema | null> {
    const { data, error } = await supabase
      .from('webhook_schemas')
      .select('*')
      .eq('id', id)
      .maybeSingle();
    if (error) throw error;
    if (!data) return null;
    return this.rowToUserSchema(data);
  }

  async updateSchema(id: string, updates: UpdateSchemaInput): Promise<void> {
    const { error } = await supabase
      .from('webhook_schemas')
      .update({
        ...(updates.fields ? { fields: updates.fields } : {}),
        ...(updates.providerMappings ? { provider_mappings: updates.providerMappings } : {}),
        updated_at: new Date().toISOString(),
      })
      .eq('id', id);
    if (error) throw error;
  }

  async deleteSchema(id: string): Promise<void> {
    const { error } = await supabase.from('webhook_schemas').delete().eq('id', id);
    if (error) throw error;
  }

  async listSchemas(userId: string): Promise<UserSchema[]> {
    const { data, error } = await supabase
      .from('webhook_schemas')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });
    if (error) throw error;
    return (data ?? []).map(this.rowToUserSchema);
  }

  // Base templates are served from the framework's in-memory registry
  async getBaseTemplate(id: string): Promise<BaseTemplate | null> {
    const { templateRegistry } = await import('@tern/normalization/dist/templates/registry');
    return templateRegistry.getById(id) ?? null;
  }

  async listBaseTemplates(): Promise<BaseTemplate[]> {
    const { templateRegistry } = await import('@tern/normalization/dist/templates/registry');
    return templateRegistry.listAll();
  }

  private rowToUserSchema = (row: any): UserSchema => ({
    id: row.id,
    userId: row.user_id,
    baseTemplateId: row.base_template_id,
    category: row.category,
    fields: row.fields,
    providerMappings: row.provider_mappings,
    createdAt: new Date(row.created_at),
    updatedAt: new Date(row.updated_at),
  });
}
```

### Initialize the Normalizer

Create `lib/normalizer.ts`:

```ts
// lib/normalizer.ts
import { Normalizer } from '@tern/normalization';
import { SupabaseStorageAdapter } from './supabaseStorageAdapter';

export const normalizer = new Normalizer(new SupabaseStorageAdapter());
```

### Next.js API routes: schema management

Create `app/api/schemas/templates/route.ts`:

```ts
// app/api/schemas/templates/route.ts
import { NextResponse } from 'next/server';
import { normalizer } from '@/lib/normalizer';

export async function GET() {
  const templates = await normalizer.getBaseTemplates();
  return NextResponse.json(templates);
}
```

Create `app/api/providers/[category]/route.ts`:

```ts
// app/api/providers/[category]/route.ts
import { NextResponse } from 'next/server';
import { normalizer } from '@/lib/normalizer';

export async function GET(_: Request, context: { params: { category: string } }) {
  const providers = await normalizer.getProviders(context.params.category as any);
  return NextResponse.json(providers);
}
```

Create `app/api/schemas/route.ts`:

```ts
// app/api/schemas/route.ts
import { NextResponse } from 'next/server';
import { normalizer } from '@/lib/normalizer';

export async function POST(req: Request) {
  const body = await req.json();
  const schema = await normalizer.createSchema(body);
  return NextResponse.json(schema);
}

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const id = searchParams.get('id');
  if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 });
  const schema = await normalizer.getSchema(id);
  return NextResponse.json(schema);
}
```

Create `app/api/schemas/[id]/route.ts`:

```ts
// app/api/schemas/[id]/route.ts
import { NextResponse } from 'next/server';
import { normalizer } from '@/lib/normalizer';

export async function PUT(req: Request, context: { params: { id: string } }) {
  const updates = await req.json();
  await normalizer.updateSchema(context.params.id, updates);
  return NextResponse.json({ success: true });
}
```

Create `app/api/transform/route.ts` (runtime test/dry run):

```ts
// app/api/transform/route.ts
import { NextResponse } from 'next/server';
import { normalizer } from '@/lib/normalizer';

export async function POST(req: Request) {
  const body = await req.json();
  const result = await normalizer.transform({
    rawPayload: body.rawPayload,
    provider: body.provider,
    schemaId: body.schemaId,
  });
  return NextResponse.json(result);
}
```

### Example: Webhook handler using Normalizer

Create a webhook route `app/api/webhooks/[provider]/route.ts`:

```ts
// app/api/webhooks/[provider]/route.ts
import { NextResponse } from 'next/server';
import { normalizer } from '@/lib/normalizer';

export async function POST(req: Request, context: { params: { provider: string } }) {
  const provider = context.params.provider;
  const rawPayload = await req.json();

  // Resolve schemaId for the current tenant/user from auth/session
  const schemaId = await resolveSchemaIdFromContext();

  const result = await normalizer.transform({ rawPayload, provider, schemaId });

  // Forward to user endpoint or process internally
  await forwardToUserEndpoint(result.normalized);

  return NextResponse.json({ status: 'ok' });
}

async function resolveSchemaIdFromContext(): Promise<string> {
  // Implement tenant-aware lookup
  return process.env.DEFAULT_SCHEMA_ID!;
}

async function forwardToUserEndpoint(payload: unknown) {
  // POST to user's configured webhook URL
}
```

### UI usage: minimal visual schema editor primitives

Fetch templates and providers:

```ts
// hooks/useTemplates.ts
export async function fetchTemplates() {
  const res = await fetch('/api/schemas/templates');
  return res.json();
}

export async function fetchProviders(category: string) {
  const res = await fetch(`/api/providers/${category}`);
  return res.json();
}
```

Create/update schema from the UI:

```ts
// lib/schemaClient.ts
import type { CreateSchemaInput, UpdateSchemaInput } from '@tern/normalization';

export async function createSchema(input: CreateSchemaInput) {
  const res = await fetch('/api/schemas', { method: 'POST', body: JSON.stringify(input) });
  return res.json();
}

export async function updateSchema(id: string, updates: UpdateSchemaInput) {
  await fetch(`/api/schemas/${id}`, { method: 'PUT', body: JSON.stringify(updates) });
}

export async function getSchema(id: string) {
  const res = await fetch(`/api/schemas?id=${id}`);
  return res.json();
}
```

Preview transformations in the editor:

```ts
// lib/previewTransform.ts
export async function previewTransform(params: { rawPayload: unknown; provider: string; schemaId: string }) {
  const res = await fetch('/api/transform', {
    method: 'POST',
    body: JSON.stringify(params),
  });
  return res.json();
}
```

### Minimal React components

Template picker:

```tsx
// components/TemplatePicker.tsx
import React from 'react';
import { useEffect, useState } from 'react';
import { fetchTemplates } from '@/hooks/useTemplates';

export function TemplatePicker({ onSelect }: { onSelect: (templateId: string) => void }) {
  const [templates, setTemplates] = useState<any[]>([]);
  useEffect(() => {
    fetchTemplates().then(setTemplates);
  }, []);
  return (
    <select onChange={(e) => onSelect(e.target.value)}>
      <option value="">Select a base template</option>
      {templates.map((t) => (
        <option key={t.id} value={t.id}>{t.category} ({t.version})</option>
      ))}
    </select>
  );
}
```

Field mapper row (conceptual):

```tsx
// components/FieldMapperRow.tsx
import React from 'react';

export function FieldMapperRow({ field, mappings, onChange }: { field: any; mappings: any[]; onChange: (m: any) => void }) {
  const mapping = mappings.find((m) => m.schemaFieldId === field.id);
  return (
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr 1fr', gap: 8 }}>
      <div>{field.name}</div>
      <input
        placeholder="provider.path.example"
        value={mapping?.providerPath ?? ''}
        onChange={(e) => onChange({ ...mapping, schemaFieldId: field.id, providerPath: e.target.value })}
      />
      <input
        placeholder="transform e.g. divide:100"
        value={mapping?.transform ?? ''}
        onChange={(e) => onChange({ ...mapping, schemaFieldId: field.id, transform: e.target.value })}
      />
    </div>
  );
}
```

### End-to-end flow to create a schema

1. User selects a base template and category
2. UI fetches providers for that category
3. UI renders fields with mapping inputs (per provider)
4. On Save, POST to `/api/schemas` with `CreateSchemaInput`
5. Use `/api/transform` to preview with sample payloads
6. Hook your webhook route to `normalizer.transform` for runtime

### Types for client payloads

Import these interfaces in your app:

```ts
import type {
  CreateSchemaInput,
  UpdateSchemaInput,
  UserSchema,
  ProviderMapping,
  FieldMapping,
} from '@tern/normalization';
```

### Security notes

- Use a service role key only on the server (API routes, server actions). Never expose it to the browser.
- Gate schema read/write by authenticated `userId` to prevent cross-tenant access.
- Validate schema via `normalizer.validateSchema` before saving.

### Performance notes

- The transform engine is synchronous-per-request and fast; typical overhead is minimal. Cache `getSchema` results per schemaId to avoid repeated database trips.
- Prefer pre-validating schema changes to avoid runtime errors in `transform`.

### Extending transforms

- The default DSL supports `toUpperCase`, `toLowerCase`, `toNumber`, `divide:x`, `multiply:x`.
- To add custom transforms, fork and extend the engine or wrap transformed outputs in your route.


