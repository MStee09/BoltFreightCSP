import React, { useState, useMemo, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/api/supabaseClient';
import { Interaction } from '../../api/entities';
import { EmailComposeDialog } from '@/components/email/EmailComposeDialog';
import { Skeleton } from '../ui/skeleton';
import { format, formatDistanceToNow } from 'date-fns';
import {
  GitBranch,
  MessageSquare,
  Phone,
  Users,
  FileText,
  FilePlus,
  Mail,
  Send,
  ExternalLink,
  Filter,
  ChevronDown,
  Clock,
  CheckCircle2,
  AlertCircle,
  User,
  Building2,
  ArrowUpRight,
  ArrowDownLeft,
  Eye,
  MousePointer
} from 'lucide-react';
import { Button } from '../ui/button';
import { Textarea } from '../ui/textarea';
import { Input } from '../ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Badge } from '../ui/badge';
import { Separator } from '../ui/separator';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuCheckboxItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '../ui/dropdown-menu';

const ACTIVITY_CONFIG = {
  email_sent: {
    icon: <ArrowUpRight className="w-4 h-4" />,
    color: 'text-blue-600',
    bgColor: 'bg-blue-50',
    borderColor: 'border-blue-200',
    label: 'Email Sent'
  },
  email_received: {
    icon: <ArrowDownLeft className="w-4 h-4" />,
    color: 'text-green-600',
    bgColor: 'bg-green-50',
    borderColor: 'border-green-200',
    label: 'Email Received'
  },
  email_opened: {
    icon: <Eye className="w-4 h-4" />,
    color: 'text-purple-600',
    bgColor: 'bg-purple-50',
    borderColor: 'border-purple-200',
    label: 'Email Opened'
  },
  email_clicked: {
    icon: <MousePointer className="w-4 h-4" />,
    color: 'text-orange-600',
    bgColor: 'bg-orange-50',
    borderColor: 'border-orange-200',
    label: 'Email Clicked'
  },
  csp_stage_update: {
    icon: <GitBranch className="w-4 h-4" />,
    color: 'text-indigo-600',
    bgColor: 'bg-indigo-50',
    borderColor: 'border-indigo-200',
    label: 'Stage Updated'
  },
  csp_created: {
    icon: <FilePlus className="w-4 h-4" />,
    color: 'text-emerald-600',
    bgColor: 'bg-emerald-50',
    borderColor: 'border-emerald-200',
    label: 'CSP Created'
  },
  csp_event: {
    icon: <GitBranch className="w-4 h-4" />,
    color: 'text-blue-600',
    bgColor: 'bg-blue-50',
    borderColor: 'border-blue-200',
    label: 'CSP Event'
  },
  tariff: {
    icon: <FileText className="w-4 h-4" />,
    color: 'text-green-600',
    bgColor: 'bg-green-50',
    borderColor: 'border-green-200',
    label: 'Tariff'
  },
  document_upload: {
    icon: <FileText className="w-4 h-4" />,
    color: 'text-blue-600',
    bgColor: 'bg-blue-50',
    borderColor: 'border-blue-200',
    label: 'Document'
  },
  note: {
    icon: <MessageSquare className="w-4 h-4" />,
    color: 'text-slate-600',
    bgColor: 'bg-slate-50',
    borderColor: 'border-slate-200',
    label: 'Note'
  },
  call: {
    icon: <Phone className="w-4 h-4" />,
    color: 'text-amber-600',
    bgColor: 'bg-amber-50',
    borderColor: 'border-amber-200',
    label: 'Call'
  },
  meeting: {
    icon: <Users className="w-4 h-4" />,
    color: 'text-violet-600',
    bgColor: 'bg-violet-50',
    borderColor: 'border-violet-200',
    label: 'Meeting'
  },
  qbr: {
    icon: <Users className="w-4 h-4" />,
    color: 'text-pink-600',
    bgColor: 'bg-pink-50',
    borderColor: 'border-pink-200',
    label: 'QBR'
  },
};

const LogInteractionForm = ({ entityId, entityType }) => {
  const queryClient = useQueryClient();
  const [type, setType] = useState('note');
  const [summary, setSummary] = useState('');
  const [details, setDetails] = useState('');

  const mutation = useMutation({
    mutationFn: (newInteraction) => Interaction.create(newInteraction),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['timeline', entityId, entityType] });
      setType('note');
      setSummary('');
      setDetails('');
    },
  });

  const handleSubmit = () => {
    if (!summary) return;
    mutation.mutate({
      entity_id: entityId,
      entity_type: entityType,
      interaction_type: type,
      summary,
      details
    });
  };

  return (
    <Card className="mb-6 border-2 border-dashed border-slate-300 bg-slate-50/50">
      <CardContent className="p-4 space-y-3">
        <div className="flex items-center gap-2 text-sm font-medium text-slate-700 mb-2">
          <MessageSquare className="w-4 h-4" />
          Log New Activity
        </div>
        <Input
          placeholder="Summary (e.g., 'Follow-up call about Q3 rates')"
          value={summary}
          onChange={(e) => setSummary(e.target.value)}
          className="bg-white"
        />
        <Textarea
          placeholder="Add details, notes, or outcomes..."
          value={details}
          onChange={(e) => setDetails(e.target.value)}
          rows={3}
          className="bg-white"
        />
        <div className="flex justify-between items-center">
          <Select value={type} onValueChange={setType}>
            <SelectTrigger className="w-[180px] bg-white">
              <SelectValue placeholder="Activity Type" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="note">
                <div className="flex items-center gap-2">
                  <MessageSquare className="w-4 h-4" />
                  Note
                </div>
              </SelectItem>
              <SelectItem value="email">
                <div className="flex items-center gap-2">
                  <Mail className="w-4 h-4" />
                  Email
                </div>
              </SelectItem>
              <SelectItem value="call">
                <div className="flex items-center gap-2">
                  <Phone className="w-4 h-4" />
                  Call
                </div>
              </SelectItem>
              <SelectItem value="meeting">
                <div className="flex items-center gap-2">
                  <Users className="w-4 h-4" />
                  Meeting
                </div>
              </SelectItem>
            </SelectContent>
          </Select>
          <Button onClick={handleSubmit} disabled={mutation.isPending || !summary}>
            {mutation.isPending ? 'Logging...' : 'Log Activity'}
            <Send className="w-4 h-4 ml-2" />
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};

