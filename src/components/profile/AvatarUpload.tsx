import { useState, useCallback, useRef } from "react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Loader2, X, User } from "lucide-react";
import { useDropzone } from "react-dropzone";
import { cn } from "@/lib/utils";

interface AvatarUploadProps {
  userId: string;
  currentAvatarUrl?: string | null;
  username?: string;
  firstName?: string;
  lastName?: string;
  onAvatarChange?: (url: string | null) => void;
}

export function AvatarUpload({
  userId,
  currentAvatarUrl,
  username = "User",
  firstName = "",
  lastName = "",
  onAvatarChange,
}: AvatarUploadProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(currentAvatarUrl || null);

  const uploadAvatar = async (file: File) => {
    try {
      setUploading(true);

      // Delete old avatar if exists
      if (currentAvatarUrl) {
        const oldPath = currentAvatarUrl.split("/").pop();
        if (oldPath) {
          await supabase.storage
            .from("avatars")
            .remove([`${userId}/${oldPath}`]);
        }
      }

      // Upload new avatar
      const fileExt = file.name.split(".").pop();
      const fileName = `${Math.random()}.${fileExt}`;
      const filePath = `${userId}/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from("avatars")
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      // Get public URL
      const { data } = supabase.storage
        .from("avatars")
        .getPublicUrl(filePath);

      const publicUrl = data.publicUrl;

      // Update user profile
      const { error: updateError } = await supabase
        .from("user_profiles")
        .update({ avatar_url: publicUrl })
        .eq("user_id", userId);

      if (updateError) throw updateError;

      setPreviewUrl(publicUrl);
      onAvatarChange?.(publicUrl);
      toast.success("Avatar uploaded successfully");
    } catch (error: any) {
      toast.error("Failed to upload avatar", {
        description: error.message,
      });
    } finally {
      setUploading(false);
    }
  };

  const deleteAvatar = async () => {
    try {
      setUploading(true);

      if (currentAvatarUrl) {
        const oldPath = currentAvatarUrl.split("/").pop();
        if (oldPath) {
          await supabase.storage
            .from("avatars")
            .remove([`${userId}/${oldPath}`]);
        }
      }

      // Update user profile
      const { error } = await supabase
        .from("user_profiles")
        .update({ avatar_url: null })
        .eq("user_id", userId);

      if (error) throw error;

      setPreviewUrl(null);
      onAvatarChange?.(null);
      toast.success("Avatar deleted");
    } catch (error: any) {
      toast.error("Failed to delete avatar", {
        description: error.message,
      });
    } finally {
      setUploading(false);
    }
  };

  const onDrop = useCallback(
    (acceptedFiles: File[]) => {
      if (acceptedFiles.length > 0) {
        uploadAvatar(acceptedFiles[0]);
      }
    },
    [userId, currentAvatarUrl]
  );

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      "image/jpeg": [".jpg", ".jpeg"],
      "image/png": [".png"],
      "image/webp": [".webp"],
      "image/gif": [".gif"],
    },
    maxFiles: 1,
    maxSize: 5242880, // 5MB
    disabled: uploading,
    noClick: true,
  });

  const fullName = [firstName, lastName].filter(Boolean).join(" ");

  return (
    <>
      <div
        {...getRootProps()}
        className={cn(
          "flex items-center gap-4 p-6 bg-muted/50 rounded-lg",
          isDragActive && "border-2 border-primary border-dashed"
        )}
      >
        <input {...getInputProps()} />
        <input
          ref={fileInputRef}
          type="file"
          className="hidden"
          accept="image/jpeg,image/jpg,image/png,image/webp,image/gif"
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) uploadAvatar(file);
          }}
        />
        
        <div className="relative group">
          <Avatar
            className="h-20 w-20 cursor-pointer"
            onClick={() => {
              if (previewUrl && !uploading) {
                setShowModal(true);
              }
            }}
          >
            {previewUrl ? (
              <AvatarImage src={previewUrl} alt={username} />
            ) : null}
            <AvatarFallback className="bg-muted text-muted-foreground">
              {uploading ? (
                <Loader2 className="h-6 w-6 animate-spin" />
              ) : (
                <User className="h-6 w-6" />
              )}
            </AvatarFallback>
          </Avatar>

          {previewUrl && !uploading && (
            <Button
              variant="destructive"
              size="icon"
              className="absolute -top-1 -right-1 h-6 w-6 rounded-full shadow-lg"
              onClick={deleteAvatar}
            >
              <X className="h-3 w-3" />
            </Button>
          )}
        </div>

        <div className="flex-1">
          <div className="font-semibold text-foreground">{username}</div>
          {fullName && (
            <div className="text-sm text-muted-foreground">{fullName}</div>
          )}
        </div>

        <Button
          variant="default"
          onClick={() => fileInputRef.current?.click()}
          disabled={uploading}
        >
          {uploading ? (
            <>
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              Uploading...
            </>
          ) : (
            "Change photo"
          )}
        </Button>
      </div>

      <Dialog open={showModal} onOpenChange={setShowModal}>
        <DialogContent className="max-w-2xl">
          <div className="flex items-center justify-center p-4">
            {previewUrl && (
              <img
                src={previewUrl}
                alt={username}
                className="max-w-full max-h-[70vh] object-contain rounded-lg"
              />
            )}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
