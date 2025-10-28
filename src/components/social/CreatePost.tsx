import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent } from "@/components/ui/card";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";

interface CreatePostProps {
  userId: string;
}

export const CreatePost = ({ userId }: CreatePostProps) => {
  const [content, setContent] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!content.trim()) {
      toast.error("Please enter some content");
      return;
    }

    setIsSubmitting(true);

    try {
      const { error } = await supabase
        .from("posts")
        .insert({
          user_id: userId,
          content: content.trim(),
        });

      if (error) throw error;

      setContent("");
      toast.success("Post created successfully!");
    } catch (error) {
      console.error("Error creating post:", error);
      toast.error("Failed to create post");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Card>
      <CardContent className="pt-6">
        <form onSubmit={handleSubmit} className="space-y-4">
          <Textarea
            placeholder="What's on your mind?"
            value={content}
            onChange={(e) => setContent(e.target.value)}
            className="min-h-[100px] resize-none"
            maxLength={5000}
          />
          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground">
              {content.length}/5000
            </span>
            <Button 
              type="submit" 
              disabled={!content.trim() || isSubmitting}
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Posting...
                </>
              ) : (
                "Post"
              )}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
};
