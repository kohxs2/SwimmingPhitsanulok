import React, { useState, useEffect, useRef } from 'react';
import { CONTACT_INFO } from '../constants';
import { Facebook, Phone, Mail, MapPin, Clock, Send, MessageCircle, CheckCircle } from 'lucide-react';

// Utility Component for Scroll Animation (Same as Home)
const RevealOnScroll: React.FC<{ children: React.ReactNode; className?: string }> = ({ children, className = "" }) => {
  const [isVisible, setIsVisible] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true);
          observer.unobserve(entry.target);
        }
      },
      { threshold: 0.1 }
    );
    if (ref.current) observer.observe(ref.current);
    return () => {
      if (ref.current) observer.unobserve(ref.current);
    };
  }, []);

  return (
    <div
      ref={ref}
      className={`transition-all duration-1000 ease-out transform ${
        isVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-10"
      } ${className}`}
    >
      {children}
    </div>
  );
};

const Contact: React.FC = () => {
  const [formData, setFormData] = useState({
    name: '',
    phone: '',
    email: '',
    message: ''
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    alert("ระบบได้รับข้อความของคุณแล้ว ทางเราจะติดต่อกลับโดยเร็วที่สุดครับ");
    setFormData({ name: '', phone: '', email: '', message: '' });
  };

  const inputClasses = "w-full p-4 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-ocean-500 focus:border-transparent outline-none transition-all text-slate-800 placeholder-slate-400 text-lg";
  const labelClasses = "block text-base font-bold text-slate-700 mb-2";

  return (
    <div className="min-h-screen bg-slate-50 py-12 px-4 sm:px-6">
      <div className="max-w-7xl mx-auto">
        
        {/* Top Banner */}
        <div className="bg-gradient-to-r from-ocean-600 to-ocean-500 rounded-2xl p-6 md:p-8 text-white shadow-lg mb-8 relative overflow-hidden flex flex-col md:flex-row items-center justify-between animate-[fadeIn_0.8s_ease-out]">
            <div className="relative z-10 text-center md:text-left">
                <div className="flex items-center justify-center md:justify-start mb-2">
                     <div className="bg-white/20 p-2 rounded-xl mr-3 backdrop-blur-sm">
                        <Phone className="w-6 h-6 md:w-8 md:h-8 text-white" />
                     </div>
                     <h1 className="text-2xl md:text-4xl font-bold">ติดต่อเรา</h1>
                </div>
                <p className="text-ocean-100 text-base md:text-lg font-light opacity-90 max-w-2xl pl-1">พร้อมให้คำปรึกษาและตอบคำถามของคุณเกี่ยวกับการเรียนว่ายน้ำ</p>
            </div>
            <div className="mt-4 md:mt-0 relative z-10 hidden md:block">
                <MessageCircle className="w-24 h-24 opacity-20 transform rotate-12" />
            </div>
            <div className="absolute top-0 right-0 w-48 h-48 bg-white opacity-5 rounded-full transform translate-x-1/2 -translate-y-1/2"></div>
            <div className="absolute bottom-0 left-0 w-32 h-32 bg-white opacity-5 rounded-full transform -translate-x-1/2 translate-y-1/2"></div>
        </div>

        {/* 4 Cards Grid - Compact version with Hover Animations */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            {/* Phone (Clickable) */}
            <RevealOnScroll className="delay-0">
                <a href={`tel:${CONTACT_INFO.phone.replace(/-/g, '')}`} className="block h-full bg-white p-6 rounded-2xl shadow-sm border border-slate-100 flex flex-col items-center text-center hover:shadow-xl hover:-translate-y-2 transition-all duration-300 group cursor-pointer">
                    <div className="w-14 h-14 bg-green-100 text-green-600 rounded-full flex items-center justify-center mb-4 transition-all duration-500 group-hover:scale-110 group-hover:rotate-[360deg]">
                        <Phone className="w-7 h-7" />
                    </div>
                    <h3 className="font-bold text-slate-700 text-lg group-hover:text-green-600 transition-colors">โทรศัพท์</h3>
                    <span className="text-lg font-bold text-slate-900 mt-1">{CONTACT_INFO.phone}</span>
                </a>
            </RevealOnScroll>

            {/* Facebook (Clickable) */}
            <RevealOnScroll className="delay-100">
                <a href={CONTACT_INFO.facebookUrl} target="_blank" rel="noopener noreferrer" className="block h-full bg-white p-6 rounded-2xl shadow-sm border border-slate-100 flex flex-col items-center text-center hover:shadow-xl hover:-translate-y-2 transition-all duration-300 group cursor-pointer">
                    <div className="w-14 h-14 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center mb-4 transition-all duration-500 group-hover:scale-110 group-hover:rotate-[360deg]">
                        <Facebook className="w-7 h-7" />
                    </div>
                    <h3 className="font-bold text-slate-700 text-lg group-hover:text-blue-600 transition-colors">Facebook Page</h3>
                    <span className="text-lg font-bold text-slate-900 mt-1 truncate w-full">เรียนว่ายน้ำพิษณุโลก...</span>
                </a>
            </RevealOnScroll>

            {/* Email (Clickable) - Requested Feature */}
            <RevealOnScroll className="delay-200">
                <a href={`mailto:${CONTACT_INFO.email}`} className="block h-full bg-white p-6 rounded-2xl shadow-sm border border-slate-100 flex flex-col items-center text-center hover:shadow-xl hover:-translate-y-2 transition-all duration-300 group cursor-pointer">
                    <div className="w-14 h-14 bg-red-100 text-red-600 rounded-full flex items-center justify-center mb-4 transition-all duration-500 group-hover:scale-110 group-hover:rotate-[360deg]">
                        <Mail className="w-7 h-7" />
                    </div>
                    <h3 className="font-bold text-slate-700 text-lg group-hover:text-red-600 transition-colors">อีเมล</h3>
                    <span className="text-lg font-bold text-slate-900 mt-1 truncate w-full px-2">{CONTACT_INFO.email}</span>
                </a>
            </RevealOnScroll>

            {/* Location (Static) */}
            <RevealOnScroll className="delay-300">
                <div className="h-full bg-white p-6 rounded-2xl shadow-sm border border-slate-100 flex flex-col items-center text-center hover:shadow-xl hover:-translate-y-2 transition-all duration-300 group">
                    <div className="w-14 h-14 bg-yellow-100 text-yellow-600 rounded-full flex items-center justify-center mb-4 transition-all duration-500 group-hover:scale-110 group-hover:rotate-[360deg]">
                        <MapPin className="w-7 h-7" />
                    </div>
                    <h3 className="font-bold text-slate-700 text-lg group-hover:text-yellow-600 transition-colors">ที่ตั้ง</h3>
                    <span className="text-lg font-bold text-slate-900 mt-1">พิษณุโลก ประเทศไทย</span>
                </div>
            </RevealOnScroll>
        </div>

        {/* Bottom Section: Form & Info */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            
            {/* Left: Contact Form */}
            <div className="lg:col-span-2">
                <RevealOnScroll className="h-full">
                    <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-8 h-full">
                        <div className="flex items-center mb-6 text-ocean-600">
                            <Send className="w-6 h-6 mr-3" />
                            <h2 className="text-2xl font-bold text-slate-800">ส่งข้อความถึงเรา</h2>
                        </div>
                        
                        <form onSubmit={handleSubmit} className="space-y-6">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div>
                                    <label className={labelClasses}>ชื่อ-นามสกุล</label>
                                    <input 
                                        required
                                        placeholder="กรอกชื่อของคุณ"
                                        className={inputClasses}
                                        value={formData.name}
                                        onChange={(e) => setFormData({...formData, name: e.target.value})}
                                    />
                                </div>
                                <div>
                                    <label className={labelClasses}>เบอร์โทรศัพท์</label>
                                    <input 
                                        required
                                        type="tel"
                                        placeholder="0XX-XXX-XXXX"
                                        className={inputClasses}
                                        value={formData.phone}
                                        onChange={(e) => setFormData({...formData, phone: e.target.value})}
                                    />
                                </div>
                            </div>
                            <div>
                                <label className={labelClasses}>อีเมล</label>
                                <input 
                                    type="email"
                                    placeholder="example@email.com"
                                    className={inputClasses}
                                    value={formData.email}
                                    onChange={(e) => setFormData({...formData, email: e.target.value})}
                                />
                            </div>
                            <div>
                                <label className={labelClasses}>ข้อความ</label>
                                <textarea 
                                    required
                                    rows={4}
                                    placeholder="เขียนข้อความของคุณที่นี่..."
                                    className={inputClasses}
                                    value={formData.message}
                                    onChange={(e) => setFormData({...formData, message: e.target.value})}
                                />
                            </div>
                            <button 
                                type="submit" 
                                className="w-full py-4 bg-ocean-600 text-white font-bold rounded-xl shadow-lg shadow-ocean-500/30 hover:bg-ocean-700 transition-all transform hover:scale-[1.02] active:scale-95 flex items-center justify-center text-lg"
                            >
                                <Send className="w-5 h-5 mr-2" /> ส่งข้อความ
                            </button>
                        </form>
                    </div>
                </RevealOnScroll>
            </div>

            {/* Right: Info & Hours */}
            <div className="space-y-6">
                
                {/* Hours */}
                <RevealOnScroll className="delay-100">
                    <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-8 hover:shadow-md transition-shadow">
                        <div className="flex items-center mb-6 text-ocean-600">
                            <Clock className="w-6 h-6 mr-3" />
                            <h2 className="text-xl font-bold text-slate-800">เวลาทำการ</h2>
                        </div>
                        <div className="space-y-4">
                            <div className="flex justify-between border-b border-slate-50 pb-3">
                                <span className="font-medium text-slate-600 text-base">จันทร์ - ศุกร์</span>
                                <span className="font-bold text-ocean-600 text-base">09:00 - 18:00</span>
                            </div>
                            <div className="flex justify-between border-b border-slate-50 pb-3">
                                <span className="font-medium text-slate-600 text-base">เสาร์ - อาทิตย์</span>
                                <span className="font-bold text-ocean-600 text-base">08:00 - 17:00</span>
                            </div>
                            <div className="flex justify-between pt-1">
                                <span className="font-medium text-slate-600 text-base">วันหยุดนักขัตฤกษ์</span>
                                <span className="font-bold text-red-500 text-base">ปิดทำการ</span>
                            </div>
                        </div>
                    </div>
                </RevealOnScroll>

                {/* Status / Quick Actions */}
                <RevealOnScroll className="delay-200">
                    <div className="bg-green-50 rounded-2xl shadow-sm border border-green-100 p-8 text-center hover:shadow-md transition-shadow group">
                        <div className="w-16 h-16 bg-white text-green-500 rounded-full flex items-center justify-center mx-auto mb-4 shadow-sm transition-all duration-500 group-hover:scale-110 group-hover:rotate-[360deg]">
                            <CheckCircle className="w-8 h-8" />
                        </div>
                        <h3 className="text-xl font-bold text-green-800 mb-2">รับสมัครตลอดทั้งปี!</h3>
                        <p className="text-green-700 text-sm mb-0">เปิดรับนักเรียนใหม่ทุกเดือน สามารถเริ่มเรียนได้ทันทีหลังชำระเงิน</p>
                    </div>
                </RevealOnScroll>

                 <RevealOnScroll className="delay-300">
                    <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-8 hover:shadow-md transition-shadow">
                        <h3 className="font-bold text-slate-800 mb-4 flex items-center text-sm uppercase tracking-wider text-ocean-500">
                            <Phone className="w-4 h-4 mr-2" /> ช่องทางติดต่อด่วน
                        </h3>
                        <div className="space-y-3">
                            <a href={`tel:${CONTACT_INFO.phone.replace(/-/g, '')}`} className="flex items-center justify-center w-full py-3 border-2 border-slate-200 rounded-xl hover:border-ocean-500 hover:bg-ocean-50 hover:text-ocean-600 transition-all font-bold text-slate-600 text-base">
                                <Phone className="w-4 h-4 mr-2" /> โทรหาเรา
                            </a>
                            <a href={CONTACT_INFO.facebookUrl} target="_blank" rel="noopener noreferrer" className="flex items-center justify-center w-full py-3 border-2 border-slate-200 rounded-xl hover:border-blue-500 hover:bg-blue-50 hover:text-blue-600 transition-all font-bold text-slate-600 text-base">
                                <Facebook className="w-4 h-4 mr-2" /> Facebook
                            </a>
                        </div>
                    </div>
                </RevealOnScroll>

            </div>
        </div>

      </div>
    </div>
  );
};

export default Contact;