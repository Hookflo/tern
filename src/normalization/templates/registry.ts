import { BaseTemplate, TemplateCategory } from '../types';
import { paymentBaseTemplate } from './base/payment';
import { authBaseTemplate } from './base/auth';
import { ecommerceBaseTemplate } from './base/ecommerce';

const templates: Record<string, BaseTemplate> = {
  [paymentBaseTemplate.id]: paymentBaseTemplate,
  [authBaseTemplate.id]: authBaseTemplate,
  [ecommerceBaseTemplate.id]: ecommerceBaseTemplate,
};

export const templateRegistry = {
  getById(id: string): BaseTemplate | undefined {
    return templates[id];
  },
  listByCategory(category: TemplateCategory): BaseTemplate[] {
    return Object.values(templates).filter((t) => t.category === category);
  },
  listAll(): BaseTemplate[] {
    return Object.values(templates);
  },
};


