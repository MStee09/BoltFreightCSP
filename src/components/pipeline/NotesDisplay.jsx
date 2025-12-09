import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '../../api/supabaseClient';
import { Card } from '../ui/card';
import { Badge } from '../ui/badge';
import { Button } from '../ui/button';
import { MessageSquare, User, ChevronDown, ChevronUp } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

export default function NotesDisplay({ entityType, entityId }) {
  const [expandedNotes, setExpandedNotes] = useState(new Set());

  const toggleNote = (noteId) => {
    const newExpanded = new Set(expandedNotes);
    if (newExpanded.has(noteId)) {
      newExpanded.delete(noteId);
    } else {
      newExpanded.add(noteId);
    }
    setExpandedNotes(newExpanded);
  };

  const { data: notes = [], isLoading } = useQuery({
    queryKey: ['notes', entityType, entityId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('notes')
        .select(`
          *,
          user:created_by (
            id,
            email
          ),
          user_profile:created_by (
            first_name,
            last_name
          )
        `)
        .eq('entity_type', entityType)
        .eq('entity_id', entityId)
        .eq('is_deleted', false)
        .order('created_at', { ascending: false });

      if (error) throw error;

      const notesWithProfiles = await Promise.all(
        (data || []).map(async (note) => {
          const { data: profile } = await supabase
            .from('user_profiles')
            .select('first_name, last_name')
            .eq('id', note.created_by)
            .maybeSingle();

          return {
            ...note,
            author_name: profile
              ? `${profile.first_name} ${profile.last_name}`.trim()
              : note.user?.email || 'Unknown User'
          };
        })
      );

      return notesWithProfiles;
    },
    enabled: !!(entityType && entityId)
  });

  if (isLoading) {
    return (
      <div className="space-y-2">
        <div className="h-16 bg-slate-100 rounded animate-pulse" />
      </div>
    );
  }

  if (notes.length === 0) {
    return (
      <div className="text-xs text-slate-400 italic py-2">
        No notes yet
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {notes.map(note => {
        const isExpanded = expandedNotes.has(note.id);
        const isLongNote = note.content && note.content.length > 200;

        return (
          <Card
            key={note.id}
            className="p-3 bg-amber-50 border-amber-200 hover:shadow-md transition-shadow cursor-pointer"
            onClick={() => isLongNote && toggleNote(note.id)}
          >
            <div className="flex items-start gap-2">
              <MessageSquare className="w-4 h-4 text-amber-600 flex-shrink-0 mt-0.5" />
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between gap-2 mb-1">
                  <div className="flex items-center gap-2">
                    <Badge variant="secondary" className="text-xs gap-1">
                      <User className="w-3 h-3" />
                      {note.author_name}
                    </Badge>
                    {note.note_type !== 'general' && (
                      <Badge variant="outline" className="text-xs">
                        {note.note_type.replace('_', ' ')}
                      </Badge>
                    )}
                  </div>
                  <span className="text-xs text-slate-500 flex-shrink-0">
                    {formatDistanceToNow(new Date(note.created_at), { addSuffix: true })}
                  </span>
                </div>
                <p className={`text-sm text-slate-700 whitespace-pre-wrap break-words ${!isExpanded && isLongNote ? 'line-clamp-3' : ''}`}>
                  {note.content}
                </p>
                {isLongNote && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={(e) => {
                      e.stopPropagation();
                      toggleNote(note.id);
                    }}
                    className="text-xs h-6 px-2 mt-2"
                  >
                    {isExpanded ? (
                      <>
                        <ChevronUp className="w-3 h-3 mr-1" />
                        Show less
                      </>
                    ) : (
                      <>
                        <ChevronDown className="w-3 h-3 mr-1" />
                        Show more
                      </>
                    )}
                  </Button>
                )}
              </div>
            </div>
          </Card>
        );
      })}
    </div>
  );
}
