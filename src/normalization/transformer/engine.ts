import { NormalizedResult, TransformParams, UserSchema } from '../types';
import { StorageAdapter } from '../storage/interface';
import { templateRegistry } from '../templates/registry';
import { SchemaValidator } from './validator';

export class NormalizationEngine {
  constructor(private readonly storage: StorageAdapter, private readonly validator = new SchemaValidator()) {}

  async transform(params: TransformParams): Promise<NormalizedResult> {
    const { rawPayload, provider, schemaId } = params;

    const schema = await this.storage.getSchema(schemaId);
    if (!schema) throw new Error(`Schema not found: ${schemaId}`);

    const baseTemplate = await this.storage.getBaseTemplate(schema.baseTemplateId) || templateRegistry.getById(schema.baseTemplateId);
    if (!baseTemplate) throw new Error(`Base template not found: ${schema.baseTemplateId}`);

    const validation = this.validator.validateSchema(schema, baseTemplate);
    if (!validation.valid) {
      throw new Error(`Invalid schema: ${validation.errors.join('; ')}`);
    }

    const providerMapping = schema.providerMappings.find((m) => m.provider === provider);
    if (!providerMapping) throw new Error(`No mapping found for provider: ${provider}`);

    const normalized: Record<string, unknown> = {};

    for (const field of schema.fields) {
      if (!field.enabled) continue;
      const mapping = providerMapping.fieldMappings.find((m) => m.schemaFieldId === field.id);
      if (mapping) {
        const value = this.extractValue(rawPayload as any, mapping.providerPath);
        const finalValue = this.applyTransform(value, mapping.transform);
        normalized[field.name] = finalValue ?? field.defaultValue;
      } else if (field.required) {
        if (field.defaultValue !== undefined) {
          normalized[field.name] = field.defaultValue;
        } else {
          throw new Error(`Required field ${field.name} has no mapping`);
        }
      }
    }

    const outValidation = this.validator.validateOutput(normalized, schema, baseTemplate);
    if (!outValidation.valid) {
      throw new Error(`Normalized output invalid: ${outValidation.errors.join('; ')}`);
    }

    return {
      normalized,
      meta: {
        provider,
        schemaId,
        schemaVersion: schema.baseTemplateId,
        transformedAt: new Date(),
      },
    };
  }

  private extractValue(obj: any, path: string): unknown {
    if (!path) return undefined;
    return path.split('.').reduce((acc, key) => (acc == null ? undefined : acc[key]), obj);
  }

  private applyTransform(value: unknown, transform?: string): unknown {
    if (transform == null) return value;
    if (value == null) return value;

    if (transform === 'toUpperCase') return String(value).toUpperCase();
    if (transform === 'toLowerCase') return String(value).toLowerCase();
    if (transform === 'toNumber') return typeof value === 'number' ? value : Number(value);
    if (transform.startsWith('divide:')) {
      const denominator = Number(transform.split(':')[1]);
      return Number(value) / denominator;
    }
    if (transform.startsWith('multiply:')) {
      const factor = Number(transform.split(':')[1]);
      return Number(value) * factor;
    }
    return value;
  }
}