const EmailActivityCard = ({ activity, onReply, threadMessages }) => {
  const [expanded, setExpanded] = useState(false);
  const [showThread, setShowThread] = useState(false);
  const config = ACTIVITY_CONFIG[activity.activityType] || ACTIVITY_CONFIG.note;
  const fromNow = formatDistanceToNow(new Date(activity.timestamp), { addSuffix: true });
  const fullDate = format(new Date(activity.timestamp), 'MMM d, yyyy h:mm a');

  const isOutbound = activity.direction === 'outbound';
  const displayConfig = isOutbound ? ACTIVITY_CONFIG.email_sent : ACTIVITY_CONFIG.email_received;

  const awaitingReply = activity.awaiting_reply;
  const daysSinceNoReply = activity.awaiting_reply_since
    ? Math.floor((new Date() - new Date(activity.awaiting_reply_since)) / (1000 * 60 * 60 * 24))
    : null;

  return (
    <Card className={`border ${displayConfig.borderColor} ${displayConfig.bgColor} hover:shadow-md transition-shadow`}>
      <CardContent className="p-4">
        <div className="flex items-start gap-3">
          <div className={`p-2 rounded-lg ${displayConfig.bgColor} ${displayConfig.color} border ${displayConfig.borderColor}`}>
            {displayConfig.icon}
          </div>

          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between gap-2 mb-2">
              <div className="flex-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <Badge variant="outline" className={`${displayConfig.color} border-current`}>
                    {displayConfig.label}
                  </Badge>
                  {activity.opened_at && (
                    <Badge variant="outline" className="text-purple-600 border-purple-300">
                      <Eye className="w-3 h-3 mr-1" />
                      Opened
                    </Badge>
                  )}
                  {awaitingReply && (
                    <Badge variant="outline" className="text-orange-600 border-orange-300 bg-orange-50">
                      <AlertCircle className="w-3 h-3 mr-1" />
                      Awaiting Reply {daysSinceNoReply > 0 && `(${daysSinceNoReply}d)`}
                    </Badge>
                  )}
                  {threadMessages && threadMessages.length > 1 && (
                    <Badge variant="outline" className="text-slate-600 border-slate-300">
                      <MessageSquare className="w-3 h-3 mr-1" />
                      {threadMessages.length} messages
                    </Badge>
                  )}
                </div>
                <h4 className="font-semibold text-slate-900 mt-1 line-clamp-1">
                  {activity.subject}
                </h4>
              </div>
              <div className="text-right flex-shrink-0">
                <p className="text-xs text-slate-500" title={fullDate}>
                  {fromNow}
                </p>
              </div>
            </div>

            <div className="space-y-2 text-sm">
              <div className="flex items-center gap-2 text-slate-600">
                {isOutbound ? (
                  <>
                    <User className="w-3 h-3" />
                    <span className="font-medium">{activity.from_name || activity.from_email}</span>
                    <ArrowUpRight className="w-3 h-3" />
                    <span>{activity.to_emails?.[0] || 'Unknown'}</span>
                    {activity.to_emails?.length > 1 && (
                      <Badge variant="secondary" className="text-xs">
                        +{activity.to_emails.length - 1} more
                      </Badge>
                    )}
                  </>
                ) : (
                  <>
                    <User className="w-3 h-3" />
                    <span className="font-medium">{activity.from_name || activity.from_email}</span>
                    <ArrowDownLeft className="w-3 h-3" />
                    <span>You</span>
                  </>
                )}
              </div>

              {expanded && activity.body_text && (
                <div className="mt-3 p-3 bg-white rounded border border-slate-200">
                  <p className="text-sm text-slate-700 whitespace-pre-wrap">
                    {activity.body_text.length > 500
                      ? `${activity.body_text.substring(0, 500)}...`
                      : activity.body_text}
                  </p>
                </div>
              )}

              <div className="flex items-center gap-2 mt-2">
                {activity.body_text && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setExpanded(!expanded)}
                    className="text-xs h-7 px-2"
                  >
                    {expanded ? 'Hide' : 'Show'} email content
                    <ChevronDown className={`w-3 h-3 ml-1 transition-transform ${expanded ? 'rotate-180' : ''}`} />
                  </Button>
                )}
                {threadMessages && threadMessages.length > 1 && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setShowThread(!showThread)}
                    className="text-xs h-7 px-2"
                  >
                    {showThread ? 'Hide' : 'View'} thread ({threadMessages.length})
                    <MessageSquare className="w-3 h-3 ml-1" />
                  </Button>
                )}
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => onReply(activity)}
                  className="text-xs h-7 px-2"
                >
                  <Send className="w-3 h-3 mr-1" />
                  Reply
                </Button>
              </div>

              {showThread && threadMessages && threadMessages.length > 1 && (
                <div className="mt-3 space-y-2 pl-4 border-l-2 border-slate-200">
                  {threadMessages
                    .filter(msg => msg.id !== activity.id)
                    .sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp))
                    .map((msg) => (
                      <div key={msg.id} className="text-sm p-2 bg-slate-50 rounded border border-slate-200">
                        <div className="flex items-center gap-2 mb-1">
                          <Badge variant="secondary" className="text-xs">
                            {msg.direction === 'outbound' ? 'You' : msg.from_name || msg.from_email}
                          </Badge>
                          <span className="text-xs text-slate-500">
                            {formatDistanceToNow(new Date(msg.timestamp), { addSuffix: true })}
                          </span>
                        </div>
                        <p className="text-slate-700 line-clamp-2">{msg.body_text}</p>
                      </div>
                    ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

const InteractionCard = ({ activity }) => {
  const navigate = useNavigate();
  const config = ACTIVITY_CONFIG[activity.activityType] || ACTIVITY_CONFIG.note;
  const fromNow = formatDistanceToNow(new Date(activity.timestamp), { addSuffix: true });
  const fullDate = format(new Date(activity.timestamp), 'MMM d, yyyy h:mm a');

  const cspEventId = activity.metadata?.csp_event_id;
  const isClickable = activity.activityType === 'csp_event' && cspEventId;

  const handleClick = () => {
    if (isClickable) {
      navigate(`/pipeline?event=${cspEventId}`);
    }
  };

  return (
    <Card className={`border ${config.borderColor} hover:shadow-md transition-shadow ${isClickable ? 'cursor-pointer' : ''}`} onClick={isClickable ? handleClick : undefined}>
      <CardContent className="p-4">
        <div className="flex items-start gap-3">
          <div className={`p-2 rounded-lg ${config.bgColor} ${config.color} border ${config.borderColor}`}>
            {config.icon}
          </div>

          <div className="flex-1">
            <div className="flex items-start justify-between gap-2 mb-2">
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <Badge variant="outline" className={`${config.color} border-current text-xs`}>
                    {config.label}
                  </Badge>
                  {isClickable && (
                    <ExternalLink className="w-3 h-3 text-slate-400" />
                  )}
                </div>
                <h4 className="font-semibold text-slate-900">
                  {activity.summary}
                </h4>
              </div>
              <div className="text-right flex-shrink-0">
                <p className="text-xs text-slate-500" title={fullDate}>
                  {fromNow}
                </p>
              </div>
            </div>

            {activity.details && (
              <p className="text-sm text-slate-600 mt-2 whitespace-pre-wrap">
                {activity.details}
              </p>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default function InteractionTimeline({ customerId, entityType }) {
  const [filterTypes, setFilterTypes] = useState([]);
  const [replyToEmail, setReplyToEmail] = useState(null);
  const [showComposeDialog, setShowComposeDialog] = useState(false);
  const [currentUserEmail, setCurrentUserEmail] = useState(null);

  useEffect(() => {
    const getUserEmail = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { data: credentials } = await supabase
          .from('user_gmail_credentials')
          .select('email_address')
          .eq('user_id', user.id)
          .maybeSingle();

        if (credentials) {
          setCurrentUserEmail(credentials.email_address);
        } else {
          setCurrentUserEmail(user.email);
        }
      }
    };
    getUserEmail();
  }, []);

  const { data: interactions = [], isLoading: interactionsLoading } = useQuery({
    queryKey: ['interactions', customerId, entityType],
    queryFn: () => Interaction.filter({ entity_id: customerId, entity_type: entityType, order_by: '-created_date' }),
    enabled: !!customerId && !!entityType,
    initialData: []
  });

  const { data: emailActivities = [], isLoading: emailsLoading } = useQuery({
    queryKey: ['email_activities', customerId, entityType],
    queryFn: async () => {
      const filterColumn = entityType === 'customer' ? 'customer_id' :
                          entityType === 'carrier' ? 'carrier_id' :
                          entityType === 'csp_event' ? 'csp_event_id' : null;

      if (!filterColumn) return [];

      const { data, error } = await supabase
        .from('email_activities')
        .select('*')
        .eq(filterColumn, customerId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data || [];
    },
    enabled: !!customerId && !!entityType,
    initialData: []
  });

  const emailThreads = useMemo(() => {
    const threads = {};
    emailActivities.forEach(email => {
      if (email.thread_id) {
        if (!threads[email.thread_id]) {
          threads[email.thread_id] = [];
        }
        threads[email.thread_id].push(email);
      }
    });
    return threads;
  }, [emailActivities]);

  const allActivities = useMemo(() => {
    const combined = [
      ...interactions.map(i => ({
        id: `interaction-${i.id}`,
        type: 'interaction',
        activityType: i.interaction_type,
        summary: i.summary,
        details: i.details,
        timestamp: i.created_date,
        metadata: i.metadata
      })),
      ...emailActivities.map(e => ({
        id: `email-${e.id}`,
        emailId: e.id,
        type: 'email',
        activityType: e.direction === 'outbound' ? 'email_sent' : 'email_received',
        subject: e.subject,
        from_email: e.from_email,
        from_name: e.from_name,
        to_emails: e.to_emails,
        cc_emails: e.cc_emails,
        body_text: e.body_text,
        direction: e.direction,
        opened_at: e.opened_at,
        clicked_at: e.clicked_at,
        timestamp: e.sent_at || e.created_at,
        tracking_code: e.tracking_code,
        message_id: e.message_id,
        thread_id: e.thread_id,
        awaiting_reply: e.awaiting_reply,
        awaiting_reply_since: e.awaiting_reply_since,
        customer_id: e.customer_id,
        carrier_id: e.carrier_id,
        csp_event_id: e.csp_event_id
      }))
    ];

    combined.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));

    if (filterTypes.length > 0) {
      return combined.filter(activity => filterTypes.includes(activity.activityType));
    }

    return combined;
  }, [interactions, emailActivities, filterTypes]);

  const activityTypeCounts = useMemo(() => {
    const counts = {};
    [...interactions, ...emailActivities].forEach(item => {
      const type = item.interaction_type || (item.direction === 'outbound' ? 'email_sent' : 'email_received');
      counts[type] = (counts[type] || 0) + 1;
    });
    return counts;
  }, [interactions, emailActivities]);

  const toggleFilter = (type) => {
    setFilterTypes(prev =>
      prev.includes(type) ? prev.filter(t => t !== type) : [...prev, type]
    );
  };

  const handleReply = (emailActivity) => {
    setReplyToEmail(emailActivity);
    setShowComposeDialog(true);
  };

  const handleCloseCompose = () => {
    setShowComposeDialog(false);
    setReplyToEmail(null);
  };

  const isLoading = interactionsLoading || emailsLoading;

  if (isLoading) {
    return (
      <div className="space-y-4 mt-4">
        <Skeleton className="h-32 w-full" />
        <Skeleton className="h-32 w-full" />
        <Skeleton className="h-32 w-full" />
      </div>
    );
  }

  return (
    <div className="mt-6 space-y-4">
      <LogInteractionForm entityId={customerId} entityType={entityType} />

      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Clock className="w-4 h-4 text-slate-500" />
          <h3 className="font-semibold text-slate-900">Activity Timeline</h3>
          <Badge variant="secondary">{allActivities.length} activities</Badge>
        </div>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" size="sm">
              <Filter className="w-4 h-4 mr-2" />
              Filter
              {filterTypes.length > 0 && (
                <Badge variant="default" className="ml-2">{filterTypes.length}</Badge>
              )}
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56">
            <DropdownMenuLabel>Activity Types</DropdownMenuLabel>
            <DropdownMenuSeparator />
            {Object.entries(ACTIVITY_CONFIG).map(([type, config]) => {
              const count = activityTypeCounts[type] || 0;
              if (count === 0) return null;

              return (
                <DropdownMenuCheckboxItem
                  key={type}
                  checked={filterTypes.includes(type)}
                  onCheckedChange={() => toggleFilter(type)}
                >
                  <div className="flex items-center justify-between w-full">
                    <div className="flex items-center gap-2">
                      <span className={config.color}>{config.icon}</span>
                      <span>{config.label}</span>
                    </div>
                    <Badge variant="secondary" className="ml-2">{count}</Badge>
                  </div>
                </DropdownMenuCheckboxItem>
              );
            })}
            {filterTypes.length > 0 && (
              <>
                <DropdownMenuSeparator />
                <Button
                  variant="ghost"
                  size="sm"
                  className="w-full justify-center"
                  onClick={() => setFilterTypes([])}
                >
                  Clear Filters
                </Button>
              </>
            )}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {allActivities.length === 0 ? (
        <div className="text-center py-12 text-slate-500 border border-dashed rounded-lg bg-slate-50">
          <Clock className="w-12 h-12 mx-auto mb-3 text-slate-300" />
          <p className="font-semibold">No Activities Yet</p>
          <p className="text-sm">Send an email, log a note, or create a CSP event to get started.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {allActivities.map((activity) => (
            activity.type === 'email' ? (
              <EmailActivityCard
                key={activity.id}
                activity={activity}
                onReply={handleReply}
                threadMessages={activity.thread_id ? emailThreads[activity.thread_id]?.map(e => ({
                  id: e.id,
                  direction: e.direction,
                  from_email: e.from_email,
                  from_name: e.from_name,
                  body_text: e.body_text,
                  timestamp: e.sent_at || e.created_at
                })) : null}
              />
            ) : (
              <InteractionCard key={activity.id} activity={activity} />
            )
          ))}
        </div>
      )}

      {showComposeDialog && replyToEmail && (() => {
        const isFollowUp = replyToEmail.direction === 'outbound' ||
                          replyToEmail.from_email === currentUserEmail;

        return (
          <EmailComposeDialog
            open={showComposeDialog}
            onOpenChange={handleCloseCompose}
            cspEvent={replyToEmail.csp_event_id ? { id: replyToEmail.csp_event_id } : null}
            customer={replyToEmail.customer_id ? { id: replyToEmail.customer_id } : null}
            carrier={replyToEmail.carrier_id ? { id: replyToEmail.carrier_id } : null}
            defaultSubject={isFollowUp ? replyToEmail.subject : (
              replyToEmail.subject?.startsWith('Re:') ? replyToEmail.subject : `Re: ${replyToEmail.subject}`
            )}
            defaultRecipients={isFollowUp ? replyToEmail.to_emails : [replyToEmail.from_email]}
            defaultCc={isFollowUp ? (replyToEmail.cc_emails || []) : []}
            inReplyTo={replyToEmail.message_id}
            threadId={replyToEmail.thread_id}
            isFollowUp={isFollowUp}
          />
        );
      })()}
    </div>
  );
}
