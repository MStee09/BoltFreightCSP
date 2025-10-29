
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Badge } from "../ui/badge";
import { Mail, Phone, Globe, MapPin } from 'lucide-react';

// Updated InfoItem component to support value or children, and without icons as per new design
const InfoItem = ({ label, value, children }) => (
    <div className="flex flex-col gap-1">
        <p className="text-sm font-medium text-slate-500">{label}</p>
        {children ? (
            <div className="text-sm text-slate-800">{children}</div>
        ) : (
            <p className="text-sm text-slate-800">{value || 'N/A'}</p>
        )}
    </div>
);

export default function CarrierOverview({ carrier }) {
    if (!carrier) return null;

    return (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-4">
            <div className="space-y-6">
                <Card>
                    <CardHeader>
                        <CardTitle>Carrier Details</CardTitle>
                    </CardHeader>
                    <CardContent className="grid grid-cols-2 md:grid-cols-3 gap-6">
                        <InfoItem label="SCAC" value={carrier.scac_code} />
                        <InfoItem label="Service Type" value={carrier.service_type} />
                        <InfoItem label="Status">
                            <Badge variant="outline" className="capitalize">{carrier.status || 'N/A'}</Badge>
                        </InfoItem>
                        {carrier.website && (
                            <InfoItem label="Website">
                                <a href={carrier.website} target="_blank" rel="noopener noreferrer" className="text-sm text-blue-600 hover:underline flex items-center gap-1">
                                    <Globe className="w-3 h-3" />
                                    Visit Site
                                </a>
                            </InfoItem>
                        )}
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader>
                        <CardTitle>Service Network</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="grid grid-cols-2 gap-6">
                            <InfoItem label="Coverage Type">
                                <Badge variant="secondary" className="capitalize">{carrier.coverage_type || 'Regional'}</Badge>
                            </InfoItem>
                            <InfoItem label="Countries">
                                <div className="flex flex-wrap gap-1">
                                    {(carrier.service_countries || ['US']).map(country => (
                                        <Badge key={country} variant="outline" className="text-xs">{country}</Badge>
                                    ))}
                                </div>
                            </InfoItem>
                        </div>
                        {carrier.service_regions && carrier.service_regions.length > 0 && (
                            <InfoItem label="Service Regions">
                                <div className="flex flex-wrap gap-1">
                                    {carrier.service_regions.map((region, idx) => (
                                        <Badge key={idx} variant="secondary" className="text-xs capitalize">
                                            <MapPin className="w-3 h-3 mr-1" />
                                            {region}
                                        </Badge>
                                    ))}
                                </div>
                            </InfoItem>
                        )}
                        {carrier.service_states && carrier.service_states.length > 0 && (
                            <InfoItem label="Service States">
                                <div className="flex flex-wrap gap-1">
                                    {carrier.service_states.map((state, idx) => (
                                        <Badge key={idx} variant="outline" className="text-xs">{state}</Badge>
                                    ))}
                                </div>
                            </InfoItem>
                        )}
                        {carrier.equipment_types && carrier.equipment_types.length > 0 && (
                            <InfoItem label="Equipment Types">
                                <div className="flex flex-wrap gap-1">
                                    {carrier.equipment_types.map((eq, idx) => (
                                        <Badge key={idx} variant="secondary" className="text-xs capitalize">{eq.replace('_', ' ')}</Badge>
                                    ))}
                                </div>
                            </InfoItem>
                        )}
                        {carrier.specializations && carrier.specializations.length > 0 && (
                            <InfoItem label="Specializations">
                                <div className="flex flex-wrap gap-1">
                                    {carrier.specializations.map((spec, idx) => (
                                        <Badge key={idx} variant="outline" className="text-xs capitalize">{spec.replace('_', ' ')}</Badge>
                                    ))}
                                </div>
                            </InfoItem>
                        )}
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader>
                        <CardTitle>Contact Information</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        {(carrier.carrier_rep_name || carrier.carrier_rep_email || carrier.carrier_rep_phone) && (
                            <div className="border-b pb-4">
                                <h4 className="text-sm font-semibold mb-2 text-slate-700">Carrier Representative</h4>
                                <div className="space-y-2">
                                    {carrier.carrier_rep_name && <p className="text-sm text-slate-800 font-medium">{carrier.carrier_rep_name}</p>}
                                    {carrier.carrier_rep_email && (
                                        <a href={`mailto:${carrier.carrier_rep_email}`} className="text-sm text-blue-600 hover:underline flex items-center gap-1">
                                            <Mail className="w-3 h-3" />
                                            {carrier.carrier_rep_email}
                                        </a>
                                    )}
                                    {carrier.carrier_rep_phone && (
                                        <a href={`tel:${carrier.carrier_rep_phone}`} className="text-sm text-blue-600 hover:underline flex items-center gap-1">
                                            <Phone className="w-3 h-3" />
                                            {carrier.carrier_rep_phone}
                                        </a>
                                    )}
                                </div>
                            </div>
                        )}
                        {(carrier.billing_contact_name || carrier.billing_contact_email || carrier.billing_contact_phone) && (
                            <div>
                                <h4 className="text-sm font-semibold mb-2 text-slate-700">Billing Contact</h4>
                                <div className="space-y-2">
                                    {carrier.billing_contact_name && <p className="text-sm text-slate-800 font-medium">{carrier.billing_contact_name}</p>}
                                    {carrier.billing_contact_email && (
                                        <a href={`mailto:${carrier.billing_contact_email}`} className="text-sm text-blue-600 hover:underline flex items-center gap-1">
                                            <Mail className="w-3 h-3" />
                                            {carrier.billing_contact_email}
                                        </a>
                                    )}
                                    {carrier.billing_contact_phone && (
                                        <a href={`tel:${carrier.billing_contact_phone}`} className="text-sm text-blue-600 hover:underline flex items-center gap-1">
                                            <Phone className="w-3 h-3" />
                                            {carrier.billing_contact_phone}
                                        </a>
                                    )}
                                </div>
                            </div>
                        )}
                        {(!carrier.carrier_rep_name && !carrier.billing_contact_name) && (
                            <p className="text-sm text-slate-500">No contact information available</p>
                        )}
                    </CardContent>
                </Card>
            </div>

            <div className="space-y-6">
                <Card>
                    <CardHeader>
                        <CardTitle>Status</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <Badge variant="outline" className="capitalize text-lg">{carrier.status || 'N/A'}</Badge>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader>
                        <CardTitle>Key Information</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3">
                        <div>
                            <p className="text-sm font-medium text-slate-500">SCAC Code</p>
                            <p className="text-sm text-slate-800 font-mono">{carrier.scac_code}</p>
                        </div>
                        <div>
                            <p className="text-sm font-medium text-slate-500">Service Type</p>
                            <p className="text-sm text-slate-800 capitalize">{carrier.service_type || 'N/A'}</p>
                        </div>
                        <div>
                            <p className="text-sm font-medium text-slate-500">Coverage</p>
                            <Badge variant="secondary" className="capitalize">{carrier.coverage_type || 'Regional'}</Badge>
                        </div>
                        {carrier.website && (
                            <div>
                                <p className="text-sm font-medium text-slate-500">Website</p>
                                <a href={carrier.website} target="_blank" rel="noopener noreferrer" className="text-sm text-blue-600 hover:underline flex items-center gap-1">
                                    <Globe className="w-3 h-3" />
                                    Visit Site
                                </a>
                            </div>
                        )}
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}
