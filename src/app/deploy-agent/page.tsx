
import type { Metadata } from 'next';
import { AppHeader } from '@/components/dashboard/app-header';
import { AgentCustomizationForm } from '@/components/agent-deployment/agent-customization-form';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { ShieldCheck, Settings } from 'lucide-react';

export const metadata: Metadata = {
  title: 'Deploy Agent - LogLens',
  description: 'Customize and deploy a monitoring agent configuration.',
};

export default function DeployAgentPage() {
  return (
    <div className="flex flex-col min-h-screen bg-background">
      <AppHeader />
      <main className="flex-grow container mx-auto p-4 md:p-8">
        <Card className="max-w-3xl mx-auto shadow-lg">
          <CardHeader>
            <CardTitle className="flex items-center text-2xl">
              <Settings className="mr-3 h-7 w-7 text-primary" />
              Customize Monitoring Agent
            </CardTitle>
            <CardDescription>
              Configure the parameters for your monitoring agent. Once configured, you can download the agent's configuration file.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <AgentCustomizationForm />
          </CardContent>
        </Card>
      </main>
      <footer className="py-4 text-center text-sm text-muted-foreground border-t">
        LogLens &copy; {new Date().getFullYear()}
      </footer>
    </div>
  );
}
