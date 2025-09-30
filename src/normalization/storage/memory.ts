import { BaseTemplate, CreateSchemaInput, UpdateSchemaInput, UserSchema } from '../types';
import { StorageAdapter } from './interface';
import { templateRegistry } from '../templates/registry';

export class InMemoryStorageAdapter implements StorageAdapter {
  private schemas = new Map<string, UserSchema>();

  async saveSchema(schema: UserSchema): Promise<void> {
    this.schemas.set(schema.id, schema);
  }

  async getSchema(id: string): Promise<UserSchema | null> {
    return this.schemas.get(id) ?? null;
  }

  async updateSchema(id: string, updates: UpdateSchemaInput): Promise<void> {
    const existing = this.schemas.get(id);
    if (!existing) return;
    const updated: UserSchema = {
      ...existing,
      ...updates,
      updatedAt: new Date(),
    } as UserSchema;
    this.schemas.set(id, updated);
  }

  async deleteSchema(id: string): Promise<void> {
    this.schemas.delete(id);
  }

  async listSchemas(userId: string): Promise<UserSchema[]> {
    return Array.from(this.schemas.values()).filter((s) => s.userId === userId);
  }

  async getBaseTemplate(id: string): Promise<BaseTemplate | null> {
    return templateRegistry.getById(id) ?? null;
  }

  async listBaseTemplates(): Promise<BaseTemplate[]> {
    return templateRegistry.listAll();
  }
}


