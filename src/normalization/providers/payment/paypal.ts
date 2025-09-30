import { ProviderMapping } from '../../types';

export const paypalDefaultMapping: ProviderMapping = {
  provider: 'paypal',
  fieldMappings: [
    { schemaFieldId: 'event_type', providerPath: 'event_type' },
    { schemaFieldId: 'amount', providerPath: 'resource.amount.value', transform: 'toNumber' },
    { schemaFieldId: 'currency', providerPath: 'resource.amount.currency_code', transform: 'toUpperCase' },
    { schemaFieldId: 'transaction_id', providerPath: 'resource.id' },
  ],
};
