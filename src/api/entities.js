import { supabase } from './supabaseClient';

const MOCK_USER_ID = '00000000-0000-0000-0000-000000000000';

const createEntity = (tableName) => ({
  async list(orderBy = '-created_date') {
    let query = supabase
      .from(tableName)
      .select('*')
      .eq('user_id', MOCK_USER_ID);

    if (orderBy) {
      const isDesc = orderBy.startsWith('-');
      const field = isDesc ? orderBy.substring(1) : orderBy;
      query = query.order(field, { ascending: !isDesc });
    }

    const { data, error } = await query;
    if (error) throw error;
    return data || [];
  },

  async get(id) {
    const { data, error } = await supabase
      .from(tableName)
      .select('*')
      .eq('id', id)
      .eq('user_id', MOCK_USER_ID)
      .maybeSingle();

    if (error) throw error;
    return data;
  },

  async create(payload) {
    const { data, error } = await supabase
      .from(tableName)
      .insert({ ...payload, user_id: MOCK_USER_ID })
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  async update(id, payload) {
    const { data, error } = await supabase
      .from(tableName)
      .update({ ...payload, updated_date: new Date().toISOString() })
      .eq('id', id)
      .eq('user_id', MOCK_USER_ID)
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  async delete(id) {
    const { error } = await supabase
      .from(tableName)
      .delete()
      .eq('id', id)
      .eq('user_id', MOCK_USER_ID);

    if (error) throw error;
    return { success: true };
  },

  async filter(filters) {
    let query = supabase
      .from(tableName)
      .select('*')
      .eq('user_id', MOCK_USER_ID);

    Object.entries(filters).forEach(([key, value]) => {
      if (key === 'order_by') {
        const isDesc = value.startsWith('-');
        const field = isDesc ? value.substring(1) : value;
        query = query.order(field, { ascending: !isDesc });
      } else if (key.endsWith('.contains')) {
        const field = key.replace('.contains', '');
        query = query.contains(field, [value]);
      } else if (key.endsWith('.icontains')) {
        const field = key.replace('.icontains', '');
        query = query.contains(field, [value]);
      } else if (key !== 'order_by') {
        query = query.eq(key, value);
      }
    });

    const { data, error } = await query;
    if (error) throw error;
    return data || [];
  },
});

export const Customer = createEntity('customers');
export const Carrier = createEntity('carriers');
export const Tariff = createEntity('tariffs');
export const CSPEvent = createEntity('csp_events');
export const Task = createEntity('tasks');
export const Interaction = createEntity('interactions');
export const Alert = createEntity('alerts');
export const Shipment = createEntity('shipments');
export const LostOpportunity = createEntity('lost_opportunities');
export const ReportSnapshot = createEntity('report_snapshots');
export const Document = createEntity('documents');
export const CalendarEvent = createEntity('calendar_events');
export const CSPEventCarrier = createEntity('csp_event_carriers');
export const CarrierContact = createEntity('carrier_contacts');

export const User = {
  async signUp(email, password) {
    const { data, error } = await supabase.auth.signUp({ email, password });
    if (error) throw error;
    return data;
  },

  async signIn(email, password) {
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) throw error;
    return data;
  },

  async signOut() {
    const { error } = await supabase.auth.signOut();
    if (error) throw error;
    return { success: true };
  },

  async getUser() {
    const { data: { user }, error } = await supabase.auth.getUser();
    if (error) throw error;
    return user;
  },

  async listAll() {
    const { data, error } = await supabase.rpc('get_all_users');
    if (error) throw error;
    return data || [];
  },

  onAuthStateChange(callback) {
    return supabase.auth.onAuthStateChange((event, session) => {
      (async () => {
        callback(event, session);
      })();
    });
  },
};

export const AISettings = {
  async get() {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Not authenticated');

    const { data, error } = await supabase
      .from('ai_chatbot_settings')
      .select('*')
      .eq('user_id', user.id)
      .eq('is_active', true)
      .maybeSingle();

    if (error) throw error;
    return data;
  },

  async upsert(settings) {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Not authenticated');

    const existing = await this.get();

    if (existing) {
      const { data, error } = await supabase
        .from('ai_chatbot_settings')
        .update({
          instructions: settings.instructions,
          knowledge_base: settings.knowledge_base,
          temperature: settings.temperature,
          max_tokens: settings.max_tokens,
        })
        .eq('id', existing.id)
        .select()
        .single();

      if (error) throw error;
      return data;
    } else {
      const { data, error } = await supabase
        .from('ai_chatbot_settings')
        .insert({
          user_id: user.id,
          instructions: settings.instructions,
          knowledge_base: settings.knowledge_base,
          temperature: settings.temperature,
          max_tokens: settings.max_tokens,
          is_active: true,
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    }
  },

  async reset() {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Not authenticated');

    const { error } = await supabase
      .from('ai_chatbot_settings')
      .delete()
      .eq('user_id', user.id);

    if (error) throw error;
    return { success: true };
  },
};

export const KnowledgeBase = {
  async list() {
    const { data, error } = await supabase
      .from('knowledge_base_documents')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) throw error;
    return data || [];
  },

  async get(id) {
    const { data, error } = await supabase
      .from('knowledge_base_documents')
      .select('*')
      .eq('id', id)
      .maybeSingle();

    if (error) throw error;
    return data;
  },

  async create(document) {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Not authenticated');

    const { data, error } = await supabase
      .from('knowledge_base_documents')
      .insert({ ...document, uploaded_by: user.id })
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  async update(id, updates) {
    const { data, error } = await supabase
      .from('knowledge_base_documents')
      .update(updates)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  async delete(id) {
    const { error } = await supabase
      .from('knowledge_base_documents')
      .delete()
      .eq('id', id);

    if (error) throw error;
    return { success: true };
  },

  async listActive() {
    const { data, error } = await supabase
      .from('knowledge_base_documents')
      .select('*')
      .eq('is_active', true)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return data || [];
  },
};
