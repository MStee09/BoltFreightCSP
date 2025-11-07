import { Alert, AlertDescription } from '@/components/ui/alert';
import { AlertCircle, Info } from 'lucide-react';

export default function EmailSetupGuide() {
  return (
    <div className="space-y-4">
      <Alert className="bg-blue-50 border-blue-200">
        <Info className="h-4 w-4 text-blue-600" />
        <AlertDescription className="text-sm">
          <div className="space-y-2">
            <p className="font-semibold text-blue-900">Gmail Integration Setup</p>
            <p className="text-blue-800">
              Admins can configure OAuth credentials above. Once configured, all users can connect their Gmail accounts with a single click below.
            </p>
          </div>
        </AlertDescription>
      </Alert>

      <Alert className="border-slate-200 bg-slate-50">
        <AlertCircle className="h-4 w-4 text-slate-600" />
        <AlertDescription className="text-xs">
          <span className="font-semibold text-slate-900">How it works:</span> The admin sets up OAuth credentials once in the section above. After that, any user in your organization can securely connect their Gmail account - no technical configuration needed!
        </AlertDescription>
      </Alert>
    </div>
  );
}
