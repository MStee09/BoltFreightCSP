import { createContext, useContext, useState, useEffect } from 'react';
import { FloatingEmailComposer } from '@/components/email/FloatingEmailComposer';
import { supabase } from '@/api/supabaseClient';

const EmailComposerContext = createContext();

export function EmailComposerProvider({ children }) {
  const [composers, setComposers] = useState([]);

  // Load existing drafts on mount
  useEffect(() => {
    loadDrafts();
  }, []);

  const loadDrafts = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data } = await supabase.rpc('get_user_active_drafts');

      if (data && data.length > 0) {
        const loadedComposers = data.map((draft, index) => ({
          id: draft.id,
          draftId: draft.id,
          cspEventId: draft.csp_event_id,
          customerId: draft.customer_id,
          carrierId: draft.carrier_id,
          initialTo: draft.to_emails || [],
          initialSubject: draft.subject || '',
          initialBody: draft.body || '',
          trackingCode: draft.tracking_code,
          isMinimized: draft.is_minimized,
          position: {
            x: window.innerWidth - 570 - (index * 20),
            y: window.innerHeight - 670 - (index * 20),
          },
          zIndex: 1000 + index,
        }));

        setComposers(loadedComposers);
      }
    } catch (error) {
      console.error('Error loading drafts:', error);
    }
  };

  const openComposer = ({ cspEvent, customer, carrier, initialTo = [], initialSubject = '', initialBody = '', inReplyTo, threadId, isFollowUp = false }) => {
    const id = Date.now();
    const stackIndex = composers.length;

    const newComposer = {
      id,
      cspEvent,
      customer,
      carrier,
      initialTo,
      initialSubject,
      initialBody,
      inReplyTo,
      threadId,
      isFollowUp,
      position: {
        x: window.innerWidth - 570 - (stackIndex * 20),
        y: window.innerHeight - 670 - (stackIndex * 20),
      },
      zIndex: 1000 + stackIndex,
    };

    setComposers([...composers, newComposer]);
  };

  const closeComposer = (id) => {
    setComposers(composers.filter(c => c.id !== id));
  };

  const minimizeComposer = (id) => {
    setComposers(
      composers.map(c =>
        c.id === id ? { ...c, isMinimized: !c.isMinimized } : c
      )
    );
  };

  const bringToFront = (id) => {
    const maxZ = Math.max(...composers.map(c => c.zIndex), 999);
    setComposers(
      composers.map(c =>
        c.id === id ? { ...c, zIndex: maxZ + 1 } : c
      )
    );
  };

  return (
    <EmailComposerContext.Provider value={{ composers, openComposer, closeComposer, minimizeComposer, bringToFront }}>
      {children}
      {composers.map((composer) => (
        <FloatingEmailComposer
          key={composer.id}
          draftId={composer.draftId}
          cspEvent={composer.cspEvent}
          customer={composer.customer}
          carrier={composer.carrier}
          initialTo={composer.initialTo}
          initialSubject={composer.initialSubject}
          initialBody={composer.initialBody}
          inReplyTo={composer.inReplyTo}
          threadId={composer.threadId}
          isFollowUp={composer.isFollowUp}
          position={composer.position}
          zIndex={composer.zIndex}
          onClose={() => closeComposer(composer.id)}
          onMinimize={() => minimizeComposer(composer.id)}
          onFocus={() => bringToFront(composer.id)}
        />
      ))}
    </EmailComposerContext.Provider>
  );
}

export function useEmailComposer() {
  const context = useContext(EmailComposerContext);
  if (!context) {
    throw new Error('useEmailComposer must be used within EmailComposerProvider');
  }
  return context;
}
