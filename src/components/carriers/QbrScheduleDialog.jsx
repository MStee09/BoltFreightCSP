import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '../ui/dialog';
import { Button } from '../ui/button';
import { Label } from '../ui/label';
import { Calendar } from '../ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '../ui/popover';
import { CalendarIcon } from 'lucide-react';
import { format } from 'date-fns';
import { Carrier } from '../../api/entities';
import { toast } from 'sonner';
import { useQueryClient } from '@tanstack/react-query';

const QbrScheduleDialog = ({ carrier, open, onOpenChange }) => {
    const [date, setDate] = useState(null);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const queryClient = useQueryClient();

    useEffect(() => {
        if (carrier?.next_qbr_date) {
            setDate(new Date(carrier.next_qbr_date + 'T00:00:00'));
        } else {
            setDate(null);
        }
    }, [carrier]);

    const handleSave = async () => {
        if (!carrier || !date) return;

        setIsSubmitting(true);
        try {
            const year = date.getFullYear();
            const month = String(date.getMonth() + 1).padStart(2, '0');
            const day = String(date.getDate()).padStart(2, '0');
            await Carrier.update(carrier.id, {
                next_qbr_date: `${year}-${month}-${day}`
            });

            queryClient.invalidateQueries(['carriers']);
            toast.success('QBR date updated successfully');
            onOpenChange(false);
        } catch (error) {
            console.error('Failed to update QBR date:', error);
            toast.error('Failed to update QBR date');
        } finally {
            setIsSubmitting(false);
        }
    };

    if (!carrier) return null;

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>Schedule QBR - {carrier.name}</DialogTitle>
                    <DialogDescription>
                        Set the next Quarterly Business Review date for this carrier
                    </DialogDescription>
                </DialogHeader>

                <div className="py-4">
                    <Label className="mb-2">Next QBR Date</Label>
                    <Popover>
                        <PopoverTrigger asChild>
                            <Button
                                variant="outline"
                                className="w-full justify-start text-left font-normal"
                            >
                                <CalendarIcon className="mr-2 h-4 w-4" />
                                {date ? format(date, 'PPP') : 'Pick a date'}
                            </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0" align="start">
                            <Calendar
                                mode="single"
                                selected={date}
                                onSelect={setDate}
                                initialFocus
                            />
                        </PopoverContent>
                    </Popover>
                </div>

                <DialogFooter>
                    <Button variant="outline" onClick={() => onOpenChange(false)}>
                        Cancel
                    </Button>
                    <Button onClick={handleSave} disabled={!date || isSubmitting}>
                        {isSubmitting ? 'Saving...' : 'Save'}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
};

export default QbrScheduleDialog;
