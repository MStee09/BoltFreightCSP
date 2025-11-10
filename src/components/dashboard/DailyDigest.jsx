import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../../api/supabaseClient';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { Skeleton } from '../ui/skeleton';
import {
  Sparkles, Clock, AlertTriangle, CheckCircle,
  FileText, TrendingDown, RefreshCw, ChevronRight,
  Calendar, Zap
} from 'lucide-react';
import { format } from 'date-fns';
import { Link } from 'react-router-dom';
import { createPageUrl } from '../../utils';
import { toast } from 'sonner';

const PRIORITY_CONFIG = {
  high: { color: 'bg-red-100 text-red-700 border-red-200', icon: AlertTriangle },
  medium: { color: 'bg-yellow-100 text-yellow-700 border-yellow-200', icon: Clock },
  low: { color: 'bg-blue-100 text-blue-700 border-blue-200', icon: CheckCircle },
};

export default function DailyDigest({ userId }) {
  const queryClient = useQueryClient();
  const [isGenerating, setIsGenerating] = useState(false);

  const { data: digest, isLoading } = useQuery({
    queryKey: ['daily-digest', userId],
    queryFn: async () => {
      const today = new Date().toISOString().split('T')[0];
      const { data, error } = await supabase
        .from('daily_digests')
        .select('*')
        .eq('user_id', userId)
        .eq('digest_date', today)
        .maybeSingle();

      if (error) throw error;
      return data;
    },
    enabled: !!userId,
  });

  const markAsReadMutation = useMutation({
    mutationFn: async () => {
      if (!digest?.id) return;
      const { error } = await supabase
        .from('daily_digests')
        .update({ is_read: true })
        .eq('id', digest.id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['daily-digest', userId]);
    },
  });

  const generateDigestMutation = useMutation({
    mutationFn: async () => {
      setIsGenerating(true);
      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/generate-daily-digest`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ userId }),
        }
      );

      if (!response.ok) {
        throw new Error('Failed to generate digest');
      }

      return response.json();
    },
    onSuccess: () => {
      toast.success('Daily digest generated successfully');
      queryClient.invalidateQueries(['daily-digest', userId]);
      setIsGenerating(false);
    },
    onError: (error) => {
      toast.error(`Failed to generate digest: ${error.message}`);
      setIsGenerating(false);
    },
  });

  if (isLoading) {
    return null;
  }

  if (!digest) {
    return null;
  }

  const actionItems = digest.action_items || [];
  const hasContent = actionItems.length > 0 ||
                     digest.expiring_tariffs?.length > 0 ||
                     digest.stalled_csps?.length > 0 ||
                     digest.pending_sops?.length > 0;

  if (!hasContent) {
    return null;
  }

  return (
    <Card className={`border-purple-200 bg-gradient-to-br from-purple-50 to-blue-50 ${!digest.is_read ? 'ring-2 ring-purple-400' : ''}`}>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-purple-600" />
            <CardTitle>Daily Digest</CardTitle>
            {!digest.is_read && (
              <Badge variant="default" className="bg-purple-600">New</Badge>
            )}
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs text-slate-500">
              {format(new Date(digest.created_at), 'MMM d, h:mm a')}
            </span>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => generateDigestMutation.mutate()}
              disabled={isGenerating}
            >
              <RefreshCw className={`w-4 h-4 ${isGenerating ? 'animate-spin' : ''}`} />
            </Button>
          </div>
        </div>
        <CardDescription>
          {actionItems.length} item${actionItems.length > 1 ? 's' : ''} need${actionItems.length === 1 ? 's' : ''} your attention
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {actionItems.length > 0 && actionItems.map((item, index) => {
          const config = PRIORITY_CONFIG[item.priority] || PRIORITY_CONFIG.medium;
          const Icon = config.icon;

          return (
            <div
              key={index}
              className={`p-4 rounded-lg border ${config.color} transition-all hover:shadow-md`}
            >
              <div className="flex items-start gap-3">
                <Icon className="w-5 h-5 mt-0.5 flex-shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-sm mb-1">{item.message}</p>
                  <p className="text-xs opacity-80">{item.action}</p>
                </div>
                <ChevronRight className="w-4 h-4 flex-shrink-0 opacity-50" />
              </div>
            </div>
          );
        })}

        {(digest.expiring_tariffs?.length > 0 || digest.stalled_csps?.length > 0 || digest.pending_sops?.length > 0) && (
          <div className="pt-4 border-t space-y-3">
            {digest.expiring_tariffs?.length > 0 && (
              <div>
                <h4 className="text-xs font-semibold text-slate-700 mb-2 flex items-center gap-1">
                  <Clock className="w-3 h-3" />
                  Expiring Soon ({digest.expiring_tariffs.length})
                </h4>
                <div className="space-y-1">
                  {digest.expiring_tariffs.slice(0, 3).map((tariff) => (
                    <Link
                      key={tariff.id}
                      to={createPageUrl(`TariffDetail?id=${tariff.id}`)}
                      className="block text-xs text-purple-700 hover:text-purple-800 hover:underline"
                    >
                      • {tariff.customers?.name} - {tariff.tariff_reference_id || 'Tariff'}
                    </Link>
                  ))}
                </div>
              </div>
            )}

            {digest.stalled_csps?.length > 0 && (
              <div>
                <h4 className="text-xs font-semibold text-slate-700 mb-2 flex items-center gap-1">
                  <TrendingDown className="w-3 h-3" />
                  Stalled CSPs ({digest.stalled_csps.length})
                </h4>
                <div className="space-y-1">
                  {digest.stalled_csps.slice(0, 3).map((csp) => (
                    <Link
                      key={csp.id}
                      to={createPageUrl(`CspEventDetail?id=${csp.id}`)}
                      className="block text-xs text-purple-700 hover:text-purple-800 hover:underline"
                    >
                      • {csp.title}
                    </Link>
                  ))}
                </div>
              </div>
            )}

            {digest.pending_sops?.length > 0 && (
              <div>
                <h4 className="text-xs font-semibold text-slate-700 mb-2 flex items-center gap-1">
                  <FileText className="w-3 h-3" />
                  Pending SOPs ({digest.pending_sops.length})
                </h4>
                <div className="space-y-1">
                  {digest.pending_sops.slice(0, 3).map((sop) => (
                    <div key={sop.id} className="text-xs text-slate-600">
                      • {sop.title}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {!digest.is_read && (
          <Button
            variant="outline"
            size="sm"
            onClick={() => markAsReadMutation.mutate()}
            className="w-full mt-2"
          >
            <CheckCircle className="w-4 h-4 mr-2" />
            Mark as Read
          </Button>
        )}
      </CardContent>
    </Card>
  );
}
