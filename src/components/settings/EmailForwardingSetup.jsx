import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { CheckCircle, Copy, ExternalLink, ArrowRight, Info } from 'lucide-react';
import { toast } from 'sonner';

export default function EmailForwardingSetup({ domain, webhookUrl }) {
  const [copied, setCopied] = useState('');

  const copyToClipboard = (text, label) => {
    navigator.clipboard.writeText(text);
    setCopied(label);
    toast.success('Copied to clipboard!');
    setTimeout(() => setCopied(''), 2000);
  };

  const catchAllPattern = `replies+*@${domain}`;

  return (
    <Card>
      <CardHeader>
        <CardTitle>Email Forwarding Setup Wizard</CardTitle>
        <CardDescription>
          Choose your preferred method and follow the step-by-step instructions
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="cloudflare" className="w-full">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="cloudflare">Cloudflare</TabsTrigger>
            <TabsTrigger value="sendgrid">SendGrid</TabsTrigger>
            <TabsTrigger value="mailgun">Mailgun</TabsTrigger>
            <TabsTrigger value="zapier">Zapier</TabsTrigger>
          </TabsList>

          <TabsContent value="cloudflare" className="space-y-4 mt-4">
            <Alert className="bg-green-50 border-green-200">
              <CheckCircle className="h-4 w-4 text-green-600" />
              <AlertDescription>
                <strong>Recommended:</strong> Free, unlimited emails, no rate limits
              </AlertDescription>
            </Alert>

            <div className="space-y-4">
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <span className="flex items-center justify-center w-6 h-6 rounded-full bg-blue-100 text-blue-700 text-sm font-semibold">1</span>
                  <h4 className="font-semibold">Add your domain to Cloudflare</h4>
                </div>
                <p className="text-sm text-muted-foreground ml-8">
                  Go to <a href="https://dash.cloudflare.com" target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline inline-flex items-center gap-1">
                    Cloudflare Dashboard <ExternalLink className="h-3 w-3" />
                  </a> and add <code className="bg-gray-100 px-1 rounded">{domain}</code>
                </p>
              </div>

              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <span className="flex items-center justify-center w-6 h-6 rounded-full bg-blue-100 text-blue-700 text-sm font-semibold">2</span>
                  <h4 className="font-semibold">Enable Email Routing</h4>
                </div>
                <p className="text-sm text-muted-foreground ml-8">
                  Navigate to <strong>Email → Email Routing</strong> and click "Get started"
                </p>
              </div>

              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <span className="flex items-center justify-center w-6 h-6 rounded-full bg-blue-100 text-blue-700 text-sm font-semibold">3</span>
                  <h4 className="font-semibold">Create Catch-All Route</h4>
                </div>
                <div className="ml-8 space-y-2">
                  <p className="text-sm text-muted-foreground">
                    Go to <strong>Routes → Catch-All</strong> and create a new route:
                  </p>
                  <div className="bg-gray-50 p-3 rounded-lg border space-y-2">
                    <div>
                      <span className="text-xs font-semibold">Action:</span>
                      <div className="text-sm">Send to a Worker</div>
                    </div>
                    <div>
                      <span className="text-xs font-semibold">Match pattern:</span>
                      <div className="flex gap-2 items-center">
                        <code className="text-sm bg-white px-2 py-1 rounded border flex-1">{catchAllPattern}</code>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => copyToClipboard(catchAllPattern, 'pattern')}
                        >
                          {copied === 'pattern' ? <CheckCircle className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
                        </Button>
                      </div>
                    </div>
                    <div>
                      <span className="text-xs font-semibold">Destination URL:</span>
                      <div className="flex gap-2 items-center">
                        <code className="text-sm bg-white px-2 py-1 rounded border flex-1 break-all">{webhookUrl}</code>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => copyToClipboard(webhookUrl, 'webhook')}
                        >
                          {copied === 'webhook' ? <CheckCircle className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
                        </Button>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <span className="flex items-center justify-center w-6 h-6 rounded-full bg-green-100 text-green-700 text-sm font-semibold">4</span>
                  <h4 className="font-semibold">Test & Done!</h4>
                </div>
                <p className="text-sm text-muted-foreground ml-8">
                  Send a test email and reply to it. Check your Dashboard to see if the reply is captured.
                </p>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="sendgrid" className="space-y-4 mt-4">
            <Alert>
              <Info className="h-4 w-4" />
              <AlertDescription>
                Free tier: 100 emails/day
              </AlertDescription>
            </Alert>

            <div className="space-y-4">
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <span className="flex items-center justify-center w-6 h-6 rounded-full bg-blue-100 text-blue-700 text-sm font-semibold">1</span>
                  <h4 className="font-semibold">Log in to SendGrid</h4>
                </div>
                <p className="text-sm text-muted-foreground ml-8">
                  Go to <a href="https://app.sendgrid.com/settings/inbound_parse" target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline inline-flex items-center gap-1">
                    SendGrid Inbound Parse <ExternalLink className="h-3 w-3" />
                  </a>
                </p>
              </div>

              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <span className="flex items-center justify-center w-6 h-6 rounded-full bg-blue-100 text-blue-700 text-sm font-semibold">2</span>
                  <h4 className="font-semibold">Add Host & URL</h4>
                </div>
                <div className="ml-8 space-y-2">
                  <div className="bg-gray-50 p-3 rounded-lg border space-y-2">
                    <div>
                      <span className="text-xs font-semibold">Subdomain:</span>
                      <div className="text-sm">replies</div>
                    </div>
                    <div>
                      <span className="text-xs font-semibold">Domain:</span>
                      <div className="text-sm">{domain}</div>
                    </div>
                    <div>
                      <span className="text-xs font-semibold">Destination URL:</span>
                      <div className="flex gap-2 items-center">
                        <code className="text-sm bg-white px-2 py-1 rounded border flex-1 break-all">{webhookUrl}</code>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => copyToClipboard(webhookUrl, 'webhook-sg')}
                        >
                          {copied === 'webhook-sg' ? <CheckCircle className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
                        </Button>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <span className="flex items-center justify-center w-6 h-6 rounded-full bg-blue-100 text-blue-700 text-sm font-semibold">3</span>
                  <h4 className="font-semibold">Update DNS</h4>
                </div>
                <p className="text-sm text-muted-foreground ml-8">
                  Add the MX records provided by SendGrid to your DNS settings
                </p>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="mailgun" className="space-y-4 mt-4">
            <Alert>
              <Info className="h-4 w-4" />
              <AlertDescription>
                Free trial available, then paid plans
              </AlertDescription>
            </Alert>

            <div className="space-y-4">
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <span className="flex items-center justify-center w-6 h-6 rounded-full bg-blue-100 text-blue-700 text-sm font-semibold">1</span>
                  <h4 className="font-semibold">Add Domain to Mailgun</h4>
                </div>
                <p className="text-sm text-muted-foreground ml-8">
                  Go to <a href="https://app.mailgun.com/app/domains" target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline inline-flex items-center gap-1">
                    Mailgun Domains <ExternalLink className="h-3 w-3" />
                  </a> and add {domain}
                </p>
              </div>

              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <span className="flex items-center justify-center w-6 h-6 rounded-full bg-blue-100 text-blue-700 text-sm font-semibold">2</span>
                  <h4 className="font-semibold">Create Route</h4>
                </div>
                <div className="ml-8 space-y-2">
                  <p className="text-sm text-muted-foreground">Go to <strong>Routes</strong> and create:</p>
                  <div className="bg-gray-50 p-3 rounded-lg border space-y-2">
                    <div>
                      <span className="text-xs font-semibold">Expression Type:</span>
                      <div className="text-sm">Match Recipient</div>
                    </div>
                    <div>
                      <span className="text-xs font-semibold">Pattern:</span>
                      <div className="flex gap-2 items-center">
                        <code className="text-sm bg-white px-2 py-1 rounded border flex-1">{catchAllPattern}</code>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => copyToClipboard(catchAllPattern, 'pattern-mg')}
                        >
                          {copied === 'pattern-mg' ? <CheckCircle className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
                        </Button>
                      </div>
                    </div>
                    <div>
                      <span className="text-xs font-semibold">Action:</span>
                      <div className="text-sm">Forward to URL</div>
                    </div>
                    <div>
                      <span className="text-xs font-semibold">URL:</span>
                      <div className="flex gap-2 items-center">
                        <code className="text-sm bg-white px-2 py-1 rounded border flex-1 break-all">{webhookUrl}</code>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => copyToClipboard(webhookUrl, 'webhook-mg')}
                        >
                          {copied === 'webhook-mg' ? <CheckCircle className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
                        </Button>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="zapier" className="space-y-4 mt-4">
            <Alert>
              <Info className="h-4 w-4" />
              <AlertDescription>
                Works with any email provider (Gmail, Outlook, etc.)
              </AlertDescription>
            </Alert>

            <div className="space-y-4">
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <span className="flex items-center justify-center w-6 h-6 rounded-full bg-blue-100 text-blue-700 text-sm font-semibold">1</span>
                  <h4 className="font-semibold">Create New Zap</h4>
                </div>
                <p className="text-sm text-muted-foreground ml-8">
                  Go to <a href="https://zapier.com/app/zaps" target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline inline-flex items-center gap-1">
                    Zapier <ExternalLink className="h-3 w-3" />
                  </a> and click "Create Zap"
                </p>
              </div>

              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <span className="flex items-center justify-center w-6 h-6 rounded-full bg-blue-100 text-blue-700 text-sm font-semibold">2</span>
                  <h4 className="font-semibold">Setup Trigger</h4>
                </div>
                <div className="ml-8 space-y-2">
                  <div className="bg-gray-50 p-3 rounded-lg border space-y-2">
                    <div>
                      <span className="text-xs font-semibold">App:</span>
                      <div className="text-sm">Email Parser / Gmail / Outlook</div>
                    </div>
                    <div>
                      <span className="text-xs font-semibold">Trigger:</span>
                      <div className="text-sm">New Email</div>
                    </div>
                    <div>
                      <span className="text-xs font-semibold">Filter:</span>
                      <div className="text-sm">To contains "replies+"</div>
                    </div>
                  </div>
                </div>
              </div>

              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <span className="flex items-center justify-center w-6 h-6 rounded-full bg-blue-100 text-blue-700 text-sm font-semibold">3</span>
                  <h4 className="font-semibold">Setup Action</h4>
                </div>
                <div className="ml-8 space-y-2">
                  <div className="bg-gray-50 p-3 rounded-lg border space-y-2">
                    <div>
                      <span className="text-xs font-semibold">App:</span>
                      <div className="text-sm">Webhooks by Zapier</div>
                    </div>
                    <div>
                      <span className="text-xs font-semibold">Action:</span>
                      <div className="text-sm">POST</div>
                    </div>
                    <div>
                      <span className="text-xs font-semibold">URL:</span>
                      <div className="flex gap-2 items-center">
                        <code className="text-sm bg-white px-2 py-1 rounded border flex-1 break-all">{webhookUrl}</code>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => copyToClipboard(webhookUrl, 'webhook-zap')}
                        >
                          {copied === 'webhook-zap' ? <CheckCircle className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
                        </Button>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}
