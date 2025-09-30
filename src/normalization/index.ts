import { BaseTemplate, CreateSchemaInput, NormalizedResult, ProviderInfo, TemplateCategory, TransformParams, UpdateSchemaInput, UserSchema } from './types';
import { providerRegistry } from './providers/registry';
import { templateRegistry } from './templates/registry';
import { StorageAdapter } from './storage/interface';
import { InMemoryStorageAdapter } from './storage/memory';
import { NormalizationEngine } from './transformer/engine';
import { SchemaValidator } from './transformer/validator';

export class Normalizer {
  private engine: NormalizationEngine;

  constructor(private readonly storage: StorageAdapter = new InMemoryStorageAdapter()) {
    this.engine = new NormalizationEngine(storage, new SchemaValidator());
  }

  async getBaseTemplates(): Promise<BaseTemplate[]> {
    return this.storage.listBaseTemplates();
  }

  async getProviders(category?: TemplateCategory): Promise<ProviderInfo[]> {
    return providerRegistry.list(category);
  }

  async createSchema(input: CreateSchemaInput): Promise<UserSchema> {
    const schema: UserSchema = {
      id: generateId(),
      userId: input.userId,
      baseTemplateId: input.baseTemplateId,
      category: input.category,
      fields: input.fields,
      providerMappings: input.providerMappings,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    await this.storage.saveSchema(schema);
    return schema;
  }

  async updateSchema(schemaId: string, updates: UpdateSchemaInput): Promise<void> {
    await this.storage.updateSchema(schemaId, updates);
  }

  async getSchema(id: string): Promise<UserSchema | null> {
    return this.storage.getSchema(id);
  }

  async transform(params: TransformParams): Promise<NormalizedResult> {
    return this.engine.transform(params);
  }

  async validateSchema(schema: UserSchema): Promise<{ valid: boolean; errors: string[] }> {
    const base = await this.storage.getBaseTemplate(schema.baseTemplateId) ?? templateRegistry.getById(schema.baseTemplateId);
    if (!base) return { valid: false, errors: [`Base template not found: ${schema.baseTemplateId}`] };
    const validator = new SchemaValidator();
    return validator.validateSchema(schema, base);
  }
}

function generateId(): string {
  // Simple non-crypto unique ID generator for framework default
  return 'sch_' + Math.random().toString(36).slice(2, 10) + Date.now().toString(36);
}

export * from './types';
export * from './storage/interface';
export { InMemoryStorageAdapter } from './storage/memory';


