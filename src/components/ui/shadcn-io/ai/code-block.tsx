/**
 * Copyright 2023 Vercel, Inc.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */
'use client';

import { cn } from '@/lib/utils';
import { Check, Copy } from 'lucide-react';
import { type ButtonHTMLAttributes, type HTMLAttributes, useState } from 'react';

interface CodeBlockProps extends HTMLAttributes<HTMLPreElement> {
  code: string;
  language: string;
}

export function CodeBlock({
  code,
  language,
  className,
  children,
  ...props
}: CodeBlockProps) {
  return (
    <pre
      className={cn(
        'relative overflow-x-auto rounded-lg border bg-muted p-4 font-mono text-sm',
        className
      )}
      {...props}
    >
      <div className="absolute right-2 top-2">{children}</div>
      <code className={`language-${language}`}>{code}</code>
    </pre>
  );
}

interface CodeBlockCopyButtonProps
  extends ButtonHTMLAttributes<HTMLButtonElement> {
  onCopy?: () => void;
  onError?: () => void;
}

export function CodeBlockCopyButton({
  onCopy,
  onError,
  className,
  ...props
}: CodeBlockCopyButtonProps) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    try {
      // Get the code content from the parent pre element
      const preElement = (document.activeElement as HTMLElement)?.closest('pre');
      const codeElement = preElement?.querySelector('code');
      const code = codeElement?.textContent || '';

      await navigator.clipboard.writeText(code);
      setCopied(true);
      onCopy?.();
      setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      console.error('Failed to copy code:', error);
      onError?.();
    }
  };

  return (
    <button
      type="button"
      onClick={handleCopy}
      className={cn(
        'inline-flex items-center justify-center rounded-md p-2 text-sm font-medium transition-colors',
        'hover:bg-accent hover:text-accent-foreground',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
        'disabled:pointer-events-none disabled:opacity-50',
        className
      )}
      aria-label="Copy code to clipboard"
      {...props}
    >
      {copied ? (
        <Check className="h-4 w-4" />
      ) : (
        <Copy className="h-4 w-4" />
      )}
    </button>
  );
}
