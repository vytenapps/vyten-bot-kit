import { useState, useRef, useCallback, useEffect } from "react";
import { useDropzone } from "react-dropzone";
import { cn } from "@/lib/utils";
import { X, FileIcon, Upload, Download, Copy } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { toast } from "sonner";

interface FileWithPreview extends File {
  preview?: string;
}

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
  const [filePreviews, setFilePreviews] = useState<string[]>([]);
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);
  const [lightboxFile, setLightboxFile] = useState<{ file: File; index: number } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Generate preview URLs for image files
  useEffect(() => {
    const previews = files.map((file) => {
      if (file.type.startsWith("image/")) {
        return URL.createObjectURL(file);
      }
      return "";
    });
    setFilePreviews(previews);

    // Cleanup preview URLs
    return () => {
      previews.forEach((preview) => {
        if (preview) URL.revokeObjectURL(preview);
      });
    };
  }, [files]);

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

  const isImageFile = (file: File) => file.type.startsWith("image/");

  const handleDownload = (file: File) => {
    const url = URL.createObjectURL(file);
    const a = document.createElement("a");
    a.href = url;
    a.download = file.name;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    toast.success("File downloaded");
  };

  const handleCopyFileName = (fileName: string) => {
    navigator.clipboard.writeText(fileName);
    toast.success("Filename copied");
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

      {/* Lightbox Dialog */}
      <Dialog open={!!lightboxFile} onOpenChange={() => setLightboxFile(null)}>
        <DialogContent className="max-w-4xl">
          {lightboxFile && (
            <>
              <DialogHeader>
                <DialogTitle className="text-sm font-normal flex items-center justify-between">
                  <span className="truncate">{lightboxFile.file.name}</span>
                  <div className="flex items-center gap-2 flex-shrink-0 ml-4">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleDownload(lightboxFile.file)}
                    >
                      <Download className="h-4 w-4 mr-2" />
                      Download File
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleCopyFileName(lightboxFile.file.name)}
                    >
                      <Copy className="h-4 w-4 mr-2" />
                      Copy
                    </Button>
                  </div>
                </DialogTitle>
              </DialogHeader>
              <div className="flex items-center justify-center bg-muted/30 rounded-lg p-4">
                <img
                  src={filePreviews[lightboxFile.index]}
                  alt={lightboxFile.file.name}
                  className="max-w-full max-h-[70vh] object-contain"
                />
              </div>
              <p className="text-xs text-muted-foreground text-center">
                Image • {(lightboxFile.file.size / 1024).toFixed(1)} KB
              </p>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

export function AttachmentPreviews({
  files,
  filePreviews,
  onRemoveFile,
  onFileClick,
  hoveredIndex,
  onMouseEnter,
  onMouseLeave,
}: {
  files: File[];
  filePreviews: string[];
  onRemoveFile: (index: number) => void;
  onFileClick: (file: File, index: number) => void;
  hoveredIndex: number | null;
  onMouseEnter: (index: number) => void;
  onMouseLeave: () => void;
}) {
  if (files.length === 0) return null;

  const isImageFile = (file: File) => file.type.startsWith("image/");

  return (
    <div className="flex flex-wrap gap-2 px-3 pt-3">
      {files.map((file, index) => {
        const isImage = isImageFile(file);
        const preview = filePreviews[index];

        return (
          <div
            key={index}
            className="relative group"
            onMouseEnter={() => onMouseEnter(index)}
            onMouseLeave={onMouseLeave}
          >
            {isImage ? (
              <div
                className="relative w-20 h-20 rounded-lg overflow-hidden border bg-muted cursor-pointer"
                onClick={() => onFileClick(file, index)}
              >
                <img
                  src={preview}
                  alt={file.name}
                  className="w-full h-full object-cover"
                />
                {hoveredIndex === index && (
                  <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
                    <Button
                      variant="destructive"
                      size="icon"
                      className="h-6 w-6"
                      onClick={(e) => {
                        e.stopPropagation();
                        onRemoveFile(index);
                      }}
                    >
                      <X className="h-3 w-3" />
                    </Button>
                  </div>
                )}
              </div>
            ) : (
              <div className="flex items-center gap-2 rounded-lg border bg-muted/50 px-3 py-2 pr-8 relative">
                <FileIcon className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                <div className="flex flex-col min-w-0">
                  <span className="text-xs font-medium truncate max-w-[120px]">
                    {file.name}
                  </span>
                  <span className="text-xs text-muted-foreground">
                    {(file.size / 1024).toFixed(0)} KB
                  </span>
                </div>
                {hoveredIndex === index && (
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-5 w-5 absolute right-1 top-1/2 -translate-y-1/2"
                    onClick={() => onRemoveFile(index)}
                  >
                    <X className="h-3 w-3" />
                  </Button>
                )}
              </div>
            )}
          </div>
        );
      })}
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
