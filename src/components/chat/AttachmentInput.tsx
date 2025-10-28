import { useState, useRef, useCallback } from "react";
import { useDropzone } from "react-dropzone";
import { cn } from "@/lib/utils";
import { X, FileIcon, Upload } from "lucide-react";
import { Button } from "@/components/ui/button";

interface AttachmentInputProps {
  onFilesSelected: (files: File[]) => void;
  files: File[];
  onRemoveFile: (index: number) => void;
  maxFiles?: number;
  maxSize?: number;
  accept?: Record<string, string[]>;
  children: React.ReactNode;
  className?: string;
}

export function AttachmentInput({
  onFilesSelected,
  files,
  onRemoveFile,
  maxFiles = 5,
  maxSize = 20 * 1024 * 1024, // 20MB
  accept,
  children,
  className,
}: AttachmentInputProps) {
  const [isDragActive, setIsDragActive] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const onDrop = useCallback(
    (acceptedFiles: File[]) => {
      setIsDragActive(false);
      if (acceptedFiles.length > 0) {
        onFilesSelected(acceptedFiles);
      }
    },
    [onFilesSelected]
  );

  const { getRootProps, getInputProps, isDragReject } = useDropzone({
    onDrop,
    maxFiles,
    maxSize,
    accept,
    noClick: true,
    noKeyboard: true,
    onDragEnter: () => setIsDragActive(true),
    onDragLeave: () => setIsDragActive(false),
  });

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFiles = Array.from(e.target.files || []);
    if (selectedFiles.length > 0) {
      onFilesSelected(selectedFiles);
    }
  };

  const openFileDialog = () => {
    fileInputRef.current?.click();
  };

  return (
    <div className={cn("relative", className)}>
      <div {...getRootProps()} className="relative">
        <input {...getInputProps()} />
        <input
          ref={fileInputRef}
          type="file"
          multiple
          accept={accept ? Object.keys(accept).join(",") : undefined}
          onChange={handleFileSelect}
          className="hidden"
        />

        {isDragActive && (
          <div
            className={cn(
              "absolute inset-0 z-50 rounded-lg border-2 border-dashed transition-colors",
              "bg-accent/90 backdrop-blur-sm",
              isDragReject ? "border-destructive" : "border-primary"
            )}
          >
            <div className="flex h-full flex-col items-center justify-center gap-2 p-4">
              <Upload
                className={cn(
                  "h-8 w-8",
                  isDragReject ? "text-destructive" : "text-primary"
                )}
              />
              <p className="text-sm font-medium">
                {isDragReject ? "File type not accepted" : "Drop files here"}
              </p>
            </div>
          </div>
        )}

        {children}
      </div>

      {files.length > 0 && (
        <div className="mt-2 space-y-1">
          {files.map((file, index) => (
            <div
              key={index}
              className="flex items-center gap-2 rounded-md border bg-muted/50 px-2 py-1.5 text-sm"
            >
              <FileIcon className="h-3.5 w-3.5 text-muted-foreground flex-shrink-0" />
              <span className="flex-1 truncate text-xs font-medium">
                {file.name}
              </span>
              <span className="text-xs text-muted-foreground flex-shrink-0">
                {(file.size / 1024).toFixed(0)} KB
              </span>
              <Button
                variant="ghost"
                size="icon"
                className="h-5 w-5 flex-shrink-0"
                onClick={() => onRemoveFile(index)}
              >
                <X className="h-3 w-3" />
              </Button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export function AttachmentTrigger({
  onClick,
  className,
}: {
  onClick: () => void;
  className?: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn("inline-flex items-center", className)}
    >
      <span className="sr-only">Attach files</span>
    </button>
  );
}
