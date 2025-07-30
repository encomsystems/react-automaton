
import { useState, useRef, useEffect } from 'react';
import { Upload, File, X, Play } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import QRCode from 'qrcode';

interface MainContentProps {
  currentStep: string;
  uploadedFile: File | null;
  onFileUpload: (file: File) => void;
  onStepComplete: () => void;
  onTriggerWorkflow?: () => Promise<void>;
  onCallWebhook?: () => Promise<void>;
  isProcessing?: boolean;
  resumeUrl?: string | null;
  invoiceResponse?: any;
  finalResponse?: any;
}

export const MainContent = ({ 
  currentStep, 
  uploadedFile, 
  onFileUpload,
  onStepComplete,
  onTriggerWorkflow,
  onCallWebhook,
  isProcessing = false,
  resumeUrl,
  invoiceResponse,
  finalResponse
}: MainContentProps) => {
  const [isDragOver, setIsDragOver] = useState(false);
  const [qrCodeUrl, setQrCodeUrl] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    
    const files = e.dataTransfer.files;
    if (files.length > 0) {
      const file = files[0];
      if (file.type === 'text/xml' || file.type === 'application/xml' || file.name.endsWith('.xml')) {
        onFileUpload(file);
      }
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      onFileUpload(files[0]);
    }
  };

  const openFileDialog = () => {
    fileInputRef.current?.click();
  };

  const removeFile = () => {
    // Create a dummy file object to clear the upload
    const emptyEvent = { target: { files: null } } as any;
    const fileInput = fileInputRef.current;
    if (fileInput) {
      fileInput.value = '';
    }
    onFileUpload(null as any);
  };

  const renderStartStep = () => (
    <div className="space-y-6 animate-fade-in">
      <div className="text-center">
        <h2 className="text-2xl font-bold text-foreground mb-2">Start Process</h2>
        <p className="text-muted-foreground">
          Click to initiate the n8n workflow and get your resume URL
        </p>
      </div>

      <div className="bg-card rounded-lg p-8 shadow-medium border text-center">
        <div className="space-y-6">
          <div className="mx-auto h-16 w-16 rounded-full bg-primary/10 flex items-center justify-center">
            <Play className="h-8 w-8 text-primary" />
          </div>
          
          <div>
            <h3 className="text-lg font-semibold text-foreground mb-2">
              Initialize Workflow
            </h3>
            <p className="text-sm text-muted-foreground mb-6">
              Start the invoice processing workflow by connecting to the n8n automation system
            </p>
          </div>

          <Button 
            onClick={onTriggerWorkflow}
            disabled={isProcessing}
            className="bg-gradient-primary hover:scale-105 transition-transform"
            size="lg"
          >
            {isProcessing ? 'Starting Workflow...' : 'Start Process'}
          </Button>
        </div>
      </div>

      {/* Resume URL Display */}
      {resumeUrl && (
        <div className="bg-card rounded-lg p-6 shadow-medium border">
          <div className="space-y-2">
            <h3 className="text-lg font-semibold text-success">
              Workflow Started Successfully
            </h3>
            <p className="text-sm text-muted-foreground">
              Resume URL received:
            </p>
            <div className="bg-muted p-3 rounded-md">
              <code className="text-xs text-foreground break-all">
                {resumeUrl}
              </code>
            </div>
          </div>
        </div>
      )}
    </div>
  );

  const renderUploadStep = () => (
    <div className="space-y-6 animate-fade-in">
      <div className="text-center">
        <h2 className="text-2xl font-bold text-foreground mb-2">Upload Your Invoice</h2>
        <p className="text-muted-foreground">
          Select your XML invoice file to continue processing
        </p>
      </div>

      <div className="bg-card rounded-lg p-8 shadow-medium border">
        <div
          className={cn(
            "relative border-2 border-dashed rounded-lg p-12 text-center transition-all duration-300",
            isDragOver && "border-primary bg-primary/5 scale-105",
            !isDragOver && "border-border hover:border-primary/50 hover:bg-muted/30"
          )}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
        >
          <input
            ref={fileInputRef}
            type="file"
            accept=".xml"
            onChange={handleFileSelect}
            className="hidden"
          />
          
          {uploadedFile ? (
            <div className="space-y-4">
              <div className="flex items-center justify-center p-4 bg-success/10 rounded-lg border border-success/20">
                <File className="h-8 w-8 text-success mr-3" />
                <div className="text-left">
                  <p className="font-medium text-success">{uploadedFile.name}</p>
                  <p className="text-sm text-muted-foreground">
                    {(uploadedFile.size / 1024 / 1024).toFixed(2)} MB
                  </p>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={removeFile}
                  className="ml-4 text-muted-foreground hover:text-destructive"
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="mx-auto h-16 w-16 rounded-full bg-primary/10 flex items-center justify-center">
                <Upload className="h-8 w-8 text-primary" />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-foreground mb-2">
                  Drag & drop your invoice here
                </h3>
                <p className="text-sm text-muted-foreground mb-4">
                  Supports XML files
                </p>
              </div>
              <Button 
                onClick={openFileDialog}
                className="bg-gradient-primary hover:scale-105 transition-transform"
              >
                Choose File
              </Button>
            </div>
          )}
        </div>

        {uploadedFile && (
          <div className="mt-6 flex justify-end">
          <Button 
            onClick={onStepComplete}
            disabled={isProcessing}
            className="bg-gradient-primary hover:scale-105 transition-transform"
          >
            {isProcessing ? 'Sending to n8n...' : 'Upload Invoice'}
          </Button>
          </div>
        )}
      </div>
    </div>
  );

  const renderProductsStep = () => (
    <div className="space-y-6 animate-fade-in">
      <div className="text-center">
        <h2 className="text-2xl font-bold text-foreground mb-2">Sending invoice</h2>
        <p className="text-muted-foreground">
          Accessing XFX API
        </p>
      </div>

      <div className="bg-card rounded-lg p-8 shadow-medium border">
        <div className="text-center space-y-6">
          <div className="mx-auto h-16 w-16 rounded-full bg-primary/10 flex items-center justify-center">
            <Upload className="h-8 w-8 text-primary animate-pulse" />
          </div>
          <h3 className="text-lg font-semibold text-foreground">
            Processing Invoice
          </h3>
          <p className="text-sm text-muted-foreground max-w-md mx-auto">
            Your invoice is being sent to the XFX API. Please wait for the response...
          </p>

          {/* File Information */}
          {uploadedFile && (
            <div className="bg-muted/50 rounded-lg p-4 text-left max-w-md mx-auto">
              <h4 className="text-sm font-medium text-foreground mb-2">File Information</h4>
              <div className="space-y-1">
                <p className="text-xs text-muted-foreground">
                  <span className="font-medium">Filename:</span> {uploadedFile.name}
                </p>
                <p className="text-xs text-muted-foreground">
                  <span className="font-medium">Size:</span> {(uploadedFile.size / 1024 / 1024).toFixed(2)} MB
                </p>
              </div>
            </div>
          )}

          {/* Response Information */}
          {invoiceResponse && (
            <div className="bg-muted/50 rounded-lg p-4 text-left max-w-md mx-auto">
              <h4 className="text-sm font-medium text-foreground mb-2">Response Information</h4>
              <div className="space-y-1">
                {invoiceResponse.error ? (
                  <p className="text-xs text-destructive">
                    <span className="font-medium">Status:</span> Error - {invoiceResponse.errorMessage || invoiceResponse.error}
                  </p>
                ) : (
                  <>
                    <p className="text-xs text-success">
                      <span className="font-medium">Status:</span> Success
                    </p>
                    {invoiceResponse.externalTrackingId && (
                      <p className="text-xs text-muted-foreground">
                        <span className="font-medium">External ID:</span> {invoiceResponse.externalTrackingId}
                      </p>
                    )}
                    {invoiceResponse.xfxTrackingId && (
                      <p className="text-xs text-muted-foreground">
                        <span className="font-medium">XFX ID:</span> {invoiceResponse.xfxTrackingId}
                      </p>
                    )}
                  </>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );

  const renderIssuesStep = () => (
    <div className="space-y-6 animate-fade-in">
      <div className="text-center">
        <h2 className="text-2xl font-bold text-foreground mb-2">Invoice Processing</h2>
        <p className="text-muted-foreground">
          Waiting for receiving confirmation
        </p>
      </div>

      <div className="bg-card rounded-lg p-8 shadow-medium border">
        {invoiceResponse ? (
          <div className="space-y-4">
            {invoiceResponse.error ? (
              <div className="bg-destructive/10 border border-destructive/20 rounded-lg p-6">
                <h3 className="text-lg font-semibold text-destructive mb-4">Error Processing Invoice</h3>
                <div className="space-y-2">
                  <p className="text-sm"><strong>Status:</strong> {invoiceResponse.status}</p>
                  <p className="text-sm"><strong>Error Code:</strong> {invoiceResponse.errorCode}</p>
                  <p className="text-sm"><strong>Message:</strong> {invoiceResponse.errorMessage}</p>
                  <p className="text-sm"><strong>Timestamp:</strong> {new Date(invoiceResponse.timestamp).toLocaleString()}</p>
                  {invoiceResponse.long_description && (
                    <details className="mt-4">
                      <summary className="cursor-pointer text-sm font-medium">Technical Details</summary>
                      <pre className="mt-2 text-xs bg-muted p-2 rounded overflow-auto max-h-32">
                        {invoiceResponse.long_description}
                      </pre>
                    </details>
                  )}
                </div>
              </div>
            ) : (
              <div className="bg-success/10 border border-success/20 rounded-lg p-6">
                <h3 className="text-lg font-semibold text-success mb-4">Invoice Processed Successfully</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm font-medium text-foreground">Date Received</p>
                    <p className="text-sm text-muted-foreground">{new Date(invoiceResponse.dateReceivedUtc).toLocaleString()}</p>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-foreground">Invoice Number</p>
                    <p className="text-sm text-muted-foreground">{invoiceResponse.invoiceNo}</p>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-foreground">External Tracking ID</p>
                    <p className="text-sm text-muted-foreground">{invoiceResponse.externalTrackingId}</p>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-foreground">XFX Tracking ID</p>
                    <p className="text-sm text-muted-foreground">{invoiceResponse.xfxTrackingId}</p>
                  </div>
                </div>
              </div>
            )}
          </div>
        ) : (
          <div className="text-center space-y-4">
            <div className="mx-auto h-16 w-16 rounded-full bg-primary/10 flex items-center justify-center">
              <Upload className="h-8 w-8 text-primary animate-spin" />
            </div>
            <h3 className="text-lg font-semibold text-foreground">
              Waiting for Response
            </h3>
            <p className="text-sm text-muted-foreground max-w-md mx-auto">
              Processing your invoice through the XFX API. This may take a few moments...
            </p>
          </div>
        )}
      </div>
    </div>
  );

  const renderResolutionStep = () => (
    <div className="space-y-6 animate-fade-in">
      <div className="text-center">
        <h2 className="text-2xl font-bold text-foreground mb-2">Invoice Processed</h2>
        <p className="text-muted-foreground">
          Final status of invoice processing
        </p>
      </div>

      <div className="bg-card rounded-lg p-8 shadow-medium border">
        {finalResponse && Array.isArray(finalResponse) && finalResponse.length > 0 ? (
          <div className="space-y-6">
            {finalResponse.map((response: any, index: number) => (
              <div key={index} className="space-y-4">
                {/* Status Header */}
                <div className="text-center space-y-4">
                  <div className="mx-auto h-16 w-16 rounded-full bg-success/10 flex items-center justify-center">
                    <Upload className="h-8 w-8 text-success" />
                  </div>
                  <h3 className="text-lg font-semibold text-success">
                    Invoice Successfully Submitted
                  </h3>
                  <div className="inline-flex items-center px-3 py-1 rounded-full bg-success/10 text-success text-sm font-medium">
                    Status: {response.ksefSubmissionStatus || 'SUBMITTED'}
                  </div>
                </div>

                {/* Main Information Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-6">
                  <div className="space-y-4">
                    <div>
                      <p className="text-sm font-medium text-foreground">KSEF Number</p>
                      <p className="text-sm text-muted-foreground font-mono">{response.ksefNumber}</p>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-foreground">Invoice Number</p>
                      <p className="text-sm text-muted-foreground">{response.number}</p>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-foreground">Total Amount</p>
                      <p className="text-sm text-muted-foreground">{response.totalAmount} {response.currencyCode}</p>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-foreground">Issue Date</p>
                      <p className="text-sm text-muted-foreground">{new Date(response.issueDate).toLocaleDateString()}</p>
                    </div>
                  </div>
                  
                  <div className="space-y-4">
                    <div>
                      <p className="text-sm font-medium text-foreground">Company</p>
                      <p className="text-sm text-muted-foreground">{response.subject1Name}</p>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-foreground">VAT Number</p>
                      <p className="text-sm text-muted-foreground">{response.subject1VatNumber}</p>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-foreground">Processing Mode</p>
                      <p className="text-sm text-muted-foreground">{response.processingMode}</p>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-foreground">Date Received</p>
                      <p className="text-sm text-muted-foreground">{new Date(response.dateReceivedUtc).toLocaleString()}</p>
                    </div>
                  </div>
                </div>

                {/* QR Code Section */}
                {response.qrCode && (
                  <div className="mt-6 text-center space-y-4">
                    <div className="bg-background p-6 rounded-lg border">
                      <div className="space-y-4">
                        <h4 className="text-lg font-semibold text-foreground">Government Verification</h4>
                        <div className="bg-white p-4 rounded-lg inline-block">
                          <img 
                            src={`https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(response.qrCode)}`}
                            alt="Government QR Code" 
                            className="mx-auto"
                          />
                        </div>
                        <div className="space-y-2">
                          <p className="text-sm text-muted-foreground">
                            Official government verification QR code
                          </p>
                          <div className="bg-muted p-3 rounded-md">
                            <p className="text-xs text-foreground break-all">
                              {response.qrCode}
                            </p>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* Additional Details */}
                <div className="mt-6 bg-muted/50 rounded-lg p-4">
                  <h4 className="text-sm font-medium text-foreground mb-3">Additional Information</h4>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
                    <div>
                      <p className="font-medium text-foreground">KSEF Date</p>
                      <p className="text-muted-foreground">{new Date(response.ksefDate).toLocaleString()}</p>
                    </div>
                    <div>
                      <p className="font-medium text-foreground">Sale Date</p>
                      <p className="text-muted-foreground">{new Date(response.saleDate).toLocaleDateString()}</p>
                    </div>
                    <div>
                      <p className="font-medium text-foreground">Schema Version</p>
                      <p className="text-muted-foreground">{response.schemaVersion}</p>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : invoiceResponse && invoiceResponse.error ? (
          <div className="bg-destructive/10 border border-destructive/20 rounded-lg p-6">
            <h3 className="text-lg font-semibold text-destructive mb-4">Invoice Processing Failed</h3>
            <div className="space-y-2">
              <p className="text-sm text-destructive">
                Error from XFX API: {invoiceResponse.errorMessage || invoiceResponse.error}
              </p>
            </div>
          </div>
        ) : (
          <div className="text-center space-y-4">
            <div className="mx-auto h-16 w-16 rounded-full bg-muted/10 flex items-center justify-center">
              <Upload className="h-8 w-8 text-muted-foreground animate-spin" />
            </div>
            <h3 className="text-lg font-semibold text-foreground">
              Waiting for Final Response
            </h3>
            <p className="text-sm text-muted-foreground max-w-md mx-auto">
              Processing final confirmation from the government system...
            </p>
          </div>
        )}
      </div>
    </div>
  );

  return (
    <div>
      {currentStep === 'start' && renderStartStep()}
      {currentStep === 'upload' && renderUploadStep()}
      {currentStep === 'products' && renderProductsStep()}
      {currentStep === 'issues' && renderIssuesStep()}
      {currentStep === 'resolution' && renderResolutionStep()}
    </div>
  );
};
