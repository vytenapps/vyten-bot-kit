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

import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { ArrowDownIcon } from 'lucide-react';
import type { ComponentProps } from 'react';
import { useCallback, forwardRef } from 'react';
import { StickToBottom, useStickToBottomContext } from 'use-stick-to-bottom';

export type ConversationProps = ComponentProps<typeof StickToBottom> & { debug?: boolean };

export const Conversation = forwardRef<HTMLDivElement, ConversationProps>(
  ({ className, debug, ...props }, ref) => (
    <StickToBottom
      ref={ref}
      className={cn(
        'relative flex-1 overflow-y-auto overscroll-contain',
        debug && 'bg-accent/10 outline outline-1 outline-accent/40',
        className
      )}
      initial="smooth"
      resize="smooth"
      role="log"
      style={{ scrollbarGutter: 'stable both-edges' }}
      {...props}
    />
  )
);

export type ConversationContentProps = ComponentProps<
  typeof StickToBottom.Content
> & { debug?: boolean };

export const ConversationContent = forwardRef<HTMLDivElement, ConversationContentProps>(
  ({ className, debug, style, ...props }, ref) => (
    <StickToBottom.Content
      ref={ref}
      className={cn('p-4', debug && 'bg-destructive/10 outline outline-1 outline-destructive/40', className)}
      style={{ ...style, overflow: 'visible' }}
      {...props}
    />
  )
);

export type ConversationScrollButtonProps = ComponentProps<typeof Button>;

export const ConversationScrollButton = ({
  className,
  ...props
}: ConversationScrollButtonProps) => {
  const { isAtBottom, scrollToBottom } = useStickToBottomContext();

  const handleScrollToBottom = useCallback(() => {
    scrollToBottom();
  }, [scrollToBottom]);

  return (
    !isAtBottom && (
      <Button
        className={cn(
          'absolute bottom-4 left-[50%] translate-x-[-50%] rounded-full',
          className
        )}
        onClick={handleScrollToBottom}
        size="icon"
        type="button"
        variant="outline"
        {...props}
      >
        <ArrowDownIcon className="size-4" />
      </Button>
    )
  );
};
