import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { Loader2, ArrowLeft } from "lucide-react";

const Profile = () => {
  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState({
    username: "",
    first_name: "",
    last_name: "",
    email: "",
    phone: "",
    bio: "",
    privacy_settings: {
      full_name: "only_me",
      email: "only_me",
      phone: "only_me",
    },
    social: {
      instagram: "",
      linkedin: "",
      x: "",
      facebook: "",
      youtube: "",
      tiktok: "",
    },
  });
  const navigate = useNavigate();
  const saveTimeoutRef = useRef<NodeJS.Timeout>();
  const isInitialLoad = useRef(true);

  useEffect(() => {
    loadProfile();
  }, []);

  // Autosave effect
  useEffect(() => {
    // Skip autosave on initial load
    if (isInitialLoad.current) {
      isInitialLoad.current = false;
      return;
    }

    // Clear existing timeout
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
    }

    // Set new timeout for autosave
    saveTimeoutRef.current = setTimeout(async () => {
      await autoSave();
    }, 1000);

    return () => {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }
    };
  }, [profile]);

  const loadProfile = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        navigate("/auth");
        return;
      }

      const { data, error } = await supabase
        .from("user_profiles")
        .select("*")
        .eq("user_id", user.id)
        .single();

      if (error && error.code !== "PGRST116") throw error;

      if (data) {
        const socialData = data.social as any;
        const privacyData = data.privacy_settings as any;
        setProfile({
          username: data.username || "",
          first_name: data.first_name || "",
          last_name: data.last_name || "",
          email: data.email || "",
          phone: data.phone || "",
          bio: data.bio || "",
          privacy_settings: {
            full_name: privacyData?.full_name || "only_me",
            email: privacyData?.email || "only_me",
            phone: privacyData?.phone || "only_me",
          },
          social: {
            instagram: socialData?.instagram || "",
            linkedin: socialData?.linkedin || "",
            x: socialData?.x || "",
            facebook: socialData?.facebook || "",
            youtube: socialData?.youtube || "",
            tiktok: socialData?.tiktok || "",
          },
        });
      }
    } catch (error: any) {
      toast.error("Failed to load profile", {
        description: error.message,
      });
    } finally {
      setLoading(false);
    }
  };

  const autoSave = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { error } = await supabase
        .from("user_profiles")
        .upsert({
          user_id: user.id,
          username: profile.username,
          first_name: profile.first_name,
          last_name: profile.last_name,
          email: profile.email,
          phone: profile.phone,
          bio: profile.bio,
          privacy_settings: profile.privacy_settings,
          social: profile.social,
        });

      if (error) throw error;

      toast.success("Profile saved");
    } catch (error: any) {
      toast.error("Failed to save profile", {
        description: error.message,
      });
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background p-8">
      <div className="mx-auto max-w-2xl">
        <Button
          variant="ghost"
          onClick={() => navigate("/chat")}
          className="mb-6"
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to chat
        </Button>

        <h1 className="mb-8 text-3xl font-bold">Profile Settings</h1>

        <div className="space-y-8">
          <div className="space-y-4">
            <h2 className="text-xl font-semibold">Basic Information</h2>
            
            <div className="space-y-2">
              <Label htmlFor="username">Username</Label>
              <Input
                id="username"
                value={profile.username}
                onChange={(e) => setProfile({ ...profile, username: e.target.value })}
                required
                minLength={3}
                maxLength={32}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="first_name">First Name</Label>
                <Input
                  id="first_name"
                  value={profile.first_name}
                  onChange={(e) => setProfile({ ...profile, first_name: e.target.value })}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="last_name">Last Name</Label>
                <Input
                  id="last_name"
                  value={profile.last_name}
                  onChange={(e) => setProfile({ ...profile, last_name: e.target.value })}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                value={profile.email}
                disabled
                className="bg-muted"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="phone">Phone Number</Label>
              <Input
                id="phone"
                type="tel"
                value={profile.phone}
                onChange={(e) => setProfile({ ...profile, phone: e.target.value })}
                placeholder="+1 (555) 123-4567"
              />
            </div>
          </div>

          <div className="space-y-4">
            <h2 className="text-xl font-semibold">Privacy Settings</h2>
            
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Full Name Visibility</Label>
                <div className="flex gap-4">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="radio"
                      name="full_name_privacy"
                      value="only_me"
                      checked={profile.privacy_settings.full_name === "only_me"}
                      onChange={(e) => setProfile({
                        ...profile,
                        privacy_settings: { ...profile.privacy_settings, full_name: e.target.value as "only_me" | "public" }
                      })}
                      className="w-4 h-4"
                    />
                    <span className="text-sm">Only Me</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="radio"
                      name="full_name_privacy"
                      value="public"
                      checked={profile.privacy_settings.full_name === "public"}
                      onChange={(e) => setProfile({
                        ...profile,
                        privacy_settings: { ...profile.privacy_settings, full_name: e.target.value as "only_me" | "public" }
                      })}
                      className="w-4 h-4"
                    />
                    <span className="text-sm">Public</span>
                  </label>
                </div>
              </div>

              <div className="space-y-2">
                <Label>Email Visibility</Label>
                <div className="flex gap-4">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="radio"
                      name="email_privacy"
                      value="only_me"
                      checked={profile.privacy_settings.email === "only_me"}
                      onChange={(e) => setProfile({
                        ...profile,
                        privacy_settings: { ...profile.privacy_settings, email: e.target.value as "only_me" | "public" }
                      })}
                      className="w-4 h-4"
                    />
                    <span className="text-sm">Only Me</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="radio"
                      name="email_privacy"
                      value="public"
                      checked={profile.privacy_settings.email === "public"}
                      onChange={(e) => setProfile({
                        ...profile,
                        privacy_settings: { ...profile.privacy_settings, email: e.target.value as "only_me" | "public" }
                      })}
                      className="w-4 h-4"
                    />
                    <span className="text-sm">Public</span>
                  </label>
                </div>
              </div>

              <div className="space-y-2">
                <Label>Phone Visibility</Label>
                <div className="flex gap-4">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="radio"
                      name="phone_privacy"
                      value="only_me"
                      checked={profile.privacy_settings.phone === "only_me"}
                      onChange={(e) => setProfile({
                        ...profile,
                        privacy_settings: { ...profile.privacy_settings, phone: e.target.value as "only_me" | "public" }
                      })}
                      className="w-4 h-4"
                    />
                    <span className="text-sm">Only Me</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="radio"
                      name="phone_privacy"
                      value="public"
                      checked={profile.privacy_settings.phone === "public"}
                      onChange={(e) => setProfile({
                        ...profile,
                        privacy_settings: { ...profile.privacy_settings, phone: e.target.value as "only_me" | "public" }
                      })}
                      className="w-4 h-4"
                    />
                    <span className="text-sm">Public</span>
                  </label>
                </div>
              </div>
            </div>
          </div>

          <div className="space-y-4">
            <h2 className="text-xl font-semibold">Bio</h2>
            <Textarea
              value={profile.bio}
              onChange={(e) => setProfile({ ...profile, bio: e.target.value })}
              placeholder="Tell us about yourself..."
              rows={4}
            />
          </div>

          <div className="space-y-4">
            <h2 className="text-xl font-semibold">Social Links</h2>
            
            <div className="space-y-2">
              <Label htmlFor="instagram">Instagram</Label>
              <Input
                id="instagram"
                type="url"
                placeholder="https://instagram.com/username"
                value={profile.social.instagram}
                onChange={(e) => setProfile({
                  ...profile,
                  social: { ...profile.social, instagram: e.target.value }
                })}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="linkedin">LinkedIn</Label>
              <Input
                id="linkedin"
                type="url"
                placeholder="https://linkedin.com/in/username"
                value={profile.social.linkedin}
                onChange={(e) => setProfile({
                  ...profile,
                  social: { ...profile.social, linkedin: e.target.value }
                })}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="x">X (Twitter)</Label>
              <Input
                id="x"
                type="url"
                placeholder="https://x.com/username"
                value={profile.social.x}
                onChange={(e) => setProfile({
                  ...profile,
                  social: { ...profile.social, x: e.target.value }
                })}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="facebook">Facebook</Label>
              <Input
                id="facebook"
                type="url"
                placeholder="https://facebook.com/username"
                value={profile.social.facebook}
                onChange={(e) => setProfile({
                  ...profile,
                  social: { ...profile.social, facebook: e.target.value }
                })}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="youtube">YouTube</Label>
              <Input
                id="youtube"
                type="url"
                placeholder="https://youtube.com/@username"
                value={profile.social.youtube}
                onChange={(e) => setProfile({
                  ...profile,
                  social: { ...profile.social, youtube: e.target.value }
                })}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="tiktok">TikTok</Label>
              <Input
                id="tiktok"
                type="url"
                placeholder="https://tiktok.com/@username"
                value={profile.social.tiktok}
                onChange={(e) => setProfile({
                  ...profile,
                  social: { ...profile.social, tiktok: e.target.value }
                })}
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Profile;
