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
    const webhookUrl = 'http://localhost:5678/webhook-test/invoice-postman';
    addLog(`Triggering n8n workflow at: ${webhookUrl}`, 'info');

    try {
      console.log('Calling n8n workflow directly');
      addLog('Attempting to connect to n8n directly on port 5678...', 'info');
      
      // Add more detailed debugging
      console.log('Fetch URL:', webhookUrl);
      console.log('Fetch options:', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ action: 'start' })
      });
      
      // Call n8n webhook through nginx proxy with more explicit options
      const response = await fetch(webhookUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ action: 'start' }),
        mode: 'cors',
        credentials: 'omit'
      });

      if (!response.ok) {
        addLog(`HTTP error response: ${response.status} ${response.statusText}`, 'error');
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const data = await response.json();
      addLog('Successfully received response from n8n', 'success');
      addLog(`Response data: ${JSON.stringify(data, null, 2)}`, 'info');
      
      // Handle different response formats from n8n
      let resumeUrlValue = null;
      
      if (Array.isArray(data) && data.length > 0) {
        // If response is an array, look for resumeUrl in the first element or webhookUrl
        const firstItem = data[0];
        resumeUrlValue = firstItem.resumeUrl || firstItem.webhookUrl;
      } else if (data.resumeUrl) {
        resumeUrlValue = data.resumeUrl;
      } else if (data.webhookUrl) {
        resumeUrlValue = data.webhookUrl;
      }
      
      if (resumeUrlValue) {
        // Use the direct n8n URL
        setResumeUrl(resumeUrlValue);
        addLog('Workflow triggered successfully', 'success');
        addLog(`Resume URL received: ${resumeUrlValue}`, 'info');
        setCurrentStep('upload');
      } else {
        addLog('No resumeUrl or webhookUrl found in response', 'warning');
        addLog('Using default webhook URL for file upload', 'info');
        // Fallback to the original webhook URL
        setResumeUrl(webhookUrl);
        setCurrentStep('upload');
      }
    } catch (error) {
      console.error('Full error details:', error);
      
      if (error.name === 'TypeError' && error.message.includes('Failed to fetch')) {
        addLog('CORS/Network error detected. Trying simple connection test...', 'error');
        
        // Try a simple GET request to test connectivity
        addLog('Network error: Cannot connect to n8n on localhost:5678', 'error');
        addLog('Please check:', 'error');
        addLog('1. Is n8n running on port 5678?', 'error');
        addLog('2. Does n8n have CORS enabled for http://localhost:8081?', 'error');
        addLog('3. Is the webhook URL correct in n8n workflow?', 'error');
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
    addLog('DEBUG: handleProcessInvoice function called', 'info');
    addLog(`DEBUG: uploadedFile exists: ${!!uploadedFile}`, 'info');
    addLog(`DEBUG: resumeUrl exists: ${!!resumeUrl}`, 'info');
    
    if (!uploadedFile || !resumeUrl) {
      addLog('ERROR: Missing file or resume URL - stopping process', 'error');
      return;
    }
    
    addLog('DEBUG: Starting invoice processing...', 'info');
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
      
      // Call n8n directly
      console.log('About to fetch:', resumeUrl);
      console.log('FormData contents:', { fileName: uploadedFile.name, fileSize: uploadedFile.size });
      
      const response = await fetch(resumeUrl, {
        method: 'POST',
        body: formData,
      });

      console.log('Response status:', response.status);
      console.log('Response headers:', Object.fromEntries(response.headers.entries()));
      console.log('Response ok:', response.ok);

      if (!response.ok) {
        addLog(`HTTP error! status: ${response.status} ${response.statusText}`, 'error');
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const responseText = await response.text();
      console.log('Raw response text:', responseText);
      
      let data;
      try {
        data = JSON.parse(responseText);
      } catch (parseError) {
        console.log('JSON parse error:', parseError);
        addLog(`Response is not valid JSON: ${responseText}`, 'error');
        throw new Error('Invalid JSON response from n8n');
      }

      console.log('Response data:', data);
      addLog('Invoice sent successfully to n8n', 'success');
      
      // Handle the response data and always progress through steps
      if (data) {
        console.log('Processing response data:', data);
        
        // If data is an array, take the first element
        const responseData = Array.isArray(data) ? data[0] : data;
        
        if (responseData) {
          setInvoiceResponse(responseData);
          addLog('Response received from workflow', 'success');
          
          // Log any relevant information from the response
          if (responseData.id) {
            addLog(`XFX Tracking ID: ${responseData.id}`, 'info');
          }
          if (responseData.number) {
            addLog(`Invoice Number: ${responseData.number}`, 'info');
          }
          if (responseData.externalTrackingId) {
            addLog(`External Tracking ID: ${responseData.externalTrackingId}`, 'info');
          }
          if (responseData.dateReceivedUtc) {
            const receivedDate = new Date(responseData.dateReceivedUtc).toLocaleString();
            addLog(`Date Received: ${receivedDate}`, 'info');
          }
          if (responseData.message) {
            addLog(`Workflow message: ${responseData.message}`, 'info');
          }
          
          // Check for errors
          if (responseData.error || responseData.errorMessage) {
            setHasError(true);
            addLog(`Error: ${responseData.errorMessage || responseData.error}`, 'error');
            if (responseData.internalTrackID) {
              addLog(`Internal Track ID: ${responseData.internalTrackID}`, 'error');
            }
          }
        }
      }
      
      // Always progress through steps with 5-second delays
      addLog('Invoice sent successfully, proceeding to next steps...', 'success');
      setTimeout(() => {
        setCurrentStep('issues');
        addLog('Invoice processing step started', 'info');
        
        setTimeout(() => {
          setCurrentStep('resolution');
          addLog('Invoice processing step completed', 'success');
        }, 5000);
      }, 5000);
      
    } catch (error) {
      console.error('Full error details:', error);
      console.log('Error name:', error.name);
      console.log('Error message:', error.message);
      
      if (error.name === 'TypeError' && error.message.includes('Failed to fetch')) {
        addLog('Network error: Unable to connect to n8n workflow. Please check if n8n is still running on localhost:5678.', 'error');
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
      addLog('Calling n8n webhook directly...', 'info');

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

  // Second polling mechanism - check for ksefSubmissionStatus when we have resumeUrlStage2
  useEffect(() => {
    if (finalResponse && finalResponse.resumeUrlStage2 && finalResponse.status === 'InvoiceAcceptedbyAPI') {
      addLog('Starting second stage polling for ksefSubmissionStatus...', 'info');
      
      const pollForKsefStatus = async () => {
        try {
          const response = await fetch(finalResponse.resumeUrlStage2, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({ action: 'checkStatus' })
          });
          
          if (response.ok) {
            const data = await response.json();
            addLog(`Second stage poll response: ${JSON.stringify(data)}`, 'info');
            
            // Check for ksefSubmissionStatus
            if (data.ksefSubmissionStatus) {
              addLog(`ksefSubmissionStatus: ${data.ksefSubmissionStatus}`, 'info');
              setFinalResponse(prev => ({ ...prev, ...data }));
            }
          }
        } catch (error) {
          addLog(`Second stage poll error: ${error.message}`, 'warning');
        }
      };

      const interval = setInterval(() => {
        addLog('Checking ksefSubmissionStatus...', 'info');
        pollForKsefStatus();
      }, 5000);

      // Cleanup interval when component unmounts or finalResponse changes
      return () => {
        clearInterval(interval);
        addLog('Second stage polling stopped', 'info');
      };
    }
  }, [finalResponse]);

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