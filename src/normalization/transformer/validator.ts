import { BaseTemplate, UserSchema } from '../types';

export class SchemaValidator {
  validateSchema(userSchema: UserSchema, baseTemplate: BaseTemplate): { valid: boolean; errors: string[] } {
    const errors: string[] = [];

    // Ensure required base fields exist and are enabled or have defaults
    for (const baseField of baseTemplate.fields) {
      if (!baseField.required) continue;
      const userField = userSchema.fields.find((f) => f.id === baseField.id);
      if (!userField) {
        errors.push(`Missing required field in schema: ${baseField.id}`);
        continue;
      }
      if (!userField.enabled && baseField.defaultValue === undefined) {
        errors.push(`Required field disabled without default: ${baseField.id}`);
      }
      if (userField.type !== baseField.type) {
        errors.push(`Type mismatch for field ${baseField.id}: expected ${baseField.type}, got ${userField.type}`);
      }
    }

    return { valid: errors.length === 0, errors };
  }

  validateOutput(output: Record<string, unknown>, userSchema: UserSchema, baseTemplate: BaseTemplate): { valid: boolean; errors: string[] } {
    const errors: string[] = [];
    for (const field of userSchema.fields) {
      if (!field.enabled) continue;
      const value = (output as any)[field.name];
      if (value === undefined) {
        if (field.required) errors.push(`Missing required field in output: ${field.name}`);
        continue;
      }
      if (!this.matchesType(value, field.type)) {
        errors.push(`Type mismatch for output field ${field.name}`);
      }
    }
    return { valid: errors.length === 0, errors };
  }

  private matchesType(value: unknown, type: UserSchema['fields'][number]['type']): boolean {
    if (type === 'number') return typeof value === 'number' && !Number.isNaN(value as number);
    if (type === 'string') return typeof value === 'string';
    if (type === 'boolean') return typeof value === 'boolean';
    if (type === 'object') return typeof value === 'object' && value !== null && !Array.isArray(value);
    if (type === 'array') return Array.isArray(value);
    return true;
  }
}
