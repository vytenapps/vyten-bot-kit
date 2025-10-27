import { Button } from '@/components/ui/button';
import { ScrollArea, ScrollBar } from '@/components/ui/scroll-area';
import { cn } from '@/lib/utils';
import type { ComponentProps, ReactNode } from 'react';

export type SuggestionsProps = ComponentProps<typeof ScrollArea>;

export const Suggestions = ({ className, ...props }: SuggestionsProps) => (
  <ScrollArea className={cn('w-full', className)}>
    <div className="flex gap-2 pb-4" {...props} />
    <ScrollBar orientation="horizontal" />
  </ScrollArea>
);

export type SuggestionProps = Omit<
  ComponentProps<typeof Button>,
  'onClick'
> & {
  suggestion: string;
  onClick?: (suggestion: string) => void;
  children?: ReactNode;
};

export const Suggestion = ({
  suggestion,
  onClick,
  className,
  variant = 'outline',
  size = 'sm',
  children,
  ...props
}: SuggestionProps) => (
  <Button
    className={cn(
      'h-auto whitespace-normal rounded-full px-4 py-2 text-left font-normal',
      className
    )}
    onClick={() => onClick?.(suggestion)}
    size={size}
    variant={variant}
    {...props}
  >
    {children ?? suggestion}
  </Button>
);
