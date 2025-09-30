import { ProviderMapping } from '../../types';

export const stripeDefaultMapping: ProviderMapping = {
  provider: 'stripe',
  fieldMappings: [
    { schemaFieldId: 'event_type', providerPath: 'type' },
    { schemaFieldId: 'amount', providerPath: 'data.object.amount_received' },
    { schemaFieldId: 'currency', providerPath: 'data.object.currency', transform: 'toUpperCase' },
    { schemaFieldId: 'transaction_id', providerPath: 'data.object.id' },
    { schemaFieldId: 'customer_id', providerPath: 'data.object.customer' },
  ],
};


