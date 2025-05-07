import { useState } from "react";
import { Link, useLocation } from "wouter";
import { useAuth } from "@/hooks/use-auth";
import { useMobile } from "@/hooks/use-mobile";
import { Shield, LogOut } from "lucide-react";
import { Button } from "@/components/ui/button";
import { 
  Sheet,
  SheetContent,
  SheetTrigger,
} from "@/components/ui/sheet";

const navigation = [
  { name: "Dashboard", path: "/", icon: "ri-dashboard-line" },
  { name: "Users", path: "/users", icon: "ri-user-settings-line" },
  { name: "Devices", path: "/devices", icon: "ri-device-line" },
  { name: "Media", path: "/media", icon: "ri-image-2-line" },
  { name: "System Settings", path: "/settings", icon: "ri-settings-4-line" },
];

export default function Sidebar() {
  const [location] = useLocation();
  const { user, logoutMutation } = useAuth();
  const isMobile = useMobile();
  const [isOpen, setIsOpen] = useState(false);

  const handleLogout = () => {
    logoutMutation.mutate();
  };

  const SidebarContent = () => (
    <div className="flex flex-col h-full bg-secondary text-white">
      <div className="p-4 border-b border-neutral-700">
        <div className="flex items-center gap-3">
          <div className="bg-primary rounded-lg p-2">
            <Shield className="h-5 w-5 text-white" />
          </div>
          <h1 className="text-xl font-bold">SecureAccess</h1>
        </div>
      </div>
      
      <nav className="flex-1 px-2 py-4 space-y-1">
        <div>
          <p className="px-3 text-xs font-semibold text-neutral-400 uppercase tracking-wider mb-2">Main</p>
          {navigation.slice(0, 4).map((item) => (
            <Link 
              key={item.path} 
              href={item.path}
              className={`flex items-center px-3 py-2 text-sm font-medium rounded-md ${
                location === item.path
                  ? "bg-neutral-800 text-white"
                  : "text-neutral-300 hover:bg-neutral-800 hover:text-white"
              }`}
              onClick={() => isMobile && setIsOpen(false)}
            >
              <i className={`${item.icon} mr-3 text-lg`}></i>
              {item.name}
            </Link>
          ))}
        </div>
        
        <div className="mt-8">
          <p className="px-3 text-xs font-semibold text-neutral-400 uppercase tracking-wider mb-2">Administration</p>
          {navigation.slice(4).map((item) => (
            <Link 
              key={item.path} 
              href={item.path}
              className={`flex items-center px-3 py-2 text-sm font-medium rounded-md ${
                location === item.path
                  ? "bg-neutral-800 text-white"
                  : "text-neutral-300 hover:bg-neutral-800 hover:text-white"
              }`}
              onClick={() => isMobile && setIsOpen(false)}
            >
              <i className={`${item.icon} mr-3 text-lg`}></i>
              {item.name}
            </Link>
          ))}
          <Link 
            href="#" 
            className="flex items-center px-3 py-2 text-sm font-medium rounded-md text-neutral-300 hover:bg-neutral-800 hover:text-white"
            onClick={() => isMobile && setIsOpen(false)}
          >
            <i className="ri-key-2-line mr-3 text-lg"></i>
            API Management
          </Link>
          <Link 
            href="#" 
            className="flex items-center px-3 py-2 text-sm font-medium rounded-md text-neutral-300 hover:bg-neutral-800 hover:text-white"
            onClick={() => isMobile && setIsOpen(false)}
          >
            <i className="ri-file-list-3-line mr-3 text-lg"></i>
            Audit Logs
          </Link>
        </div>
      </nav>
      
      <div className="p-4 border-t border-neutral-700">
        <div className="flex items-center">
          <div className="h-8 w-8 rounded-full bg-neutral-500 flex items-center justify-center text-white">
            {user?.fullName?.charAt(0) || 'A'}
          </div>
          <div className="ml-3">
            <p className="text-sm font-medium text-white">{user?.fullName || 'Admin User'}</p>
            <p className="text-xs text-neutral-400">{user?.role || 'Administrator'}</p>
          </div>
          <button 
            className="ml-auto text-neutral-400 hover:text-white"
            onClick={handleLogout}
          >
            <LogOut className="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  );

  if (isMobile) {
    return (
      <>
        <div className="fixed top-0 left-0 z-20 p-4">
          <Sheet open={isOpen} onOpenChange={setIsOpen}>
            <SheetTrigger asChild>
              <Button variant="ghost" size="icon" className="md:hidden text-neutral-700">
                <i className="ri-menu-line text-2xl"></i>
                <span className="sr-only">Toggle menu</span>
              </Button>
            </SheetTrigger>
            <SheetContent side="left" className="p-0 w-64 border-r-0">
              <SidebarContent />
            </SheetContent>
          </Sheet>
        </div>
      </>
    );
  }

  return (
    <aside className="hidden md:flex flex-col w-64 bg-secondary text-white overflow-y-auto">
      <SidebarContent />
    </aside>
  );
}
