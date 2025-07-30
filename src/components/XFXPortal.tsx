import { useState, useEffect } from 'react';
import { Sidebar } from './Sidebar';
import { MainContent } from './MainContent';
import { SystemLogs } from './SystemLogs';

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
  const [finalResponse, setFinalResponse] = useState<any>(null);
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
        // Check if we're at resolution step AND have a successful invoice response
        if (currentStep === 'resolution' && invoiceResponse && invoiceResponse.xfxTrackingId && invoiceResponse.invoiceNo) {
          return 'completed';
        }
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
    const webhookUrl = 'http://localhost:8080/webhook-test/invoice-postman';
    addLog(`Triggering n8n workflow at: ${webhookUrl}`, 'info');

    try {
      console.log('Calling n8n workflow via nginx proxy');
      addLog('Attempting to connect to nginx proxy on port 8080...', 'info');
      
      // Call n8n webhook through nginx proxy
      const response = await fetch(webhookUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ action: 'start' })
      });

      if (!response.ok) {
        addLog(`HTTP error response: ${response.status} ${response.statusText}`, 'error');
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const data = await response.json();
      addLog('Successfully received response from nginx proxy', 'success');
      
      if (data.resumeUrl) {
        // Convert the resumeUrl to use nginx proxy instead of direct n8n connection
        const proxiedResumeUrl = data.resumeUrl.replace('http://localhost:5678', 'http://localhost:8080');
        setResumeUrl(proxiedResumeUrl);
        addLog('Workflow triggered successfully', 'success');
        addLog(`Resume URL received: ${proxiedResumeUrl}`, 'info');
        setCurrentStep('upload');
      } else {
        throw new Error('No resumeUrl received from n8n');
      }
    } catch (error) {
      console.error('Full error details:', error);
      
      if (error.name === 'TypeError' && error.message.includes('Failed to fetch')) {
        addLog('Network error: Cannot connect to nginx proxy on localhost:8080', 'error');
        addLog('Please check:', 'error');
        addLog('1. Is nginx running on port 8080?', 'error');
        addLog('2. Is n8n running on port 5678?', 'error');
        addLog('3. Are you running this app locally (not on Lovable preview)?', 'error');
      } else {
        addLog(`Error triggering workflow: ${error.message}`, 'error');
      }
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
      console.log('About to call n8n via nginx proxy');
      console.log('File details:', { name: uploadedFile.name, size: uploadedFile.size, type: uploadedFile.type });
      
      // Call n8n directly through nginx proxy
      const response = await fetch(resumeUrl, {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const data = await response.json();

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
      addLog('Calling n8n webhook via nginx proxy...', 'info');

      const response = await fetch(resumeUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ action: 'complete' })
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const data = await response.json();

      addLog('Final webhook completed successfully', 'success');
      
      // Store the final response data
      setFinalResponse(data);
      
      // Move to next step if successful
      setCurrentStep('resolution');
      
    } catch (error) {
      console.error('Error calling webhook:', error);
      addLog(`Error calling webhook: ${error.message}`, 'error');
    } finally {
      setIsProcessing(false);
    }
  };

  // Auto-call webhook after 2 seconds when invoice response is received (only if no errors)
  useEffect(() => {
    if (invoiceResponse) {
      // Check if the response has errors
      const hasErrors = Array.isArray(invoiceResponse) 
        ? invoiceResponse.some(item => item.error === true)
        : invoiceResponse.error === true;

      if (hasErrors) {
        addLog('Invoice processing failed - stopping workflow due to errors', 'error');
        setCurrentStep('issues');
        return;
      }

      // Only proceed with webhook call if no errors
      const timer = setTimeout(() => {
        callN8nWebhook();
      }, 2000);

      return () => clearTimeout(timer);
    }
  }, [invoiceResponse]);

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
              finalResponse={finalResponse}
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