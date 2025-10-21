import { CalendarEvent } from '../api/entities';

export const calculateNextReviewDate = (frequency, fromDate = new Date()) => {
  const date = new Date(fromDate);

  switch (frequency) {
    case 'monthly':
      date.setMonth(date.getMonth() + 1);
      break;
    case 'quarterly':
      date.setMonth(date.getMonth() + 3);
      break;
    case 'semi_annual':
      date.setMonth(date.getMonth() + 6);
      break;
    case 'annual':
      date.setFullYear(date.getFullYear() + 1);
      break;
    default:
      date.setFullYear(date.getFullYear() + 1);
  }

  return date.toISOString().split('T')[0];
};

export const createCspReviewEvent = async (customer) => {
  if (!customer.csp_review_frequency) return null;

  const nextReviewDate = calculateNextReviewDate(customer.csp_review_frequency);

  const frequencyLabels = {
    monthly: 'Monthly',
    quarterly: 'Quarterly',
    semi_annual: 'Semi-Annual',
    annual: 'Annual'
  };

  const eventData = {
    event_type: 'csp_review',
    title: `${frequencyLabels[customer.csp_review_frequency]} CSP Review - ${customer.name}`,
    description: `Time to review CSP opportunities and strategy with ${customer.name}`,
    event_date: nextReviewDate,
    status: 'pending',
    entity_type: 'customer',
    entity_id: customer.id,
    customer_id: customer.id,
    assigned_to: customer.account_owner || '',
    metadata: {
      frequency: customer.csp_review_frequency,
      customer_name: customer.name
    }
  };

  return await CalendarEvent.create(eventData);
};

export const createHoneymoonEvents = async (cspEvent, customer) => {
  if (!cspEvent.go_live_date || !cspEvent.honeymoon_monitoring) return [];

  const goLiveDate = new Date(cspEvent.go_live_date);
  const events = [];

  const checkpoints = [
    { days: 30, label: '30-Day' },
    { days: 60, label: '60-Day' },
    { days: 90, label: '90-Day' }
  ];

  for (const checkpoint of checkpoints) {
    const checkDate = new Date(goLiveDate);
    checkDate.setDate(checkDate.getDate() + checkpoint.days);

    const eventData = {
      event_type: 'honeymoon_check',
      title: `${checkpoint.label} Honeymoon Check - ${cspEvent.title}`,
      description: `Monitor adoption and performance of ${cspEvent.title} with ${customer?.name || 'customer'}`,
      event_date: checkDate.toISOString().split('T')[0],
      status: 'pending',
      entity_type: 'csp_event',
      entity_id: cspEvent.id,
      customer_id: cspEvent.customer_id,
      csp_event_id: cspEvent.id,
      assigned_to: cspEvent.assigned_to || '',
      metadata: {
        honeymoon_day: checkpoint.days,
        go_live_date: cspEvent.go_live_date,
        csp_event_title: cspEvent.title
      }
    };

    const createdEvent = await CalendarEvent.create(eventData);
    events.push(createdEvent);
  }

  return events;
};

export const getUpcomingEvents = async (daysAhead = 30) => {
  const today = new Date().toISOString().split('T')[0];
  const futureDate = new Date();
  futureDate.setDate(futureDate.getDate() + daysAhead);
  const futureDateStr = futureDate.toISOString().split('T')[0];

  const allEvents = await CalendarEvent.list();

  return allEvents.filter(event =>
    event.event_date >= today &&
    event.event_date <= futureDateStr &&
    event.status === 'pending'
  ).sort((a, b) => a.event_date.localeCompare(b.event_date));
};
