import { ProviderInfo } from '../types';

const providers: ProviderInfo[] = [
  { id: 'stripe', name: 'Stripe', category: 'payment' },
  { id: 'razorpay', name: 'Razorpay', category: 'payment' },
  { id: 'paypal', name: 'PayPal', category: 'payment' },
  { id: 'clerk', name: 'Clerk', category: 'auth' },
  { id: 'auth0', name: 'Auth0', category: 'auth' },
  { id: 'supabase', name: 'Supabase', category: 'auth' },
  { id: 'shopify', name: 'Shopify', category: 'ecommerce' },
  { id: 'woocommerce', name: 'WooCommerce', category: 'ecommerce' },
];

export const providerRegistry = {
  list(category?: ProviderInfo['category']): ProviderInfo[] {
    if (!category) return providers;
    return providers.filter((p) => p.category === category);
  },
  getById(id: string): ProviderInfo | undefined {
    return providers.find((p) => p.id === id);
  },
};
