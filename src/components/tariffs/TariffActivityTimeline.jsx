import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { supabase } from '../../api/supabaseClient';
import { Card, CardContent } from '../ui/card';
import { Badge } from '../ui/badge';
import { Skeleton } from '../ui/skeleton';
import {
  TrendingUp, FileText, CheckCircle, XCircle, Clock,
  Mail, Upload, StickyNote, Users, Package, Edit,
  ArrowRight
} from 'lucide-react';
import { format, isToday, isYesterday, isThisWeek } from 'date-fns';
import { createPageUrl } from '../../utils';

const ACTIVITY_ICONS = {
  'csp_created': TrendingUp,
  'csp_stage_change': TrendingUp,
  'tariff_created': FileText,
  'tariff_activated': CheckCircle,
  'tariff_superseded': XCircle,
  'tariff_expired': Clock,
  'renewal_csp_created': TrendingUp,
  'sop_added': FileText,
  'sop_updated': Edit,
  'document_uploaded': Upload,
  'email_sent': Mail,
  'email_received': Mail,
  'note_added': StickyNote,
  'tariff_updated': Edit,
  'carrier_added': Users,
  'carrier_removed': Users,
  'status_change': Edit,
  'system': Package
};

const ACTIVITY_COLORS = {
  'csp_created': 'text-purple-600 bg-purple-100',
  'csp_stage_change': 'text-purple-600 bg-purple-100',
  'tariff_created': 'text-blue-600 bg-blue-100',
  'tariff_activated': 'text-green-600 bg-green-100',
  'tariff_superseded': 'text-orange-600 bg-orange-100',
  'tariff_expired': 'text-red-600 bg-red-100',
  'renewal_csp_created': 'text-purple-600 bg-purple-100',
  'sop_added': 'text-blue-600 bg-blue-100',
  'sop_updated': 'text-blue-600 bg-blue-100',
  'document_uploaded': 'text-slate-600 bg-slate-100',
  'email_sent': 'text-blue-600 bg-blue-100',
  'email_received': 'text-green-600 bg-green-100',
  'note_added': 'text-yellow-600 bg-yellow-100',
  'tariff_updated': 'text-slate-600 bg-slate-100',
  'carrier_added': 'text-green-600 bg-green-100',
  'carrier_removed': 'text-red-600 bg-red-100',
  'status_change': 'text-blue-600 bg-blue-100',
  'system': 'text-slate-600 bg-slate-100'
};

function groupActivitiesByDate(activities) {
  const groups = {};

  activities.forEach(activity => {
    const date = new Date(activity.created_at);
    let groupKey;

    if (isToday(date)) {
      groupKey = 'Today';
    } else if (isYesterday(date)) {
      groupKey = 'Yesterday';
    } else if (isThisWeek(date)) {
      groupKey = 'Earlier this week';
    } else {
      groupKey = format(date, 'MMMM d, yyyy');
    }

    if (!groups[groupKey]) {
      groups[groupKey] = [];
    }
    groups[groupKey].push(activity);
  });

  return groups;
}

export default function TariffActivityTimeline({ tariffId, tariffFamilyId }) {
  const { data: activities = [], isLoading } = useQuery({
    queryKey: ['tariff-activities', tariffId, tariffFamilyId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('tariff_activities')
        .select('*')
        .or(`tariff_id.eq.${tariffId},tariff_family_id.eq.${tariffFamilyId}`)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data || [];
    },
    enabled: !!(tariffId || tariffFamilyId)
  });

  if (isLoading) {
    return (
      <div className="space-y-4">
        {[...Array(5)].map((_, i) => (
          <div key={i} className="flex gap-4">
            <Skeleton className="w-10 h-10 rounded-full flex-shrink-0" />
            <div className="flex-1 space-y-2">
              <Skeleton className="h-4 w-3/4" />
              <Skeleton className="h-3 w-1/2" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (activities.length === 0) {
    return (
      <Card>
        <CardContent className="p-12 text-center">
          <Clock className="w-12 h-12 mx-auto text-slate-300 mb-4" />
          <p className="text-slate-600 font-medium">No activity yet</p>
          <p className="text-sm text-slate-500 mt-1">
            Activity will appear here as changes are made to this tariff
          </p>
        </CardContent>
      </Card>
    );
  }

  const groupedActivities = groupActivitiesByDate(activities);

  return (
    <div className="space-y-8">
      {Object.entries(groupedActivities).map(([dateGroup, items]) => (
        <div key={dateGroup}>
          <h3 className="text-sm font-semibold text-slate-900 mb-4 sticky top-0 bg-white/95 backdrop-blur-sm py-2 z-10">
            {dateGroup}
          </h3>

          <div className="space-y-4 relative before:absolute before:left-5 before:top-0 before:bottom-0 before:w-px before:bg-slate-200">
            {items.map((activity, index) => {
              const Icon = ACTIVITY_ICONS[activity.activity_type] || FileText;
              const colorClass = ACTIVITY_COLORS[activity.activity_type] || 'text-slate-600 bg-slate-100';
              const isSystem = activity.is_system || !activity.user_name;

              return (
                <div key={activity.id} className="flex gap-4 relative">
                  {/* Icon */}
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 ${colorClass} relative z-10`}>
                    <Icon className="w-5 h-5" />
                  </div>

                  {/* Content */}
                  <div className="flex-1 pb-4">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-slate-900 text-sm">
                          {activity.title || activity.description}
                        </p>

                        {activity.description && activity.title && (
                          <p className="text-sm text-slate-600 mt-1">
                            {activity.description}
                          </p>
                        )}

                        <div className="flex items-center gap-2 mt-2 text-xs text-slate-500">
                          {isSystem ? (
                            <Badge variant="outline" className="text-xs bg-slate-50">
                              System
                            </Badge>
                          ) : (
                            <>
                              <div className="w-5 h-5 rounded-full bg-slate-300 flex items-center justify-center text-[10px] font-semibold text-slate-700">
                                {activity.user_name?.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2) || '?'}
                              </div>
                              <span className="font-medium">{activity.user_name}</span>
                            </>
                          )}
                          <span>•</span>
                          <span>{format(new Date(activity.created_at), 'h:mm a')}</span>
                        </div>

                        {/* Deep link based on activity type */}
                        {activity.csp_event_id && (
                          <Link
                            to={createPageUrl(`CspEventDetail?id=${activity.csp_event_id}`)}
                            className="inline-flex items-center gap-1 text-xs text-purple-600 hover:text-purple-700 hover:underline mt-2"
                          >
                            <TrendingUp className="w-3 h-3" />
                            View CSP Event
                            <ArrowRight className="w-3 h-3" />
                          </Link>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}
