import { ProviderMapping } from '../../types';

export const razorpayDefaultMapping: ProviderMapping = {
  provider: 'razorpay',
  fieldMappings: [
    { schemaFieldId: 'event_type', providerPath: 'event' },
    { schemaFieldId: 'amount', providerPath: 'payload.payment.entity.amount' },
    { schemaFieldId: 'currency', providerPath: 'payload.payment.entity.currency', transform: 'toUpperCase' },
    { schemaFieldId: 'transaction_id', providerPath: 'payload.payment.entity.id' },
    { schemaFieldId: 'customer_id', providerPath: 'payload.payment.entity.contact' },
  ],
};
