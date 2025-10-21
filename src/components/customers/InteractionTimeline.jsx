
import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Customer, Carrier, Tariff, CSPEvent, Task, Interaction, Alert, Shipment, LostOpportunity, ReportSnapshot } from '../../api/entities';
import { Skeleton } from '../ui/skeleton';
import { format, formatDistanceToNow } from 'date-fns';
import { GitBranch, MessageSquare, Phone, Users, FileText, FilePlus, Mail, Send } from 'lucide-react';
import { Button } from '../ui/button';
import { Textarea } from '../ui/textarea';
import { Input } from '../ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { Card, CardContent } from '../ui/card';

const ICONS = {
    csp_stage_update: <GitBranch className="w-5 h-5 text-slate-500" />,
    csp_created: <FilePlus className="w-5 h-5 text-slate-500" />,
    document_upload: <FileText className="w-5 h-5 text-blue-500" />,
    note: <MessageSquare className="w-5 h-5 text-slate-500" />,
    call: <Phone className="w-5 h-5 text-slate-500" />,
    email: <Mail className="w-5 h-5 text-slate-500" />,
    meeting: <Users className="w-5 h-5 text-slate-500" />,
    qbr: <Users className="w-5 h-5 text-slate-500" />,
    default: <FileText className="w-5 h-5 text-slate-500" />
};

const LogInteractionForm = ({ entityId, entityType }) => {
    const queryClient = useQueryClient();
    const [type, setType] = useState('note');
    const [summary, setSummary] = useState('');
    const [details, setDetails] = useState('');

    const mutation = useMutation({
        mutationFn: (newInteraction) => Interaction.create(newInteraction),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['interactions', entityId, entityType] }); // Update queryKey
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
        <Card className="mb-6 bg-slate-50/70 border-slate-200 shadow-sm">
            <CardContent className="p-4 space-y-3">
                <Input 
                    placeholder="Summary (e.g., 'Follow-up on Q3 rates')"
                    value={summary}
                    onChange={(e) => setSummary(e.target.value)}
                />
                <Textarea 
                    placeholder="Add details, notes, or email body..."
                    value={details}
                    onChange={(e) => setDetails(e.target.value)}
                    rows={3}
                />
                <div className="flex justify-between items-center">
                    <Select value={type} onValueChange={setType}>
                        <SelectTrigger className="w-[150px] bg-white">
                            <SelectValue placeholder="Type" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="note"><MessageSquare className="w-4 h-4 mr-2 inline-block" />Note</SelectItem>
                            <SelectItem value="email"><Mail className="w-4 h-4 mr-2 inline-block" />Email</SelectItem>
                            <SelectItem value="call"><Phone className="w-4 h-4 mr-2 inline-block" />Call</SelectItem>
                            <SelectItem value="meeting"><Users className="w-4 h-4 mr-2 inline-block" />Meeting</SelectItem>
                        </SelectContent>
                    </Select>
                    <Button onClick={handleSubmit} disabled={mutation.isLoading || !summary}>
                        {mutation.isLoading ? 'Logging...' : 'Log Activity'}
                        <Send className="w-4 h-4 ml-2" />
                    </Button>
                </div>
            </CardContent>
        </Card>
    );
};

const InteractionItem = ({ interaction }) => {
    const icon = ICONS[interaction.interaction_type] || ICONS.default;
    const fromNow = formatDistanceToNow(new Date(interaction.created_date), { addSuffix: true });

    return (
        <div className="flex gap-4">
            <div className="flex flex-col items-center">
                <div className="bg-slate-100 rounded-full p-2">{icon}</div>
                <div className="flex-grow w-px bg-slate-200 my-2"></div>
            </div>
            <div className="flex-1 pb-8">
                <div className="flex items-center justify-between">
                    <p className="font-medium text-slate-800">{interaction.summary}</p>
                    <p className="text-xs text-slate-500">{fromNow}</p>
                </div>
                {interaction.details && (
                    <p className="text-sm text-slate-600 mt-1">{interaction.details}</p>
                )}
                <p className="text-xs text-slate-400 mt-2 capitalize">
                    {interaction.interaction_type.replace(/_/g, ' ')}
                </p>
            </div>
        </div>
    );
};

export default function InteractionTimeline({ customerId, entityType }) { // Added entityType prop
    const { data: interactions = [], isLoading } = useQuery({
        queryKey: ['interactions', customerId, entityType], // Updated queryKey
        queryFn: () => Interaction.filter({ entity_id: customerId, entity_type: entityType, order_by: '-created_date' }), // Updated queryFn
        enabled: !!customerId && !!entityType, // Updated enabled condition
        initialData: []
    });

    if (isLoading) {
        return (
            <div className="space-y-4 mt-4">
                <Skeleton className="h-16 w-full" />
                <Skeleton className="h-16 w-full" />
                <Skeleton className="h-16 w-full" />
            </div>
        );
    }
    
    if (interactions.length === 0 && !isLoading) {
        return (
            <div className="mt-6">
                <LogInteractionForm entityId={customerId} entityType={entityType} /> {/* Pass entityType prop */}
                <div className="text-center py-12 text-slate-500 border border-dashed rounded-lg">
                    <p className="font-semibold">No Interactions Logged</p>
                    <p className="text-sm">Create a CSP event or add a note to get started.</p>
                </div>
            </div>
        );
    }

    return (
        <div className="mt-6 flow-root">
             <LogInteractionForm entityId={customerId} entityType={entityType} /> {/* Pass entityType prop */}
             <div>
                {interactions.map((interaction, index) => (
                    <InteractionItem key={interaction.id} interaction={interaction} />
                ))}
             </div>
        </div>
    );
}
