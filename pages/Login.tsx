import React, { useState, useEffect } from 'react';
// @ts-ignore
import { signInWithPopup, createUserWithEmailAndPassword, signInWithEmailAndPassword, RecaptchaVerifier, signInWithPhoneNumber } from "firebase/auth";
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { auth, googleProvider, db } from '../services/firebase';
import { useNavigate, useLocation } from 'react-router-dom';
import { LogIn, Mail, Lock, Phone, Loader2, ArrowRight, RefreshCw, CheckCircle } from 'lucide-react';
import { UserRole, UserProfile } from '../types';

declare global {
  interface Window {
    recaptchaVerifier: any;
  }
}

const Login: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  
  const [authMethod, setAuthMethod] = useState<'EMAIL' | 'PHONE'>('EMAIL');
  
  const [isRegistering, setIsRegistering] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  
  const [phoneNumber, setPhoneNumber] = useState('');
  const [otp, setOtp] = useState('');
  const [otpSent, setOtpSent] = useState(false);
  const [confirmationResult, setConfirmationResult] = useState<any>(null);
  const [countdown, setCountdown] = useState(0);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (location.state?.isRegister) {
      setIsRegistering(true);
    }
  }, [location.state]);

  // Countdown Timer Effect
  useEffect(() => {
    let timer: any;
    if (countdown > 0) {
      timer = setInterval(() => {
        setCountdown((prev) => prev - 1);
      }, 1000);
    }
    return () => clearInterval(timer);
  }, [countdown]);

  const handleUserCreation = async (user: any, additionalData: Partial<UserProfile> = {}) => {
      const userDocRef = doc(db, "users", user.uid);
      const userSnap = await getDoc(userDocRef);

      if (!userSnap.exists()) {
        let role = UserRole.STUDENT;
        const userEmail = user.email || additionalData.email || "";
        if (userEmail === 'admin@example.com') role = UserRole.ADMIN;
        if (userEmail === 'instructor@example.com') role = UserRole.INSTRUCTOR;

        const newUser: UserProfile = {
          uid: user.uid,
          email: userEmail,
          displayName: user.displayName || (user.phoneNumber ? user.phoneNumber : userEmail.split('@')[0]) || "User",
          photoURL: user.photoURL || "",
          role: role,
          phone: user.phoneNumber || "",
          ...additionalData
        };
        await setDoc(userDocRef, newUser);
      }
  };

  const handleGoogleLogin = async () => {
    setError('');
    try {
      const result = await signInWithPopup(auth, googleProvider);
      await handleUserCreation(result.user);
      navigate('/dashboard');
    } catch (err: any) {
      console.error("Google Login failed", err);
      setError("การเข้าสู่ระบบด้วย Google ล้มเหลว กรุณาลองใหม่");
    }
  };

  const handleEmailAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      if (isRegistering) {
        const userCredential = await createUserWithEmailAndPassword(auth, email, password);
        await handleUserCreation(userCredential.user);
        navigate('/dashboard');
      } else {
        await signInWithEmailAndPassword(auth, email, password);
        await handleUserCreation(auth.currentUser); 
        navigate('/dashboard');
      }
    } catch (err: any) {
      console.error("Email Auth failed", err);
      let msg = "เกิดข้อผิดพลาด กรุณาลองใหม่";
      if (err.code === 'auth/email-already-in-use') msg = "อีเมลนี้ถูกใช้งานแล้ว";
      if (err.code === 'auth/wrong-password' || err.code === 'auth/invalid-credential') msg = "อีเมลหรือรหัสผ่านไม่ถูกต้อง";
      if (err.code === 'auth/user-not-found') msg = "ไม่พบผู้ใช้งานนี้";
      if (err.code === 'auth/weak-password') msg = "รหัสผ่านต้องมีความยาว 6 ตัวอักษรขึ้นไป";
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  const onCaptchVerify = () => {
    if (!window.recaptchaVerifier) {
      window.recaptchaVerifier = new RecaptchaVerifier(auth, 'recaptcha-container', {
        'size': 'invisible',
        'callback': (response: any) => {
        },
        'expired-callback': () => {
          setError("ReCaptcha expired. Please try again.");
        }
      });
    }
  };

  const handleSendOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    
    let formattedPhone = phoneNumber;
    if (formattedPhone.startsWith('0')) {
        formattedPhone = '+66' + formattedPhone.substring(1);
    }

    try {
        onCaptchVerify();
        const appVerifier = window.recaptchaVerifier;
        const confirmation = await signInWithPhoneNumber(auth, formattedPhone, appVerifier);
        setConfirmationResult(confirmation);
        setOtpSent(true);
        setCountdown(60); // Start 60s cooldown
    } catch (err: any) {
        console.error("OTP Send failed", err);
        setError("ไม่สามารถส่ง OTP ได้ กรุณาตรวจสอบเบอร์โทรศัพท์ (Error: " + err.message + ")");
    } finally {
        setLoading(false);
    }
  };

  const handleResendOtp = (e: React.MouseEvent) => {
      e.preventDefault();
      if (countdown > 0) return;
      handleSendOtp(e as any);
  };

  const handleVerifyOtp = async (e: React.FormEvent) => {
      e.preventDefault();
      setError('');
      setLoading(true);
      try {
          const res = await confirmationResult.confirm(otp);
          const user = res.user;
          await handleUserCreation(user, { phone: user.phoneNumber || phoneNumber });
          navigate('/dashboard');
      } catch (err: any) {
          console.error("OTP Verify failed", err);
          setError("รหัส OTP ไม่ถูกต้อง");
      } finally {
          setLoading(false);
      }
  };

  const inputClasses = "pl-12 w-full p-4 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-ocean-500 focus:border-transparent outline-none transition-all text-slate-800 placeholder-slate-400 text-lg";

  return (
    <div className="min-h-[85vh] flex items-center justify-center bg-ocean-50 px-4 py-16">
      <div className="max-w-lg w-full bg-white rounded-[2rem] shadow-2xl overflow-hidden relative">
        <div id="recaptcha-container"></div>
        
        {/* Method Tabs */}
        <div className="flex border-b border-slate-100">
            <button 
                onClick={() => { setAuthMethod('EMAIL'); setError(''); }}
                className={`flex-1 py-5 text-base font-bold flex items-center justify-center gap-3 transition-colors ${authMethod === 'EMAIL' ? 'text-ocean-600 bg-white border-b-4 border-ocean-600' : 'text-slate-500 bg-slate-50 hover:bg-slate-100'}`}
            >
                <Mail size={20} /> อีเมล
            </button>
            <button 
                onClick={() => { setAuthMethod('PHONE'); setError(''); }}
                className={`flex-1 py-5 text-base font-bold flex items-center justify-center gap-3 transition-colors ${authMethod === 'PHONE' ? 'text-ocean-600 bg-white border-b-4 border-ocean-600' : 'text-slate-500 bg-slate-50 hover:bg-slate-100'}`}
            >
                <Phone size={20} /> เบอร์โทรศัพท์
            </button>
        </div>

        <div className="p-10">
            <div className="text-center mb-10">
                <h2 className="text-3xl font-bold text-slate-800">
                    {authMethod === 'EMAIL' 
                        ? (isRegistering ? 'สร้างบัญชีด้วยอีเมล' : 'เข้าสู่ระบบด้วยอีเมล') 
                        : 'เข้าสู่ระบบ / สมัครด้วยเบอร์โทร'}
                </h2>
                <p className="text-slate-500 text-base mt-2">
                    {authMethod === 'EMAIL' 
                        ? 'กรอกอีเมลและรหัสผ่านเพื่อดำเนินการต่อ' 
                        : 'ระบบจะส่งรหัส OTP เพื่อยืนยันตัวตนของคุณ'}
                </p>
            </div>

            {/* ERROR MESSAGE */}
            {error && (
                <div className="bg-red-50 text-red-600 text-base p-4 rounded-xl flex items-center mb-6 animate-slide-up">
                    <span className="mr-3 text-xl">⚠️</span> {error}
                </div>
            )}

            {/* --- EMAIL FORM --- */}
            {authMethod === 'EMAIL' && (
                <form onSubmit={handleEmailAuth} className="space-y-5 animate-fade-in">
                    <div className="relative">
                        <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-slate-400">
                            <Mail size={22} />
                        </div>
                        <input 
                            type="email" 
                            required 
                            placeholder="อีเมล"
                            className={inputClasses}
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                        />
                    </div>

                    <div className="relative">
                        <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-slate-400">
                            <Lock size={22} />
                        </div>
                        <input 
                            type="password" 
                            required 
                            minLength={6}
                            placeholder="รหัสผ่าน"
                            className={inputClasses}
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                        />
                    </div>

                    <button 
                        type="submit" 
                        disabled={loading}
                        className="w-full py-4 bg-ocean-600 text-white font-bold rounded-xl shadow-lg shadow-ocean-500/30 hover:bg-ocean-700 transition-all flex items-center justify-center disabled:opacity-70 mt-4 text-xl"
                    >
                        {loading ? <Loader2 className="animate-spin mr-3 h-6 w-6" /> : null}
                        {isRegistering ? 'สมัครสมาชิก' : 'เข้าสู่ระบบ'}
                    </button>

                    <div className="text-center mt-6 text-base text-slate-500">
                        {isRegistering ? 'มีบัญชีอยู่แล้ว? ' : 'ยังไม่มีบัญชี? '}
                        <button 
                            type="button" 
                            onClick={() => setIsRegistering(!isRegistering)}
                            className="text-ocean-600 font-bold hover:underline"
                        >
                            {isRegistering ? 'เข้าสู่ระบบ' : 'สมัครสมาชิก'}
                        </button>
                    </div>
                </form>
            )}

            {/* --- PHONE FORM --- */}
            {authMethod === 'PHONE' && (
                <form onSubmit={otpSent ? handleVerifyOtp : handleSendOtp} className="space-y-5 animate-fade-in">
                    {!otpSent ? (
                        <div className="animate-fade-in">
                             <div className="relative">
                                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-slate-400">
                                    <Phone size={22} />
                                </div>
                                <input 
                                    type="tel" 
                                    required 
                                    placeholder="เบอร์โทรศัพท์ (เช่น 0812345678)"
                                    className={inputClasses}
                                    value={phoneNumber}
                                    onChange={(e) => setPhoneNumber(e.target.value)}
                                />
                            </div>
                            <button 
                                type="submit" 
                                disabled={loading || !phoneNumber}
                                className="w-full py-4 bg-ocean-600 text-white font-bold rounded-xl shadow-lg shadow-ocean-500/30 hover:bg-ocean-700 transition-all flex items-center justify-center disabled:opacity-70 mt-4 text-xl"
                            >
                                {loading ? <Loader2 className="animate-spin mr-3 h-6 w-6" /> : <ArrowRight className="mr-2" />}
                                รับรหัส OTP
                            </button>
                        </div>
                    ) : (
                        <div className="animate-fade-in">
                             <div className="bg-green-50 border border-green-100 rounded-xl p-4 text-center mb-6 animate-slide-up">
                                <div className="flex items-center justify-center text-green-700 font-bold mb-1">
                                    <CheckCircle size={20} className="mr-2" /> ส่งรหัส OTP สำเร็จ
                                </div>
                                <p className="text-slate-600 text-sm">รหัสถูกส่งไปที่ <span className="font-bold">{phoneNumber}</span></p>
                                <button type="button" onClick={() => setOtpSent(false)} className="text-xs text-ocean-600 underline hover:text-ocean-800 mt-2">แก้ไขเบอร์โทร</button>
                             </div>
                             
                             <div className="relative">
                                <input 
                                    type="text" 
                                    required 
                                    placeholder="รหัส OTP 6 หลัก"
                                    maxLength={6}
                                    className={`${inputClasses} text-center text-3xl tracking-[0.5em] font-bold h-20 pl-0`}
                                    value={otp}
                                    onChange={(e) => setOtp(e.target.value)}
                                />
                            </div>
                            
                            <button 
                                type="submit" 
                                disabled={loading || otp.length < 6}
                                className="w-full py-4 bg-green-600 text-white font-bold rounded-xl shadow-lg shadow-green-500/30 hover:bg-green-700 transition-all flex items-center justify-center disabled:opacity-70 mt-4 text-xl"
                            >
                                {loading ? <Loader2 className="animate-spin mr-3 h-6 w-6" /> : null}
                                ยืนยันรหัส OTP
                            </button>

                            <div className="mt-6 text-center">
                                <button 
                                    type="button"
                                    onClick={handleResendOtp}
                                    disabled={countdown > 0 || loading}
                                    className={`flex items-center justify-center mx-auto text-sm font-medium transition-colors ${countdown > 0 ? 'text-slate-400 cursor-not-allowed' : 'text-ocean-600 hover:text-ocean-700'}`}
                                >
                                    <RefreshCw size={16} className={`mr-2 ${countdown > 0 ? '' : 'group-hover:rotate-180 transition-transform'}`} />
                                    {countdown > 0 ? `ขอรหัสใหม่ได้ใน ${countdown} วินาที` : 'ขอรหัส OTP อีกครั้ง'}
                                </button>
                            </div>
                        </div>
                    )}
                </form>
            )}

            {/* Divider */}
            <div className="mt-10">
                <div className="relative">
                    <div className="absolute inset-0 flex items-center">
                        <div className="w-full border-t border-slate-200"></div>
                    </div>
                    <div className="relative flex justify-center text-base">
                        <span className="px-4 bg-white text-slate-400">หรือ</span>
                    </div>
                </div>

                <button 
                onClick={handleGoogleLogin}
                className="mt-8 w-full py-4 px-6 bg-slate-50 border border-slate-200 rounded-xl flex items-center justify-center space-x-4 hover:bg-white hover:border-slate-300 hover:shadow-md transition-all group"
                >
                <img src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg" alt="Google" className="w-6 h-6" />
                <span className="font-bold text-slate-600 group-hover:text-slate-800 text-lg">ดำเนินการต่อด้วย Google</span>
                </button>
            </div>
        </div>
      </div>
    </div>
  );
};

export default Login;