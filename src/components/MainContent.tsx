import { useState, useRef } from 'react';
import { Upload, File, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface MainContentProps {
  currentStep: string;
  uploadedFile: File | null;
  onFileUpload: (file: File) => void;
  onStepComplete: () => void;
  onTriggerWorkflow?: () => Promise<void>;
  isProcessing?: boolean;
  resumeUrl?: string | null;
}

export const MainContent = ({ 
  currentStep, 
  uploadedFile, 
  onFileUpload,
  onStepComplete,
  onTriggerWorkflow,
  isProcessing = false,
  resumeUrl
}: MainContentProps) => {
  const [isDragOver, setIsDragOver] = useState(false);
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

  const renderUploadStep = () => (
    <div className="space-y-6 animate-fade-in">
      <div className="text-center">
        <h2 className="text-2xl font-bold text-foreground mb-2">Upload Your Invoice</h2>
        <p className="text-muted-foreground">
          Follow the steps below to process your claim
        </p>
      </div>

      {/* Start Process Button */}
      {onTriggerWorkflow && !resumeUrl && (
        <div className="bg-card rounded-lg p-6 shadow-medium border mb-6">
          <div className="text-center space-y-4">
            <h3 className="text-lg font-semibold text-foreground">
              Start Process
            </h3>
            <p className="text-sm text-muted-foreground">
              Click to initiate the n8n workflow and get your resume URL
            </p>
            <Button 
              onClick={onTriggerWorkflow}
              disabled={isProcessing}
              className="bg-gradient-primary hover:scale-105 transition-transform"
            >
              {isProcessing ? 'Starting Workflow...' : 'Start Process'}
            </Button>
          </div>
        </div>
      )}

      {/* Resume URL Display */}
      {resumeUrl && (
        <div className="bg-card rounded-lg p-6 shadow-medium border mb-6">
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
              className="bg-gradient-primary hover:scale-105 transition-transform"
            >
              Upload Invoice
            </Button>
          </div>
        )}
      </div>
    </div>
  );

  const renderOtherSteps = () => (
    <div className="space-y-6 animate-fade-in">
      <div className="text-center">
        <h2 className="text-2xl font-bold text-foreground mb-2">
          {currentStep === 'products' && 'Select Products'}
          {currentStep === 'issues' && 'Describe Issues'}
          {currentStep === 'resolution' && 'Resolution'}
        </h2>
        <p className="text-muted-foreground">
          This step is coming soon...
        </p>
      </div>

      <div className="bg-card rounded-lg p-12 shadow-medium border text-center">
        <div className="space-y-4">
          <div className="mx-auto h-16 w-16 rounded-full bg-muted flex items-center justify-center">
            <Upload className="h-8 w-8 text-muted-foreground" />
          </div>
          <h3 className="text-lg font-semibold text-foreground">
            Step Under Development
          </h3>
          <p className="text-sm text-muted-foreground max-w-md mx-auto">
            This feature will be available soon. For now, you can practice with the file upload step.
          </p>
        </div>
      </div>
    </div>
  );

  return (
    <div>
      {currentStep === 'upload' ? renderUploadStep() : renderOtherSteps()}
    </div>
  );
};