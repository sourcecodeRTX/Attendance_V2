"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  User,
  Bell,
  Sun,
  LogOut,
  ChevronRight,
} from "lucide-react";
import { useTheme } from "next-themes";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { signOut, updateUserProfile } from "@/lib/firebase/auth";
import { useAuthStore } from "@/lib/stores/auth-store";
import { useToast } from "@/hooks/use-toast";
import { LoadingSpinner } from "@/components/shared/loading-spinner";

export default function SettingsPage() {
  const router = useRouter();
  const { resolvedTheme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  const { user, preferences, updatePreferences, reset } = useAuthStore();

  useEffect(() => {
    setMounted(true);
  }, []);
  const { toast } = useToast();

  const [profileDialogOpen, setProfileDialogOpen] = useState(false);
  const [logoutLoading, setLogoutLoading] = useState(false);
  const [profileSaving, setProfileSaving] = useState(false);

  // Profile form
  const [profileForm, setProfileForm] = useState({
    displayName: user?.displayName || "",
    email: user?.email || "",
  });

  async function handleSaveProfile() {
    if (!user?.id) return;
    
    setProfileSaving(true);
    try {
      const updatedUser = await updateUserProfile(user.id, {
        displayName: profileForm.displayName,
      });
      
      // Update local store
      useAuthStore.getState().setUser(updatedUser);
      
      toast({
        title: "Profile Updated",
        description: "Your profile has been updated successfully",
      });
      setProfileDialogOpen(false);
    } catch {
      toast({
        title: "Error",
        description: "Failed to update profile",
        variant: "destructive",
      });
    } finally {
      setProfileSaving(false);
    }
  }

  return (
    <div className="space-y-6 max-w-2xl">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold">Settings</h1>
        <p className="text-muted-foreground">
          Manage your account and preferences
        </p>
      </div>

      {/* Profile Section */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <User className="h-5 w-5" />
            Profile
          </CardTitle>
          <CardDescription>
            Manage your personal information
          </CardDescription>
        </CardHeader>
        <CardContent>
          <button
            className="w-full flex items-center justify-between p-4 -m-4 hover:bg-muted/50 rounded-lg transition-colors"
            onClick={() => setProfileDialogOpen(true)}
          >
            <div className="flex items-center gap-4">
              <div className="h-12 w-12 rounded-full bg-primary flex items-center justify-center">
                <User className="h-6 w-6 text-primary-foreground" />
              </div>
              <div className="text-left">
                <p className="font-medium">
                  {user?.displayName || "Guest User"}
                </p>
                <p className="text-sm text-muted-foreground">
                  {user?.email || "Not signed in"}
                </p>
              </div>
            </div>
            <ChevronRight className="h-5 w-5 text-muted-foreground" />
          </button>
        </CardContent>
      </Card>

      {/* Appearance Section */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Sun className="h-5 w-5" />
            Appearance
          </CardTitle>
          <CardDescription>
            Customize how the app looks
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label>Dark Mode</Label>
              <p className="text-sm text-muted-foreground">
                Switch between light and dark themes
              </p>
            </div>
            <Switch
              checked={mounted ? resolvedTheme === "dark" : false}
              onCheckedChange={(checked) => setTheme(checked ? "dark" : "light")}
            />
          </div>
        </CardContent>
      </Card>

      {/* Preferences Section */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Bell className="h-5 w-5" />
            Preferences
          </CardTitle>
          <CardDescription>
            Configure app preferences
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label>Sound Effects</Label>
              <p className="text-sm text-muted-foreground">
                Play sounds for actions
              </p>
            </div>
            <Switch
              checked={preferences?.soundEnabled ?? true}
              onCheckedChange={(checked) =>
                updatePreferences({ soundEnabled: checked })
              }
            />
          </div>
        </CardContent>
      </Card>

      {/* Sign Out */}
      <Card>
        <CardContent className="pt-6">
          <Button 
            variant="outline" 
            className="w-full" 
            disabled={logoutLoading}
            onClick={async () => {
              setLogoutLoading(true);
              try {
                await signOut();
                reset();
                router.push("/login");
                toast({ title: "Signed out", description: "You have been signed out successfully" });
              } catch {
                toast({
                  title: "Error",
                  description: "Failed to sign out",
                  variant: "destructive",
                });
              } finally {
                setLogoutLoading(false);
              }
            }}
          >
            {logoutLoading && <LoadingSpinner size="sm" className="mr-2" />}
            <LogOut className="mr-2 h-4 w-4" />
            Sign Out
          </Button>
        </CardContent>
      </Card>

      {/* App Info */}
      <div className="text-center text-sm text-muted-foreground space-y-1">
        <p>ATT Tracker v2.0.0</p>
        <p>Built with Next.js 14</p>
      </div>

      {/* Profile Dialog */}
      <Dialog open={profileDialogOpen} onOpenChange={setProfileDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Profile</DialogTitle>
            <DialogDescription>
              Update your personal information
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="displayName">Display Name</Label>
              <Input
                id="displayName"
                value={profileForm.displayName}
                onChange={(e) =>
                  setProfileForm({ ...profileForm, displayName: e.target.value })
                }
                placeholder="Your name"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                value={profileForm.email}
                onChange={(e) =>
                  setProfileForm({ ...profileForm, email: e.target.value })
                }
                placeholder="your@email.com"
                disabled
              />
              <p className="text-xs text-muted-foreground">
                Email cannot be changed
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setProfileDialogOpen(false)} disabled={profileSaving}>
              Cancel
            </Button>
            <Button onClick={handleSaveProfile} disabled={profileSaving}>
              {profileSaving ? "Saving..." : "Save Changes"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

    </div>
  );
}
