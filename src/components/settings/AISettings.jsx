import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { AISettings as AISettingsAPI } from '../../api/entities';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Textarea } from '../ui/textarea';
import { Label } from '../ui/label';
import { Slider } from '../ui/slider';
import { Alert, AlertDescription } from '../ui/alert';
import { useToast } from '../ui/use-toast';
import { BrainCircuit, Save, RotateCcw, Info, Sparkles } from 'lucide-react';

export function AISettings() {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: settings, isLoading } = useQuery({
    queryKey: ['ai-settings'],
    queryFn: () => AISettingsAPI.get(),
  });

  const [instructions, setInstructions] = useState('');
  const [knowledgeBase, setKnowledgeBase] = useState('');
  const [temperature, setTemperature] = useState([0.7]);
  const [maxTokens, setMaxTokens] = useState([1000]);
  const [hasChanges, setHasChanges] = useState(false);

  useState(() => {
    if (settings) {
      setInstructions(settings.instructions || '');
      setKnowledgeBase(settings.knowledge_base || '');
      setTemperature([settings.temperature || 0.7]);
      setMaxTokens([settings.max_tokens || 1000]);
    }
  }, [settings]);

  const handleInputChange = (setter) => (value) => {
    setter(value);
    setHasChanges(true);
  };

  const saveMutation = useMutation({
    mutationFn: (data) => AISettingsAPI.upsert(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ai-settings'] });
      setHasChanges(false);
      toast({
        title: 'Settings saved',
        description: 'Your AI chatbot settings have been updated.',
      });
    },
    onError: (error) => {
      toast({
        title: 'Error',
        description: error.message || 'Failed to save settings.',
        variant: 'destructive',
      });
    },
  });

  const resetMutation = useMutation({
    mutationFn: () => AISettingsAPI.reset(),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ai-settings'] });
      setInstructions('');
      setKnowledgeBase('');
      setTemperature([0.7]);
      setMaxTokens([1000]);
      setHasChanges(false);
      toast({
        title: 'Settings reset',
        description: 'AI chatbot settings have been reset to defaults.',
      });
    },
    onError: (error) => {
      toast({
        title: 'Error',
        description: error.message || 'Failed to reset settings.',
        variant: 'destructive',
      });
    },
  });

  const handleSave = () => {
    saveMutation.mutate({
      instructions: instructions || 'You are a helpful logistics and procurement analyst. Provide clear, actionable insights based on the shipment data.',
      knowledge_base: knowledgeBase || '',
      temperature: temperature[0],
      max_tokens: maxTokens[0],
    });
  };

  const handleReset = () => {
    if (confirm('Are you sure you want to reset all AI settings to defaults?')) {
      resetMutation.mutate();
    }
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BrainCircuit className="w-5 h-5" />
            AI Chatbot Configuration
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">Loading...</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <Alert>
        <Sparkles className="h-4 w-4" />
        <AlertDescription>
          Customize how the AI chatbot responds to your questions about shipment strategies. These settings affect the AI's behavior when you chat with your data.
        </AlertDescription>
      </Alert>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BrainCircuit className="w-5 h-5" />
            AI Chatbot Configuration
          </CardTitle>
          <CardDescription>
            Personalize the AI assistant to match your communication style and needs
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-3">
            <Label htmlFor="instructions" className="text-base font-semibold">
              System Instructions
            </Label>
            <p className="text-sm text-muted-foreground">
              Define how the AI should behave and what tone it should use when answering questions.
            </p>
            <Textarea
              id="instructions"
              placeholder="Example: You are a senior logistics analyst with 15 years of experience. Be direct, professional, and focus on cost-saving opportunities. Always back up recommendations with specific data points."
              value={instructions}
              onChange={(e) => handleInputChange(setInstructions)(e.target.value)}
              rows={6}
              className="font-mono text-sm"
            />
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
              <div className="flex gap-2">
                <Info className="w-4 h-4 text-blue-600 mt-0.5 flex-shrink-0" />
                <p className="text-xs text-blue-900">
                  <strong>Tips:</strong> Specify the role (e.g., "senior analyst"), tone (e.g., "direct and concise"),
                  and focus areas (e.g., "cost savings and risk mitigation"). The more specific you are, the better the responses.
                </p>
              </div>
            </div>
          </div>

          <div className="space-y-3">
            <Label htmlFor="knowledge" className="text-base font-semibold">
              Knowledge Base
            </Label>
            <p className="text-sm text-muted-foreground">
              Add custom information about your company, processes, or industry-specific knowledge that the AI should consider.
            </p>
            <Textarea
              id="knowledge"
              placeholder="Example: Our company policy prioritizes carriers with 95%+ on-time delivery. We prefer regional carriers for sub-500 mile lanes. Our fiscal year ends in June. Standard contract terms are 12 months with 60-day termination clause."
              value={knowledgeBase}
              onChange={(e) => handleInputChange(setKnowledgeBase)(e.target.value)}
              rows={8}
              className="font-mono text-sm"
            />
            <div className="bg-amber-50 border border-amber-200 rounded-lg p-3">
              <div className="flex gap-2">
                <Info className="w-4 h-4 text-amber-600 mt-0.5 flex-shrink-0" />
                <p className="text-xs text-amber-900">
                  <strong>Examples of useful knowledge:</strong> Company policies, preferred carriers, contract terms,
                  service level requirements, budget constraints, strategic priorities, or industry regulations.
                </p>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-3">
              <Label htmlFor="temperature" className="text-base font-semibold">
                Creativity Level: {temperature[0].toFixed(1)}
              </Label>
              <p className="text-sm text-muted-foreground">
                Lower = more focused and consistent. Higher = more creative and varied responses.
              </p>
              <div className="pt-2">
                <Slider
                  id="temperature"
                  min={0}
                  max={1.5}
                  step={0.1}
                  value={temperature}
                  onValueChange={(value) => handleInputChange(setTemperature)(value)}
                  className="w-full"
                />
              </div>
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>More Focused (0.0)</span>
                <span>More Creative (1.5)</span>
              </div>
            </div>

            <div className="space-y-3">
              <Label htmlFor="maxTokens" className="text-base font-semibold">
                Response Length: {maxTokens[0]}
              </Label>
              <p className="text-sm text-muted-foreground">
                Maximum length of AI responses. Higher = longer, more detailed answers.
              </p>
              <div className="pt-2">
                <Slider
                  id="maxTokens"
                  min={500}
                  max={2000}
                  step={100}
                  value={maxTokens}
                  onValueChange={(value) => handleInputChange(setMaxTokens)(value)}
                  className="w-full"
                />
              </div>
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>Shorter (500)</span>
                <span>Longer (2000)</span>
              </div>
            </div>
          </div>

          <div className="flex gap-3 pt-4">
            <Button
              onClick={handleSave}
              disabled={!hasChanges || saveMutation.isPending}
              className="gap-2"
            >
              <Save className="w-4 h-4" />
              {saveMutation.isPending ? 'Saving...' : 'Save Settings'}
            </Button>
            <Button
              variant="outline"
              onClick={handleReset}
              disabled={resetMutation.isPending}
              className="gap-2"
            >
              <RotateCcw className="w-4 h-4" />
              Reset to Defaults
            </Button>
          </div>

          {hasChanges && (
            <Alert>
              <Info className="h-4 w-4" />
              <AlertDescription>
                You have unsaved changes. Click "Save Settings" to apply them.
              </AlertDescription>
            </Alert>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
