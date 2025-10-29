import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { toast } from "sonner";
import { Loader2, Image, X, Plus } from "lucide-react";
import { UserAvatar } from "@/components/shared/UserAvatar";

interface CreatePostProps {
  userId: string;
}

export const CreatePost = ({ userId }: CreatePostProps) => {
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [userProfile, setUserProfile] = useState<{
    avatar_url: string | null;
    username: string;
    first_name: string | null;
    last_name: string | null;
    email: string | null;
  } | null>(null);

  // Fetch user profile on mount and when dialog opens
  useEffect(() => {
    fetchUserProfile();
  }, [userId]);

  // Refresh profile when dialog opens to ensure latest avatar
  useEffect(() => {
    if (isDialogOpen) {
      fetchUserProfile();
    }
  }, [isDialogOpen]);

  const fetchUserProfile = async () => {
    try {
      const { data } = await (supabase as any)
        .from("user_profiles")
        .select("avatar_url, username, first_name, last_name, email")
        .eq("user_id", userId)
        .single();

      if (data) {
        setUserProfile(data);
      }
    } catch (error) {
      console.error("Error fetching user profile:", error);
    }
  };

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
    const trimmedTitle = title.trim();
    const trimmedContent = content.trim();
    
    if (!trimmedTitle) {
      setError("Please enter a title");
      return;
    }
    
    if (trimmedTitle.length > 200) {
      setError("Title must be less than 200 characters");
      return;
    }
    
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
          title: trimmedTitle,
          content: trimmedContent,
          media_url: mediaUrl,
          media_type: mediaType,
        });

      if (insertError) throw insertError;

      setTitle("");
      setContent("");
      setError(null);
      handleRemoveImage();
      setIsDialogOpen(false);
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
    <>
      {/* Collapsed Create Post Button */}
      <Card 
        className="cursor-pointer hover:bg-accent/50 transition-colors"
        onClick={() => setIsDialogOpen(true)}
      >
        <CardContent className="p-3 sm:p-4">
          <div className="flex items-center gap-2 sm:gap-3">
            <UserAvatar
              avatarUrl={userProfile?.avatar_url}
              email={userProfile?.email}
              username={userProfile?.username}
              firstName={userProfile?.first_name}
              lastName={userProfile?.last_name}
              className="h-10 w-10 sm:h-12 sm:w-12"
              fallbackClassName="bg-primary text-primary-foreground"
            />
            <div className="flex-1 text-sm sm:text-base text-muted-foreground">
              Start a post
            </div>
            <Button 
              size="icon" 
              variant="ghost" 
              className="rounded-full h-8 w-8 sm:h-10 sm:w-10"
              onClick={(e) => {
                e.stopPropagation();
                setIsDialogOpen(true);
              }}
            >
              <Plus className="h-4 w-4 sm:h-5 sm:w-5" />
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Expanded Create Post Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Create a post</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="flex items-center gap-3">
              <UserAvatar
                avatarUrl={userProfile?.avatar_url}
                email={userProfile?.email}
                username={userProfile?.username}
                firstName={userProfile?.first_name}
                lastName={userProfile?.last_name}
                className="h-10 w-10 sm:h-12 sm:w-12"
                fallbackClassName="bg-primary text-primary-foreground"
              />
              <div>
                <p className="font-semibold">
                  {userProfile?.first_name || userProfile?.last_name
                    ? `${userProfile.first_name || ""} ${userProfile.last_name || ""}`.trim()
                    : userProfile?.username || "User"}
                </p>
              </div>
            </div>

            {error && (
              <div className="text-sm text-destructive bg-destructive/10 p-3 rounded-md">
                {error}
              </div>
            )}

            <Input
              placeholder="Title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="text-base sm:text-lg font-semibold border-0 focus-visible:ring-0"
              maxLength={200}
            />

            <Textarea
              placeholder="What do you want to talk about?"
              value={content}
              onChange={(e) => setContent(e.target.value)}
              className="min-h-[100px] sm:min-h-[120px] resize-none border-0 focus-visible:ring-0 text-sm sm:text-base"
              maxLength={5000}
            />
            
            {previewUrl && (
              <div className="relative">
                <img 
                  src={previewUrl} 
                  alt="Preview" 
                  className="rounded-lg w-full h-auto max-h-64 sm:max-h-80 object-contain bg-muted"
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

            <div className="flex items-center justify-between pt-4 border-t flex-wrap gap-2">
              <div className="flex items-center gap-2 flex-wrap">
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
                  variant="ghost"
                  size="sm"
                  onClick={() => document.getElementById('image-upload')?.click()}
                  disabled={isSubmitting}
                  className="h-8 sm:h-9"
                >
                  <Image className="h-4 w-4 sm:h-5 sm:w-5" />
                </Button>
                <span className="text-xs text-muted-foreground">
                  Title: {title.length}/200 | Content: {content.length}/5000
                </span>
              </div>
              <Button 
                type="submit" 
                disabled={!title.trim() || !content.trim() || isSubmitting}
                className="rounded-full px-4 sm:px-6 text-sm"
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
        </DialogContent>
      </Dialog>
    </>
  );
};
