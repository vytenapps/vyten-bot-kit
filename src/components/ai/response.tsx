import * as React from "react";
import ReactMarkdown, { type Options, type Components } from "react-markdown";
import remarkGfm from "remark-gfm";
import remarkMath from "remark-math";
import rehypeKatex from "rehype-katex";
import { cn } from "@/lib/utils";
import "katex/dist/katex.min.css";

interface ResponseProps extends React.HTMLAttributes<HTMLDivElement> {
  children: string | React.ReactNode;
  options?: Partial<Options>;
  allowedImagePrefixes?: string[];
  allowedLinkPrefixes?: string[];
  defaultOrigin?: string;
  parseIncompleteMarkdown?: boolean;
}

function parseIncompleteMarkdown(text: string): string {
  // Protect code blocks from being modified
  const codeBlockRegex = /```[\s\S]*?```/g;
  const codeBlocks: string[] = [];
  let protectedText = text.replace(codeBlockRegex, (match) => {
    codeBlocks.push(match);
    return `__CODE_BLOCK_${codeBlocks.length - 1}__`;
  });

  // Count formatting tokens to determine if completion is needed
  const countTokens = (str: string, token: string) =>
    (str.match(new RegExp(token.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "g")) || []).length;

  // Auto-complete bold
  if (countTokens(protectedText, "**") % 2 !== 0) {
    protectedText += "**";
  }

  // Auto-complete italic
  if (countTokens(protectedText, "*") % 2 !== 0 && !protectedText.endsWith("**")) {
    protectedText += "*";
  }

  // Auto-complete strikethrough
  if (countTokens(protectedText, "~~") % 2 !== 0) {
    protectedText += "~~";
  }

  // Auto-complete inline code (but not in code blocks)
  const backtickCount = countTokens(protectedText, "`");
  if (backtickCount % 2 !== 0) {
    protectedText += "`";
  }

  // Hide incomplete links
  protectedText = protectedText.replace(/\[([^\]]+)$/g, "");

  // Hide incomplete images
  protectedText = protectedText.replace(/!\[([^\]]+)$/g, "");

  // Restore code blocks
  codeBlocks.forEach((block, index) => {
    protectedText = protectedText.replace(`__CODE_BLOCK_${index}__`, block);
  });

  return protectedText;
}

function isAllowedUrl(url: string, allowedPrefixes: string[], defaultOrigin?: string): boolean {
  if (allowedPrefixes.includes("*")) return true;

  try {
    const fullUrl = new URL(url, defaultOrigin);
    return allowedPrefixes.some((prefix) => fullUrl.href.startsWith(prefix));
  } catch {
    return false;
  }
}

export const Response = React.forwardRef<HTMLDivElement, ResponseProps>(
  (
    {
      children,
      className,
      options = {},
      allowedImagePrefixes = ["*"],
      allowedLinkPrefixes = ["*"],
      defaultOrigin,
      parseIncompleteMarkdown: shouldParse = true,
      ...props
    },
    ref
  ) => {
    const content = typeof children === "string" ? children : String(children);
    const processedContent = shouldParse ? parseIncompleteMarkdown(content) : content;

    const components: Partial<Components> = React.useMemo(
      () => ({
        a: ({ href, children, ...props }) => {
          if (href && isAllowedUrl(href, allowedLinkPrefixes, defaultOrigin)) {
            return (
              <a href={href} target="_blank" rel="noopener noreferrer" {...props}>
                {children}
              </a>
            );
          }
          return <span {...props}>{children}</span>;
        },
        img: ({ src, alt, ...props }) => {
          if (src && isAllowedUrl(src, allowedImagePrefixes, defaultOrigin)) {
            return <img src={src} alt={alt} {...props} />;
          }
          return null;
        },
      }),
      [allowedImagePrefixes, allowedLinkPrefixes, defaultOrigin]
    );

    return (
      <div
        ref={ref}
        className={cn(
          "prose prose-sm dark:prose-invert max-w-none",
          "prose-p:leading-relaxed prose-pre:p-0",
          "prose-headings:font-semibold prose-headings:tracking-tight",
          "prose-a:text-primary prose-a:no-underline hover:prose-a:underline",
          "prose-code:before:content-none prose-code:after:content-none",
          "prose-code:bg-muted prose-code:px-1.5 prose-code:py-0.5 prose-code:rounded",
          "prose-pre:bg-muted prose-pre:border prose-pre:rounded-lg",
          "prose-img:rounded-lg prose-img:border",
          "prose-table:border prose-th:border prose-td:border",
          "prose-blockquote:border-l-primary prose-blockquote:italic",
          className
        )}
        {...props}
      >
        <ReactMarkdown
          remarkPlugins={[remarkGfm, remarkMath]}
          rehypePlugins={[rehypeKatex]}
          components={components}
          {...options}
        >
          {processedContent}
        </ReactMarkdown>
      </div>
    );
  }
);

Response.displayName = "Response";
