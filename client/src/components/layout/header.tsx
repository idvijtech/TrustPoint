import { useState } from "react";
import { Bell, HelpCircle, Menu } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useMobile } from "@/hooks/use-mobile";

export default function Header() {
  const [notifications, setNotifications] = useState([
    {
      id: 1,
      title: "System update available",
      description: "New security patches available for installation",
      time: "5 minutes ago",
    },
    {
      id: 2,
      title: "New user registered",
      description: "Jane Smith was added to the system",
      time: "1 hour ago",
    },
  ]);

  const isMobile = useMobile();

  return (
    <header className="bg-white border-b border-neutral-200 shadow-sm">
      <div className="flex items-center justify-between h-16 px-4 md:px-6">
        <div className="flex items-center md:hidden">
          <h1 className="text-lg font-bold text-secondary">SecureAccess</h1>
        </div>
        
        <div className="flex items-center ml-auto space-x-4">
          <div className="relative">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="relative">
                  <span className="absolute top-0 right-0 h-2 w-2 rounded-full bg-error"></span>
                  <Bell className="h-5 w-5 text-neutral-500" />
                  <span className="sr-only">Notifications</span>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-80">
                <DropdownMenuLabel className="flex items-center justify-between">
                  Notifications
                  <Button variant="ghost" size="sm" className="text-xs">
                    Mark all as read
                  </Button>
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                {notifications.length === 0 ? (
                  <div className="py-4 px-2 text-center text-sm text-muted-foreground">
                    No notifications
                  </div>
                ) : (
                  notifications.map((notification) => (
                    <DropdownMenuItem key={notification.id} className="p-2 cursor-pointer">
                      <div>
                        <div className="text-sm font-medium">{notification.title}</div>
                        <div className="text-xs text-muted-foreground mt-1">
                          {notification.description}
                        </div>
                        <div className="text-xs text-neutral-400 mt-1">
                          {notification.time}
                        </div>
                      </div>
                    </DropdownMenuItem>
                  ))
                )}
                <DropdownMenuSeparator />
                <DropdownMenuItem className="p-2 justify-center">
                  <Button variant="ghost" size="sm" className="w-full text-primary text-xs">
                    View all notifications
                  </Button>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
          
          <div className="relative">
            <Button variant="ghost" size="icon">
              <HelpCircle className="h-5 w-5 text-neutral-500" />
              <span className="sr-only">Help</span>
            </Button>
          </div>
          
          <div className="border-l border-neutral-200 h-6 mx-2"></div>
          
          {isMobile && (
            <div className="flex items-center">
              <Button variant="ghost" size="icon" className="rounded-full">
                <div className="h-8 w-8 rounded-full bg-neutral-200 flex items-center justify-center text-neutral-700">
                  A
                </div>
              </Button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
