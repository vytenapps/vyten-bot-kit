import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import type { ComponentProps } from 'react';

export type SuggestionProps = ComponentProps<typeof Button>;

export const Suggestion = ({
  className,
  variant = 'outline',
  ...props
}: SuggestionProps) => (
  <Button
    className={cn(
      'h-auto whitespace-normal rounded-xl px-4 py-3 text-left font-normal',
      className
    )}
    variant={variant}
    {...props}
  />
);
