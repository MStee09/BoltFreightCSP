import React from 'react';
import { ArrowLeft } from 'lucide-react';
import { Button } from '../ui/button';
import { useNavigation } from '../../contexts/NavigationContext';

export function BackButton({ fallbackPath, className = '' }) {
    const { goBack, canGoBack } = useNavigation();

    if (!canGoBack && !fallbackPath) return null;

    return (
        <Button
            variant="ghost"
            size="sm"
            onClick={goBack}
            className={`inline-flex items-center gap-2 text-sm text-slate-600 hover:text-slate-900 ${className}`}
        >
            <ArrowLeft className="w-4 h-4" />
            Back
        </Button>
    );
}
