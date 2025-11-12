import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/api/supabaseClient';
import { Badge } from '@/components/ui/badge';
import { Mail, Clock, Pause, Circle } from 'lucide-react';

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
      const stalled = data?.filter(t => t.status === 'stalled').length || 0;
      const active = data?.filter(t => t.status === 'active').length || 0;
      const closed = data?.filter(t => t.status === 'closed').length || 0;
      const total = data?.length || 0;

      return { awaiting, stalled, active, closed, total };
    },
    refetchInterval: 30000,
  });

  if (!counts || counts.total === 0) {
    return null;
  }

  // Priority: Awaiting > Stalled > Active > Closed
  if (counts.awaiting > 0) {
    return (
      <button
        onClick={onClick}
        className="inline-flex items-center gap-1 text-xs hover:opacity-80 transition-opacity"
      >
        <Badge className="gap-1 bg-[#F2C94C] hover:bg-[#F2C94C]/90 text-white border-0">
          <Clock className="h-3 w-3" />
          {counts.awaiting} awaiting reply
        </Badge>
      </button>
    );
  }

  if (counts.stalled > 0) {
    return (
      <button
        onClick={onClick}
        className="inline-flex items-center gap-1 text-xs hover:opacity-80 transition-opacity"
      >
        <Badge className="gap-1 bg-[#F2994A] hover:bg-[#F2994A]/90 text-white border-0">
          <Pause className="h-3 w-3" />
          {counts.stalled} stalled
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
        <Badge className="gap-1 bg-[#3BB273] hover:bg-[#3BB273]/90 text-white border-0">
          <Circle className="h-3 w-3 fill-current" />
          {counts.active} active
        </Badge>
      </button>
    );
  }

  if (counts.closed > 0) {
    return (
      <button
        onClick={onClick}
        className="inline-flex items-center gap-1 text-xs hover:opacity-80 transition-opacity"
      >
        <Badge className="gap-1 bg-[#BDBDBD] hover:bg-[#BDBDBD]/90 text-white border-0">
          <Mail className="h-3 w-3" />
          {counts.closed} closed
        </Badge>
      </button>
    );
  }

  return null;
}
