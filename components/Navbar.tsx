import React, { useState, useEffect, useRef } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
// @ts-ignore
import { signOut } from 'firebase/auth';
import { collection, query, where, onSnapshot, updateDoc, doc, writeBatch } from 'firebase/firestore';
import { UserProfile, Notification } from '../types';
import { auth, db } from '../services/firebase';
import { 
  Menu, X, User, LogOut, ChevronRight, Bell, 
  CheckCircle, XCircle, Info, LayoutDashboard, Star, Clock, AlertTriangle 
} from 'lucide-react';

interface NavbarProps {
  user: UserProfile | null;
}

export const Navbar: React.FC<NavbarProps> = ({ user }) => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [showNotiDropdown, setShowNotiDropdown] = useState(false);
  const [showProfileDropdown, setShowProfileDropdown] = useState(false);
  
  const navigate = useNavigate();
  const location = useLocation();
  const notiRef = useRef<HTMLDivElement>(null);
  const profileRef = useRef<HTMLDivElement>(null);

  // Close dropdowns when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (notiRef.current && !notiRef.current.contains(event.target as Node)) {
        setShowNotiDropdown(false);
      }
      if (profileRef.current && !profileRef.current.contains(event.target as Node)) {
        setShowProfileDropdown(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Fetch Notifications
  useEffect(() => {
    if (!user) return;
    
    const q = query(
      collection(db, "notifications"), 
      where("userId", "==", user.uid)
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Notification));
      data.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
      setNotifications(data);
    });

    return () => unsubscribe();
  }, [user]);

  const handleLogout = async () => {
    await signOut(auth);
    navigate('/');
    setIsMenuOpen(false);
  };

  const markAsRead = async (notiId: string) => {
    try {
      await updateDoc(doc(db, "notifications", notiId), { read: true });
    } catch (e) { console.error(e); }
  };

  const markAllAsRead = async () => {
    try {
        const batch = writeBatch(db);
        const unreadNotes = notifications.filter(n => !n.read);
        unreadNotes.forEach(n => {
            const ref = doc(db, "notifications", n.id);
            batch.update(ref, { read: true });
        });
        await batch.commit();
    } catch (e) { console.error(e); }
  };

  const unreadCount = notifications.filter(n => !n.read).length;

  // Helper to get Icon and Color based on notification type
  const getNotificationStyle = (type: string | undefined, title: string) => {
      // Default fallback
      let icon = <Info className="w-5 h-5 text-ocean-500" />;
      let bgClass = "bg-ocean-50";
      
      if (type === 'PAYMENT') {
          if (title.includes('สำเร็จ') || title.includes('อนุมัติ')) {
              icon = <CheckCircle className="w-5 h-5 text-green-500" />;
              bgClass = "bg-green-50";
          } else {
              icon = <XCircle className="w-5 h-5 text-red-500" />;
              bgClass = "bg-red-50";
          }
      } else if (type === 'EVALUATION') {
           if (title.includes('รีวิว')) {
               icon = <Star className="w-5 h-5 text-yellow-500" />;
               bgClass = "bg-yellow-50";
           } else {
               icon = <Star className="w-5 h-5 text-purple-500" />;
               bgClass = "bg-purple-50";
           }
      } else if (type === 'EXPIRY') {
          icon = <Clock className="w-5 h-5 text-orange-500" />;
          bgClass = "bg-orange-50";
      } else if (type === 'SYSTEM') {
          if (title.includes('สมัคร')) {
             icon = <User className="w-5 h-5 text-blue-500" />;
             bgClass = "bg-blue-50";
          } else {
             icon = <AlertTriangle className="w-5 h-5 text-slate-500" />;
             bgClass = "bg-slate-50";
          }
      }

      return { icon, bgClass };
  };

  const NavLink = ({ to, label, mobile = false }: { to: string, label: string, mobile?: boolean }) => {
    const isActive = location.pathname === to;
    const baseClass = mobile 
      ? "block px-4 py-3 text-lg font-medium rounded-xl transition-colors mb-1" 
      : "text-base font-bold transition-colors hover:text-ocean-600 relative group";
    
    const activeClass = mobile 
      ? "bg-ocean-50 text-ocean-600" 
      : "text-ocean-600";
      
    const inactiveClass = mobile 
      ? "text-slate-600 hover:bg-slate-50" 
      : "text-slate-500";

    return (
      <Link 
        to={to} 
        className={`${baseClass} ${isActive ? activeClass : inactiveClass}`}
        onClick={() => setIsMenuOpen(false)}
      >
        {label}
        {!mobile && (
           <span className={`absolute -bottom-1 left-0 w-full h-0.5 bg-ocean-500 transform origin-left transition-transform duration-300 ${isActive ? 'scale-x-100' : 'scale-x-0 group-hover:scale-x-100'}`}></span>
        )}
      </Link>
    );
  };

  return (
    <nav className="fixed top-0 left-0 right-0 bg-white/95 backdrop-blur-md shadow-sm z-50 h-20 transition-all border-b border-slate-100">
      <div className="w-full px-4 sm:px-10 lg:px-16 h-full flex items-center justify-between">
        
        {/* Logo */}
        <Link to="/" className="flex items-center gap-3 group overflow-hidden">
          <img 
            src="https://img5.pic.in.th/file/secure-sv1/548319157_1084231807208955_4955603028962618729_n.png" 
            alt="Logo" 
            className="w-12 h-12 rounded-xl object-cover border border-slate-100 shadow-sm flex-shrink-0" 
          />
          <div className="flex flex-col min-w-0">
            <span className="text-lg sm:text-xl font-bold text-slate-800 leading-tight truncate">เรียนว่ายน้ำพิษณุโลก</span>
            <span className="text-xs text-ocean-600 font-medium truncate">By ครูฟลุ๊ค</span>
          </div>
        </Link>

        {/* Desktop Menu */}
        <div className="hidden lg:flex items-center space-x-8">
          <NavLink to="/" label="หน้าแรก" />
          <NavLink to="/courses" label="คอร์สเรียน" />
          <NavLink to="/register" label="ลงทะเบียนเรียน" />
          <NavLink to="/faq" label="คำถามที่พบบ่อย" />
          <NavLink to="/about" label="เกี่ยวกับเรา" />
          <NavLink to="/contact" label="ติดต่อเรา" />
        </div>

        {/* User Actions */}
        <div className="hidden lg:flex items-center space-x-4">
          {user ? (
            <>
               <Link 
                 to="/dashboard"
                 className="p-2.5 text-slate-500 hover:text-ocean-600 hover:bg-ocean-50 rounded-full transition-all relative group"
                 title="แดชบอร์ด"
               >
                  <LayoutDashboard size={24} />
               </Link>

              {/* Notifications */}
              <div className="relative" ref={notiRef}>
                <button 
                  onClick={() => setShowNotiDropdown(!showNotiDropdown)}
                  className={`p-2.5 rounded-full transition-all relative ${showNotiDropdown ? 'bg-ocean-50 text-ocean-600' : 'text-slate-500 hover:text-ocean-600 hover:bg-ocean-50'}`}
                >
                  <Bell size={24} />
                  {unreadCount > 0 && (
                    <span className="absolute top-1 right-1 w-5 h-5 bg-red-500 text-white text-xs font-bold rounded-full flex items-center justify-center border-2 border-white animate-pulse">
                      {unreadCount}
                    </span>
                  )}
                </button>
                
                {showNotiDropdown && (
                  <div className="absolute right-0 mt-3 w-80 md:w-96 bg-white rounded-2xl shadow-xl border border-slate-100 overflow-hidden animate-fade-in z-50">
                    <div className="p-4 border-b border-slate-100 flex justify-between items-center bg-white">
                      <h3 className="font-bold text-slate-800 text-lg">การแจ้งเตือน</h3>
                      {unreadCount > 0 && (
                          <button onClick={markAllAsRead} className="text-xs text-ocean-600 font-bold hover:underline">
                              อ่านทั้งหมด
                          </button>
                      )}
                    </div>
                    <div className="max-h-[400px] overflow-y-auto custom-scrollbar">
                      {notifications.length === 0 ? (
                        <div className="p-10 text-center text-slate-400 flex flex-col items-center">
                            <Bell className="w-10 h-10 mb-3 opacity-20" />
                            <p className="text-sm">ไม่มีการแจ้งเตือนใหม่</p>
                        </div>
                      ) : (
                        notifications.map(n => {
                          const style = getNotificationStyle(n.type, n.title);
                          return (
                            <div 
                                key={n.id} 
                                onClick={() => markAsRead(n.id)}
                                className={`p-4 border-b border-slate-50 hover:bg-slate-50 cursor-pointer transition-colors relative group ${!n.read ? 'bg-slate-50/60' : 'bg-white'}`}
                            >
                                {!n.read && <div className="absolute left-0 top-0 bottom-0 w-1 bg-ocean-500"></div>}
                                <div className="flex items-start gap-4">
                                    <div className={`p-2 rounded-full flex-shrink-0 ${style.bgClass}`}>
                                        {style.icon}
                                    </div>
                                    <div className="flex-grow">
                                        <div className="flex justify-between items-start">
                                            <p className={`text-sm mb-1 ${!n.read ? 'font-bold text-slate-800' : 'text-slate-600 font-medium'}`}>{n.title}</p>
                                            <span className="text-[10px] text-slate-400 whitespace-nowrap ml-2">{new Date(n.date).toLocaleDateString('th-TH')}</span>
                                        </div>
                                        <p className="text-xs text-slate-500 leading-relaxed line-clamp-2">{n.message}</p>
                                    </div>
                                </div>
                            </div>
                          );
                        })
                      )}
                    </div>
                  </div>
                )}
              </div>

              {/* Profile Dropdown */}
              <div className="relative" ref={profileRef}>
                <button 
                  onClick={() => setShowProfileDropdown(!showProfileDropdown)}
                  className={`flex items-center gap-3 pl-2 pr-4 py-1.5 rounded-full border transition-all ${showProfileDropdown ? 'bg-slate-50 border-slate-200' : 'border-transparent hover:bg-slate-50 hover:border-slate-100'}`}
                >
                  <div className="w-9 h-9 rounded-full bg-ocean-100 text-ocean-600 flex items-center justify-center border border-ocean-200">
                    <User size={20} />
                  </div>
                  <div className="text-left hidden xl:block">
                    <p className="text-sm font-bold text-slate-800 leading-none">{user.displayName}</p>
                    <p className="text-[10px] text-slate-500 font-medium uppercase mt-0.5">{user.role}</p>
                  </div>
                </button>

                {showProfileDropdown && (
                  <div className="absolute right-0 mt-3 w-56 bg-white rounded-2xl shadow-xl border border-slate-100 overflow-hidden animate-fade-in p-2 z-50">
                      <div className="xl:hidden px-4 py-3 border-b border-slate-50 mb-2">
                         <p className="font-bold text-slate-800">{user.displayName}</p>
                         <p className="text-xs text-slate-500">{user.email}</p>
                      </div>
                      <Link to="/profile" className="flex items-center gap-3 px-4 py-3 rounded-xl hover:bg-slate-50 text-slate-700 text-sm font-medium transition-colors" onClick={() => setShowProfileDropdown(false)}>
                        <User size={18} /> โปรไฟล์ของฉัน
                      </Link>
                      <Link to="/dashboard" className="flex items-center gap-3 px-4 py-3 rounded-xl hover:bg-slate-50 text-slate-700 text-sm font-medium transition-colors" onClick={() => setShowProfileDropdown(false)}>
                        <LayoutDashboard size={18} /> แดชบอร์ด
                      </Link>
                      <div className="h-px bg-slate-100 my-2"></div>
                      <button onClick={handleLogout} className="w-full flex items-center gap-3 px-4 py-3 rounded-xl hover:bg-red-50 text-red-600 text-sm font-medium transition-colors">
                        <LogOut size={18} /> ออกจากระบบ
                      </button>
                  </div>
                )}
              </div>
            </>
          ) : (
            <div className="flex items-center gap-3">
              <Link to="/login" state={{ isRegister: true }}>
                <button className="px-5 py-2.5 text-ocean-600 font-bold hover:bg-ocean-50 rounded-full transition-all duration-300 transform hover:scale-105 hover:shadow-sm text-sm border border-transparent hover:border-ocean-100">
                  สมัครสมาชิก
                </button>
              </Link>
              <Link to="/login">
                <button className="group px-6 py-2.5 bg-ocean-600 hover:bg-ocean-700 text-white font-bold rounded-full transition-all duration-300 shadow-lg shadow-ocean-500/30 hover:shadow-ocean-500/50 flex items-center text-sm transform hover:-translate-y-0.5 hover:scale-105">
                  เข้าสู่ระบบ <ChevronRight className="ml-1 w-4 h-4 group-hover:translate-x-1 transition-transform" />
                </button>
              </Link>
            </div>
          )}
        </div>

        {/* Mobile Menu Button */}
        <button 
          className="lg:hidden p-2 text-slate-800 hover:bg-slate-100 rounded-lg flex-shrink-0 ml-2"
          onClick={() => setIsMenuOpen(!isMenuOpen)}
        >
          {isMenuOpen ? <X size={28} /> : <Menu size={28} />}
        </button>
      </div>

      {/* Mobile Menu Overlay - Full Screen Fixed */}
      {isMenuOpen && (
        <div className="lg:hidden fixed inset-0 bg-white z-[60] h-screen w-full overflow-y-auto animate-fade-in">
           {/* Header with Close Button */}
           <div className="flex items-center justify-between px-6 h-20 border-b border-slate-100 bg-white sticky top-0 z-50">
              <span className="text-xl font-bold text-slate-800">เมนูหลัก</span>
              <button 
                onClick={() => setIsMenuOpen(false)}
                className="p-2 -mr-2 text-slate-500 hover:bg-slate-100 hover:text-red-500 rounded-full transition-colors"
              >
                <X size={32} />
              </button>
           </div>

           {/* Menu Content */}
           <div className="p-6 pb-20 space-y-2 bg-white">
              <NavLink to="/" label="หน้าแรก" mobile />
              <NavLink to="/courses" label="คอร์สเรียน" mobile />
              <NavLink to="/register" label="ลงทะเบียนเรียน" mobile />
              <NavLink to="/faq" label="คำถามที่พบบ่อย" mobile />
              <NavLink to="/about" label="เกี่ยวกับเรา" mobile />
              <NavLink to="/contact" label="ติดต่อเรา" mobile />
              
              <div className="border-t border-slate-100 my-4 pt-4">
                 {user ? (
                   <>
                      <div className="px-4 mb-6 flex items-center gap-4">
                         <div className="w-12 h-12 rounded-full bg-ocean-100 text-ocean-600 flex items-center justify-center border border-ocean-200 flex-shrink-0">
                            <User size={24} />
                         </div>
                         <div className="min-w-0">
                            <p className="font-bold text-lg text-slate-900 truncate">{user.displayName}</p>
                            <p className="text-sm text-slate-500 truncate">{user.email}</p>
                         </div>
                      </div>
                      <Link to="/dashboard" onClick={() => setIsMenuOpen(false)} className="block px-4 py-3 text-lg font-medium text-slate-600 hover:bg-slate-50 rounded-xl mb-1">
                          <LayoutDashboard className="inline mr-3 w-6 h-6 text-ocean-500" /> แดชบอร์ด
                      </Link>
                      <Link to="/profile" onClick={() => setIsMenuOpen(false)} className="block px-4 py-3 text-lg font-medium text-slate-600 hover:bg-slate-50 rounded-xl mb-1">
                          <User className="inline mr-3 w-6 h-6 text-ocean-500" /> โปรไฟล์
                      </Link>
                      <button onClick={handleLogout} className="w-full text-left px-4 py-3 text-lg font-medium text-red-600 hover:bg-red-50 rounded-xl mt-2">
                          <LogOut className="inline mr-3 w-6 h-6" /> ออกจากระบบ
                      </button>
                   </>
                 ) : (
                   <div className="flex flex-col gap-4 mt-2">
                     <Link to="/login" state={{ isRegister: true }} onClick={() => setIsMenuOpen(false)} className="block w-full text-center py-4 text-ocean-600 bg-ocean-50 hover:bg-ocean-100 font-bold rounded-2xl border border-ocean-100 text-lg">
                        สมัครสมาชิก
                     </Link>
                     <Link to="/login" onClick={() => setIsMenuOpen(false)} className="block w-full text-center py-4 bg-ocean-600 text-white font-bold rounded-2xl shadow-lg hover:bg-ocean-700 text-lg">
                        เข้าสู่ระบบ
                     </Link>
                   </div>
                 )}
              </div>
           </div>
        </div>
      )}
    </nav>
  );
};