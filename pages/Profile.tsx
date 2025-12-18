import React, { useState, useEffect } from 'react';
import { updateDoc, doc, collection, query, where, getDocs, addDoc } from 'firebase/firestore';
import { db } from '../services/firebase';
import { UserProfile, Enrollment, Course } from '../types';
import { INITIAL_COURSES } from '../constants';
import { User, Phone, MapPin, Save, Activity, Calendar, Star, MessageSquare, X, Info } from 'lucide-react';

interface ProfileProps {
  user: UserProfile;
}

const Profile: React.FC<ProfileProps> = ({ user }) => {
  const [formData, setFormData] = useState({
    displayName: user.displayName || '',
    phone: user.phone || '',
    address: user.address || '',
    emergencyContact: user.emergencyContact || ''
  });
  const [isEditing, setIsEditing] = useState(false);
  const [enrollments, setEnrollments] = useState<Enrollment[]>([]);
  const [courses] = useState<Course[]>(INITIAL_COURSES);

  // Review Modal State
  const [isReviewModalOpen, setIsReviewModalOpen] = useState(false);
  const [currentReviewEnrollmentId, setCurrentReviewEnrollmentId] = useState<string | null>(null);
  const [reviewRating, setReviewRating] = useState(5);
  const [reviewComment, setReviewComment] = useState('');

  useEffect(() => {
    const fetchEnrollments = async () => {
      const q = query(collection(db, "enrollments"), where("userId", "==", user.uid));
      const querySnapshot = await getDocs(q);
      const data = querySnapshot.docs.map(doc => ({ id: doc.id, ...(doc.data() as any) } as Enrollment));
      // Sort by latest
      data.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
      setEnrollments(data);
    };
    fetchEnrollments();
  }, [user.uid]);

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await updateDoc(doc(db, "users", user.uid), formData);
      setIsEditing(false);
      alert("อัพเดทข้อมูลสำเร็จ");
    } catch (error) {
      console.error("Error updating profile:", error);
      alert("เกิดข้อผิดพลาด");
    }
  };

  const openReviewModal = (enrollmentId: string) => {
      setCurrentReviewEnrollmentId(enrollmentId);
      setReviewRating(5);
      setReviewComment('');
      setIsReviewModalOpen(true);
  };

  const notifyStaffOnReview = async (studentName: string, courseTitle: string) => {
      try {
          // Find Admins and Instructors
          const q = query(collection(db, "users"), where("role", "in", ["ADMIN", "INSTRUCTOR"]));
          const snapshot = await getDocs(q);
          
          if (!snapshot.empty) {
              const notifications = snapshot.docs.map(doc => {
                  return addDoc(collection(db, "notifications"), {
                      userId: doc.id,
                      title: "มีรีวิวใหม่จากนักเรียน",
                      message: `คุณ ${studentName} ได้รีวิวคอร์ส ${courseTitle}`,
                      read: false,
                      type: 'EVALUATION',
                      date: new Date().toISOString()
                  });
              });
              await Promise.all(notifications);
          }
      } catch (error) {
          console.error("Failed to notify staff", error);
      }
  };

  const submitReview = async () => {
      if (!currentReviewEnrollmentId) return;
      
      try {
          const reviewData = {
              rating: reviewRating,
              comment: reviewComment,
              createdAt: new Date().toISOString()
          };

          await updateDoc(doc(db, "enrollments", currentReviewEnrollmentId), {
              review: reviewData
          });

          // Update local state
          const enrolled = enrollments.find(e => e.id === currentReviewEnrollmentId);
          setEnrollments(prev => prev.map(en => 
              en.id === currentReviewEnrollmentId 
              ? { ...en, review: reviewData } 
              : en
          ));
          
          if (enrolled) {
              const course = courses.find(c => c.id === enrolled.courseId);
              await notifyStaffOnReview(user.displayName, course?.title || 'Unknown Course');
          }

          setIsReviewModalOpen(false);
          alert("ขอบคุณสำหรับการรีวิว!");
      } catch (error) {
          console.error("Error submitting review:", error);
          alert("เกิดข้อผิดพลาดในการบันทึกรีวิว");
      }
  };

  const inputClasses = "w-full mt-2 p-4 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-ocean-500 focus:border-transparent outline-none transition-all text-slate-800 placeholder-slate-400 text-lg";

  return (
    <div className="min-h-screen bg-slate-50 py-16">
      <div className="max-w-6xl mx-auto px-6 sm:px-8 lg:px-10">
        <h1 className="text-4xl font-bold text-slate-900 mb-10">โปรไฟล์ของฉัน</h1>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-10">
          {/* Left Column: Personal Info */}
          <div className="lg:col-span-1">
            <div className="bg-white rounded-[2rem] shadow-sm border border-slate-100 p-8">
              <div className="flex items-center justify-between mb-8">
                <h2 className="text-2xl font-bold text-slate-800">ข้อมูลส่วนตัว</h2>
                <button 
                  onClick={() => setIsEditing(!isEditing)}
                  className="text-base text-ocean-600 font-bold hover:underline"
                >
                  {isEditing ? 'ยกเลิก' : 'แก้ไข'}
                </button>
              </div>

              {isEditing ? (
                <form onSubmit={handleUpdateProfile} className="space-y-5">
                  <div>
                    <label className="text-sm font-bold text-slate-500 uppercase tracking-wider">ชื่อ-นามสกุล</label>
                    <input 
                      className={inputClasses} 
                      value={formData.displayName}
                      onChange={e => setFormData({...formData, displayName: e.target.value})}
                    />
                  </div>
                  <div>
                    <label className="text-sm font-bold text-slate-500 uppercase tracking-wider">เบอร์โทรศัพท์</label>
                    <input 
                      className={inputClasses} 
                      value={formData.phone}
                      onChange={e => setFormData({...formData, phone: e.target.value})}
                    />
                  </div>
                  <div>
                    <label className="text-sm font-bold text-slate-500 uppercase tracking-wider">ที่อยู่</label>
                    <textarea 
                      className={inputClasses} 
                      rows={3}
                      value={formData.address}
                      onChange={e => setFormData({...formData, address: e.target.value})}
                    />
                  </div>
                  <div>
                    <label className="text-sm font-bold text-slate-500 uppercase tracking-wider">ติดต่อฉุกเฉิน</label>
                    <input 
                      className={inputClasses} 
                      value={formData.emergencyContact}
                      onChange={e => setFormData({...formData, emergencyContact: e.target.value})}
                    />
                  </div>
                  <button type="submit" className="w-full bg-ocean-600 text-white py-4 rounded-xl flex items-center justify-center gap-2 hover:bg-ocean-700 shadow-md text-lg font-bold">
                    <Save size={20} /> บันทึกข้อมูล
                  </button>
                </form>
              ) : (
                <div className="space-y-6">
                  <div className="flex items-start gap-4">
                    <div className="bg-ocean-50 p-3 rounded-full text-ocean-600"><User size={24} /></div>
                    <div>
                      <p className="text-sm text-slate-500 font-bold">ชื่อ-นามสกุล</p>
                      <p className="font-semibold text-slate-900 text-lg">{formData.displayName}</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-4">
                    <div className="bg-ocean-50 p-3 rounded-full text-ocean-600"><Phone size={24} /></div>
                    <div>
                      <p className="text-sm text-slate-500 font-bold">เบอร์โทรศัพท์</p>
                      <p className="font-semibold text-slate-900 text-lg">{formData.phone || '-'}</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-4">
                    <div className="bg-ocean-50 p-3 rounded-full text-ocean-600"><MapPin size={24} /></div>
                    <div>
                      <p className="text-sm text-slate-500 font-bold">ที่อยู่</p>
                      <p className="font-semibold text-slate-900 text-lg">{formData.address || '-'}</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-4">
                    <div className="bg-ocean-50 p-3 rounded-full text-ocean-600"><Activity size={24} /></div>
                    <div>
                      <p className="text-sm text-slate-500 font-bold">ติดต่อฉุกเฉิน</p>
                      <p className="font-semibold text-slate-900 text-lg">{formData.emergencyContact || '-'}</p>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Right Column: Enrolled Courses */}
          <div className="lg:col-span-2">
            <h2 className="text-2xl font-bold text-slate-800 mb-8">คอร์สเรียนของฉัน</h2>
            {enrollments.length === 0 ? (
              <div className="bg-white p-12 rounded-[2rem] text-center border border-slate-100">
                <p className="text-slate-500 text-xl">ยังไม่มีคอร์สเรียน</p>
                <a href="#/courses" className="text-ocean-600 hover:underline mt-3 inline-block text-lg font-medium">สมัครเรียนเลย</a>
              </div>
            ) : (
              <div className="space-y-6">
                {enrollments.map(enrollment => {
                   const course = courses.find(c => c.id === enrollment.courseId);
                   const totalSessions = course?.sessions || 20;
                   const attended = enrollment.attendance.length;
                   const progress = Math.min((attended / totalSessions) * 100, 100);
                   const isPassed = enrollment.evaluation === 'PASS';

                   return (
                     <div key={enrollment.id} className="bg-white rounded-[2rem] shadow-sm border border-slate-100 p-8">
                        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4">
                          <div>
                            <h3 className="font-bold text-2xl text-slate-900">{course?.title || enrollment.courseId}</h3>
                            <div className="flex flex-col sm:flex-row sm:items-center text-base text-slate-500 mt-1 gap-2">
                                <span className="font-medium text-slate-700">ผู้เรียน: {enrollment.studentName}</span>
                                {enrollment.studentId && (
                                    <span className="bg-slate-100 text-slate-600 px-2 py-0.5 rounded text-sm font-mono border border-slate-200 w-fit">
                                        ID: {enrollment.studentId}
                                    </span>
                                )}
                            </div>
                          </div>
                          
                          <div className="flex items-center gap-3">
                              {isPassed && (
                                  <span className="bg-green-500 text-white px-4 py-2 rounded-full text-sm font-bold shadow-md shadow-green-200">
                                      ผ่านหลักสูตร
                                  </span>
                              )}
                              <span className={`px-4 py-2 rounded-full text-sm font-bold ${
                                enrollment.paymentStatus === 'PAID' ? 'bg-green-100 text-green-700' :
                                enrollment.paymentStatus === 'REJECTED' ? 'bg-red-100 text-red-700' :
                                'bg-yellow-100 text-yellow-700'
                              }`}>
                                {enrollment.paymentStatus === 'PAID' ? 'ชำระเงินแล้ว' : 
                                enrollment.paymentStatus === 'REJECTED' ? 'ปฏิเสธ' : 'รอตรวจสอบ'}
                              </span>
                          </div>
                        </div>

                        {enrollment.paymentStatus === 'PAID' && (
                          <div className="mt-6">
                            <div className="flex justify-between text-base mb-3 text-slate-600">
                                <span>ความคืบหน้าการเรียน</span>
                                <span className="font-bold">{attended} / {totalSessions} ชั่วโมง</span>
                            </div>
                            <div className="w-full bg-slate-100 rounded-full h-4 relative overflow-hidden">
                                <div 
                                  className={`h-4 rounded-full transition-all duration-500 ${isPassed ? 'bg-green-500' : 'bg-ocean-500'}`}
                                  style={{ width: `${progress}%` }}
                                ></div>
                            </div>
                            <div className="mt-6 flex flex-wrap items-center text-base text-slate-500 gap-x-6 gap-y-2">
                               <div className="flex items-center">
                                  <Calendar className="w-5 h-5 mr-2 text-ocean-500" />
                                  เริ่มเรียน: {new Date(enrollment.startDate).toLocaleDateString('th-TH')}
                               </div>
                               {course?.instructorName && (
                                 <div className="flex items-center">
                                    <User className="w-5 h-5 mr-2 text-ocean-500" />
                                    ครูผู้สอน: {course.instructorName}
                                 </div>
                               )}
                            </div>

                            {/* REVIEW SECTION */}
                            <div className="mt-8 pt-6 border-t border-slate-100">
                                {isPassed ? (
                                    enrollment.review ? (
                                        <div className="bg-yellow-50 rounded-xl p-5 border border-yellow-100">
                                            <div className="flex items-center justify-between mb-2">
                                                <div className="flex text-yellow-500">
                                                    {[...Array(5)].map((_, i) => (
                                                        <Star key={i} size={18} fill={i < enrollment.review!.rating ? "currentColor" : "none"} className={i < enrollment.review!.rating ? "" : "text-yellow-200"} />
                                                    ))}
                                                </div>
                                                <span className="text-xs text-yellow-700 font-medium">รีวิวของคุณ</span>
                                            </div>
                                            <p className="text-slate-700 italic">"{enrollment.review.comment}"</p>
                                        </div>
                                    ) : (
                                        <div className="flex items-center justify-between bg-slate-50 p-4 rounded-xl">
                                            <div className="flex items-center text-slate-600">
                                                <MessageSquare className="w-5 h-5 mr-3 text-ocean-500" />
                                                <span>คุณผ่านหลักสูตรแล้ว! ช่วยรีวิวคอร์สนี้หน่อยไหมครับ?</span>
                                            </div>
                                            <button 
                                                onClick={() => openReviewModal(enrollment.id)}
                                                className="bg-ocean-600 text-white px-5 py-2 rounded-lg font-bold hover:bg-ocean-700 transition-colors shadow-md shadow-ocean-200"
                                            >
                                                เขียนรีวิว
                                            </button>
                                        </div>
                                    )
                                ) : (
                                    <div className="flex items-center justify-center p-4 bg-slate-50/50 rounded-xl border border-slate-100 border-dashed text-slate-400 text-sm">
                                        <Info className="w-4 h-4 mr-2" />
                                        รอครูผู้สอนประเมินผล "ผ่าน" เพื่อเขียนรีวิว
                                    </div>
                                )}
                            </div>
                          </div>
                        )}
                     </div>
                   );
                })}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* REVIEW MODAL */}
      {isReviewModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
              <div className="bg-white rounded-[2rem] max-w-lg w-full p-8 shadow-2xl relative">
                  <button 
                      onClick={() => setIsReviewModalOpen(false)}
                      className="absolute top-6 right-6 p-2 rounded-full hover:bg-slate-100 text-slate-400 hover:text-slate-600 transition"
                  >
                      <X size={24} />
                  </button>
                  
                  <h3 className="text-2xl font-bold text-slate-800 mb-2 text-center">ความพึงพอใจการเรียน</h3>
                  <p className="text-slate-500 text-center mb-8">ให้คะแนนและติชมเพื่อเป็นกำลังใจให้ครูผู้สอนครับ</p>
                  
                  <div className="flex justify-center gap-2 mb-8">
                      {[1, 2, 3, 4, 5].map((star) => (
                          <button 
                              key={star}
                              type="button"
                              onClick={() => setReviewRating(star)}
                              className="focus:outline-none transform hover:scale-110 transition-transform"
                          >
                              <Star 
                                  size={40} 
                                  fill={star <= reviewRating ? "#f59e0b" : "none"} 
                                  className={star <= reviewRating ? "text-yellow-500" : "text-slate-200"}
                              />
                          </button>
                      ))}
                  </div>

                  <div className="mb-8">
                      <label className="block text-sm font-bold text-slate-700 mb-2">ความคิดเห็นเพิ่มเติม</label>
                      <textarea 
                          rows={4}
                          className="w-full p-4 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-ocean-500 focus:border-transparent outline-none transition-all text-slate-800 placeholder-slate-400 text-base"
                          placeholder="สอนเป็นยังไงบ้าง? บรรยากาศเป็นอย่างไร?"
                          value={reviewComment}
                          onChange={(e) => setReviewComment(e.target.value)}
                      />
                  </div>

                  <button 
                      onClick={submitReview}
                      className="w-full py-4 bg-ocean-600 text-white font-bold rounded-xl hover:bg-ocean-700 transition-colors shadow-lg shadow-ocean-500/30 text-lg"
                  >
                      ส่งรีวิว
                  </button>
              </div>
          </div>
      )}
    </div>
  );
};

export default Profile;