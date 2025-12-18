import React, { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { collection, addDoc, getDocs, query, where } from 'firebase/firestore';
import { db } from '../services/firebase';
import { uploadImageToImgbb } from '../services/imgbbService';
import { generateStudentId } from '../services/studentIdGenerator';
import { INITIAL_COURSES, BANK_INFO, CONTACT_INFO } from '../constants';
import { UserProfile, Course } from '../types';
import { 
  Upload, CheckCircle, Loader2, Edit3, ClipboardList, 
  User, CreditCard, Phone, Info, Facebook, Clock, Calendar, Smartphone, FileText 
} from 'lucide-react';

interface RegistrationProps {
  user: UserProfile | null;
}

const Registration: React.FC<RegistrationProps> = ({ user }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const queryParams = new URLSearchParams(location.search);
  const preSelectedCourseId = queryParams.get('courseId');

  const [courses] = useState<Course[]>(INITIAL_COURSES);
  const [loading, setLoading] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  
  // Form State
  const [formData, setFormData] = useState({
    studentName: user?.displayName || '',
    gender: 'ชาย',
    age: '',
    weight: '',
    height: '',
    disease: '',
    adhdCondition: false,
    school: '',
    startDate: '',
    courseId: preSelectedCourseId || '',
    phone: user?.phone || '',
  });

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0]);
    }
  };

  const calculateExpiryDate = (startDate: string, courseType: string) => {
    if (courseType === 'Normal') {
        const date = new Date(startDate);
        date.setMonth(date.getMonth() + 3); // Add 3 months
        return date.toISOString();
    }
    return null; // Private/Baby courses might not have strict expiry
  };

  const notifyAdmins = async (studentName: string, courseTitle: string) => {
      try {
          const q = query(collection(db, "users"), where("role", "==", "ADMIN"));
          const snapshot = await getDocs(q);
          
          if (!snapshot.empty) {
              const notifications = snapshot.docs.map(doc => {
                  return addDoc(collection(db, "notifications"), {
                      userId: doc.id,
                      title: "มีการสมัครเรียนใหม่",
                      message: `คุณ ${studentName} ได้สมัครคอร์ส ${courseTitle} และส่งหลักฐานการโอนเงินแล้ว โปรดตรวจสอบ`,
                      read: false,
                      type: 'SYSTEM',
                      date: new Date().toISOString()
                  });
              });
              await Promise.all(notifications);
          }
      } catch (error) {
          console.error("Failed to notify admins", error);
      }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) {
      alert("กรุณาเข้าสู่ระบบก่อนสมัครเรียน");
      navigate('/login');
      return;
    }
    if (!file) {
      alert("กรุณาแนบสลิปการโอนเงิน");
      return;
    }

    setLoading(true);

    try {
      const selectedCourse = courses.find(c => c.id === formData.courseId);
      if (!selectedCourse) throw new Error("Course not found");

      // 1. Generate Student ID
      const studentId = await generateStudentId(selectedCourse.id, selectedCourse.title);

      const expiryDate = calculateExpiryDate(formData.startDate, selectedCourse.type);
      const slipUrl = await uploadImageToImgbb(file);
      
      // 2. Create Enrollment with Generated ID
      await addDoc(collection(db, "enrollments"), {
        userId: user.uid,
        studentId, // Save the ID CA68xxx
        ...formData,
        age: Number(formData.age),
        adhdCondition: formData.adhdCondition,
        slipUrl,
        paymentStatus: 'PENDING',
        attendance: [],
        evaluation: 'PENDING',
        expiryDate: expiryDate,
        createdAt: new Date().toISOString()
      });

      // Notify Admins
      await notifyAdmins(formData.studentName, selectedCourse.title);

      alert(`ลงทะเบียนสำเร็จ! รหัสนักเรียนของคุณคือ ${studentId} กรุณารอการตรวจสอบการชำระเงิน`);
      navigate('/dashboard');

    } catch (error) {
      console.error("Registration failed", error);
      alert("เกิดข้อผิดพลาดในการลงทะเบียน โปรดลองใหม่อีกครั้ง");
    } finally {
      setLoading(false);
    }
  };

  const selectedCourseData = courses.find(c => c.id === formData.courseId);

  // Styling Classes
  const inputClasses = "w-full p-4 bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-ocean-500 focus:border-transparent outline-none transition-all text-slate-800 placeholder-slate-400 text-base mt-1";
  const labelClasses = "block text-sm font-bold text-slate-700 mb-1";
  const sectionTitleClasses = "text-xl font-bold text-slate-800 flex items-center mb-6 pb-2 border-b border-slate-100";

  return (
    <div className="min-h-screen bg-slate-50 py-12 px-4 sm:px-6">
      <div className="max-w-7xl mx-auto">
        
        {/* Hero Banner - Reduced Size */}
        <div className="bg-gradient-to-r from-ocean-500 to-ocean-400 rounded-2xl p-6 md:p-8 text-white shadow-lg mb-8 relative overflow-hidden flex flex-col md:flex-row items-center justify-between">
            <div className="relative z-10">
                <div className="flex items-center mb-2">
                    <div className="bg-white/20 p-2 rounded-xl mr-3 backdrop-blur-sm">
                        <Edit3 className="w-6 h-6 md:w-8 md:h-8 text-white" />
                    </div>
                    <h1 className="text-2xl md:text-4xl font-bold">แบบฟอร์มลงทะเบียนเรียน</h1>
                </div>
                <p className="text-ocean-50 text-base md:text-lg font-light opacity-90 max-w-2xl pl-1">
                    กรอกข้อมูลให้ครบถ้วน เพื่อให้เราสามารถดูแลและพัฒนาทักษะของคุณได้อย่างเต็มที่
                </p>
            </div>
            <div className="mt-4 md:mt-0 relative z-10 hidden md:block">
                <ClipboardList className="w-24 h-24 opacity-20 transform rotate-12" />
            </div>
            {/* Decor Circles */}
            <div className="absolute top-0 right-0 w-48 h-48 bg-white opacity-5 rounded-full transform translate-x-1/2 -translate-y-1/2"></div>
            <div className="absolute bottom-0 left-0 w-32 h-32 bg-white opacity-5 rounded-full transform -translate-x-1/2 translate-y-1/2"></div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
           
           {/* Left Column: Form */}
           <div className="lg:col-span-2 space-y-8">
              <form onSubmit={handleSubmit} className="bg-white rounded-[2rem] p-8 shadow-sm border border-slate-100">
                 
                 {/* 1. ข้อมูลผู้เรียน */}
                 <div className="mb-10">
                    <h2 className={sectionTitleClasses}>
                        <User className="w-6 h-6 mr-2 text-ocean-600" /> ข้อมูลผู้เรียน
                    </h2>
                    <div className="space-y-6">
                        <div>
                            <label className={labelClasses}>ชื่อ-นามสกุล ผู้เรียน <span className="text-red-500">*</span></label>
                            <input 
                                required 
                                className={inputClasses} 
                                placeholder="ระบุชื่อ-นามสกุล"
                                value={formData.studentName} 
                                onChange={e => setFormData({...formData, studentName: e.target.value})} 
                            />
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div>
                                <label className={labelClasses}>เพศ <span className="text-red-500">*</span></label>
                                <select className={inputClasses} value={formData.gender} onChange={e => setFormData({...formData, gender: e.target.value})}>
                                    <option value="ชาย">ชาย</option>
                                    <option value="หญิง">หญิง</option>
                                </select>
                            </div>
                            <div>
                                <label className={labelClasses}>อายุ (ปี) <span className="text-red-500">*</span></label>
                                <input 
                                    required 
                                    type="number" 
                                    className={inputClasses} 
                                    placeholder="อายุ"
                                    value={formData.age} 
                                    onChange={e => setFormData({...formData, age: e.target.value})} 
                                />
                            </div>
                        </div>
                        <div className="grid grid-cols-2 gap-6">
                            <div>
                                <label className={labelClasses}>น้ำหนัก (กก.) <span className="text-red-500">*</span></label>
                                <input required className={inputClasses} placeholder="เช่น 50" value={formData.weight} onChange={e => setFormData({...formData, weight: e.target.value})} />
                            </div>
                            <div>
                                <label className={labelClasses}>ส่วนสูง (ซม.) <span className="text-red-500">*</span></label>
                                <input required className={inputClasses} placeholder="เช่น 160" value={formData.height} onChange={e => setFormData({...formData, height: e.target.value})} />
                            </div>
                        </div>
                        <div>
                            <label className={labelClasses}>โรงเรียน / สถานศึกษา</label>
                            <input 
                                required 
                                className={inputClasses} 
                                placeholder="ระบุโรงเรียน (ถ้ามี)"
                                value={formData.school} 
                                onChange={e => setFormData({...formData, school: e.target.value})} 
                            />
                        </div>
                        <div>
                            <label className={labelClasses}>โรคประจำตัว / ข้อจำกัดทางร่างกาย</label>
                            <input 
                                className={inputClasses} 
                                placeholder="ระบุโรคประจำตัว หรือปล่อยว่างถ้าไม่มี"
                                value={formData.disease} 
                                onChange={e => setFormData({...formData, disease: e.target.value})} 
                            />
                        </div>
                        <div>
                            <label className={labelClasses}>มีภาวะ ADHD (สมาธิสั้น) หรือไม่?</label>
                            <div className="flex gap-6 mt-3">
                                <label className="flex items-center cursor-pointer">
                                    <input 
                                        type="radio" 
                                        name="adhd"
                                        checked={!formData.adhdCondition}
                                        onChange={() => setFormData({...formData, adhdCondition: false})}
                                        className="w-5 h-5 text-ocean-600 focus:ring-ocean-500 border-gray-300"
                                    />
                                    <span className="ml-2 text-slate-700">ไม่มี</span>
                                </label>
                                <label className="flex items-center cursor-pointer">
                                    <input 
                                        type="radio" 
                                        name="adhd"
                                        checked={formData.adhdCondition}
                                        onChange={() => setFormData({...formData, adhdCondition: true})}
                                        className="w-5 h-5 text-ocean-600 focus:ring-ocean-500 border-gray-300"
                                    />
                                    <span className="ml-2 text-slate-700">มี</span>
                                </label>
                            </div>
                        </div>
                    </div>
                 </div>

                 {/* 2. เลือกคอร์สเรียน */}
                 <div className="mb-10">
                    <h2 className={sectionTitleClasses}>
                        <FileText className="w-6 h-6 mr-2 text-ocean-600" /> เลือกคอร์สเรียน <span className="text-red-500 ml-1">*</span>
                    </h2>
                    <div>
                        <select 
                            required 
                            className={inputClasses} 
                            value={formData.courseId} 
                            onChange={e => setFormData({...formData, courseId: e.target.value})}
                        >
                            <option value="">-- เลือกคอร์ส --</option>
                            {courses.map(c => (
                            <option key={c.id} value={c.id}>{c.title} - {c.price.toLocaleString()} บาท</option>
                            ))}
                        </select>
                    </div>
                    {selectedCourseData && (
                        <div className="mt-4 bg-ocean-50 p-5 rounded-xl border border-ocean-100 flex justify-between items-center">
                            <div>
                                <p className="text-sm text-ocean-600 font-bold">เวลาเรียน</p>
                                <p className="text-slate-700">{selectedCourseData.timeSlot}</p>
                                {selectedCourseData.type === 'Normal' && (
                                   <p className="text-xs text-orange-500 font-bold mt-1">* คอร์สนี้มีระยะเวลา 3 เดือน นับจากวันเริ่มเรียน</p>
                                )}
                            </div>
                            <div className="text-right">
                                <p className="text-sm text-ocean-600 font-bold">ราคา</p>
                                <p className="text-2xl font-bold text-ocean-700">{selectedCourseData.price.toLocaleString()} ฿</p>
                            </div>
                        </div>
                    )}
                 </div>

                 {/* 3. ข้อมูลการเริ่มเรียน */}
                 <div className="mb-10">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div>
                            <label className={labelClasses}>วันที่ต้องการเริ่มเรียน <span className="text-red-500">*</span></label>
                            <div className="relative">
                                <Calendar className="absolute top-1/2 left-4 transform -translate-y-1/2 text-slate-400 w-5 h-5 pointer-events-none" />
                                <input 
                                    required 
                                    type="date" 
                                    className={`${inputClasses} pl-12`} 
                                    value={formData.startDate} 
                                    onChange={e => setFormData({...formData, startDate: e.target.value})} 
                                />
                            </div>
                        </div>
                        <div>
                            <label className={labelClasses}>เบอร์โทรศัพท์ติดต่อ <span className="text-red-500">*</span></label>
                            <div className="relative">
                                <Smartphone className="absolute top-1/2 left-4 transform -translate-y-1/2 text-slate-400 w-5 h-5 pointer-events-none" />
                                <input 
                                    required 
                                    type="tel" 
                                    className={`${inputClasses} pl-12`} 
                                    placeholder="0XX-XXX-XXXX"
                                    value={formData.phone} 
                                    onChange={e => setFormData({...formData, phone: e.target.value})} 
                                />
                            </div>
                        </div>
                    </div>
                 </div>

                 {/* 4. หลักฐานการโอนเงิน */}
                 <div className="mb-8">
                    <h2 className={sectionTitleClasses}>
                        <CreditCard className="w-6 h-6 mr-2 text-ocean-600" /> หลักฐานการโอนเงิน <span className="text-red-500 ml-1">*</span>
                    </h2>
                    
                    <div className="border-2 border-dashed border-slate-300 rounded-2xl p-8 bg-slate-50 text-center hover:bg-slate-100 transition-colors cursor-pointer relative group">
                        <input 
                            type="file" 
                            accept="image/*" 
                            onChange={handleFileChange} 
                            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                        />
                        <div className="flex flex-col items-center justify-center">
                            {file ? (
                                <>
                                    <div className="w-16 h-16 bg-green-100 text-green-500 rounded-full flex items-center justify-center mb-4">
                                        <CheckCircle className="w-8 h-8" />
                                    </div>
                                    <p className="font-bold text-slate-800 text-lg">{file.name}</p>
                                    <p className="text-slate-500 text-sm mt-1">คลิกเพื่อเปลี่ยนไฟล์</p>
                                </>
                            ) : (
                                <>
                                    <div className="w-16 h-16 bg-ocean-100 text-ocean-500 rounded-full flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                                        <Upload className="w-8 h-8" />
                                    </div>
                                    <p className="font-bold text-slate-800 text-lg">อัปโหลดสลิปโอนเงิน</p>
                                    <p className="text-slate-500 text-sm mt-1">คลิกเพื่อเลือกไฟล์ หรือลากไฟล์มาวางที่นี่</p>
                                    <p className="text-xs text-slate-400 mt-2">รองรับไฟล์ JPG, PNG</p>
                                </>
                            )}
                        </div>
                    </div>
                 </div>

                 <button 
                    type="submit" 
                    disabled={loading}
                    className="w-full py-5 bg-ocean-600 text-white font-bold rounded-2xl shadow-lg hover:bg-ocean-700 transition-all disabled:opacity-70 disabled:cursor-not-allowed flex items-center justify-center text-xl mt-4"
                 >
                    {loading ? <Loader2 className="animate-spin mr-3 h-6 w-6" /> : null}
                    {loading ? 'กำลังดำเนินการ...' : 'ยืนยันการลงทะเบียน'}
                 </button>
              </form>
           </div>

           {/* Right Column: Sidebar (Info) */}
           <div className="lg:col-span-1 space-y-6">
              
              {/* Payment Info Card */}
              <div className="bg-white rounded-[2rem] shadow-sm border border-slate-100 overflow-hidden">
                  <div className="bg-ocean-500 p-5 flex items-center text-white font-bold text-lg">
                      <CreditCard className="mr-3 w-6 h-6" /> ข้อมูลการชำระเงิน
                  </div>
                  <div className="p-6">
                      <div className="mb-6 space-y-3 text-slate-700">
                          <div>
                              <p className="text-sm text-slate-500 font-bold">บัญชีธนาคาร</p>
                              <p className="font-semibold flex items-center"><span className="w-2 h-2 bg-purple-500 rounded-full mr-2"></span>{BANK_INFO.bankName}</p>
                          </div>
                          <div>
                              <p className="text-sm text-slate-500 font-bold">เลขที่บัญชี</p>
                              <p className="text-2xl font-mono font-bold text-ocean-600 tracking-wider">{BANK_INFO.accountNumber}</p>
                          </div>
                          <div>
                              <p className="text-sm text-slate-500 font-bold">ชื่อบัญชี</p>
                              <p className="font-semibold">{BANK_INFO.accountName}</p>
                          </div>
                      </div>
                      
                      {/* QR Code */}
                      <div className="bg-white p-4 rounded-xl border-2 border-slate-100 shadow-sm mb-6 text-center">
                          <img 
                            src="https://img2.pic.in.th/pic/qrcode31e8b4afbdabbca7.png" 
                            alt="PromptPay QR" 
                            className="w-48 h-48 mx-auto object-contain" 
                          />
                          <p className="text-xs text-slate-400 mt-2">สแกนจ่ายผ่านแอปธนาคาร</p>
                      </div>

                      <div className="bg-yellow-50 p-4 rounded-xl border border-yellow-100 flex items-start">
                          <Info className="w-5 h-5 text-yellow-600 mr-2 flex-shrink-0 mt-0.5" />
                          <p className="text-sm text-yellow-800 font-medium leading-relaxed">
                              โอนเงินแล้วกรุณาแนบสลิปในฟอร์มทางด้านซ้ายเพื่อยืนยันการสมัคร
                          </p>
                      </div>
                  </div>
              </div>
              
              {/* Contact Card */}
              <div className="bg-white rounded-[2rem] shadow-sm border border-slate-100 overflow-hidden">
                   <div className="bg-ocean-700 p-5 flex items-center text-white font-bold text-lg">
                      <Phone className="mr-3 w-6 h-6" /> ติดต่อสอบถาม
                  </div>
                  <div className="p-6 space-y-4">
                      <div className="flex items-start">
                          <Phone className="w-5 h-5 text-ocean-600 mr-3 mt-1" />
                          <div>
                              <p className="text-sm text-slate-500">โทรศัพท์</p>
                              <a href={`tel:${CONTACT_INFO.phone}`} className="font-bold text-slate-800 hover:text-ocean-600">{CONTACT_INFO.phone}</a>
                          </div>
                      </div>
                      <div className="flex items-start">
                          <Facebook className="w-5 h-5 text-blue-600 mr-3 mt-1" />
                          <div>
                              <p className="text-sm text-slate-500">Facebook</p>
                              <a href={CONTACT_INFO.facebookUrl} target="_blank" rel="noopener noreferrer" className="font-bold text-slate-800 hover:text-blue-600">เรียนว่ายน้ำพิษณุโลก By ครูฟลุ๊ค</a>
                          </div>
                      </div>
                      <div className="flex items-start">
                          <Clock className="w-5 h-5 text-orange-500 mr-3 mt-1" />
                          <div>
                              <p className="text-sm text-slate-500">เวลาทำการ</p>
                              <p className="font-bold text-slate-800">09:00 - 18:00 น.</p>
                          </div>
                      </div>
                  </div>
              </div>

               {/* Tips Card */}
               <div className="bg-sky-50 rounded-[2rem] p-6 border border-sky-100 text-sky-900">
                  <h3 className="font-bold flex items-center mb-3 text-sky-700">
                      <Info className="w-5 h-5 mr-2" /> เคล็ดลับ
                  </h3>
                  <ul className="space-y-2 text-sm text-sky-800 list-disc list-inside marker:text-sky-500">
                      <li>กรอกข้อมูลให้ครบถ้วน</li>
                      <li>ระบุโรคประจำตัว (ถ้ามี)</li>
                      <li>โอนเงินก่อนวันเริ่มเรียน 3 วัน</li>
                      <li>ส่งสลิปเพื่อยืนยันการชำระ</li>
                  </ul>
               </div>

           </div>
        </div>

      </div>
    </div>
  );
};

export default Registration;