import { useState, useCallback } from "react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Loader2, Upload, X, User } from "lucide-react";
import { useDropzone } from "react-dropzone";
import { cn } from "@/lib/utils";

interface AvatarUploadProps {
  userId: string;
  currentAvatarUrl?: string | null;
  username?: string;
  onAvatarChange?: (url: string | null) => void;
  size?: "sm" | "md" | "lg" | "xl";
}

const sizeClasses = {
  sm: "h-16 w-16",
  md: "h-24 w-24",
  lg: "h-32 w-32",
  xl: "h-40 w-40",
};

export function AvatarUpload({
  userId,
  currentAvatarUrl,
  username = "User",
  onAvatarChange,
  size = "lg",
}: AvatarUploadProps) {
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
  });

  const getInitials = () => {
    return username
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  };

  return (
    <>
      <div className="flex flex-col items-center gap-4">
        <div
          {...getRootProps()}
          className={cn(
            "relative cursor-pointer group",
            isDragActive && "opacity-50"
          )}
        >
          <input {...getInputProps()} />
          <Avatar
            className={cn(sizeClasses[size], "transition-opacity")}
            onClick={(e) => {
              if (previewUrl && !uploading) {
                e.stopPropagation();
                setShowModal(true);
              }
            }}
          >
            {previewUrl ? (
              <AvatarImage src={previewUrl} alt={username} />
            ) : null}
            <AvatarFallback className="bg-muted text-muted-foreground">
              {uploading ? (
                <Loader2 className="h-8 w-8 animate-spin" />
              ) : (
                <User className="h-8 w-8" />
              )}
            </AvatarFallback>
          </Avatar>

          {!uploading && (
            <div className="absolute inset-0 flex items-center justify-center bg-black/50 rounded-full opacity-0 group-hover:opacity-100 transition-opacity">
              <Upload className="h-6 w-6 text-white" />
            </div>
          )}
        </div>

        <div className="flex gap-2">
          {previewUrl && !uploading && (
            <Button
              variant="outline"
              size="sm"
              onClick={deleteAvatar}
              disabled={uploading}
            >
              <X className="h-4 w-4 mr-2" />
              Delete
            </Button>
          )}
        </div>

        <p className="text-sm text-muted-foreground text-center">
          {isDragActive
            ? "Drop your avatar here"
            : "Click or drag to upload an avatar"}
        </p>
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
