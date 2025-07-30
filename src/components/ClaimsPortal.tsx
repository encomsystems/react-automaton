
import { useState } from 'react';
import { Sidebar } from './Sidebar';
import { MainContent } from './MainContent';
import { SystemLogs } from './SystemLogs';
import { supabase } from '@/integrations/supabase/client';

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
  const [currentStep, setCurrentStep] = useState('start');
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const [resumeUrl, setResumeUrl] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [invoiceResponse, setInvoiceResponse] = useState<any>(null);
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

  const getSteps = (): ClaimStep[] => {
    const baseSteps: ClaimStep[] = [
      {
        id: 'start',
        title: 'Start Process',
        description: 'Initiate your claim',
        status: 'completed',
        icon: 'play'
      }
    ];

    if (resumeUrl) {
      const getUploadStatus = (): 'completed' | 'current' | 'pending' => {
        if (currentStep === 'upload') return 'current';
        if (currentStep === 'products' || currentStep === 'issues' || currentStep === 'resolution') return 'completed';
        return 'pending';
      };

      const getProductsStatus = (): 'completed' | 'current' | 'pending' => {
        if (currentStep === 'products') return 'current';
        if (currentStep === 'issues' || currentStep === 'resolution') return 'completed';
        return 'pending';
      };

      const getIssuesStatus = (): 'completed' | 'current' | 'pending' => {
        if (currentStep === 'issues') return 'current';
        if (currentStep === 'resolution') return 'completed';
        return 'pending';
      };

      const getResolutionStatus = (): 'completed' | 'current' | 'pending' => {
        if (currentStep === 'resolution') return 'current';
        return 'pending';
      };

      const steps: ClaimStep[] = [
        ...baseSteps,
        {
          id: 'upload',
          title: 'Upload Invoice',
          description: 'Provide xml file',
          status: getUploadStatus(),
          icon: 'upload'
        },
        {
          id: 'products',
          title: 'Sending invoice',
          description: 'Accessing XFX API',
          status: getProductsStatus(),
          icon: 'package'
        },
        {
          id: 'issues',
          title: 'Invoice Processing',
          description: 'Waiting for receiving confirmation',
          status: getIssuesStatus(),
          icon: 'message-square'
        },
        {
          id: 'resolution',
          title: 'Invoice Processed',
          description: 'Status of invoice',
          status: getResolutionStatus(),
          icon: 'check-circle'
        }
      ];
      return steps;
    }

    return baseSteps;
  };

  const addLog = (message: string, type: LogEntry['type'] = 'info') => {
    const newLog: LogEntry = {
      id: Date.now().toString(),
      timestamp: new Date().toISOString(),
      message,
      type
    };
    setLogs(prev => [...prev, newLog]);
  };

  const triggerN8nWorkflow = async () => {
    setIsProcessing(true);
    const webhookUrl = 'https://modest-stable-terrapin.ngrok-free.app/webhook-test/invoice-postman';
    addLog(`Triggering n8n workflow at: ${webhookUrl}`, 'info');

    try {
      console.log('Calling Supabase edge function: trigger-n8n-workflow');
      
      // Call n8n webhook through Supabase Edge Function
      const { data, error } = await supabase.functions.invoke('trigger-n8n-workflow', {
        body: { webhookUrl }
      });

      if (error) {
        console.error('Supabase function error:', error);
        throw new Error(`Supabase function error: ${error.message}`);
      }
      
      if (data.resumeUrl) {
        setResumeUrl(data.resumeUrl);
        addLog('Workflow triggered successfully', 'success');
        addLog(`Resume URL received: ${data.resumeUrl}`, 'info');
        setCurrentStep('upload');
      } else {
        throw new Error('No resumeUrl received from n8n');
      }
    } catch (error) {
      addLog(`Error triggering workflow: ${error.message}`, 'error');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleFileUpload = (file: File | null) => {
    setUploadedFile(file);
    if (file) {
      addLog(`File uploaded: ${file.name}`, 'success');
    } else {
      addLog('File removed', 'info');
    }
  };

  const handleProcessInvoice = async () => {
    if (!uploadedFile || !resumeUrl) return;
    
    setIsProcessing(true);
    addLog('Processing invoice...', 'info');
    setCurrentStep('products');
    
    try {
      const formData = new FormData();
      formData.append('file', uploadedFile);
      formData.append('resumeUrl', resumeUrl);
      
      addLog(`Sending file to n8n workflow: ${resumeUrl}`, 'info');
      console.log('About to call Supabase edge function: upload-to-n8n');
      console.log('File details:', { name: uploadedFile.name, size: uploadedFile.size, type: uploadedFile.type });
      
      const { data, error } = await supabase.functions.invoke('upload-to-n8n', {
        body: formData,
      });

      if (error) {
        console.error('Supabase function error:', error);
        throw new Error(`Supabase function error: ${error.message}`);
      }

      console.log('Response data:', data);
      addLog('Invoice sent successfully to n8n', 'success');
      addLog('Accessing XFX API...', 'info');
      setCurrentStep('issues');
      
      // Handle the response data - check if it's the expected format
      if (data) {
        console.log('Processing response data:', data);
        
        // If data is an array, take the first element
        const responseData = Array.isArray(data) ? data[0] : data;
        
        if (responseData) {
          setInvoiceResponse(responseData);
          
          if (responseData.error) {
            addLog(`Error from XFX API: ${responseData.errorMessage}`, 'error');
          } else if (responseData.xfxTrackingId || responseData.invoiceNo) {
            addLog(`Invoice processed successfully. Tracking ID: ${responseData.xfxTrackingId || responseData.invoiceNo}`, 'success');
            setCurrentStep('resolution');
          } else {
            addLog('Invoice sent to XFX API, waiting for response...', 'info');
          }
        } else {
          addLog('Invoice sent successfully, no response data received yet', 'info');
        }
      } else {
        addLog('Invoice sent successfully, waiting for processing...', 'info');
      }
      
    } catch (error) {
      console.error('Full error details:', error);
      console.log('Error name:', error.name);
      console.log('Error message:', error.message);
      
      if (error.name === 'TypeError' && error.message.includes('Failed to fetch')) {
        addLog('Network error: Unable to connect to n8n workflow. Please check if the ngrok tunnel is running.', 'error');
      } else {
        addLog(`Error sending invoice: ${error.message}`, 'error');
      }
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-100">
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
              steps={getSteps()} 
              currentStep={currentStep}
              onStepClick={setCurrentStep}
            />
          </div>

          {/* Main Content */}
          <div className="lg:col-span-3 space-y-8">
            <MainContent 
              currentStep={currentStep}
              uploadedFile={uploadedFile}
              onFileUpload={handleFileUpload}
              onStepComplete={handleProcessInvoice}
              onTriggerWorkflow={triggerN8nWorkflow}
              isProcessing={isProcessing}
              resumeUrl={resumeUrl}
              invoiceResponse={invoiceResponse}
            />
            
            {/* System Logs */}
            <SystemLogs logs={logs} />
          </div>
        </div>
      </div>
    </div>
  );
};

export default ClaimsPortal;
