import { BaseTemplate, CreateSchemaInput, UpdateSchemaInput, UserSchema } from '../types';

export interface StorageAdapter {
  saveSchema(schema: UserSchema): Promise<void>;
  getSchema(id: string): Promise<UserSchema | null>;
  updateSchema(id: string, updates: UpdateSchemaInput): Promise<void>;
  deleteSchema(id: string): Promise<void>;
  listSchemas(userId: string): Promise<UserSchema[]>;

  getBaseTemplate(id: string): Promise<BaseTemplate | null>;
  listBaseTemplates(): Promise<BaseTemplate[]>;
}

export interface NormalizationStorageOptions {
  adapter: StorageAdapter;
}


