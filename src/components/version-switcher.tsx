"use client"

import * as React from "react"
import { supabase } from "@/integrations/supabase/client"
import { VytenIcon } from "@/components/VytenIcon"

import {
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar"

export function VersionSwitcher() {
  const [userRole, setUserRole] = React.useState<string>("Guest")
  const [loading, setLoading] = React.useState(true)

  React.useEffect(() => {
    const fetchUserRole = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser()
        
        if (!user) {
          setUserRole("Guest")
          setLoading(false)
          return
        }

        const { data: roleData, error } = await supabase
          .from("user_roles")
          .select("role")
          .eq("user_id", user.id)
          .single()

        if (error || !roleData) {
          setUserRole("Member")
        } else {
          // Capitalize first letter of role
          const role = roleData.role.charAt(0).toUpperCase() + roleData.role.slice(1)
          setUserRole(role)
        }
      } catch (error) {
        console.error("Error fetching user role:", error)
        setUserRole("Guest")
      } finally {
        setLoading(false)
      }
    }

    fetchUserRole()

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(() => {
      fetchUserRole()
    })

    return () => subscription.unsubscribe()
  }, [])

  const handleClick = () => {
    window.open(
      'https://vyten.com?utm_source=lovable&utm_medium=logo_link&utm_campaign=vyten-bot-kit&utm_content=sidebar_logo',
      '_blank',
      'noopener,noreferrer'
    );
  };

  return (
    <SidebarMenu>
      <SidebarMenuItem>
        <SidebarMenuButton size="lg" onClick={handleClick} className="cursor-pointer">
          <div className="bg-sidebar-primary text-sidebar-primary-foreground flex aspect-square size-8 items-center justify-center rounded-lg">
            <VytenIcon className="size-5" />
          </div>
          <div className="flex flex-col gap-0.5 leading-none">
            <span className="font-medium">Vyten Bot Kit</span>
            <span className="text-xs text-muted-foreground">
              {loading ? "..." : userRole}
            </span>
          </div>
        </SidebarMenuButton>
      </SidebarMenuItem>
    </SidebarMenu>
  )
}
