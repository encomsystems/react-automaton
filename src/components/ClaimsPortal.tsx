
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
    const baseSteps = [
      {
        id: 'start',
        title: 'Start Process',
        description: 'Initiate your claim',
        status: 'current' as const,
        icon: 'play'
      }
    ];

    if (resumeUrl) {
      return [
        {
          ...baseSteps[0],
          status: 'completed' as const
        },
        {
          id: 'upload',
          title: 'Upload Invoice',
          description: 'Provide xml file',
          status: 'current' as const,
          icon: 'upload'
        },
        {
          id: 'products',
          title: 'Sending invoice',
          description: 'Accessing XFX API',
          status: 'pending' as const,
          icon: 'package'
        },
        {
          id: 'issues',
          title: 'Invoice Processing',
          description: 'Waiting for receiving confirmation',
          status: 'pending' as const,
          icon: 'message-square'
        },
        {
          id: 'resolution',
          title: 'Invoice Processed',
          description: 'Status of invoice',
          status: 'pending' as const,
          icon: 'check-circle'
        }
      ];
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
      // Use CORS proxy to avoid CORS issues
      const proxyUrl = 'https://cors-anywhere.herokuapp.com/';
      const response = await fetch(proxyUrl + webhookUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Requested-With': 'XMLHttpRequest'
        },
        body: JSON.stringify({
          action: 'start_process',
          timestamp: new Date().toISOString()
        }),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      
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
      formData.append('action', 'process_invoice');
      
      addLog(`Sending file to n8n workflow: ${resumeUrl}`, 'info');
      console.log('About to send FormData to:', resumeUrl);
      console.log('File details:', { name: uploadedFile.name, size: uploadedFile.size, type: uploadedFile.type });
      
      // Use CORS proxy for the resume URL as well
      const proxyUrl = 'https://cors-anywhere.herokuapp.com/';
      addLog('Using CORS proxy to send file', 'info');
      
      const response = await fetch(proxyUrl + resumeUrl, {
        method: 'POST',
        headers: {
          'X-Requested-With': 'XMLHttpRequest'
          // Don't set Content-Type for FormData - let browser set it with boundary
        },
        body: formData,
      });

      console.log('Response received:', { status: response.status, ok: response.ok });

      if (!response.ok) {
        const errorText = await response.text();
        console.log('Error response text:', errorText);
        throw new Error(`HTTP error! status: ${response.status} - ${errorText}`);
      }

      const data = await response.json();
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
      console.log('Resume URL that failed:', resumeUrl);
      
      if (error.name === 'TypeError' && error.message.includes('Failed to fetch')) {
        addLog(`Network error: Unable to connect to webhook-waiting endpoint: ${resumeUrl}`, 'error');
        addLog('This usually means the n8n workflow webhook-waiting node is not properly configured', 'error');
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
