import { type FormEventHandler, useRef } from "react";
import { AI_MODELS } from "@/lib/ai-config";
import { AttachmentInput, AttachmentPreviews } from "@/components/chat/AttachmentInput";
import { Button } from "@/components/ui/button";
import {
  PromptInput,
  PromptInputButton,
  PromptInputModelSelect,
  PromptInputModelSelectContent,
  PromptInputModelSelectItem,
  PromptInputModelSelectTrigger,
  PromptInputModelSelectValue,
  PromptInputTextarea,
  PromptInputToolbar,
  PromptInputTools,
} from "@/components/ui/shadcn-io/ai/prompt-input";
import { MicIcon, PaperclipIcon } from "lucide-react";

interface ChatInputBoxProps {
  text: string;
  onTextChange: (text: string) => void;
  model: string;
  onModelChange: (model: string) => void;
  status?: "submitted" | "streaming" | "ready" | "error";
  onSubmit: FormEventHandler<HTMLFormElement>;
  attachedFiles: File[];
  filePreviews: string[];
  onFilesSelected: (files: File[]) => void;
  onRemoveFile: (index: number) => void;
  onFileClick: (file: File, index: number) => void;
  hoveredIndex: number | null;
  onMouseEnter: (index: number) => void;
  onMouseLeave: () => void;
  onStopStreaming?: () => void;
  placeholder?: string;
  disabled?: boolean;
}

export const ChatInputBox = ({
  text,
  onTextChange,
  model,
  onModelChange,
  status,
  onSubmit,
  attachedFiles,
  filePreviews,
  onFilesSelected,
  onRemoveFile,
  onFileClick,
  hoveredIndex,
  onMouseEnter,
  onMouseLeave,
  onStopStreaming,
  placeholder = "Type your message...",
  disabled = false,
}: ChatInputBoxProps) => {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleAttachClick = () => {
    fileInputRef.current?.click();
  };

  return (
    <AttachmentInput
      onFilesSelected={onFilesSelected}
      files={attachedFiles}
      onRemoveFile={onRemoveFile}
      maxFiles={10}
      maxSize={20 * 1024 * 1024}
    >
      <PromptInput onSubmit={onSubmit}>
        <AttachmentPreviews
          files={attachedFiles}
          filePreviews={filePreviews}
          onRemoveFile={onRemoveFile}
          onFileClick={onFileClick}
          hoveredIndex={hoveredIndex}
          onMouseEnter={onMouseEnter}
          onMouseLeave={onMouseLeave}
        />
        <PromptInputTextarea
          value={text}
          onChange={(e) => onTextChange(e.target.value)}
          placeholder={placeholder}
          disabled={disabled}
        />
        <PromptInputToolbar>
          <PromptInputTools>
            <PromptInputButton onClick={handleAttachClick} type="button">
              <PaperclipIcon size={16} />
            </PromptInputButton>
            <PromptInputModelSelect
              value={model}
              onValueChange={onModelChange}
            >
              <PromptInputModelSelectTrigger>
                <PromptInputModelSelectValue />
              </PromptInputModelSelectTrigger>
              <PromptInputModelSelectContent>
                {AI_MODELS.map((m) => (
                  <PromptInputModelSelectItem key={m.id} value={m.id}>
                    {m.name}
                  </PromptInputModelSelectItem>
                ))}
              </PromptInputModelSelectContent>
            </PromptInputModelSelect>
          </PromptInputTools>
          <div className="flex items-center gap-1">
            <div className="flex items-center justify-center h-11 w-11 shrink-0">
              <Button
                type="button"
                size="icon"
                variant="ghost"
                className="rounded-full h-[30px] w-[30px] min-w-[30px] p-0"
              >
                <MicIcon size={16} />
              </Button>
            </div>
            {status === "streaming" ? (
              <div className="flex items-center justify-center h-11 w-11 shrink-0">
                <Button
                  type="button"
                  size="icon"
                  variant="default"
                  className="rounded-full h-[30px] w-[30px] min-w-[30px] p-0"
                  onClick={onStopStreaming}
                >
                  <div className="w-2.5 h-2.5 bg-current" />
                </Button>
              </div>
            ) : (
              <div className="flex items-center justify-center h-11 w-11 shrink-0">
                <Button
                  type="submit"
                  size="icon"
                  variant="default"
                  className="rounded-full h-[30px] w-[30px] min-w-[30px] p-0"
                  disabled={disabled || !text.trim()}
                >
                  <svg width="12" height="15" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className="shrink-0">
                    <path fill="currentColor" d="M11 19V7.415l-3.293 3.293a1 1 0 1 1-1.414-1.414l5-5 .074-.067a1 1 0 0 1 1.34.067l5 5a1 1 0 1 1-1.414 1.414L13 7.415V19a1 1 0 1 1-2 0"></path>
                  </svg>
                </Button>
              </div>
            )}
          </div>
        </PromptInputToolbar>
      </PromptInput>
    </AttachmentInput>
  );
};
