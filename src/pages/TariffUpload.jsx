
import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Customer, Carrier, Tariff, CSPEvent, Task, Interaction, Alert, Shipment, LostOpportunity, ReportSnapshot } from '../api/entities';
import { useNavigate, Link } from 'react-router-dom';
import { createPageUrl } from '../utils';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { Popover, PopoverContent, PopoverTrigger } from '../components/ui/popover';
import { Calendar } from '../components/ui/calendar';
import { Label } from '../components/ui/label';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../components/ui/card';
import { UploadCloud, Calendar as CalendarIcon, ArrowLeft, File, X, Loader2, Check, ChevronsUpDown, ExternalLink } from 'lucide-react';
import { format } from 'date-fns';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem } from "../components/ui/command"
import { cn } from "../lib/utils";
import { Badge } from "../components/ui/badge";
import { Switch } from "../components/ui/switch"; // Added Switch import

const MultiSelect = ({ options, selected, onChange, placeholder, searchPlaceholder, onCreateNew, emptyText = "No results found", createNewText = "Create new" }) => {
    const [open, setOpen] = useState(false);

    return (
        <div>
            <Popover open={open} onOpenChange={setOpen}>
                <PopoverTrigger asChild>
                    <Button
                        variant="outline"
                        role="combobox"
                        aria-expanded={open}
                        className="w-full justify-between h-auto min-h-[40px]"
                    >
                        <div className="flex gap-1 flex-wrap">
                            {selected.length > 0 ? selected.map(value => {
                                const option = options.find(o => o.value === value);
                                return <Badge key={value} variant="secondary">{option?.label}</Badge>;
                            }) : placeholder}
                        </div>
                        <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                    </Button>
                </PopoverTrigger>
                <PopoverContent className="w-[--radix-popover-trigger-width] p-0">
                    <Command>
                        <CommandInput placeholder={searchPlaceholder || "Search..."} />
                        <CommandEmpty>
                            <div className="p-4 text-center space-y-2">
                                <p className="text-sm text-slate-600">{emptyText}</p>
                                {onCreateNew && (
                                    <button
                                        onClick={(e) => {
                                            e.preventDefault();
                                            e.stopPropagation();
                                            setOpen(false);
                                            onCreateNew();
                                        }}
                                        className="inline-flex items-center gap-1 text-sm text-blue-600 hover:text-blue-700 hover:underline cursor-pointer"
                                    >
                                        <ExternalLink className="h-3 w-3" />
                                        {createNewText}
                                    </button>
                                )}
                            </div>
                        </CommandEmpty>
                        <CommandGroup className="max-h-64 overflow-y-auto">
                            {options.map((option) => (
                                <CommandItem
                                    key={option.value}
                                    onSelect={() => {
                                        const newSelected = selected.includes(option.value)
                                            ? selected.filter((v) => v !== option.value)
                                            : [...selected, option.value];
                                        onChange(newSelected);
                                    }}
                                >
                                    <Check
                                        className={cn(
                                            "mr-2 h-4 w-4",
                                            selected.includes(option.value) ? "opacity-100" : "opacity-0"
                                        )}
                                    />
                                    {option.label}
                                </CommandItem>
                            ))}
                            {onCreateNew && (
                                <div className="border-t border-slate-200 mt-1 pt-1">
                                    <CommandItem
                                        onSelect={() => {
                                            setOpen(false);
                                            onCreateNew();
                                        }}
                                        className="text-blue-600 font-medium cursor-pointer"
                                    >
                                        <ExternalLink className="mr-2 h-4 w-4" />
                                        {createNewText}
                                    </CommandItem>
                                </div>
                            )}
                        </CommandGroup>
                    </Command>
                </PopoverContent>
            </Popover>
        </div>
    );
}

