import { BaseTemplate } from '../../types';

export const ecommerceBaseTemplate: BaseTemplate = {
  id: 'ecommerce_v1',
  category: 'ecommerce',
  version: '1.0.0',
  fields: [
    { id: 'event_type', name: 'event_type', type: 'string', required: true },
    { id: 'order_id', name: 'order_id', type: 'string', required: true },
    { id: 'total', name: 'total', type: 'number', required: true },
    { id: 'currency', name: 'currency', type: 'string', required: true },
    { id: 'customer_id', name: 'customer_id', type: 'string', required: false },
  ],
};


