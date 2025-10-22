import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { CarrierContact } from '../../api/entities';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '../ui/dialog';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { Textarea } from '../ui/textarea';
import { useToast } from '../ui/use-toast';
import { Plus, Mail, Phone, User, X, Edit2, Star } from 'lucide-react';
import { ScrollArea } from '../ui/scroll-area';
import { Separator } from '../ui/separator';

const CONTACT_TYPES = [
    { value: 'primary', label: 'Primary Contact' },
    { value: 'sales', label: 'Sales' },
    { value: 'billing', label: 'Billing' },
    { value: 'operations', label: 'Operations' },
    { value: 'executive', label: 'Executive' }
];

export default function ManageContactsDialog({ isOpen, onOpenChange, carrierId, carrierName }) {
    const queryClient = useQueryClient();
    const { toast } = useToast();
    const [isAdding, setIsAdding] = useState(false);
    const [editingContact, setEditingContact] = useState(null);
    const [formData, setFormData] = useState({
        name: '',
        email: '',
        phone: '',
        title: '',
        contact_type: 'primary',
        is_primary: false,
        notes: ''
    });

    const { data: contacts = [] } = useQuery({
        queryKey: ['carrier_contacts', carrierId],
        queryFn: () => CarrierContact.filter({ carrier_id: carrierId }),
        enabled: !!carrierId && isOpen
    });

    const createContactMutation = useMutation({
        mutationFn: (data) => CarrierContact.create({ ...data, carrier_id: carrierId }),
        onSuccess: () => {
            queryClient.invalidateQueries(['carrier_contacts', carrierId]);
            resetForm();
            toast({
                title: 'Contact added',
                description: 'Contact has been added successfully'
            });
        },
        onError: (error) => {
            toast({
                title: 'Error',
                description: error.message,
                variant: 'destructive'
            });
        }
    });

    const updateContactMutation = useMutation({
        mutationFn: ({ id, data }) => CarrierContact.update(id, data),
        onSuccess: () => {
            queryClient.invalidateQueries(['carrier_contacts', carrierId]);
            resetForm();
            toast({
                title: 'Contact updated',
                description: 'Contact has been updated successfully'
            });
        },
        onError: (error) => {
            toast({
                title: 'Error',
                description: error.message,
                variant: 'destructive'
            });
        }
    });

    const deleteContactMutation = useMutation({
        mutationFn: (id) => CarrierContact.delete(id),
        onSuccess: () => {
            queryClient.invalidateQueries(['carrier_contacts', carrierId]);
            toast({
                title: 'Contact deleted',
                description: 'Contact has been removed'
            });
        },
        onError: (error) => {
            toast({
                title: 'Error',
                description: error.message,
                variant: 'destructive'
            });
        }
    });

    const resetForm = () => {
        setFormData({
            name: '',
            email: '',
            phone: '',
            title: '',
            contact_type: 'primary',
            is_primary: false,
            notes: ''
        });
        setIsAdding(false);
        setEditingContact(null);
    };

    const handleSubmit = (e) => {
        e.preventDefault();
        if (editingContact) {
            updateContactMutation.mutate({ id: editingContact.id, data: formData });
        } else {
            createContactMutation.mutate(formData);
        }
    };

    const handleEdit = (contact) => {
        setFormData({
            name: contact.name || '',
            email: contact.email || '',
            phone: contact.phone || '',
            title: contact.title || '',
            contact_type: contact.contact_type || 'primary',
            is_primary: contact.is_primary || false,
            notes: contact.notes || ''
        });
        setEditingContact(contact);
        setIsAdding(true);
    };

    const handleDelete = (id) => {
        if (window.confirm('Are you sure you want to delete this contact?')) {
            deleteContactMutation.mutate(id);
        }
    };

    return (
        <Dialog open={isOpen} onOpenChange={(open) => {
            onOpenChange(open);
            if (!open) resetForm();
        }}>
            <DialogContent className="max-w-3xl max-h-[85vh] flex flex-col">
                <DialogHeader>
                    <DialogTitle>Manage Contacts - {carrierName}</DialogTitle>
                    <DialogDescription>
                        Add and manage contact information for this carrier
                    </DialogDescription>
                </DialogHeader>

                <div className="flex-1 overflow-hidden space-y-4">
                    {isAdding ? (
                        <form onSubmit={handleSubmit} className="space-y-4 border rounded-lg p-4">
                            <div className="flex items-center justify-between">
                                <h3 className="font-semibold">{editingContact ? 'Edit Contact' : 'Add New Contact'}</h3>
                                <Button type="button" variant="ghost" size="sm" onClick={resetForm}>
                                    <X className="w-4 h-4" />
                                </Button>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <Label htmlFor="name">Name *</Label>
                                    <Input
                                        id="name"
                                        value={formData.name}
                                        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                        required
                                        placeholder="John Doe"
                                    />
                                </div>

                                <div className="space-y-2">
                                    <Label htmlFor="title">Title</Label>
                                    <Input
                                        id="title"
                                        value={formData.title}
                                        onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                                        placeholder="Account Manager"
                                    />
                                </div>

                                <div className="space-y-2">
                                    <Label htmlFor="email">Email</Label>
                                    <Input
                                        id="email"
                                        type="email"
                                        value={formData.email}
                                        onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                                        placeholder="john@carrier.com"
                                    />
                                </div>

                                <div className="space-y-2">
                                    <Label htmlFor="phone">Phone</Label>
                                    <Input
                                        id="phone"
                                        value={formData.phone}
                                        onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                                        placeholder="(555) 123-4567"
                                    />
                                </div>

                                <div className="space-y-2">
                                    <Label htmlFor="contact_type">Contact Type</Label>
                                    <Select
                                        value={formData.contact_type}
                                        onValueChange={(value) => setFormData({ ...formData, contact_type: value })}
                                    >
                                        <SelectTrigger>
                                            <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {CONTACT_TYPES.map(type => (
                                                <SelectItem key={type.value} value={type.value}>
                                                    {type.label}
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>

                                <div className="space-y-2 flex items-center pt-6">
                                    <input
                                        type="checkbox"
                                        id="is_primary"
                                        checked={formData.is_primary}
                                        onChange={(e) => setFormData({ ...formData, is_primary: e.target.checked })}
                                        className="mr-2"
                                    />
                                    <Label htmlFor="is_primary" className="cursor-pointer">
                                        Set as primary contact
                                    </Label>
                                </div>
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="notes">Notes</Label>
                                <Textarea
                                    id="notes"
                                    value={formData.notes}
                                    onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                                    placeholder="Additional notes..."
                                    rows={3}
                                />
                            </div>

                            <div className="flex gap-2">
                                <Button type="submit" disabled={createContactMutation.isPending || updateContactMutation.isPending}>
                                    {editingContact ? 'Update Contact' : 'Add Contact'}
                                </Button>
                                <Button type="button" variant="outline" onClick={resetForm}>
                                    Cancel
                                </Button>
                            </div>
                        </form>
                    ) : (
                        <Button onClick={() => setIsAdding(true)} className="w-full">
                            <Plus className="w-4 h-4 mr-2" />
                            Add New Contact
                        </Button>
                    )}

                    <ScrollArea className="h-[400px] border rounded-lg p-4">
                        {contacts.length === 0 ? (
                            <p className="text-sm text-slate-500 text-center py-8">
                                No contacts added yet
                            </p>
                        ) : (
                            <div className="space-y-3">
                                {contacts.map((contact) => (
                                    <div key={contact.id} className="border rounded-lg p-4 space-y-2">
                                        <div className="flex items-start justify-between">
                                            <div className="flex-1">
                                                <div className="flex items-center gap-2 mb-1">
                                                    <p className="font-medium">{contact.name}</p>
                                                    {contact.is_primary && (
                                                        <Badge variant="default" className="text-xs">
                                                            <Star className="w-3 h-3 mr-1" />
                                                            Primary
                                                        </Badge>
                                                    )}
                                                    <Badge variant="outline" className="text-xs capitalize">
                                                        {contact.contact_type}
                                                    </Badge>
                                                </div>
                                                {contact.title && (
                                                    <p className="text-sm text-slate-600">{contact.title}</p>
                                                )}
                                            </div>
                                            <div className="flex gap-1">
                                                <Button
                                                    variant="ghost"
                                                    size="sm"
                                                    onClick={() => handleEdit(contact)}
                                                >
                                                    <Edit2 className="w-4 h-4" />
                                                </Button>
                                                <Button
                                                    variant="ghost"
                                                    size="sm"
                                                    onClick={() => handleDelete(contact.id)}
                                                    disabled={deleteContactMutation.isPending}
                                                >
                                                    <X className="w-4 h-4" />
                                                </Button>
                                            </div>
                                        </div>

                                        <div className="space-y-1">
                                            {contact.email && (
                                                <div className="flex items-center gap-2 text-sm text-slate-600">
                                                    <Mail className="w-4 h-4" />
                                                    <a href={`mailto:${contact.email}`} className="hover:underline">
                                                        {contact.email}
                                                    </a>
                                                </div>
                                            )}
                                            {contact.phone && (
                                                <div className="flex items-center gap-2 text-sm text-slate-600">
                                                    <Phone className="w-4 h-4" />
                                                    <a href={`tel:${contact.phone}`} className="hover:underline">
                                                        {contact.phone}
                                                    </a>
                                                </div>
                                            )}
                                        </div>

                                        {contact.notes && (
                                            <p className="text-xs text-slate-500 mt-2 pt-2 border-t">
                                                {contact.notes}
                                            </p>
                                        )}
                                    </div>
                                ))}
                            </div>
                        )}
                    </ScrollArea>
                </div>

                <DialogFooter>
                    <Button variant="outline" onClick={() => onOpenChange(false)}>
                        Done
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
