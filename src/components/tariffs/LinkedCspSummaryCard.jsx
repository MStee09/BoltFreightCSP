import React from 'react';
import { Link } from 'react-router-dom';
import { Card, CardContent } from '../ui/card';
import { Badge } from '../ui/badge';
import { Button } from '../ui/button';
import { Avatar } from '../ui/avatar';
import { ExternalLink, Calendar, TrendingUp, Users } from 'lucide-react';
import { format } from 'date-fns';
import { createPageUrl } from '../../utils';

const STAGE_COLORS = {
  'planning': 'bg-slate-100 text-slate-700 border-slate-300',
  'invites_sent': 'bg-blue-100 text-blue-700 border-blue-300',
  'optimization': 'bg-purple-100 text-purple-700 border-purple-300',
  'awarded': 'bg-green-100 text-green-700 border-green-300',
  'implementation': 'bg-yellow-100 text-yellow-700 border-yellow-300',
  'closed': 'bg-slate-100 text-slate-600 border-slate-300'
};

const STAGE_LABELS = {
  'planning': 'Planning',
  'invites_sent': 'Invites Sent',
  'optimization': 'Optimization',
  'awarded': 'Awarded',
  'implementation': 'Implementation',
  'closed': 'Closed'
};

export default function LinkedCspSummaryCard({ cspEvent, customer, carriers = [] }) {
  if (!cspEvent) return null;

  const stageColor = STAGE_COLORS[cspEvent.stage] || 'bg-slate-100 text-slate-700';
  const stageLabel = STAGE_LABELS[cspEvent.stage] || cspEvent.stage;

  const carrierList = carriers.length > 0 ? carriers : [];
  const carrierCount = cspEvent.carrier_ids?.length || 0;
  const invitedCarriers = cspEvent.invited_carriers || carrierCount;

  return (
    <Card className="border-l-4 border-l-purple-500 bg-gradient-to-r from-purple-50/50 to-white">
      <CardContent className="p-4">
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-2">
              <TrendingUp className="w-4 h-4 text-purple-600 flex-shrink-0" />
              <span className="text-xs font-medium text-purple-600 uppercase tracking-wide">Linked CSP Event</span>
              <Badge variant="outline" className={`${stageColor} text-xs`}>
                {stageLabel}
              </Badge>
            </div>

            <Link
              to={createPageUrl(`CspEventDetail?id=${cspEvent.id}`)}
              className="text-base font-semibold text-slate-900 hover:text-purple-600 transition-colors block mb-2 truncate"
            >
              {cspEvent.title}
            </Link>

            <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-600">
              {customer && (
                <div className="flex items-center gap-1">
                  <span className="text-slate-500">Customer:</span>
                  <span className="font-medium">{customer.name}</span>
                </div>
              )}

              {carrierList.length > 0 && (
                <div className="flex items-center gap-1">
                  <span className="text-slate-500">Carrier:</span>
                  <span className="font-medium">{carrierList.map(c => c.name).join(', ')}</span>
                </div>
              )}

              {cspEvent.created_date && (
                <div className="flex items-center gap-1">
                  <Calendar className="w-3 h-3 text-slate-400" />
                  <span>Created {format(new Date(cspEvent.created_date), 'MMM d, yyyy')}</span>
                </div>
              )}

              {cspEvent.updated_date && (
                <div className="flex items-center gap-1">
                  <span className="text-slate-500">Updated:</span>
                  <span>{format(new Date(cspEvent.updated_date), 'MMM d, yyyy')}</span>
                </div>
              )}

              {invitedCarriers > 0 && (
                <div className="flex items-center gap-1">
                  <Users className="w-3 h-3 text-slate-400" />
                  <span>{invitedCarriers} carrier{invitedCarriers > 1 ? 's' : ''} invited</span>
                </div>
              )}
            </div>

            {cspEvent.owner_name && (
              <div className="flex items-center gap-2 mt-2">
                <div className="w-6 h-6 rounded-full bg-purple-300 flex items-center justify-center text-xs font-semibold text-purple-800">
                  {cspEvent.owner_name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)}
                </div>
                <span className="text-xs text-slate-600">
                  <span className="font-medium text-slate-900">{cspEvent.owner_name}</span>
                  <span className="text-slate-500"> • Owner</span>
                </span>
              </div>
            )}
          </div>

          <Link to={createPageUrl(`CspEventDetail?id=${cspEvent.id}`)}>
            <Button variant="outline" size="sm" className="flex-shrink-0">
              <ExternalLink className="w-3.5 h-3.5 mr-1.5" />
              View CSP
            </Button>
          </Link>
        </div>
      </CardContent>
    </Card>
  );
}
