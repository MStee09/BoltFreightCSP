import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Plus, Edit, Trash2, Target, ChevronLeft } from 'lucide-react';
import { supabase } from '@/api/supabaseClient';
import { toast } from 'sonner';

const KPI_TYPES = [
  { value: 'win_rate', label: 'Win Rate', unit: '%', description: 'Percentage of won deals vs total closed' },
  { value: 'avg_cycle_time', label: 'Average Cycle Time', unit: 'days', description: 'Average days from deal creation to closure' },
  { value: 'stage_conversion', label: 'Stage Conversion', unit: '%', description: 'Conversion rate between pipeline stages' },
  { value: 'email_response_rate', label: 'Email Response Rate', unit: '%', description: 'Percentage of emails receiving responses' },
  { value: 'deals_closed', label: 'Deals Closed', unit: 'number', description: 'Total number of deals won' },
  { value: 'deals_entering_stage', label: 'Deals Entering Stage', unit: 'number', description: 'Number of deals entering a specific pipeline stage' },
  { value: 'revenue_target', label: 'Revenue Target', unit: '$', description: 'Total revenue or savings achieved' },
  { value: 'activity_volume', label: 'Activity Volume', unit: 'number', description: 'Total activities completed' },
  { value: 'carrier_engagement', label: 'Carrier Engagement', unit: 'number', description: 'Number of carrier interactions' },
  { value: 'customer_satisfaction', label: 'Customer Satisfaction', unit: 'score', description: 'Customer satisfaction metrics' },
  { value: 'custom', label: 'Custom KPI', unit: 'custom', description: 'Define your own KPI' },
];

const PIPELINE_STAGES = [
  { value: 'discovery', label: 'Discovery' },
  { value: 'rfp', label: 'RFP' },
  { value: 'in_review', label: 'In Review' },
  { value: 'negotiation', label: 'Negotiation' },
  { value: 'contract', label: 'Contract' },
  { value: 'won', label: 'Won' },
  { value: 'live', label: 'Live' },
  { value: 'lost', label: 'Lost' },
  { value: 'not_awarded', label: 'Not Awarded' },
];

const MEASUREMENT_PERIODS = [
  { value: 'daily', label: 'Daily' },
  { value: 'weekly', label: 'Weekly' },
  { value: 'monthly', label: 'Monthly' },
  { value: 'quarterly', label: 'Quarterly' },
  { value: 'yearly', label: 'Yearly' },
];

