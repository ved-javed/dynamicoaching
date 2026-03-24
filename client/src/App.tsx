import { Switch, Route, Redirect, Link, useLocation } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider, useQuery } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import Dashboard from "@/pages/Dashboard";
import Income from "@/pages/Income";
import Admission from "@/pages/Admission";
import Expenses from "@/pages/Expenses";
import ManageData from "@/pages/ManageData";
import EntryMarks from "@/pages/EntryMarks";
import Marksheet from "@/pages/Marksheet";
import LoginPage from "@/pages/Login";
import NotFound from "@/pages/not-found";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/app-sidebar";
import { useToast } from "@/hooks/use-toast";
import { useEffect } from "react";
import { io } from "socket.io-client";
import { type User } from "@/lib/schemas";
import { LayoutDashboard, Wallet, Receipt, Settings, UserPlus, FileCheck } from "lucide-react";

function Router() {
  const { data: user, isLoading } = useQuery<User>({ 
    queryKey: ["/api/user"],
    retry: false
  });
  const [location] = useLocation();
  const { toast } = useToast();

  useEffect(() => {
    if (user?.role === 'admin') {
      const socket = io();
      socket.emit("join-admin");
      socket.on("new-payment", (data) => {
        toast({
          title: "New Payment Received!",
          description: `৳${data.amount} recorded for ${data.studentName} by ${data.teacherName}`,
          duration: 10000,
        });
      });
      return () => {
        socket.disconnect();
      };
    }
  }, [user, toast]);

  if (isLoading) return null;

  if (!user) {
    return (
      <Switch>
        <Route path="/login" component={LoginPage} />
        <Route>
          <Redirect to="/login" />
        </Route>
      </Switch>
    );
  }

  return (
    <SidebarProvider defaultOpen={false}>
      <div className="flex h-svh w-full overflow-hidden bg-background">
        <AppSidebar />
        <div className="flex flex-col flex-1 overflow-hidden relative">
          <header className="flex items-center justify-between px-4 h-16 shrink-0 bg-white backdrop-blur-md border-b z-20">
            <div className="flex items-center gap-4">
              <SidebarTrigger data-testid="button-sidebar-toggle" className="md:flex" />
              <div className="font-display font-black text-primary truncate tracking-tight hidden sm:block text-xl uppercase">
                Dynamic Coaching Center
              </div>
            </div>
          </header>
          <main className="flex-1 overflow-auto bg-muted/30 px-2 py-3 md:p-6 pb-28 md:pb-28 w-full">
            <Switch>
              {user.role === 'admin' ? (
                <Route path="/" component={Dashboard} />
              ) : user.role === 'student' ? (
                <Route path="/" component={Dashboard} />
              ) : (
                <Route path="/">
                  <Redirect to="/income" />
                </Route>
              )}
              <Route path="/income" component={Income} />
              <Route path="/results" component={EntryMarks} />
              <Route path="/marksheet" component={Marksheet} />
              <Route path="/admission">
                {user.role === 'teacher' ? <Admission /> : <Redirect to="/" />}
              </Route>
              {user.role === 'admin' && (
                <>
                  <Route path="/expenses" component={Expenses} />
                  <Route path="/manage" component={ManageData} />
                </>
              )}
              <Route path="/login">
                <Redirect to="/" />
              </Route>
              <Route component={NotFound} />
            </Switch>
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
}

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Router />
        <Toaster />
      </TooltipProvider>
    </QueryClientProvider>
  );
}