export default function TariffUploadPage() {
    const queryClient = useQueryClient();
    const navigate = useNavigate();

    const urlParams = new URLSearchParams(window.location.search);
    const preselectedCspEventId = urlParams.get('cspEventId');
    const preselectedCustomerId = urlParams.get('customerId');
    const preselectedCarrierIds = urlParams.get('carrierIds')?.split(',').filter(Boolean) || [];

    const [customerId, setCustomerId] = useState(preselectedCustomerId || null);
    const [carrierIds, setCarrierIds] = useState(preselectedCarrierIds);
    const [subCustomerIds, setSubCustomerIds] = useState([]);
    const [version, setVersion] = useState('');
    const [ownershipType, setOwnershipType] = useState('');
    const [effectiveDate, setEffectiveDate] = useState(null);
    const [expiryDate, setExpiryDate] = useState(null);
    const [file, setFile] = useState(null);
    const [isDragging, setIsDragging] = useState(false);
    const [isBlanket, setIsBlanket] = useState(false);
    const [cspEventId, setCspEventId] = useState(preselectedCspEventId || '');

    const isRocketOrP1 = ownershipType === 'Rocket' || ownershipType === 'Priority 1';

    useEffect(() => {
        if (!isRocketOrP1) {
            setIsBlanket(false);
            setSubCustomerIds([]);
        }
    }, [isRocketOrP1]);

    const { data: customers = [] } = useQuery({ queryKey: ["customers"], queryFn: () => Customer.list(), initialData: [] });
    const { data: carriers = [] } = useQuery({ queryKey: ["carriers"], queryFn: () => Carrier.list(), initialData: [] });
    const { data: existingTariffs = [] } = useQuery({ queryKey: ["tariffs"], queryFn: () => Tariff.list(), initialData: [] });

    useEffect(() => {
        if (carrierIds.length === 0 || !effectiveDate) {
            return;
        }

        if (!isBlanket && !customerId) {
            return;
        }

        if (!ownershipType) {
            return;
        }

        // Determine type prefix
        let typePrefix;
        if (isBlanket) {
            typePrefix = 'BLK';
        } else {
            if (ownershipType === 'Rocket') {
                typePrefix = 'RKT';
            } else if (ownershipType === 'Priority 1') {
                typePrefix = 'P1';
            } else {
                typePrefix = 'DIR';
            }
        }

        // Get customer code
        let customerCode;
        if (isBlanket) {
            customerCode = 'ROCKET';
        } else {
            const customer = customers.find(c => c.id === customerId);
            if (!customer) return;
            customerCode = customer.short_code || customer.name.toUpperCase().replace(/[^A-Z0-9]/g, '').substring(0, 4);
        }

        // Get carrier code (use first carrier)
        const carrier = carriers.find(c => c.id === carrierIds[0]);
        if (!carrier) return;
        const carrierCode = carrier.scac_code || carrier.name.toUpperCase().replace(/[^A-Z0-9]/g, '').substring(0, 4);

        const year = effectiveDate.getFullYear();

        const prefix = `${typePrefix}-${customerCode}-${carrierCode}-${year}-`;

        const existingWithPrefix = existingTariffs.filter(t =>
            t.tariff_reference_id && t.tariff_reference_id.startsWith(prefix)
        );

        const existingNumbers = existingWithPrefix.map(t => {
            const match = t.tariff_reference_id.match(/-(\d{3})$/);
            return match ? parseInt(match[1], 10) : 0;
        });

        const nextNumber = existingNumbers.length > 0 ? Math.max(...existingNumbers) + 1 : 1;
        const sequenceNumber = String(nextNumber).padStart(3, '0');

        const generatedVersion = `${prefix}${sequenceNumber}`;
        setVersion(generatedVersion);
    }, [customerId, carrierIds, effectiveDate, isBlanket, ownershipType, customers, carriers, existingTariffs]);

    const createTariffMutation = useMutation({
        mutationFn: async (data) => {
            const ownershipTypeMap = {
                'Customer Direct': 'customer_direct',
                'Priority 1': data.isBlanket ? 'priority1_blanket' : 'customer_direct',
                'Rocket': data.isBlanket ? 'rocket_blanket' : 'rocket_csp'
            };

            // Auto-set status to active if effective date has passed
            const effectiveDate = data.effectiveDate ? format(data.effectiveDate, 'yyyy-MM-dd') : null;
            const effectiveDatePassed = effectiveDate && new Date(effectiveDate) <= new Date();
            const status = effectiveDatePassed ? 'active' : (data.cspEventId ? 'active' : 'proposed');

            const tariffData = {
                customer_id: data.isBlanket ? null : data.customerId,
                carrier_id: data.carrierIds[0], // Use first carrier as carrier_id
                customer_ids: data.isBlanket ? data.subCustomerIds : [],
                version: data.version,
                ownership_type: ownershipTypeMap[data.ownershipType] || 'customer_direct',
                is_blanket_tariff: data.isBlanket,
                effective_date: effectiveDate,
                expiry_date: data.expiryDate ? format(data.expiryDate, 'yyyy-MM-dd') : null,
                file_url: null,
                csp_event_id: data.cspEventId || null,
                status: status
            };

            const newTariff = await Tariff.create(tariffData);
            return newTariff;
        },
        onSuccess: (newTariff) => {
            queryClient.invalidateQueries({ queryKey: ['tariffs'] });
            navigate(createPageUrl(`TariffDetail?id=${newTariff.id}`));
        },
        onError: (error) => {
            console.error("Error creating tariff:", error);
        }
    });

    const handleFileChange = (e) => {
        if (e.target.files && e.target.files[0]) {
            setFile(e.target.files[0]);
        }
    };
    
    const handleDragEnter = (e) => { e.preventDefault(); e.stopPropagation(); setIsDragging(true); };
    const handleDragLeave = (e) => { e.preventDefault(); e.stopPropagation(); setIsDragging(false); };
    const handleDragOver = (e) => { e.preventDefault(); e.stopPropagation(); };
    const handleDrop = (e) => {
        e.preventDefault();
        e.stopPropagation();
        setIsDragging(false);
        if (e.dataTransfer.files && e.dataTransfer.files[0]) {
            setFile(e.dataTransfer.files[0]);
        }
    };

    const handleSubmit = (e) => {
        e.preventDefault();
        
        let missingFields = [];
        if (!version) missingFields.push("Tariff Version");
        if (carrierIds.length === 0) missingFields.push("Carrier");
        if (!effectiveDate) missingFields.push("Effective Date");
        if (!expiryDate) missingFields.push("Expiry Date");
        
        if (!isBlanket && !customerId) {
            missingFields.push("Customer");
        }

        if (missingFields.length > 0) {
            alert(`Please fill all required fields: ${missingFields.join(', ')}.`);
            return;
        }

        createTariffMutation.mutate({
            customerId,
            carrierIds,
            subCustomerIds,
            version,
            ownershipType,
            effectiveDate,
            expiryDate,
            file,
            isBlanket,
            cspEventId
        });
    };

    const carrierOptions = carriers
        .map(c => ({ value: c.id, label: c.name }))
        .sort((a, b) => a.label.localeCompare(b.label));
    const customerOptions = customers
        .map(c => ({ value: c.id, label: c.name }))
        .sort((a, b) => a.label.localeCompare(b.label));

    return (
        <div className="p-6 lg:p-8 max-w-4xl mx-auto">
            <Link to={createPageUrl("Tariffs")} className="inline-flex items-center gap-2 text-sm text-slate-600 hover:text-slate-900 mb-6">
                <ArrowLeft className="w-4 h-4" />
                Back to Tariff Workspace
            </Link>
            
            <Card>
                <CardHeader>
                    <CardTitle className="text-2xl">Create New Tariff</CardTitle>
                    <CardDescription>Enter the tariff details. You can upload the document now or add it later.</CardDescription>
                </CardHeader>
                <CardContent>
                    <form onSubmit={handleSubmit} className="space-y-6">
                        <div className="space-y-2">
                            <Label htmlFor="ownership">Ownership</Label>
                            <Select onValueChange={setOwnershipType} value={ownershipType || undefined}>
                                <SelectTrigger id="ownership"><SelectValue placeholder="Select ownership type" /></SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="Customer Direct">Customer Direct</SelectItem>
                                    <SelectItem value="Priority 1">Priority 1</SelectItem>
                                    <SelectItem value="Rocket">Rocket</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                        
                        {isRocketOrP1 && (
                            <div className="flex items-center space-x-2 p-3 bg-slate-50 rounded-md border">
                                <Switch id="blanket-switch" checked={isBlanket} onCheckedChange={setIsBlanket} />
                                <Label htmlFor="blanket-switch" className="flex flex-col">
                                    <span>Blanket Tariff</span>
                                    <span className="text-xs font-normal text-slate-500">A master tariff applied to multiple sub-customers.</span>
                                </Label>
                            </div>
                        )}

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            {isBlanket ? (
                                <div className="space-y-2 md:col-span-2">
                                    <Label htmlFor="sub-customers">Sub-Customers (Optional)</Label>
                                    <MultiSelect
                                        options={customerOptions}
                                        selected={subCustomerIds}
                                        onChange={setSubCustomerIds}
                                        placeholder="Select one or more sub-customers"
                                        searchPlaceholder="Search customers..."
                                        onCreateNew={() => navigate(createPageUrl('CustomerDetail?new=true'))}
                                        emptyText="No customer found"
                                        createNewText="Add New Customer"
                                    />
                                </div>
                            ) : (
                                <div className="space-y-2">
                                    <Label htmlFor="customer">Customer</Label>
                                    <Select onValueChange={setCustomerId} value={customerId || ""}>
                                        <SelectTrigger id="customer"><SelectValue placeholder="Select a customer" /></SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value={null}>No Customer Selected</SelectItem>
                                            {customers
                                                .sort((a, b) => a.name.localeCompare(b.name))
                                                .map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
                                        </SelectContent>
                                    </Select>
                                </div>
                            )}

                            <div className={`space-y-2 ${isBlanket ? 'md:col-span-2' : ''}`}>
                                <Label htmlFor="carrier">Carrier</Label>
                                <Select onValueChange={(value) => setCarrierIds([value])} value={carrierIds[0] || ""}>
                                    <SelectTrigger id="carrier"><SelectValue placeholder="Select a carrier" /></SelectTrigger>
                                    <SelectContent>
                                        {carriers
                                            .sort((a, b) => a.name.localeCompare(b.name))
                                            .map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div className="space-y-2">
                                <Label htmlFor="effective-date">Effective Date</Label>
                                <Popover>
                                    <PopoverTrigger asChild>
                                        <Button id="effective-date" variant="outline" className="w-full justify-start text-left font-normal">
                                            <CalendarIcon className="mr-2 h-4 w-4" />
                                            {effectiveDate ? format(effectiveDate, "PPP") : <span>Pick a date</span>}
                                        </Button>
                                    </PopoverTrigger>
                                    <PopoverContent className="w-auto p-0"><Calendar mode="single" selected={effectiveDate} onSelect={setEffectiveDate} /></PopoverContent>
                                </Popover>
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="expiry-date">Expiry Date</Label>
                                <Popover>
                                    <PopoverTrigger asChild>
                                        <Button id="expiry-date" variant="outline" className="w-full justify-start text-left font-normal">
                                            <CalendarIcon className="mr-2 h-4 w-4" />
                                            {expiryDate ? format(expiryDate, "PPP") : <span>Pick a date</span>}
                                        </Button>
                                    </PopoverTrigger>
                                    <PopoverContent className="w-auto p-0"><Calendar mode="single" selected={expiryDate} onSelect={setExpiryDate} /></PopoverContent>
                                </Popover>
                            </div>
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="version">Tariff Version</Label>
                            <Input
                                id="version"
                                placeholder={
                                    !isBlanket && !customerId
                                        ? "Select customer, carrier, and effective date to auto-generate"
                                        : carrierIds.length === 0
                                        ? "Select carrier and effective date to auto-generate"
                                        : !effectiveDate
                                        ? "Select effective date to auto-generate"
                                        : "Auto-generated version will appear here"
                                }
                                value={version}
                                onChange={e => setVersion(e.target.value)}
                            />
                        </div>

                        <div className="space-y-2">
                            <Label>Tariff Document (Optional)</Label>
                            {file ? (
                                <div className="p-4 border rounded-lg flex items-center justify-between">
                                    <div className="flex items-center gap-3">
                                        <File className="w-6 h-6 text-blue-500"/>
                                        <div>
                                            <p className="font-medium text-sm">{file.name}</p>
                                            <p className="text-xs text-slate-500">{(file.size / 1024).toFixed(2)} KB</p>
                                        </div>
                                    </div>
                                    <Button variant="ghost" size="icon" onClick={() => setFile(null)}><X className="w-4 h-4"/></Button>
                                </div>
                            ) : (
                                <div onDragEnter={handleDragEnter} onDragLeave={handleDragLeave} onDragOver={handleDragOver} onDrop={handleDrop} className={`relative p-8 border-2 border-dashed rounded-lg text-center cursor-pointer hover:border-blue-500 transition-colors ${isDragging ? 'border-blue-500 bg-blue-50' : 'border-slate-300'}`}>
                                    <UploadCloud className="w-8 h-8 mx-auto text-slate-400 mb-2"/>
                                    <p className="font-semibold text-slate-700">Drag & drop file here</p>
                                    <p className="text-sm text-slate-500">or click to browse</p>
                                    <Input type="file" className="absolute top-0 left-0 w-full h-full opacity-0 cursor-pointer" onChange={handleFileChange} accept=".pdf,.doc,.docx,.xls,.xlsx"/>
                                </div>
                            )}
                        </div>

                        <div className="flex justify-end gap-4">
                            <Button type="button" variant="outline" onClick={() => navigate(createPageUrl('Tariffs'))}>Cancel</Button>
                            <Button type="submit" disabled={createTariffMutation.isPending}>
                                {createTariffMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin"/>}
                                {createTariffMutation.isPending ? 'Creating...' : 'Create Tariff'}
                            </Button>
                        </div>
                    </form>
                </CardContent>
            </Card>
        </div>
    );
}
