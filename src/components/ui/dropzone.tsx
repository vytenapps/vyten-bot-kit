import * as React from "react";
import { useDropzone, type DropzoneOptions } from "react-dropzone";
import { cn } from "@/lib/utils";
import { Upload, FileIcon, X } from "lucide-react";
import { Button } from "./button";

interface DropzoneProps extends Omit<DropzoneOptions, "onDrop"> {
  onFilesSelected: (files: File[]) => void;
  files?: File[];
  onRemoveFile?: (index: number) => void;
  className?: string;
  showPreview?: boolean;
}

export function Dropzone({
  onFilesSelected,
  files = [],
  onRemoveFile,
  className,
  showPreview = true,
  ...dropzoneOptions
}: DropzoneProps) {
  const {
    getRootProps,
    getInputProps,
    isDragActive,
    isDragReject,
  } = useDropzone({
    ...dropzoneOptions,
    onDrop: (acceptedFiles) => {
      onFilesSelected(acceptedFiles);
    },
  });

  return (
    <div className={cn("w-full", className)}>
      <div
        {...getRootProps()}
        className={cn(
          "relative rounded-lg border-2 border-dashed transition-colors cursor-pointer",
          "hover:border-primary/50 hover:bg-accent/5",
          isDragActive && "border-primary bg-accent/10",
          isDragReject && "border-destructive bg-destructive/10",
          "p-6 text-center"
        )}
      >
        <input {...getInputProps()} />
        <div className="flex flex-col items-center gap-2">
          <Upload
            className={cn(
              "h-8 w-8 text-muted-foreground",
              isDragActive && "text-primary",
              isDragReject && "text-destructive"
            )}
          />
          <div className="space-y-1">
            <p className="text-sm font-medium">
              {isDragActive
                ? "Drop files here"
                : isDragReject
                ? "File type not accepted"
                : "Drag & drop files here, or click to select"}
            </p>
            <p className="text-xs text-muted-foreground">
              {dropzoneOptions.maxSize
                ? `Max file size: ${(dropzoneOptions.maxSize / 1024 / 1024).toFixed(0)}MB`
                : "Upload your files"}
            </p>
          </div>
        </div>
      </div>

      {showPreview && files.length > 0 && (
        <div className="mt-4 space-y-2">
          {files.map((file, index) => (
            <div
              key={index}
              className="flex items-center gap-2 rounded-lg border bg-card p-2"
            >
              <FileIcon className="h-4 w-4 text-muted-foreground flex-shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">{file.name}</p>
                <p className="text-xs text-muted-foreground">
                  {(file.size / 1024).toFixed(1)} KB
                </p>
              </div>
              {onRemoveFile && (
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-6 w-6 flex-shrink-0"
                  onClick={(e) => {
                    e.stopPropagation();
                    onRemoveFile(index);
                  }}
                >
                  <X className="h-3 w-3" />
                </Button>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