export function KPIManagement({ onBack }) {
  const [kpis, setKpis] = useState([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingKPI, setEditingKPI] = useState(null);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    kpi_type: 'win_rate',
    target_value: '',
    measurement_period: 'monthly',
    calculation_method: '',
    unit: '%',
    threshold_green: '',
    threshold_yellow: '',
    threshold_red: '',
    is_active: true,
    target_stage: '',
  });

  useEffect(() => {
    fetchKPIs();
  }, []);

  const fetchKPIs = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('kpi_definitions')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setKpis(data || []);
    } catch (error) {
      console.error('Error fetching KPIs:', error);
      toast.error('Failed to load KPIs');
    } finally {
      setLoading(false);
    }
  };

  const handleKPITypeChange = (type) => {
    const kpiType = KPI_TYPES.find(k => k.value === type);
    setFormData({
      ...formData,
      kpi_type: type,
      unit: kpiType?.unit || 'number',
      description: kpiType?.description || '',
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!formData.name || !formData.target_value || !formData.threshold_green || !formData.threshold_yellow || !formData.threshold_red) {
      toast.error('Please fill in all required fields');
      return;
    }

    if (formData.kpi_type === 'deals_entering_stage' && !formData.target_stage) {
      toast.error('Please select a target stage');
      return;
    }

    try {
      const { data: { user } } = await supabase.auth.getUser();

      const metadata = formData.kpi_type === 'deals_entering_stage'
        ? { target_stage: formData.target_stage }
        : {};

      const kpiData = {
        name: formData.name,
        description: formData.description,
        kpi_type: formData.kpi_type,
        target_value: parseFloat(formData.target_value),
        measurement_period: formData.measurement_period,
        calculation_method: formData.calculation_method,
        unit: formData.unit,
        threshold_green: parseFloat(formData.threshold_green),
        threshold_yellow: parseFloat(formData.threshold_yellow),
        threshold_red: parseFloat(formData.threshold_red),
        is_active: formData.is_active,
        metadata,
        created_by: user.id,
      };

      if (editingKPI) {
        const { error } = await supabase
          .from('kpi_definitions')
          .update(kpiData)
          .eq('id', editingKPI.id);

        if (error) throw error;
        toast.success('KPI updated successfully');
      } else {
        const { error } = await supabase
          .from('kpi_definitions')
          .insert([kpiData]);

        if (error) throw error;
        toast.success('KPI created successfully');
      }

      setDialogOpen(false);
      setEditingKPI(null);
      resetForm();
      fetchKPIs();
    } catch (error) {
      console.error('Error saving KPI:', error);
      toast.error('Failed to save KPI');
    }
  };

  const handleEdit = (kpi) => {
    setEditingKPI(kpi);
    setFormData({
      name: kpi.name,
      description: kpi.description || '',
      kpi_type: kpi.kpi_type,
      target_value: kpi.target_value.toString(),
      measurement_period: kpi.measurement_period,
      calculation_method: kpi.calculation_method || '',
      unit: kpi.unit,
      threshold_green: kpi.threshold_green.toString(),
      threshold_yellow: kpi.threshold_yellow.toString(),
      threshold_red: kpi.threshold_red.toString(),
      is_active: kpi.is_active,
      target_stage: kpi.metadata?.target_stage || '',
    });
    setDialogOpen(true);
  };

  const handleDelete = async (id) => {
    if (!confirm('Are you sure you want to delete this KPI? This will also delete all tracking and prediction data.')) {
      return;
    }

    try {
      const { error } = await supabase
        .from('kpi_definitions')
        .delete()
        .eq('id', id);

      if (error) throw error;
      toast.success('KPI deleted successfully');
      fetchKPIs();
    } catch (error) {
      console.error('Error deleting KPI:', error);
      toast.error('Failed to delete KPI');
    }
  };

  const toggleActive = async (kpi) => {
    try {
      const { error } = await supabase
        .from('kpi_definitions')
        .update({ is_active: !kpi.is_active })
        .eq('id', kpi.id);

      if (error) throw error;
      toast.success(`KPI ${!kpi.is_active ? 'activated' : 'deactivated'}`);
      fetchKPIs();
    } catch (error) {
      console.error('Error toggling KPI:', error);
      toast.error('Failed to update KPI');
    }
  };

  const resetForm = () => {
    setFormData({
      name: '',
      description: '',
      kpi_type: 'win_rate',
      target_value: '',
      measurement_period: 'monthly',
      calculation_method: '',
      unit: '%',
      threshold_green: '',
      threshold_yellow: '',
      threshold_red: '',
      is_active: true,
      target_stage: '',
    });
  };

  const openCreateDialog = () => {
    setEditingKPI(null);
    resetForm();
    setDialogOpen(true);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Button variant="ghost" onClick={onBack} className="gap-2">
            <ChevronLeft className="h-4 w-4" />
            Back
          </Button>
          <div>
            <h2 className="text-2xl font-bold">Manage KPIs</h2>
            <p className="text-slate-600">Configure and track key performance indicators</p>
          </div>
        </div>
        <Button onClick={openCreateDialog} className="gap-2">
          <Plus className="h-4 w-4" />
          New KPI
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Active KPIs</CardTitle>
          <CardDescription>Track and manage your key performance metrics</CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            </div>
          ) : kpis.length === 0 ? (
            <div className="text-center py-12">
              <Target className="h-12 w-12 mx-auto text-slate-300 mb-3" />
              <p className="text-slate-600 mb-4">No KPIs configured yet</p>
              <Button onClick={openCreateDialog} className="gap-2">
                <Plus className="h-4 w-4" />
                Create Your First KPI
              </Button>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Target</TableHead>
                  <TableHead>Period</TableHead>
                  <TableHead>Thresholds</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {kpis.map((kpi) => (
                  <TableRow key={kpi.id}>
                    <TableCell>
                      <div>
                        <div className="font-medium">{kpi.name}</div>
                        {kpi.description && (
                          <div className="text-xs text-slate-500">{kpi.description}</div>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline">
                        {KPI_TYPES.find(t => t.value === kpi.kpi_type)?.label || kpi.kpi_type}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {kpi.target_value} {kpi.unit}
                    </TableCell>
                    <TableCell className="capitalize">{kpi.measurement_period}</TableCell>
                    <TableCell>
                      <div className="flex gap-1 text-xs">
                        <Badge variant="secondary" className="bg-green-100 text-green-700">
                          &gt;{kpi.threshold_green}
                        </Badge>
                        <Badge variant="secondary" className="bg-yellow-100 text-yellow-700">
                          &gt;{kpi.threshold_yellow}
                        </Badge>
                        <Badge variant="secondary" className="bg-red-100 text-red-700">
                          &lt;{kpi.threshold_red}
                        </Badge>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Switch
                        checked={kpi.is_active}
                        onCheckedChange={() => toggleActive(kpi)}
                      />
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        <Button variant="ghost" size="sm" onClick={() => handleEdit(kpi)}>
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="sm" onClick={() => handleDelete(kpi.id)}>
                          <Trash2 className="h-4 w-4 text-red-600" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingKPI ? 'Edit KPI' : 'Create New KPI'}</DialogTitle>
            <DialogDescription>
              Define your key performance indicator and set target thresholds
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="col-span-2">
                <Label htmlFor="name">KPI Name *</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="e.g., Monthly Win Rate"
                  required
                />
              </div>

              <div className="col-span-2">
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Describe what this KPI measures"
                  rows={2}
                />
              </div>

              <div>
                <Label htmlFor="kpi_type">KPI Type *</Label>
                <Select value={formData.kpi_type} onValueChange={handleKPITypeChange}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {KPI_TYPES.map((type) => (
                      <SelectItem key={type.value} value={type.value}>
                        {type.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {formData.kpi_type === 'deals_entering_stage' && (
                <div>
                  <Label htmlFor="target_stage">Target Stage *</Label>
                  <Select
                    value={formData.target_stage}
                    onValueChange={(value) => setFormData({ ...formData, target_stage: value })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select a stage" />
                    </SelectTrigger>
                    <SelectContent>
                      {PIPELINE_STAGES.map((stage) => (
                        <SelectItem key={stage.value} value={stage.value}>
                          {stage.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}

              <div>
                <Label htmlFor="measurement_period">Measurement Period *</Label>
                <Select
                  value={formData.measurement_period}
                  onValueChange={(value) => setFormData({ ...formData, measurement_period: value })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {MEASUREMENT_PERIODS.map((period) => (
                      <SelectItem key={period.value} value={period.value}>
                        {period.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="target_value">Target Value *</Label>
                <Input
                  id="target_value"
                  type="number"
                  step="0.01"
                  value={formData.target_value}
                  onChange={(e) => setFormData({ ...formData, target_value: e.target.value })}
                  placeholder="e.g., 75"
                  required
                />
              </div>

              <div>
                <Label htmlFor="unit">Unit</Label>
                <Input
                  id="unit"
                  value={formData.unit}
                  onChange={(e) => setFormData({ ...formData, unit: e.target.value })}
                  placeholder="e.g., %, days, $"
                />
              </div>
            </div>

            <div className="space-y-3 p-4 bg-slate-50 rounded-lg">
              <h4 className="font-medium text-sm">Performance Thresholds</h4>
              <p className="text-xs text-slate-600">
                Define the ranges that determine if your KPI is on track
              </p>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <Label htmlFor="threshold_green" className="text-green-700">
                    Green (Excellent) *
                  </Label>
                  <Input
                    id="threshold_green"
                    type="number"
                    step="0.01"
                    value={formData.threshold_green}
                    onChange={(e) => setFormData({ ...formData, threshold_green: e.target.value })}
                    placeholder="90"
                    className="border-green-300"
                    required
                  />
                  <p className="text-xs text-slate-500 mt-1">Values above this</p>
                </div>

                <div>
                  <Label htmlFor="threshold_yellow" className="text-yellow-700">
                    Yellow (At Risk) *
                  </Label>
                  <Input
                    id="threshold_yellow"
                    type="number"
                    step="0.01"
                    value={formData.threshold_yellow}
                    onChange={(e) => setFormData({ ...formData, threshold_yellow: e.target.value })}
                    placeholder="70"
                    className="border-yellow-300"
                    required
                  />
                  <p className="text-xs text-slate-500 mt-1">Values above this</p>
                </div>

                <div>
                  <Label htmlFor="threshold_red" className="text-red-700">
                    Red (Off Track) *
                  </Label>
                  <Input
                    id="threshold_red"
                    type="number"
                    step="0.01"
                    value={formData.threshold_red}
                    onChange={(e) => setFormData({ ...formData, threshold_red: e.target.value })}
                    placeholder="50"
                    className="border-red-300"
                    required
                  />
                  <p className="text-xs text-slate-500 mt-1">Values below this</p>
                </div>
              </div>
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>
                Cancel
              </Button>
              <Button type="submit">
                {editingKPI ? 'Update KPI' : 'Create KPI'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
