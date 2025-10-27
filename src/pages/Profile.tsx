import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { Loader2, ArrowLeft } from "lucide-react";

const Profile = () => {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [profile, setProfile] = useState({
    username: "",
    first_name: "",
    last_name: "",
    email: "",
    bio: "",
    social: {
      instagram: "",
      linkedin: "",
      x: "",
      facebook: "",
      youtube: "",
      tiktok: "",
    },
  });
  const { toast } = useToast();
  const navigate = useNavigate();

  useEffect(() => {
    loadProfile();
  }, []);

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
        setProfile({
          username: data.username || "",
          first_name: data.first_name || "",
          last_name: data.last_name || "",
          email: data.email || "",
          bio: data.bio || "",
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
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const { error } = await supabase
        .from("user_profiles")
        .upsert({
          user_id: user.id,
          username: profile.username,
          first_name: profile.first_name,
          last_name: profile.last_name,
          email: profile.email,
          bio: profile.bio,
          social: profile.social,
        });

      if (error) throw error;

      toast({
        title: "Success",
        description: "Profile updated successfully.",
      });
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setSaving(false);
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

        <form onSubmit={handleSave} className="space-y-8">
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

          <Button type="submit" disabled={saving}>
            {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Save Changes
          </Button>
        </form>
      </div>
    </div>
  );
};

export default Profile;
