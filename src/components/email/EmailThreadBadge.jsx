import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/api/supabaseClient';
import { Badge } from '@/components/ui/badge';
import { Mail, Clock } from 'lucide-react';

export function EmailThreadBadge({ cspEventId, customerId, carrierId, onClick }) {
  const { data: counts } = useQuery({
    queryKey: ['email_thread_counts', cspEventId, customerId, carrierId],
    queryFn: async () => {
      let query = supabase
        .from('email_threads')
        .select('status', { count: 'exact', head: false });

      if (cspEventId) query = query.eq('csp_event_id', cspEventId);
      if (customerId) query = query.eq('customer_id', customerId);
      if (carrierId) query = query.eq('carrier_id', carrierId);

      const { data, error } = await query;
      if (error) throw error;

      const awaiting = data?.filter(t => t.status === 'awaiting_reply').length || 0;
      const active = data?.filter(t => t.status === 'active').length || 0;
      const total = data?.length || 0;

      return { awaiting, active, total };
    },
    refetchInterval: 30000,
  });

  if (!counts || counts.total === 0) {
    return null;
  }

  if (counts.awaiting > 0) {
    return (
      <button
        onClick={onClick}
        className="inline-flex items-center gap-1 text-xs hover:opacity-80 transition-opacity"
      >
        <Badge variant="outline" className="gap-1 border-amber-500 text-amber-700 bg-amber-50">
          <Clock className="h-3 w-3" />
          {counts.awaiting} awaiting reply
        </Badge>
      </button>
    );
  }

  if (counts.active > 0) {
    return (
      <button
        onClick={onClick}
        className="inline-flex items-center gap-1 text-xs hover:opacity-80 transition-opacity"
      >
        <Badge variant="outline" className="gap-1 text-muted-foreground">
          <Mail className="h-3 w-3" />
          {counts.active} active thread{counts.active !== 1 ? 's' : ''}
        </Badge>
      </button>
    );
  }

  return null;
}
