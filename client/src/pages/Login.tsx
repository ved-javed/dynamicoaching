import { useState } from "react";
import { useLocation } from "wouter";
import { useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { Shield, Lock, User as UserIcon, GraduationCap, ChevronLeft, ArrowRight, Sparkles, Eye, EyeOff } from "lucide-react";
import coachingLogo from "@assets/IMG_20260126_081644_1769393818079.jpg";

export default function LoginPage() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();

  const [role, setRole] = useState<"admin" | "teacher" | "student" | null>(null);
  const [isLogin, setIsLogin] = useState(true);
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  const loginMutation = useMutation({
    mutationFn: async (data: any) => {
      const res = await apiRequest("POST", "/api/login", data);
      return res.json();
    },
    onSuccess: (user) => {
      queryClient.setQueryData(["/api/user"], user);
      setLocation("/");
      toast({ title: "Logged in successfully" });
    },
    onError: (error: Error) => {
      toast({ variant: "destructive", title: "Login failed", description: error.message });
    }
  });

  const registerMutation = useMutation({
    mutationFn: async (data: any) => {
      const res = await apiRequest("POST", "/api/register", data);
      return res.json();
    },
    onSuccess: (user) => {
      queryClient.setQueryData(["/api/user"], user);
      setLocation("/");
      toast({ title: "Registered successfully" });
    },
    onError: (error: Error) => {
      toast({ variant: "destructive", title: "Registration failed", description: error.message });
    }
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const data = { username, password, role: isLogin ? undefined : role };
    if (isLogin) {
      loginMutation.mutate(data);
    } else {
      registerMutation.mutate(data);
    }
  };

  return (
    <div className="min-h-screen relative flex items-center justify-center bg-[#F8FAFC] overflow-hidden selection:bg-indigo-500/30">
      {/* Premium Background Effects */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-indigo-600/5 blur-[120px] rounded-full animate-pulse" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-blue-600/5 blur-[120px] rounded-full animate-pulse" style={{ animationDelay: '2s' }} />
      </div>

      <div className="w-full max-w-xl relative z-10 px-6 space-y-12 py-12">
        {/* Branding Section */}
        <div className="text-center space-y-6 animate-in fade-in slide-in-from-top-4 duration-1000">
          <div className="inline-flex relative group">
            <div className="absolute -inset-1 bg-primary/20 rounded-3xl blur opacity-25 group-hover:opacity-50 transition duration-1000 group-hover:duration-200" />
            <div className="relative flex items-center justify-center w-24 h-24 rounded-3xl bg-white border border-primary/10 shadow-xl overflow-hidden p-2">
              <img src={coachingLogo} alt="Coaching Logo" className="w-full h-full object-contain" />
            </div>
          </div>
          <div className="space-y-2">
            <h1 className="text-4xl md:text-5xl font-black tracking-tight text-primary font-display">
              Dynamic Coaching Center
            </h1>
            <p className="text-slate-500 text-sm font-bold uppercase tracking-[0.3em] flex items-center justify-center gap-2">
              <Sparkles className="w-4 h-4 text-primary" /> Come to Learn, Leave to Shine
            </p>
          </div>
        </div>

        {!role ? (
          /* Role Selection Cards */
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 animate-in fade-in slide-in-from-bottom-8 duration-1000 delay-300">
            {[
              { id: 'teacher', label: 'Teacher', icon: UserIcon, desc: 'Class Management', color: 'bg-blue-50 text-blue-600' },
              { id: 'admin', label: 'Authority', icon: Shield, desc: 'Core Dashboard', color: 'bg-indigo-50 text-indigo-600' },
              { id: 'student', label: 'Student', icon: GraduationCap, desc: 'Payment Tracking', color: 'bg-purple-50 text-purple-600' }
            ].map((item) => (
              <button 
                key={item.id}
                onClick={() => { setRole(item.id as any); setIsLogin(true); }}
                className="group relative flex flex-col items-center text-center p-8 rounded-[2rem] bg-white border border-primary/5 shadow-sm hover:shadow-md hover:border-primary/20 transition-all duration-500"
              >
                <div className={`p-4 rounded-2xl ${item.color} mb-6 group-hover:scale-110 transition-all duration-500`}>
                  <item.icon className="w-8 h-8" />
                </div>
                <h3 className="text-xl font-bold text-slate-900 mb-2 tracking-tight">{item.label}</h3>
                <p className="text-xs text-slate-500 font-medium leading-relaxed">{item.desc}</p>
                <div className="absolute bottom-6 opacity-0 group-hover:opacity-100 transform translate-y-2 group-hover:translate-y-0 transition-all duration-500 text-primary">
                  <ArrowRight className="w-5 h-5" />
                </div>
              </button>
            ))}
          </div>
        ) : (
          /* Premium Login Card */
          <div className="max-w-md mx-auto w-full animate-in fade-in slide-in-from-bottom-8 duration-700">
            <div className="relative group">
              <div className="absolute -inset-0.5 bg-primary/10 rounded-[2.5rem] blur opacity-20 group-hover:opacity-40 transition duration-1000" />
              <Card className="relative bg-white border-primary/10 rounded-[2.5rem] shadow-xl overflow-hidden">
                <CardContent className="p-10">
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    onClick={() => setRole(null)}
                    className="mb-8 -ml-2 text-slate-400 hover:text-slate-900 hover:bg-slate-50 font-bold text-xs tracking-widest"
                  >
                    <ChevronLeft className="w-4 h-4 mr-2" /> BACK
                  </Button>

                  <div className="mb-10 space-y-2">
                    <h2 className="text-2xl font-black text-slate-900 flex items-center gap-3 uppercase">
                      <span className="p-2 rounded-xl bg-primary/5 border border-primary/10 text-primary">
                        {role === "admin" ? <Shield className="w-5 h-5" /> : 
                         role === "student" ? <GraduationCap className="w-5 h-5" /> : 
                         <UserIcon className="w-5 h-5" />}
                      </span>
                      {role}
                    </h2>
                    <p className="text-slate-500 text-sm font-medium">Access your professional workspace</p>
                  </div>

                  <form onSubmit={handleSubmit} className="space-y-6">
                    <div className="space-y-2">
                      <Label className="text-[10px] font-bold uppercase tracking-[0.2em] text-slate-400 ml-1">Identity</Label>
                      <div className="relative group/input">
                        <UserIcon className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 group-focus-within/input:text-primary transition-colors" />
                        <Input 
                          placeholder="Username" 
                          className="pl-12 h-14 bg-slate-50 border-slate-200 text-slate-900 placeholder:text-slate-400 focus:border-primary/50 focus:ring-primary/10 rounded-2xl transition-all" 
                          value={username} 
                          onChange={(e) => setUsername(e.target.value)} 
                          required 
                        />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label className="text-[10px] font-bold uppercase tracking-[0.2em] text-slate-400 ml-1">Password</Label>
                      <div className="relative group/input">
                        <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 group-focus-within/input:text-primary transition-colors" />
                        <Input 
                          type={showPassword ? "text" : "password"} 
                          placeholder="••••••••" 
                          className="pl-12 pr-12 h-14 bg-slate-50 border-slate-200 text-slate-900 placeholder:text-slate-400 focus:border-primary/50 focus:ring-primary/10 rounded-2xl transition-all" 
                          value={password} 
                          onChange={(e) => setPassword(e.target.value)} 
                          required 
                        />
                        <button
                          type="button"
                          onClick={() => setShowPassword(!showPassword)}
                          className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-primary transition-colors focus:outline-none"
                        >
                          {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                        </button>
                      </div>
                    </div>
                    <Button 
                      type="submit" 
                      className="w-full h-14 bg-primary hover:bg-primary/90 text-white font-bold rounded-2xl shadow-lg shadow-primary/20 hover:shadow-xl hover:shadow-primary/30 transition-all duration-300" 
                      disabled={loginMutation.isPending}
                    >
                      {loginMutation.isPending ? "AUTHENTICATING..." : "Login"}
                    </Button>
                  </form>
                </CardContent>
              </Card>
            </div>
          </div>
        )}
      </div>

      {/* Footer Branding */}
      <div className="absolute bottom-8 left-1/2 -translate-x-1/2 animate-in fade-in duration-1000 delay-700">
        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-[0.4em]">
          Powered by DCC © 2026
        </p>
      </div>
    </div>
  );
}
