import { createContext, useContext, useState, useCallback } from 'react';
import { GmailReconnectModal } from '@/components/email/GmailReconnectModal';

const GmailReconnectContext = createContext(null);

export function GmailReconnectProvider({ children }) {
  const [isOpen, setIsOpen] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [onReconnectedCallback, setOnReconnectedCallback] = useState(null);

  const showReconnectModal = useCallback((error = '', onReconnected = null) => {
    setErrorMessage(error);
    setOnReconnectedCallback(() => onReconnected);
    setIsOpen(true);
  }, []);

  const hideReconnectModal = useCallback(() => {
    setIsOpen(false);
    setErrorMessage('');
    setOnReconnectedCallback(null);
  }, []);

  const handleReconnected = useCallback(() => {
    if (onReconnectedCallback) {
      onReconnectedCallback();
    }
    hideReconnectModal();
  }, [onReconnectedCallback, hideReconnectModal]);

  return (
    <GmailReconnectContext.Provider value={{ showReconnectModal, hideReconnectModal }}>
      {children}
      <GmailReconnectModal
        isOpen={isOpen}
        onClose={hideReconnectModal}
        onReconnected={handleReconnected}
        errorMessage={errorMessage}
      />
    </GmailReconnectContext.Provider>
  );
}

export function useGmailReconnect() {
  const context = useContext(GmailReconnectContext);
  if (!context) {
    throw new Error('useGmailReconnect must be used within GmailReconnectProvider');
  }
  return context;
}
