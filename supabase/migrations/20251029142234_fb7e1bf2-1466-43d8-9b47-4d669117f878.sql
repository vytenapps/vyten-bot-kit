-- Add title column to posts table
ALTER TABLE public.posts
ADD COLUMN title TEXT;

-- Update existing posts to have a title extracted from content
UPDATE public.posts
SET title = CASE 
  WHEN LENGTH(SPLIT_PART(content, E'\n', 1)) > 0 
  THEN SPLIT_PART(content, E'\n', 1)
  ELSE 'Untitled Post'
END
WHERE title IS NULL;