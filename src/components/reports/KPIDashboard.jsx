import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Progress } from '@/components/ui/progress';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Target,
  TrendingUp,
  TrendingDown,
  Activity,
  AlertTriangle,
  CheckCircle2,
  Brain,
  Lightbulb,
  RefreshCw,
  Settings,
  ChevronRight,
  BarChart3,
  Clock
} from 'lucide-react';
import { supabase } from '@/api/supabaseClient';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { format, differenceInDays } from 'date-fns';

export function KPIDashboard({ onManageKPIs }) {
  const [kpis, setKpis] = useState([]);
  const [tracking, setTracking] = useState([]);
  const [predictions, setPredictions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [analyzing, setAnalyzing] = useState(false);
  const [selectedKPI, setSelectedKPI] = useState(null);

  useEffect(() => {
    fetchKPIData();
  }, []);

  const fetchKPIData = async () => {
    setLoading(true);
    try {
      const [kpisResult, trackingResult, predictionsResult] = await Promise.all([
        supabase.from('kpi_definitions').select('*').eq('is_active', true).order('created_at', { ascending: false }),
        supabase.from('kpi_tracking').select('*').order('recorded_at', { ascending: false }).limit(100),
        supabase.from('kpi_predictions').select('*').order('prediction_date', { ascending: false }).limit(100),
      ]);

      if (kpisResult.error) throw kpisResult.error;
      if (trackingResult.error) throw trackingResult.error;
      if (predictionsResult.error) throw predictionsResult.error;

      setKpis(kpisResult.data || []);
      setTracking(trackingResult.data || []);
      setPredictions(predictionsResult.data || []);
    } catch (error) {
      console.error('Error fetching KPI data:', error);
      toast.error('Failed to load KPI data');
    } finally {
      setLoading(false);
    }
  };

  const runAnalysis = async () => {
    setAnalyzing(true);
    try {
      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/analyze-kpis`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({}),
        }
      );

      if (!response.ok) {
        throw new Error('Failed to analyze KPIs');
      }

      const result = await response.json();
      toast.success(result.message || 'KPI analysis completed');
      await fetchKPIData();
    } catch (error) {
      console.error('Error analyzing KPIs:', error);
      toast.error('Failed to run KPI analysis');
    } finally {
      setAnalyzing(false);
    }
  };

  const getLatestTracking = (kpiId) => {
    return tracking.find(t => t.kpi_id === kpiId);
  };

  const getLatestPrediction = (kpiId) => {
    return predictions.find(p => p.kpi_id === kpiId);
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'exceeded':
        return 'text-green-600 bg-green-50 border-green-200';
      case 'on_track':
        return 'text-blue-600 bg-blue-50 border-blue-200';
      case 'at_risk':
        return 'text-yellow-600 bg-yellow-50 border-yellow-200';
      case 'off_track':
        return 'text-red-600 bg-red-50 border-red-200';
      default:
        return 'text-slate-600 bg-slate-50 border-slate-200';
    }
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'exceeded':
      case 'on_track':
        return <CheckCircle2 className="h-5 w-5" />;
      case 'at_risk':
        return <AlertTriangle className="h-5 w-5" />;
      case 'off_track':
        return <AlertTriangle className="h-5 w-5" />;
      default:
        return <Activity className="h-5 w-5" />;
    }
  };

  const getTrendIcon = (direction) => {
    switch (direction) {
      case 'improving':
        return <TrendingUp className="h-4 w-4 text-green-600" />;
      case 'declining':
        return <TrendingDown className="h-4 w-4 text-red-600" />;
      default:
        return <Activity className="h-4 w-4 text-slate-600" />;
    }
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <Skeleton className="h-8 w-64" />
          <Skeleton className="h-10 w-32" />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[1, 2, 3].map((i) => (
            <Card key={i}>
              <CardContent className="p-6">
                <Skeleton className="h-32 w-full" />
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  if (kpis.length === 0) {
    return (
      <Card>
        <CardContent className="p-12">
          <div className="text-center">
            <Target className="h-16 w-16 mx-auto text-slate-300 mb-4" />
            <h3 className="text-lg font-semibold mb-2">No KPIs Configured</h3>
            <p className="text-slate-600 mb-6">
              Set up your first KPI to start tracking performance metrics
            </p>
            <Button onClick={onManageKPIs} className="gap-2">
              <Settings className="h-4 w-4" />
              Configure KPIs
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">KPI Dashboard</h2>
          <p className="text-slate-600">AI-powered performance tracking and predictions</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={onManageKPIs} className="gap-2">
            <Settings className="h-4 w-4" />
            Manage KPIs
          </Button>
          <Button onClick={runAnalysis} disabled={analyzing} className="gap-2">
            <RefreshCw className={cn("h-4 w-4", analyzing && "animate-spin")} />
            {analyzing ? 'Analyzing...' : 'Run Analysis'}
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {kpis.map((kpi) => {
          const latestTracking = getLatestTracking(kpi.id);
          const prediction = getLatestPrediction(kpi.id);
          const percentageOfTarget = latestTracking?.percentage_of_target || 0;

          return (
            <Card
              key={kpi.id}
              className={cn(
                "cursor-pointer transition-all hover:shadow-lg",
                selectedKPI?.id === kpi.id && "ring-2 ring-blue-500"
              )}
              onClick={() => setSelectedKPI(selectedKPI?.id === kpi.id ? null : kpi)}
            >
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <CardTitle className="text-lg mb-1">{kpi.name}</CardTitle>
                    <CardDescription className="text-xs">
                      {kpi.description || kpi.kpi_type.replace(/_/g, ' ')}
                    </CardDescription>
                  </div>
                  {latestTracking && (
                    <div className={cn("flex items-center gap-1 px-2 py-1 rounded-full border", getStatusColor(latestTracking.status))}>
                      {getStatusIcon(latestTracking.status)}
                    </div>
                  )}
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-end justify-between">
                  <div>
                    <div className="text-3xl font-bold">
                      {latestTracking ? latestTracking.actual_value.toFixed(1) : '-'}
                      <span className="text-sm text-slate-500 ml-1">{kpi.unit}</span>
                    </div>
                    <div className="text-xs text-slate-500 mt-1">
                      Target: {kpi.target_value} {kpi.unit}
                    </div>
                  </div>
                  {prediction && (
                    <div className="text-right">
                      <div className="flex items-center gap-1 text-sm font-medium">
                        {getTrendIcon(prediction.trend_direction)}
                        {prediction.trend_direction}
                      </div>
                    </div>
                  )}
                </div>

                {latestTracking && (
                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-slate-600">Progress</span>
                      <span className="font-medium">{percentageOfTarget.toFixed(0)}%</span>
                    </div>
                    <Progress value={Math.min(percentageOfTarget, 100)} className="h-2" />
                  </div>
                )}

                {prediction && (
                  <div className="pt-3 border-t space-y-2">
                    <div className="flex items-center gap-2 text-sm">
                      <Brain className="h-4 w-4 text-blue-600" />
                      <span className="font-medium">AI Prediction</span>
                    </div>
                    <div className="grid grid-cols-2 gap-2 text-xs">
                      <div>
                        <div className="text-slate-600">Next Period</div>
                        <div className="font-semibold">{prediction.predicted_value.toFixed(1)} {kpi.unit}</div>
                      </div>
                      <div>
                        <div className="text-slate-600">Likelihood</div>
                        <div className={cn(
                          "font-semibold",
                          prediction.likelihood_of_meeting_target >= 70 ? "text-green-600" :
                          prediction.likelihood_of_meeting_target >= 40 ? "text-yellow-600" : "text-red-600"
                        )}>
                          {prediction.likelihood_of_meeting_target.toFixed(0)}%
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {selectedKPI?.id === kpi.id && (
                  <div className="pt-3 border-t">
                    <Button variant="link" className="p-0 h-auto text-blue-600 gap-1">
                      View Details
                      <ChevronRight className="h-4 w-4" />
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>

      {selectedKPI && (
        <Card className="border-2 border-blue-500">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Brain className="h-5 w-5 text-blue-600" />
              AI Insights: {selectedKPI.name}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {(() => {
              const prediction = getLatestPrediction(selectedKPI.id);
              const latestTracking = getLatestTracking(selectedKPI.id);

              if (!prediction) {
                return (
                  <div className="text-center py-8 text-slate-500">
                    <Brain className="h-12 w-12 mx-auto mb-3 text-slate-300" />
                    <p>No AI analysis available yet</p>
                    <Button onClick={runAnalysis} className="mt-4 gap-2">
                      <RefreshCw className="h-4 w-4" />
                      Run Analysis Now
                    </Button>
                  </div>
                );
              }

              return (
                <Tabs defaultValue="overview" className="space-y-4">
                  <TabsList>
                    <TabsTrigger value="overview">Overview</TabsTrigger>
                    <TabsTrigger value="insights">Insights</TabsTrigger>
                    <TabsTrigger value="recommendations">Actions</TabsTrigger>
                  </TabsList>

                  <TabsContent value="overview" className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <Card>
                        <CardContent className="pt-6">
                          <div className="text-sm text-slate-600 mb-1">Current Value</div>
                          <div className="text-2xl font-bold">
                            {latestTracking?.actual_value.toFixed(1) || '-'} {selectedKPI.unit}
                          </div>
                          <div className="text-xs text-slate-500 mt-1">
                            {latestTracking ? format(new Date(latestTracking.recorded_at), 'MMM d, yyyy') : 'No data'}
                          </div>
                        </CardContent>
                      </Card>

                      <Card>
                        <CardContent className="pt-6">
                          <div className="text-sm text-slate-600 mb-1">Predicted Value</div>
                          <div className="text-2xl font-bold text-blue-600">
                            {prediction.predicted_value.toFixed(1)} {selectedKPI.unit}
                          </div>
                          <div className="text-xs text-slate-500 mt-1">
                            Confidence: {prediction.confidence_score.toFixed(0)}%
                          </div>
                        </CardContent>
                      </Card>

                      <Card>
                        <CardContent className="pt-6">
                          <div className="text-sm text-slate-600 mb-1">Success Likelihood</div>
                          <div className={cn(
                            "text-2xl font-bold",
                            prediction.likelihood_of_meeting_target >= 70 ? "text-green-600" :
                            prediction.likelihood_of_meeting_target >= 40 ? "text-yellow-600" : "text-red-600"
                          )}>
                            {prediction.likelihood_of_meeting_target.toFixed(0)}%
                          </div>
                          <div className="text-xs text-slate-500 mt-1">of meeting target</div>
                        </CardContent>
                      </Card>
                    </div>

                    {prediction.ai_analysis_summary && (
                      <Card>
                        <CardHeader>
                          <CardTitle className="text-base">AI Analysis</CardTitle>
                        </CardHeader>
                        <CardContent>
                          <p className="text-slate-700">{prediction.ai_analysis_summary}</p>
                        </CardContent>
                      </Card>
                    )}
                  </TabsContent>

                  <TabsContent value="insights" className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <Card className="border-green-200">
                        <CardHeader>
                          <CardTitle className="text-base flex items-center gap-2 text-green-700">
                            <CheckCircle2 className="h-4 w-4" />
                            Positive Indicators
                          </CardTitle>
                        </CardHeader>
                        <CardContent>
                          <ul className="space-y-2">
                            {prediction.positive_indicators.map((indicator, idx) => (
                              <li key={idx} className="flex items-start gap-2 text-sm">
                                <div className="h-1.5 w-1.5 rounded-full bg-green-600 mt-1.5 flex-shrink-0" />
                                <span>{indicator}</span>
                              </li>
                            ))}
                          </ul>
                        </CardContent>
                      </Card>

                      <Card className="border-red-200">
                        <CardHeader>
                          <CardTitle className="text-base flex items-center gap-2 text-red-700">
                            <AlertTriangle className="h-4 w-4" />
                            Risk Factors
                          </CardTitle>
                        </CardHeader>
                        <CardContent>
                          <ul className="space-y-2">
                            {prediction.negative_indicators.map((indicator, idx) => (
                              <li key={idx} className="flex items-start gap-2 text-sm">
                                <div className="h-1.5 w-1.5 rounded-full bg-red-600 mt-1.5 flex-shrink-0" />
                                <span>{indicator}</span>
                              </li>
                            ))}
                          </ul>
                        </CardContent>
                      </Card>
                    </div>

                    <Card>
                      <CardHeader>
                        <CardTitle className="text-base">Key Factors</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="space-y-2">
                          {prediction.key_factors.map((factor, idx) => (
                            <div key={idx} className="flex items-start gap-2 text-sm p-2 bg-slate-50 rounded">
                              <BarChart3 className="h-4 w-4 text-blue-600 mt-0.5 flex-shrink-0" />
                              <span>{factor}</span>
                            </div>
                          ))}
                        </div>
                      </CardContent>
                    </Card>
                  </TabsContent>

                  <TabsContent value="recommendations" className="space-y-4">
                    <Card>
                      <CardHeader>
                        <CardTitle className="text-base flex items-center gap-2">
                          <Lightbulb className="h-4 w-4 text-yellow-600" />
                          AI Recommendations
                        </CardTitle>
                        <CardDescription>
                          Actionable steps to improve KPI performance
                        </CardDescription>
                      </CardHeader>
                      <CardContent>
                        <div className="space-y-3">
                          {prediction.recommendations.map((rec, idx) => (
                            <div key={idx} className="flex gap-3 p-3 border rounded-lg hover:bg-slate-50 transition-colors">
                              <div className="flex-shrink-0 w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center text-blue-700 font-semibold text-sm">
                                {idx + 1}
                              </div>
                              <div className="flex-1">
                                <p className="text-sm">{rec}</p>
                              </div>
                            </div>
                          ))}
                        </div>
                      </CardContent>
                    </Card>

                    <Card>
                      <CardHeader>
                        <CardTitle className="text-base">Data Quality</CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-2">
                        <div className="flex items-center justify-between text-sm">
                          <span className="text-slate-600">Confidence in analysis</span>
                          <span className="font-medium">{prediction.data_quality_score.toFixed(0)}%</span>
                        </div>
                        <Progress value={prediction.data_quality_score} className="h-2" />
                        {prediction.data_quality_score < 70 && (
                          <p className="text-xs text-amber-600 flex items-center gap-1 mt-2">
                            <AlertTriangle className="h-3 w-3" />
                            Limited data available. More historical data will improve prediction accuracy.
                          </p>
                        )}
                      </CardContent>
                    </Card>
                  </TabsContent>
                </Tabs>
              );
            })()}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
