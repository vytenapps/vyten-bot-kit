import * as React from "react"
import { useState, useEffect, useRef } from "react"
import {
  User,
  Bell,
  Globe,
  Paintbrush,
  Lock,
  Settings,
  Check,
} from "lucide-react"
import { supabase } from "@/integrations/supabase/client"
import { toast } from "sonner"
import { useTheme } from "@/components/theme-provider"
import { ThemeSwitcher } from "@/components/theme-switcher"
import { applyBaseColor, getStoredBaseColor, baseColors, type BaseColor } from "@/lib/colors"

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
  })
  const saveTimeoutRef = useRef<NodeJS.Timeout>()
  const isInitialLoad = useRef(true)
  const previousProfileRef = useRef(profile)
  const [baseColor, setBaseColor] = useState<BaseColor>(getStoredBaseColor())
  const { theme, setTheme } = useTheme()

  // Apply base color when theme changes
  useEffect(() => {
    applyBaseColor(baseColor)
  }, [theme, baseColor])

  useEffect(() => {
    if (open) {
      loadProfile()
      isInitialLoad.current = true
    }
  }, [open])

  // Autosave effect
  useEffect(() => {
    // Skip autosave if dialog is closed or on initial load
    if (!open || isInitialLoad.current) {
      isInitialLoad.current = false
      return
    }

    // Clear existing timeout
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current)
    }

    // Set new timeout for autosave
    saveTimeoutRef.current = setTimeout(async () => {
      await autoSave()
    }, 1000)

    return () => {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current)
      }
    }
  }, [profile, open])

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
        const privacyData = data.privacy_settings as any
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
        })
      }
    } catch (error: any) {
      toast.error("Failed to load profile", {
        description: error.message,
      })
    } finally {
      setLoading(false)
    }
  }

  const getChangedField = () => {
    const prev = previousProfileRef.current
    
    if (prev.username !== profile.username) return "Username"
    if (prev.first_name !== profile.first_name) return "First name"
    if (prev.last_name !== profile.last_name) return "Last name"
    if (prev.phone !== profile.phone) return "Phone number"
    if (prev.bio !== profile.bio) return "Bio"
    
    // Check privacy settings
    if (prev.privacy_settings.full_name !== profile.privacy_settings.full_name) return "Full name privacy"
    if (prev.privacy_settings.email !== profile.privacy_settings.email) return "Email privacy"
    if (prev.privacy_settings.phone !== profile.privacy_settings.phone) return "Phone privacy"
    
    // Check social links
    if (prev.social.instagram !== profile.social.instagram) return "Instagram"
    if (prev.social.linkedin !== profile.social.linkedin) return "LinkedIn"
    if (prev.social.x !== profile.social.x) return "X (Twitter)"
    if (prev.social.facebook !== profile.social.facebook) return "Facebook"
    if (prev.social.youtube !== profile.social.youtube) return "YouTube"
    if (prev.social.tiktok !== profile.social.tiktok) return "TikTok"
    
    return "Profile"
  }

  const autoSave = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      const changedField = getChangedField()

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
        })

      if (error) throw error

      toast.success(`${changedField} saved`)
      previousProfileRef.current = profile
    } catch (error: any) {
      toast.error("Failed to save profile", {
        description: error.message,
      })
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
                <Label htmlFor="phone">Phone Number</Label>
                <Input
                  id="phone"
                  type="tel"
                  value={profile.phone}
                  onChange={(e) => setProfile({ ...profile, phone: e.target.value })}
                  placeholder="+1 (555) 123-4567"
                />
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
            
            <div className="space-y-6">
              <div className="space-y-4">
                <div>
                  <Label className="text-base">Theme</Label>
                  <p className="text-sm text-muted-foreground mb-3">
                    Select your preferred theme mode
                  </p>
                </div>
                <ThemeSwitcher />
              </div>

              <div className="space-y-4">
                <div>
                  <Label className="text-base">Color</Label>
                  <p className="text-sm text-muted-foreground mb-3">
                    Choose your accent color
                  </p>
                </div>
                <div className="flex gap-3">
                  {(Object.keys(baseColors) as BaseColor[]).map((color) => (
                    <button
                      key={color}
                      onClick={() => {
                        setBaseColor(color)
                        applyBaseColor(color)
                        toast.success(`${baseColors[color].name} theme applied`)
                      }}
                      className="relative group"
                      aria-label={`Select ${baseColors[color].name} color`}
                    >
                      <div
                        className="w-10 h-10 rounded-full border-2 border-border transition-transform group-hover:scale-110"
                        style={{
                          background: color === "neutral" ? "hsl(0 0% 50%)" :
                                     color === "zinc" ? "hsl(240 5% 50%)" :
                                     color === "slate" ? "hsl(215 20% 50%)" :
                                     color === "gray" ? "hsl(220 15% 50%)" :
                                     "hsl(25 10% 50%)",
                        }}
                      />
                      {baseColor === color && (
                        <div className="absolute inset-0 flex items-center justify-center">
                          <Check className="w-5 h-5 text-white drop-shadow-md" />
                        </div>
                      )}
                      <span className="absolute -bottom-6 left-1/2 -translate-x-1/2 text-xs whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity">
                        {baseColors[color].name}
                      </span>
                    </button>
                  ))}
                </div>
              </div>
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
            
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="language">Display Language</Label>
                <select
                  id="language"
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                  defaultValue="en"
                >
                  <option value="en">English</option>
                </select>
                <p className="text-xs text-muted-foreground">
                  Choose your preferred language for the interface
                </p>
              </div>
            </div>
          </div>
        )
      
      case "privacy":
        return (
          <div className="space-y-6">
            <div>
              <h2 className="text-2xl font-bold">Privacy & Visibility</h2>
              <p className="text-muted-foreground mt-1">
                Control who can see your personal information
              </p>
            </div>

            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Full Name Visibility</Label>
                <p className="text-xs text-muted-foreground mb-2">
                  Choose who can see your full name
                </p>
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
                <p className="text-xs text-muted-foreground mb-2">
                  Choose who can see your email address
                </p>
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
                <p className="text-xs text-muted-foreground mb-2">
                  Choose who can see your phone number
                </p>
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
