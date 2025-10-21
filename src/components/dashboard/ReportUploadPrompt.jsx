import React, { useState, useMemo } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Customer, Carrier, Tariff, CSPEvent, Task, Interaction, Alert, Shipment, LostOpportunity, ReportSnapshot } from '../../api/entities';
import { differenceInDays } from 'date-fns';
import { Card, CardHeader, CardTitle, CardContent } from '../ui/card';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { UploadCloud, FileCheck, Loader2 } from 'lucide-react';

// Inline array safety
function toArray(val) {
  if (!val) return [];
  if (Array.isArray(val)) return val;
  if (val.data && Array.isArray(val.data)) return val.data;
  if (val.results && Array.isArray(val.results)) return val.results;
  return [];
}

const UploadItem = ({ customer, reportType }) => {
    const queryClient = useQueryClient();
    const [file, setFile] = useState(null);
    const [status, setStatus] = useState('idle');

    const uploadMutation = useMutation({
        mutationFn: async ({ file, customerId, reportType }) => {
            const { file_url } = await base44.integrations.Core.UploadFile({ file });
            await ReportSnapshot.create({
                customer_id: customerId,
                report_type: reportType.toLowerCase().replace(' ', '_'),
                snapshot_date: new Date().toISOString().split('T')[0],
                file_name: file.name,
                file_url: file_url,
            });
        },
        onSuccess: () => {
            setStatus('success');
            queryClient.invalidateQueries({ queryKey: ['reportSnapshots'] });
            setTimeout(() => setStatus('idle'), 5000);
        },
        onError: () => setStatus('error'),
    });

    const handleFileChange = (e) => {
        const selectedFile = e.target.files[0];
        if (selectedFile) {
            setFile(selectedFile);
        }
    };
    
    const handleUpload = () => {
        if (!file) return;
        setStatus('uploading');
        uploadMutation.mutate({ file, customerId: customer.id, reportType });
    };

    const getButton = () => {
        switch(status) {
            case 'uploading': 
                return <Button size="sm" disabled><Loader2 className="mr-2 h-4 w-4 animate-spin" />Uploading</Button>;
            case 'success': 
                return <Button size="sm" variant="ghost" className="text-green-600"><FileCheck className="mr-2 h-4 w-4" />Uploaded</Button>;
            default: 
                return <Button size="sm" onClick={handleUpload} disabled={!file}>Upload</Button>
        }
    }

    return (
        <div className="flex items-center justify-between gap-2 p-2 rounded-lg hover:bg-slate-50">
            <div className="flex-1">
                <p className="text-sm font-medium">{customer.name}</p>
                <p className="text-xs text-slate-500">Upload {reportType} Report</p>
            </div>
            <div className="flex items-center gap-2">
                <Input type="file" className="text-xs w-48 h-9 file:mr-2 file:text-xs" onChange={handleFileChange} />
                {getButton()}
            </div>
        </div>
    );
};

export default function ReportUploadPrompt({ customers }) {
    // CRITICAL FIX: Ensure customers is an array BEFORE useMemo
    const safeCustomers = toArray(customers);

    const customersNeedingReports = useMemo(() => {
        // Double-check it's an array inside useMemo too
        const customerList = Array.isArray(safeCustomers) ? safeCustomers : [];
        
        const today = new Date();
        return customerList.filter(c => {
            try {
                if (!c || !c.csp_go_live_date) return false;
                const daysSinceGoLive = differenceInDays(today, new Date(c.csp_go_live_date));
                return daysSinceGoLive >= 25 && daysSinceGoLive < 100;
            } catch (error) {
                console.error('Error filtering customer:', c, error);
                return false;
            }
        });
    }, [safeCustomers]);

    if (customersNeedingReports.length === 0) {
        return null;
    }

    return (
        <Card className="shadow-lg border-0 bg-white/80 backdrop-blur">
            <CardHeader className="border-b border-slate-100 pb-4">
                <CardTitle className="text-xl font-bold text-slate-900 flex items-center gap-2">
                    <UploadCloud className="w-5 h-5 text-blue-500" />
                    Data Refresh Center
                </CardTitle>
            </CardHeader>
            <CardContent className="p-4 space-y-2">
                 {customersNeedingReports.map(customer => (
                     <React.Fragment key={customer.id}>
                        <UploadItem customer={customer} reportType="Shipment Detail" />
                        <UploadItem customer={customer} reportType="Lost Opportunity" />
                     </React.Fragment>
                 ))}
            </CardContent>
        </Card>
    );
}