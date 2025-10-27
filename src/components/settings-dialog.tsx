"use client"

import * as React from "react"
import { useState, useEffect } from "react"
import {
  User,
  Bell,
  Globe,
  Paintbrush,
  Lock,
  Settings,
} from "lucide-react"
import { supabase } from "@/integrations/supabase/client"
import { useToast } from "@/hooks/use-toast"

import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarProvider,
} from "@/components/ui/sidebar"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"

const data = {
  nav: [
    { name: "Profile", icon: User, id: "profile" },
    { name: "Notifications", icon: Bell, id: "notifications" },
    { name: "Appearance", icon: Paintbrush, id: "appearance" },
    { name: "Language & region", icon: Globe, id: "language" },
    { name: "Privacy & visibility", icon: Lock, id: "privacy" },
    { name: "Advanced", icon: Settings, id: "advanced" },
  ],
}

interface SettingsDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function SettingsDialog({ open, onOpenChange }: SettingsDialogProps) {
  const [activeSection, setActiveSection] = React.useState("profile")
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
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
  })
  const { toast } = useToast()

  useEffect(() => {
    if (open) {
      loadProfile()
    }
  }, [open])

  const loadProfile = async () => {
    setLoading(true)
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      const { data, error } = await supabase
        .from("user_profiles")
        .select("*")
        .eq("user_id", user.id)
        .single()

      if (error && error.code !== "PGRST116") throw error

      if (data) {
        const socialData = data.social as any
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
        })
      }
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  const handleSave = async () => {
    setSaving(true)
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error("Not authenticated")

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
        })

      if (error) throw error

      toast({
        title: "Success",
        description: "Profile updated successfully.",
      })
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      })
    } finally {
      setSaving(false)
    }
  }

  const renderContent = () => {
    if (loading && activeSection === "profile") {
      return (
        <div className="flex items-center justify-center h-full">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </div>
      )
    }

    switch (activeSection) {
      case "profile":
        return (
          <div className="space-y-6">
            <div>
              <h2 className="text-2xl font-bold">Profile Settings</h2>
              <p className="text-muted-foreground mt-1">
                Manage your account information and preferences
              </p>
            </div>

            <div className="space-y-4">
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
                <p className="text-xs text-muted-foreground">
                  Email cannot be changed
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="bio">Bio</Label>
                <Textarea
                  id="bio"
                  value={profile.bio}
                  onChange={(e) => setProfile({ ...profile, bio: e.target.value })}
                  placeholder="Tell us about yourself..."
                  rows={3}
                />
              </div>

              <div className="space-y-4">
                <h3 className="text-lg font-semibold">Social Links</h3>
                
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

              <Button 
                onClick={handleSave} 
                disabled={saving}
                className="w-full sm:w-auto"
              >
                {saving ? "Saving..." : "Save Changes"}
              </Button>
            </div>
          </div>
        )
      
      case "notifications":
        return (
          <div className="space-y-6">
            <div>
              <h2 className="text-2xl font-bold">Notifications</h2>
              <p className="text-muted-foreground mt-1">
                Configure how you receive notifications
              </p>
            </div>
            <div className="bg-muted/50 aspect-video max-w-3xl rounded-xl flex items-center justify-center text-muted-foreground">
              Notification settings coming soon
            </div>
          </div>
        )
      
      case "appearance":
        return (
          <div className="space-y-6">
            <div>
              <h2 className="text-2xl font-bold">Appearance</h2>
              <p className="text-muted-foreground mt-1">
                Customize how the app looks
              </p>
            </div>
            <div className="bg-muted/50 aspect-video max-w-3xl rounded-xl flex items-center justify-center text-muted-foreground">
              Appearance settings coming soon
            </div>
          </div>
        )
      
      case "language":
        return (
          <div className="space-y-6">
            <div>
              <h2 className="text-2xl font-bold">Language & Region</h2>
              <p className="text-muted-foreground mt-1">
                Set your language and regional preferences
              </p>
            </div>
            <div className="bg-muted/50 aspect-video max-w-3xl rounded-xl flex items-center justify-center text-muted-foreground">
              Language settings coming soon
            </div>
          </div>
        )
      
      case "privacy":
        return (
          <div className="space-y-6">
            <div>
              <h2 className="text-2xl font-bold">Privacy & Visibility</h2>
              <p className="text-muted-foreground mt-1">
                Control your privacy and visibility settings
              </p>
            </div>
            <div className="bg-muted/50 aspect-video max-w-3xl rounded-xl flex items-center justify-center text-muted-foreground">
              Privacy settings coming soon
            </div>
          </div>
        )
      
      case "advanced":
        return (
          <div className="space-y-6">
            <div>
              <h2 className="text-2xl font-bold">Advanced Settings</h2>
              <p className="text-muted-foreground mt-1">
                Advanced configuration options
              </p>
            </div>
            <div className="bg-muted/50 aspect-video max-w-3xl rounded-xl flex items-center justify-center text-muted-foreground">
              Advanced settings coming soon
            </div>
          </div>
        )
      
      default:
        return null
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="overflow-hidden p-0 md:max-h-[500px] md:max-w-[700px] lg:max-w-[800px]">
        <DialogTitle className="sr-only">Settings</DialogTitle>
        <DialogDescription className="sr-only">
          Customize your settings here.
        </DialogDescription>
        <SidebarProvider className="items-start">
          <Sidebar collapsible="none" className="hidden md:flex">
            <SidebarContent>
              <SidebarGroup>
                <SidebarGroupContent>
                  <SidebarMenu>
                    {data.nav.map((item) => (
                      <SidebarMenuItem key={item.name}>
                        <SidebarMenuButton
                          asChild
                          isActive={item.id === activeSection}
                          onClick={() => setActiveSection(item.id)}
                        >
                          <button>
                            <item.icon />
                            <span>{item.name}</span>
                          </button>
                        </SidebarMenuButton>
                      </SidebarMenuItem>
                    ))}
                  </SidebarMenu>
                </SidebarGroupContent>
              </SidebarGroup>
            </SidebarContent>
          </Sidebar>
          <main className="flex h-[480px] flex-1 flex-col overflow-hidden">
            <header className="flex h-16 shrink-0 items-center gap-2 transition-[width,height] ease-linear group-has-data-[collapsible=icon]/sidebar-wrapper:h-12">
              <div className="flex items-center gap-2 px-4">
                <Breadcrumb>
                  <BreadcrumbList>
                    <BreadcrumbItem className="hidden md:block">
                      <BreadcrumbLink href="#">Settings</BreadcrumbLink>
                    </BreadcrumbItem>
                    <BreadcrumbSeparator className="hidden md:block" />
                    <BreadcrumbItem>
                      <BreadcrumbPage>
                        {data.nav.find(item => item.id === activeSection)?.name}
                      </BreadcrumbPage>
                    </BreadcrumbItem>
                  </BreadcrumbList>
                </Breadcrumb>
              </div>
            </header>
            <div className="flex flex-1 flex-col gap-4 overflow-y-auto p-4 pt-0">
              {renderContent()}
            </div>
          </main>
        </SidebarProvider>
      </DialogContent>
    </Dialog>
  )
}
