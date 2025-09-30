import { BaseTemplate } from '../../types';

export const authBaseTemplate: BaseTemplate = {
  id: 'auth_v1',
  category: 'auth',
  version: '1.0.0',
  fields: [
    { id: 'event_type', name: 'event_type', type: 'string', required: true },
    { id: 'user_id', name: 'user_id', type: 'string', required: true },
    { id: 'email', name: 'email', type: 'string', required: false },
    { id: 'status', name: 'status', type: 'string', required: true },
  ],
};


