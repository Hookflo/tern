import { BaseTemplate } from '../../types';

export const paymentBaseTemplate: BaseTemplate = {
  id: 'payment_v1',
  category: 'payment',
  version: '1.0.0',
  fields: [
    { id: 'event_type', name: 'event_type', type: 'string', required: true, description: 'Type of payment event' },
    { id: 'amount', name: 'amount', type: 'number', required: true, description: 'Amount in the smallest currency unit' },
    { id: 'currency', name: 'currency', type: 'string', required: true, description: 'Three-letter currency code' },
    { id: 'transaction_id', name: 'transaction_id', type: 'string', required: true, description: 'Unique transaction identifier' },
    { id: 'customer_id', name: 'customer_id', type: 'string', required: false, description: 'Customer identifier' },
  ],
};


