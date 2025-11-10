import React from 'react';
import { Link } from 'react-router-dom';
import { Badge } from '../ui/badge';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '../ui/tooltip';
import { Repeat } from 'lucide-react';
import { format, getQuarter, getYear } from 'date-fns';
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

export default function RenewalStatusBadge({ renewalCspEvent }) {
  if (!renewalCspEvent) return null;

  const targetDate = renewalCspEvent.due_date || renewalCspEvent.created_date;
  const quarter = targetDate ? `Q${getQuarter(new Date(targetDate))}` : '';
  const year = targetDate ? getYear(new Date(targetDate)) : '';

  const stageColor = STAGE_COLORS[renewalCspEvent.stage] || 'bg-purple-100 text-purple-700';
  const stageLabel = STAGE_LABELS[renewalCspEvent.stage] || renewalCspEvent.stage;

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <Link to={createPageUrl(`CspEventDetail?id=${renewalCspEvent.id}`)}>
            <Badge
              variant="outline"
              className={`${stageColor} flex items-center gap-1 cursor-pointer hover:shadow-md transition-shadow`}
            >
              <Repeat className="w-3 h-3" />
              <span className="font-medium">
                Renewal CSP: {quarter} {year}
              </span>
              <span className="text-xs opacity-75">
                ({stageLabel})
              </span>
            </Badge>
          </Link>
        </TooltipTrigger>
        <TooltipContent>
          <div className="text-xs">
            <div className="font-semibold">{renewalCspEvent.title}</div>
            <div className="text-slate-400 mt-1">Click to view renewal CSP event</div>
          </div>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
