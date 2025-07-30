import { useState } from 'react';
import { Sidebar } from './Sidebar';
import { MainContent } from './MainContent';
import { SystemLogs } from './SystemLogs';
import { supabase } from '@/integrations/supabase/client';

export interface ClaimStep {
  id: string;
  title: string;
  description: string;
  status: 'completed' | 'current' | 'pending' | 'error';
  icon: string;
}

export interface LogEntry {
  id: string;
  timestamp: string;
  message: string;
  type: 'info' | 'success' | 'warning' | 'error';
}

const XFXPortal = () => {
  const [currentStep, setCurrentStep] = useState('start');
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const [resumeUrl, setResumeUrl] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [invoiceResponse, setInvoiceResponse] = useState<any>(null);
  const [hasError, setHasError] = useState(false);
  const [logs, setLogs] = useState<LogEntry[]>([
    {
      id: '1',
      timestamp: new Date().toISOString(),
      message: 'Waiting for XFX workflow to start...',
      type: 'info'
    },
    {
      id: '2',
      timestamp: new Date().toISOString(),
      message: 'XFX portal initialized',
      type: 'success'
    },
    {
      id: '3',
      timestamp: new Date().toISOString(),
      message: 'Ready to process invoices',
      type: 'info'
    }
  ]);

  const getSteps = (): ClaimStep[] => {
    const baseSteps: ClaimStep[] = [
      {
        id: 'start',
        title: 'Start Process',
        description: 'Initiate your XFX process',
        status: 'completed',
        icon: 'play'
      }
    ];

    if (resumeUrl) {
      const getUploadStatus = (): 'completed' | 'current' | 'pending' | 'error' => {
        if (currentStep === 'upload') return 'current';
        if (currentStep === 'products' || currentStep === 'issues' || currentStep === 'resolution') return 'completed';
        return 'pending';
      };

      const getProductsStatus = (): 'completed' | 'current' | 'pending' | 'error' => {
        if (currentStep === 'products') return 'current';
        if (currentStep === 'issues' || currentStep === 'resolution') return 'completed';
        return 'pending';
      };

      const getIssuesStatus = (): 'completed' | 'current' | 'pending' | 'error' => {
        if (hasError) return 'error';
        if (currentStep === 'issues') return 'current';
        if (currentStep === 'resolution') return 'completed';
        return 'pending';
      };

      const getResolutionStatus = (): 'completed' | 'current' | 'pending' | 'error' => {
        if (hasError) return 'error';
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
      
      // Handle the response data - check if it's the expected format
      if (data) {
        console.log('Processing response data:', data);
        
        // Check if it's just a workflow started message
        if (data.message === "Workflow was started") {
          addLog('Workflow started, waiting for XFX API response...', 'info');
          // Stay in current step until we get the actual response
          return;
        }
        
        // If data is an array, take the first element
        const responseData = Array.isArray(data) ? data[0] : data;
        
        if (responseData) {
          setInvoiceResponse(responseData);
          
          // Check if it's the expected XFX API response format
          if (responseData.xfxTrackingId && responseData.invoiceNo) {
            addLog('XFX API response received successfully!', 'success');
            addLog(`XFX Tracking ID: ${responseData.xfxTrackingId}`, 'info');
            addLog(`Invoice Number: ${responseData.invoiceNo}`, 'info');
            if (responseData.externalTrackingId) {
              addLog(`External Tracking ID: ${responseData.externalTrackingId}`, 'info');
            }
            if (responseData.dateReceivedUtc) {
              const receivedDate = new Date(responseData.dateReceivedUtc).toLocaleString();
              addLog(`Date Received: ${receivedDate}`, 'info');
            }
            
            // Wait 3 seconds before advancing to Invoice Processing step
            setTimeout(() => {
              setCurrentStep('issues');
              addLog('Invoice processing step started', 'info');
              
              // Wait 3 seconds then advance to final step
              setTimeout(() => {
                setCurrentStep('resolution');
                addLog('Invoice processing completed', 'success');
              }, 3000);
            }, 3000);
          } else if (responseData.error || responseData.errorMessage) {
            // Handle error response
            setHasError(true);
            setInvoiceResponse(responseData);
            addLog(`Error from XFX API: ${responseData.errorMessage || responseData.error}`, 'error');
            
            // Add internalTrackID and timestamp if available
            if (responseData.internalTrackID) {
              addLog(`Internal Track ID: ${responseData.internalTrackID}`, 'error');
            }
            if (responseData.timestamp) {
              addLog(`Timestamp: ${responseData.timestamp}`, 'error');
            }
            
            // Set steps to error state
            setCurrentStep('issues');
            setTimeout(() => {
              setCurrentStep('resolution');
              addLog('Invoice processing unsuccessful', 'error');
            }, 3000);
          } else {
            addLog('Waiting for XFX API response...', 'info');
          }
        } else {
          addLog('Waiting for XFX API response...', 'info');
        }
      } else {
        addLog('Waiting for XFX API response...', 'info');
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

  const callN8nWebhook = async (): Promise<void> => {
    if (!resumeUrl) {
      addLog('No resume URL available for webhook call', 'error');
      return;
    }

    try {
      setIsProcessing(true);
      addLog('Calling n8n webhook...', 'info');

      const response = await fetch(resumeUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          finalresponse: 'success'
        }),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const responseData = await response.json();
      addLog(`Webhook response received: ${JSON.stringify(responseData)}`, 'success');
      
      // You can handle the webhook response here if needed
      
    } catch (error) {
      console.error('Error calling webhook:', error);
      addLog(`Error calling webhook: ${error.message}`, 'error');
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
              onCallWebhook={callN8nWebhook}
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

export default XFXPortal;