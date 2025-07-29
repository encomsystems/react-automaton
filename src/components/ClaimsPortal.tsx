import { useState } from 'react';
import { Sidebar } from './Sidebar';
import { MainContent } from './MainContent';
import { SystemLogs } from './SystemLogs';

export interface ClaimStep {
  id: string;
  title: string;
  description: string;
  status: 'completed' | 'current' | 'pending';
  icon: string;
}

export interface LogEntry {
  id: string;
  timestamp: string;
  message: string;
  type: 'info' | 'success' | 'warning' | 'error';
}

const ClaimsPortal = () => {
  const [currentStep, setCurrentStep] = useState('upload');
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const [logs, setLogs] = useState<LogEntry[]>([
    {
      id: '1',
      timestamp: new Date().toISOString(),
      message: 'Waiting for workflow to start...',
      type: 'info'
    },
    {
      id: '2',
      timestamp: new Date().toISOString(),
      message: 'Claims portal initialized',
      type: 'success'
    },
    {
      id: '3',
      timestamp: new Date().toISOString(),
      message: 'Ready to process claims',
      type: 'info'
    }
  ]);

  const steps: ClaimStep[] = [
    {
      id: 'start',
      title: 'Start Process',
      description: 'Initiate your claim',
      status: 'completed',
      icon: 'play'
    },
    {
      id: 'upload',
      title: 'Upload Invoice',
      description: 'Provide proof of purchase',
      status: 'current',
      icon: 'upload'
    },
    {
      id: 'products',
      title: 'Select Products',
      description: 'Choose affected items',
      status: 'pending',
      icon: 'package'
    },
    {
      id: 'issues',
      title: 'Describe Issues',
      description: "Tell us what's wrong",
      status: 'pending',
      icon: 'message-square'
    },
    {
      id: 'resolution',
      title: 'Resolution',
      description: 'Get your solution',
      status: 'pending',
      icon: 'check-circle'
    }
  ];

  const addLog = (message: string, type: LogEntry['type'] = 'info') => {
    const newLog: LogEntry = {
      id: Date.now().toString(),
      timestamp: new Date().toISOString(),
      message,
      type
    };
    setLogs(prev => [...prev, newLog]);
  };

  const handleFileUpload = (file: File) => {
    setUploadedFile(file);
    addLog(`File uploaded: ${file.name}`, 'success');
    
    // Simulate workflow progression
    setTimeout(() => {
      addLog('Processing invoice...', 'info');
      setCurrentStep('products');
    }, 1000);
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b bg-card shadow-soft">
        <div className="mx-auto max-w-7xl px-6 py-4">
          <div className="text-center">
            <h1 className="text-2xl font-bold tracking-tight text-foreground">
              XFX - Invoice System
            </h1>
            <p className="mt-1 text-sm text-muted-foreground">
              Process invoices quickly and efficiently
            </p>
          </div>
        </div>
      </header>

      {/* Main Layout */}
      <div className="mx-auto max-w-7xl px-6 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
          {/* Sidebar */}
          <div className="lg:col-span-1">
            <Sidebar 
              steps={steps} 
              currentStep={currentStep}
              onStepClick={setCurrentStep}
            />
          </div>

          {/* Main Content */}
          <div className="lg:col-span-3">
            <MainContent 
              currentStep={currentStep}
              uploadedFile={uploadedFile}
              onFileUpload={handleFileUpload}
              onStepComplete={() => {}}
            />
          </div>
        </div>

        {/* System Logs */}
        <div className="mt-8">
          <SystemLogs logs={logs} />
        </div>
      </div>
    </div>
  );
};

export default ClaimsPortal;