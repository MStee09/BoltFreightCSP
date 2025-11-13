import React, { useState, useRef, useEffect } from 'react';
import { Button } from '../ui/button';
import { Textarea } from '../ui/textarea';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { CSPEventCarrier } from '../../api/entities';
import { useToast } from '../ui/use-toast';
import { Save, X, MessageSquare } from 'lucide-react';
import { supabase } from '../../api/supabaseClient';

export default function InlineNoteEditor({ carrierAssignment, onCancel }) {
  const [note, setNote] = useState('');
  const textareaRef = useRef(null);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  useEffect(() => {
    textareaRef.current?.focus();
  }, []);

  const saveNoteMutation = useMutation({
    mutationFn: async () => {
      const currentNotes = carrierAssignment.notes || '';
      const timestamp = new Date().toISOString();
      const { data: { user } } = await supabase.auth.getUser();

      const newNote = `[${new Date(timestamp).toLocaleString()}] ${note}`;
      const updatedNotes = currentNotes ? `${currentNotes}\n${newNote}` : newNote;

      await CSPEventCarrier.update(carrierAssignment.id, {
        notes: updatedNotes
      });

      await supabase.from('activity_timeline').insert({
        entity_type: 'csp_event_carrier',
        entity_id: carrierAssignment.id,
        activity_type: 'note_added',
        user_id: user?.id,
        details: { note, carrier_id: carrierAssignment.carrier_id }
      });

      return updatedNotes;
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['csp_event_carriers']);
      toast({ title: 'Note added successfully' });
      onCancel();
    },
    onError: (error) => {
      toast({
        title: 'Error',
        description: error.message || 'Failed to add note',
        variant: 'destructive'
      });
    }
  });

  const handleSave = () => {
    if (!note.trim()) {
      toast({ title: 'Note cannot be empty', variant: 'destructive' });
      return;
    }
    saveNoteMutation.mutate();
  };

  return (
    <div className="border-t pt-3 mt-3">
      <div className="flex items-start gap-2 mb-2">
        <MessageSquare className="w-4 h-4 text-slate-400 mt-1" />
        <Textarea
          ref={textareaRef}
          value={note}
          onChange={(e) => setNote(e.target.value)}
          placeholder="Add a note... Use @username to mention team members"
          rows={2}
          className="text-sm"
        />
      </div>
      <div className="flex justify-end gap-2">
        <Button
          variant="ghost"
          size="sm"
          onClick={onCancel}
          disabled={saveNoteMutation.isPending}
        >
          <X className="w-3 h-3 mr-1" />
          Cancel
        </Button>
        <Button
          size="sm"
          onClick={handleSave}
          disabled={saveNoteMutation.isPending || !note.trim()}
        >
          <Save className="w-3 h-3 mr-1" />
          {saveNoteMutation.isPending ? 'Saving...' : 'Save Note'}
        </Button>
      </div>
    </div>
  );
}
