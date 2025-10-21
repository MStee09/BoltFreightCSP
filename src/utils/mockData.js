import { supabase } from '../api/supabaseClient';

const MOCK_USER_ID = '00000000-0000-0000-0000-000000000000';

export async function loadMockData() {
  try {
    const mockCustomers = [
      {
        id: '11111111-1111-1111-1111-111111111111',
        name: 'Acme Logistics',
        account_owner: 'John Smith',
        csp_strategy: 'Aggressive cost reduction through carrier diversification',
        margin_30d: 12.5,
        margin_60d: 11.8,
        status: 'active',
        notes: 'High-volume customer with quarterly reviews',
        user_id: MOCK_USER_ID
      },
      {
        id: '11111111-1111-1111-1111-111111111112',
        name: 'Global Trade Co',
        account_owner: 'Sarah Johnson',
        csp_strategy: 'Premium service focus with select carriers',
        margin_30d: 15.2,
        margin_60d: 14.9,
        status: 'active',
        notes: 'Values reliability over cost savings',
        user_id: MOCK_USER_ID
      },
      {
        id: '11111111-1111-1111-1111-111111111113',
        name: 'Express Distributors',
        account_owner: 'Mike Chen',
        csp_strategy: 'Balance between cost and service quality',
        margin_30d: 8.7,
        margin_60d: 9.2,
        status: 'active',
        notes: 'Growing account with potential for expansion',
        user_id: MOCK_USER_ID
      }
    ];

    const mockCarriers = [
      {
        id: '22222222-2222-2222-2222-222222222221',
        name: 'Swift Transport',
        scac_code: 'SWFT',
        service_type: 'LTL',
        contact_name: 'David Brown',
        contact_email: 'david.brown@swifttransport.com',
        contact_phone: '555-0101',
        performance_score: 92.5,
        status: 'active',
        notes: 'Excellent on-time performance, preferred for time-sensitive shipments',
        user_id: MOCK_USER_ID
      },
      {
        id: '22222222-2222-2222-2222-222222222222',
        name: 'National Freight',
        scac_code: 'NATF',
        service_type: 'TL',
        contact_name: 'Lisa Anderson',
        contact_email: 'lisa.anderson@nationalfreight.com',
        contact_phone: '555-0102',
        performance_score: 88.3,
        status: 'active',
        notes: 'Cost-effective for full truckload shipments',
        user_id: MOCK_USER_ID
      },
      {
        id: '22222222-2222-2222-2222-222222222223',
        name: 'Ocean Express',
        scac_code: 'OCEX',
        service_type: 'Ocean',
        contact_name: 'Robert Lee',
        contact_email: 'robert.lee@oceanexpress.com',
        contact_phone: '555-0103',
        performance_score: 85.7,
        status: 'active',
        notes: 'Specialized in international ocean freight',
        user_id: MOCK_USER_ID
      }
    ];

    const mockTariffs = [
      {
        id: '33333333-3333-3333-3333-333333333331',
        customer_id: '11111111-1111-1111-1111-111111111111',
        carrier_ids: ['22222222-2222-2222-2222-222222222221'],
        version: 'v2024.1',
        ownership_type: 'Customer',
        status: 'active',
        effective_date: '2024-01-01',
        expiry_date: '2025-03-31',
        is_blanket_tariff: false,
        file_url: '',
        notes: 'Standard LTL rates with volume discounts',
        user_id: MOCK_USER_ID
      },
      {
        id: '33333333-3333-3333-3333-333333333332',
        customer_id: '11111111-1111-1111-1111-111111111112',
        carrier_ids: ['22222222-2222-2222-2222-222222222222', '22222222-2222-2222-2222-222222222223'],
        version: 'v2024.2',
        ownership_type: 'Carrier',
        status: 'active',
        effective_date: '2024-06-01',
        expiry_date: '2025-05-31',
        is_blanket_tariff: true,
        file_url: '',
        notes: 'Multi-carrier blanket agreement',
        user_id: MOCK_USER_ID
      },
      {
        id: '33333333-3333-3333-3333-333333333333',
        customer_id: '11111111-1111-1111-1111-111111111113',
        carrier_ids: ['22222222-2222-2222-2222-222222222221'],
        version: 'v2023.4',
        ownership_type: 'Customer',
        status: 'proposed',
        effective_date: '2025-01-01',
        expiry_date: '2025-12-31',
        is_blanket_tariff: false,
        file_url: '',
        notes: 'Proposed rates for 2025, pending approval',
        user_id: MOCK_USER_ID
      }
    ];

    const mockCspEvents = [
      {
        id: '44444444-4444-4444-4444-444444444441',
        customer_id: '11111111-1111-1111-1111-111111111111',
        title: 'Q1 2025 Rate Negotiation',
        stage: 'negotiation',
        status: 'in_progress',
        priority: 'high',
        assigned_to: 'John Smith',
        due_date: '2025-01-15',
        days_in_stage: 12,
        notes: 'Customer seeking 8% reduction, we proposed 5%',
        user_id: MOCK_USER_ID
      },
      {
        id: '44444444-4444-4444-4444-444444444442',
        customer_id: '11111111-1111-1111-1111-111111111112',
        title: 'New Lane Expansion - West Coast',
        stage: 'discovery',
        status: 'in_progress',
        priority: 'normal',
        assigned_to: 'Sarah Johnson',
        due_date: '2025-02-01',
        days_in_stage: 5,
        notes: 'Exploring carrier options for new west coast routes',
        user_id: MOCK_USER_ID
      },
      {
        id: '44444444-4444-4444-4444-444444444443',
        customer_id: '11111111-1111-1111-1111-111111111113',
        title: 'Annual Contract Renewal',
        stage: 'implementation',
        status: 'completed',
        priority: 'high',
        assigned_to: 'Mike Chen',
        due_date: '2024-12-15',
        days_in_stage: 45,
        notes: 'Successfully renewed with improved terms',
        user_id: MOCK_USER_ID
      }
    ];

    const mockTasks = [
      {
        entity_type: 'customer',
        entity_id: '11111111-1111-1111-1111-111111111111',
        title: 'Prepare rate comparison analysis',
        status: 'open',
        priority: 'high',
        due_date: '2025-01-10',
        assigned_to: 'John Smith',
        notes: 'Compare current rates with proposed Q1 rates',
        user_id: MOCK_USER_ID
      },
      {
        entity_type: 'carrier',
        entity_id: '22222222-2222-2222-2222-222222222221',
        title: 'Quarterly performance review',
        status: 'open',
        priority: 'normal',
        due_date: '2025-01-20',
        assigned_to: 'Operations Team',
        notes: 'Review Q4 performance metrics and on-time delivery',
        user_id: MOCK_USER_ID
      },
      {
        entity_type: 'csp_event',
        entity_id: '44444444-4444-4444-4444-444444444442',
        title: 'Research west coast carriers',
        status: 'in_progress',
        priority: 'high',
        due_date: '2025-01-12',
        assigned_to: 'Sarah Johnson',
        notes: 'Identify 3-5 qualified carriers for new lanes',
        user_id: MOCK_USER_ID
      }
    ];

    const mockAlerts = [
      {
        alert_type: 'expiring_tariff',
        severity: 'warning',
        status: 'active',
        title: 'Tariff Expiring Soon',
        message: 'Acme Logistics tariff expires in 90 days',
        entity_type: 'tariff',
        entity_id: '33333333-3333-3333-3333-333333333331',
        user_id: MOCK_USER_ID
      },
      {
        alert_type: 'idle_negotiation',
        severity: 'warning',
        status: 'active',
        title: 'Stalled Negotiation',
        message: 'Q1 2025 Rate Negotiation has been in current stage for 12 days',
        entity_type: 'csp_event',
        entity_id: '44444444-4444-4444-4444-444444444441',
        user_id: MOCK_USER_ID
      },
      {
        alert_type: 'performance',
        severity: 'info',
        status: 'active',
        title: 'High Performer',
        message: 'Swift Transport maintains 92.5% performance score',
        entity_type: 'carrier',
        entity_id: '22222222-2222-2222-2222-222222222221',
        user_id: MOCK_USER_ID
      }
    ];

    const { error: customersError } = await supabase
      .from('customers')
      .insert(mockCustomers);

    if (customersError) throw customersError;

    const { error: carriersError } = await supabase
      .from('carriers')
      .insert(mockCarriers);

    if (carriersError) throw carriersError;

    const { error: tariffsError } = await supabase
      .from('tariffs')
      .insert(mockTariffs);

    if (tariffsError) throw tariffsError;

    const { error: eventsError } = await supabase
      .from('csp_events')
      .insert(mockCspEvents);

    if (eventsError) throw eventsError;

    const { error: tasksError } = await supabase
      .from('tasks')
      .insert(mockTasks);

    if (tasksError) throw tasksError;

    const { error: alertsError } = await supabase
      .from('alerts')
      .insert(mockAlerts);

    if (alertsError) throw alertsError;

    return { success: true, message: 'Mock data loaded successfully!' };
  } catch (error) {
    console.error('Error loading mock data:', error);
    return { success: false, error: error.message };
  }
}

export async function clearMockData() {
  try {
    await supabase.from('alerts').delete().eq('user_id', MOCK_USER_ID);
    await supabase.from('tasks').delete().eq('user_id', MOCK_USER_ID);
    await supabase.from('interactions').delete().eq('user_id', MOCK_USER_ID);
    await supabase.from('csp_events').delete().eq('user_id', MOCK_USER_ID);
    await supabase.from('tariffs').delete().eq('user_id', MOCK_USER_ID);
    await supabase.from('shipments').delete().eq('user_id', MOCK_USER_ID);
    await supabase.from('carriers').delete().eq('user_id', MOCK_USER_ID);
    await supabase.from('customers').delete().eq('user_id', MOCK_USER_ID);

    return { success: true, message: 'Mock data cleared successfully!' };
  } catch (error) {
    console.error('Error clearing mock data:', error);
    return { success: false, error: error.message };
  }
}
