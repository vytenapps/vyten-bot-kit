import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent } from "@/components/ui/card";
import { toast } from "sonner";
import { Loader2, Image, X } from "lucide-react";

interface CreatePostProps {
  userId: string;
}

export const CreatePost = ({ userId }: CreatePostProps) => {
  const [content, setContent] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        toast.error("Image must be less than 5MB");
        return;
      }
      setSelectedFile(file);
      setPreviewUrl(URL.createObjectURL(file));
    }
  };

  const handleRemoveImage = () => {
    setSelectedFile(null);
    if (previewUrl) {
      URL.revokeObjectURL(previewUrl);
      setPreviewUrl(null);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    setError(null);
    
    // Client-side validation
    const trimmedContent = content.trim();
    if (!trimmedContent) {
      setError("Please enter some content");
      return;
    }
    
    if (trimmedContent.length > 5000) {
      setError("Post content must be less than 5000 characters");
      return;
    }

    setIsSubmitting(true);

    try {
      let mediaUrl = null;
      let mediaType = null;

      // Upload image if selected
      if (selectedFile) {
        // Validate file type
        if (!selectedFile.type.startsWith('image/')) {
          throw new Error('Only image files are allowed');
        }
        
        const fileExt = selectedFile.name.split('.').pop();
        const fileName = `${userId}/${Date.now()}.${fileExt}`;
        
        const { error: uploadError } = await supabase.storage
          .from('post-images')
          .upload(fileName, selectedFile);

        if (uploadError) throw uploadError;

        // Use signed URL with 1 year expiration for better security
        const { data: signedUrlData, error: urlError } = await supabase.storage
          .from('post-images')
          .createSignedUrl(fileName, 31536000); // 1 year in seconds

        if (urlError) throw urlError;

        mediaUrl = signedUrlData.signedUrl;
        mediaType = selectedFile.type;
      }

      const { error: insertError } = await supabase
        .from("posts")
        .insert({
          user_id: userId,
          content: trimmedContent,
          media_url: mediaUrl,
          media_type: mediaType,
        });

      if (insertError) throw insertError;

      setContent("");
      setError(null);
      handleRemoveImage();
      toast.success("Post created successfully!");
    } catch (error) {
      console.error("Error creating post:", error);
      const errorMessage = error instanceof Error ? error.message : "Failed to create post";
      setError(errorMessage);
      toast.error(errorMessage);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Card>
      <CardContent className="pt-6">
        <form onSubmit={handleSubmit} className="space-y-4">
          {error && (
            <div className="text-sm text-destructive bg-destructive/10 p-3 rounded-md">
              {error}
            </div>
          )}
          <Textarea
            placeholder="What's on your mind?"
            value={content}
            onChange={(e) => setContent(e.target.value)}
            className="min-h-[100px] resize-none"
            maxLength={5000}
          />
          
          {previewUrl && (
            <div className="relative">
              <img 
                src={previewUrl} 
                alt="Preview" 
                className="rounded-lg max-h-64 w-full object-cover"
              />
              <Button
                type="button"
                variant="destructive"
                size="icon"
                className="absolute top-2 right-2"
                onClick={handleRemoveImage}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          )}

          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <input
                type="file"
                id="image-upload"
                accept="image/*"
                className="hidden"
                onChange={handleFileSelect}
                disabled={isSubmitting}
              />
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => document.getElementById('image-upload')?.click()}
                disabled={isSubmitting}
              >
                <Image className="h-4 w-4 mr-2" />
                Photo
              </Button>
              <span className="text-sm text-muted-foreground">
                {content.length}/5000
              </span>
            </div>
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
