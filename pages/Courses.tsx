import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { collection, getDocs, doc, updateDoc, setDoc, onSnapshot, query, where } from 'firebase/firestore';
import { db } from '../services/firebase';
import { uploadImageToImgbb } from '../services/imgbbService';
import { Course, UserRole, UserProfile, Enrollment } from '../types';
import { INITIAL_COURSES } from '../constants';
import { 
  Users, Clock, Edit2, Save, XCircle, Filter, SortAsc, 
  DollarSign, ShieldCheck, CheckCircle, Info, Calendar, BookOpen, UserCheck, User, Star, MessageSquare,
  Image as ImageIcon, Loader2
} from 'lucide-react';

interface CoursesProps {
  user: UserProfile | null;
}

interface ReviewData {
  id: string;
  studentName: string;
  rating: number;
  comment: string;
  date: string;
}

const Courses: React.FC<CoursesProps> = ({ user }) => {
  const [courses, setCourses] = useState<Course[]>([]);
  const [selectedCourse, setSelectedCourse] = useState<Course | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [editForm, setEditForm] = useState<Partial<Course>>({});
  const [realTimeEnrolled, setRealTimeEnrolled] = useState<Record<string, number>>({});
  
  // Image Editing State
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [saving, setSaving] = useState(false);
  
  // Reviews State
  const [courseReviews, setCourseReviews] = useState<ReviewData[]>([]);
  const [averageRating, setAverageRating] = useState(0);
  const [allReviews, setAllReviews] = useState<Record<string, { count: number, avg: number }>>({}); // Cache for grid view

  // Filters and Sort State
  const [filterAge, setFilterAge] = useState<string>('All');
  const [filterType, setFilterType] = useState<string>('All');
  const [filterInstructor, setFilterInstructor] = useState<string>('All');
  const [sortOption, setSortOption] = useState<string>('default');

  const navigate = useNavigate();

  // Load courses from Firestore with Real-time listener
  // Merges Firestore data with INITIAL_COURSES to ensure default data is editable
  useEffect(() => {
    const unsubscribe = onSnapshot(collection(db, "courses"), (snapshot) => {
      const firestoreCourses: Record<string, Course> = {};
      
      snapshot.forEach(doc => {
          firestoreCourses[doc.id] = { id: doc.id, ...doc.data() } as Course;
      });

      // Merge logic: Start with INITIAL_COURSES, override with Firestore data
      const mergedCourses = INITIAL_COURSES.map(initCourse => {
          // Check if this ID exists in Firestore updates
          if (firestoreCourses[initCourse.id]) {
              const updated = firestoreCourses[initCourse.id];
              delete firestoreCourses[initCourse.id]; // Remove from pool so we don't duplicate
              return updated;
          }
          return initCourse;
      });

      // Add any remaining Firestore courses (newly created ones not in INITIAL)
      const finalCourses = [...mergedCourses, ...Object.values(firestoreCourses)];
      
      setCourses(finalCourses);
    }, (error) => {
      console.error("Error loading courses:", error);
      // Fallback if permission error or offline (though onSnapshot handles offline mostly)
      setCourses(INITIAL_COURSES);
    });

    return () => unsubscribe();
  }, []);

  // Real-time listener for PAID enrollments (Counts & Reviews Aggregation)
  useEffect(() => {
    // We listen to ALL PAID enrollments to calculate stats globally
    const q = query(collection(db, "enrollments"), where("paymentStatus", "==", "PAID"));
    
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const counts: Record<string, number> = {};
      const reviewsMap: Record<string, { total: number, sum: number }> = {};
      
      snapshot.docs.forEach(doc => {
        const data = doc.data() as Enrollment;
        const courseId = data.courseId;
        
        // 1. Enrollment Count
        if (courseId) {
          counts[courseId] = (counts[courseId] || 0) + 1;
        }

        // 2. Reviews Aggregation
        if (courseId && data.review) {
             if (!reviewsMap[courseId]) reviewsMap[courseId] = { total: 0, sum: 0 };
             reviewsMap[courseId].total += 1;
             reviewsMap[courseId].sum += data.review.rating;
        }
      });
      
      setRealTimeEnrolled(counts);

      // Convert reviewsMap to usable state
      const computedReviews: Record<string, { count: number, avg: number }> = {};
      Object.keys(reviewsMap).forEach(k => {
          computedReviews[k] = {
              count: reviewsMap[k].total,
              avg: reviewsMap[k].total > 0 ? reviewsMap[k].sum / reviewsMap[k].total : 0
          };
      });
      setAllReviews(computedReviews);

    }, (error) => {
      console.error("Error fetching real-time data:", error);
    });

    return () => unsubscribe();
  }, []);

  // Fetch specific reviews when a course is selected
  useEffect(() => {
      if (selectedCourse) {
          const fetchReviews = async () => {
              // Note: Firestore doesn't natively support "field exists" in simple queries easily mixed with others without indexing.
              // We'll fetch paid enrollments for this course and filter in JS for now as dataset is small.
              const q = query(
                  collection(db, "enrollments"), 
                  where("courseId", "==", selectedCourse.id),
                  where("paymentStatus", "==", "PAID")
              );
              
              const snap = await getDocs(q);
              const reviews: ReviewData[] = [];
              let sum = 0;
              let count = 0;

              snap.docs.forEach(doc => {
                  const data = doc.data() as Enrollment;
                  if (data.review) {
                      reviews.push({
                          id: doc.id,
                          studentName: data.studentName,
                          rating: data.review.rating,
                          comment: data.review.comment,
                          date: data.review.createdAt
                      });
                      sum += data.review.rating;
                      count++;
                  }
              });
              
              // Sort by newest
              reviews.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

              setCourseReviews(reviews);
              setAverageRating(count > 0 ? sum / count : 0);
          };
          fetchReviews();
      }
  }, [selectedCourse]);

  // Strict Admin check for Edit Button
  const isSuperAdmin = user?.role === UserRole.ADMIN;

  // Extract unique instructors from courses
  const instructors = useMemo(() => {
    const names = courses.map(c => c.instructorName).filter((name): name is string => !!name);
    return Array.from(new Set(names));
  }, [courses]);

  // Filter and Sort Logic
  const filteredCourses = useMemo(() => {
    let result = [...courses];

    // Filter by Age
    if (filterAge === '4-6') {
      result = result.filter(c => c.ageGroup.includes('4-6') || c.ageGroup.includes('เด็กเล็ก'));
    } else if (filterAge === '7+') {
      result = result.filter(c => c.ageGroup.includes('7') || c.ageGroup.includes('ผู้ใหญ่'));
    }

    // Filter by Type
    if (filterType !== 'All') {
      result = result.filter(c => c.type === filterType);
    }

    // Filter by Instructor
    if (filterInstructor !== 'All') {
      result = result.filter(c => c.instructorName === filterInstructor);
    }

    // Sort
    if (sortOption === 'price_asc') {
      result.sort((a, b) => a.price - b.price);
    } else if (sortOption === 'price_desc') {
      result.sort((a, b) => b.price - a.price);
    } else if (sortOption === 'popularity') {
      // Use real-time counts for sorting
      result.sort((a, b) => (realTimeEnrolled[b.id] || 0) - (realTimeEnrolled[a.id] || 0));
    }

    return result;
  }, [courses, filterAge, filterType, filterInstructor, sortOption, realTimeEnrolled]);

  const handleEditClick = (course: Course) => {
    setSelectedCourse(course);
    setEditForm(course);
    setImageFile(null); // Reset file
    setIsEditing(true);
  };

  const handleSaveEdit = async () => {
    if (!selectedCourse || !isSuperAdmin) return;
    
    setSaving(true);
    try {
      let finalImageUrl = editForm.imageUrl;

      // Upload new image if selected
      if (imageFile) {
         finalImageUrl = await uploadImageToImgbb(imageFile);
      }

      const courseRef = doc(db, "courses", selectedCourse.id);
      const updatedData = { ...editForm, imageUrl: finalImageUrl };

      // Use setDoc with merge: true to handle both existing docs and new docs (from INITIAL_COURSES)
      await setDoc(courseRef, updatedData, { merge: true });
      
      // Update local selected state immediately for better UX
      setSelectedCourse({ ...selectedCourse, ...updatedData } as Course);
      
      setIsEditing(false);
      setImageFile(null);
      alert("บันทึกข้อมูลเรียบร้อยแล้ว");
    } catch (error) {
      console.error("Error updating course:", error);
      alert("เกิดข้อผิดพลาดในการบันทึก");
    } finally {
      setSaving(false);
    }
  };

  const getTagInfo = (course: Course) => {
    if (course.type === 'Private') return { text: 'คอร์สส่วนตัว', color: 'bg-purple-500', icon: <Users size={14} className="mr-1"/> };
    if (course.type === 'Baby') return { text: 'ยอดนิยม', color: 'bg-orange-500', icon: <CheckCircle size={14} className="mr-1"/> };
    return { text: 'ราคาพิเศษ', color: 'bg-green-500', icon: <DollarSign size={14} className="mr-1"/> };
  };

  // Shared input style class
  const inputClasses = "mt-2 w-full p-4 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-ocean-500 focus:border-transparent outline-none transition-all text-slate-800 placeholder-slate-400 text-lg";

  return (
    <div className="min-h-screen bg-slate-50 py-12 px-4 sm:px-6">
      {/* Standardized container max-width to match other pages */}
      <div className="max-w-7xl mx-auto">
        
        {/* Banner Section - Matched Registration/FAQ style */}
        <div className="bg-gradient-to-r from-ocean-500 to-ocean-400 rounded-2xl p-6 md:p-8 text-white shadow-lg mb-8 relative overflow-hidden flex flex-col md:flex-row items-center justify-between">
            <div className="relative z-10">
                <div className="flex items-center mb-2">
                    <div className="bg-white/20 p-2 rounded-xl mr-3 backdrop-blur-sm">
                        <BookOpen className="w-6 h-6 md:w-8 md:h-8 text-white" />
                    </div>
                    <h1 className="text-2xl md:text-4xl font-bold">คอร์สเรียนว่ายน้ำของเรา</h1>
                </div>
                <p className="text-ocean-50 text-base md:text-lg font-light opacity-90 max-w-2xl pl-1">
                    เลือกคอร์สที่เหมาะสมกับคุณ หรือบุตรหลานของคุณ เรามีหลักสูตรครอบคลุมทุกช่วงอายุ
                </p>
            </div>
            <div className="mt-4 md:mt-0 relative z-10 hidden md:block">
                <BookOpen className="w-24 h-24 opacity-20 transform rotate-12" />
            </div>
            {/* Decor Circles */}
            <div className="absolute top-0 right-0 w-48 h-48 bg-white opacity-5 rounded-full transform translate-x-1/2 -translate-y-1/2"></div>
            <div className="absolute bottom-0 left-0 w-32 h-32 bg-white opacity-5 rounded-full transform -translate-x-1/2 translate-y-1/2"></div>
        </div>

        {/* Filter Bar */}
        <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-100 mb-8 flex flex-col md:flex-row gap-5 items-center justify-between max-w-full mx-auto">
          <div className="flex flex-col md:flex-row gap-5 w-full md:w-auto overflow-x-auto pb-2 md:pb-0">
            <div className="flex items-center gap-3 whitespace-nowrap">
              <Filter size={20} className="text-ocean-500" />
              <span className="text-base font-semibold text-slate-700">ตัวกรอง:</span>
            </div>
            <select 
              value={filterAge} 
              onChange={(e) => setFilterAge(e.target.value)}
              className="p-2.5 border rounded-xl text-sm bg-slate-50 focus:ring-ocean-500 text-slate-700 outline-none min-w-[140px]"
            >
              <option value="All">ทุกช่วงอายุ</option>
              <option value="4-6">4-6 ปี</option>
              <option value="7+">7 ปีขึ้นไป</option>
            </select>
            <select 
              value={filterType} 
              onChange={(e) => setFilterType(e.target.value)}
              className="p-2.5 border rounded-xl text-sm bg-slate-50 focus:ring-ocean-500 text-slate-700 outline-none min-w-[140px]"
            >
              <option value="All">ทุกประเภท</option>
              <option value="Normal">ปกติ (Normal)</option>
              <option value="Private">ส่วนตัว (Private)</option>
              <option value="Baby">เด็กเล็ก (Baby)</option>
            </select>
            <select 
              value={filterInstructor} 
              onChange={(e) => setFilterInstructor(e.target.value)}
              className="p-2.5 border rounded-xl text-sm bg-slate-50 focus:ring-ocean-500 text-slate-700 outline-none min-w-[140px]"
            >
              <option value="All">ทุกผู้สอน</option>
              {instructors.map((inst, idx) => (
                <option key={idx} value={inst}>{inst}</option>
              ))}
            </select>
          </div>

          <div className="flex items-center gap-5 w-full md:w-auto">
            <div className="flex items-center gap-3 whitespace-nowrap">
              <SortAsc size={20} className="text-ocean-500" />
              <span className="text-base font-semibold text-slate-700">เรียงตาม:</span>
            </div>
            <select 
              value={sortOption} 
              onChange={(e) => setSortOption(e.target.value)}
              className="p-2.5 border rounded-xl text-sm bg-slate-50 focus:ring-ocean-500 flex-grow md:flex-grow-0 text-slate-700 outline-none min-w-[160px]"
            >
              <option value="default">แนะนำ</option>
              <option value="price_asc">ราคา: ต่ำ - สูง</option>
              <option value="price_desc">ราคา: สูง - ต่ำ</option>
              <option value="popularity">ยอดนิยม</option>
            </select>
          </div>
        </div>

        {/* Course Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredCourses.map((course) => {
            const tag = getTagInfo(course);
            const currentEnrolled = realTimeEnrolled[course.id] || 0;
            const reviewStats = allReviews[course.id] || { count: 0, avg: 0 };

            return (
              <div key={course.id} className="bg-white rounded-3xl shadow-lg shadow-ocean-900/5 hover:shadow-xl hover:shadow-ocean-900/10 transition-all duration-300 overflow-hidden flex flex-col group relative border border-slate-100">
                {/* Image Section */}
                <div className="relative h-52 overflow-hidden">
                  <img src={course.imageUrl} alt={course.title} className="w-full h-full object-cover transform group-hover:scale-110 transition-transform duration-700 ease-in-out" />
                  <div className="absolute inset-0 bg-gradient-to-t from-ocean-900/80 to-transparent"></div>
                  
                  {/* Tag */}
                  <div className={`absolute top-4 right-4 ${tag.color} text-white px-3 py-1 rounded-full text-xs font-bold shadow-md flex items-center`}>
                    {tag.icon} {tag.text}
                  </div>

                  {/* Title Overlay */}
                  <div className="absolute bottom-4 left-5 right-5">
                     <h3 className="text-2xl font-bold text-white leading-tight shadow-black drop-shadow-md">{course.title}</h3>
                     <div className="flex items-center justify-between mt-2">
                         {course.instructorName && (
                            <div className="flex items-center text-white/95 text-sm font-medium bg-black/30 backdrop-blur-md px-2 py-1 rounded-lg w-fit shadow-sm border border-white/10">
                                <User size={14} className="mr-1.5" />
                                <span>ครู{course.instructorName}</span>
                            </div>
                         )}
                         {reviewStats.count > 0 && (
                            <div className="flex items-center text-yellow-400 bg-black/30 backdrop-blur-md px-2 py-1 rounded-lg border border-white/10">
                                <Star size={14} fill="currentColor" className="mr-1"/>
                                <span className="text-white text-sm font-bold">{reviewStats.avg.toFixed(1)}</span>
                            </div>
                         )}
                     </div>
                  </div>

                  {!course.isOpen && (
                     <div className="absolute inset-0 bg-black/60 flex items-center justify-center backdrop-blur-sm">
                       <span className="text-white font-bold text-xl border-2 border-white px-6 py-2 rounded-lg">ปิดรับสมัคร</span>
                     </div>
                  )}
                </div>
                
                {/* Content Section */}
                <div className="p-6 flex-grow flex flex-col relative">
                  {/* Floating Dollar Icon */}
                  <div className="absolute top-0 right-6 w-12 h-12 bg-sky-400 rounded-full flex items-center justify-center shadow-lg transform -translate-y-1/2 border-4 border-white z-10 group-hover:bg-ocean-400 transition-colors duration-300">
                      <div className="transition-transform duration-700 ease-in-out group-hover:rotate-[360deg]">
                          <DollarSign className="text-white w-6 h-6" />
                      </div>
                  </div>

                  <div className="mb-6 mt-2">
                    <p className="text-xs text-slate-500 font-medium">ราคาเริ่มต้น</p>
                    <p className="text-3xl font-bold text-ocean-600">{course.price.toLocaleString()} <span className="text-base font-normal text-slate-400">บาท</span></p>
                  </div>
                  
                  <div className="space-y-3 mb-6 flex-grow">
                    <div className="flex items-center text-slate-600 text-base">
                      <Users className="w-5 h-5 mr-3 text-ocean-500" />
                      <span>เหมาะสำหรับ: {course.ageGroup}</span>
                    </div>
                    <div className="flex items-center text-slate-600 text-base">
                      <Clock className="w-5 h-5 mr-3 text-ocean-500" />
                      <span>ระยะเวลา: {course.sessions} ครั้ง (ครั้งละ 1 ชม.)</span>
                    </div>
                    <div className="flex items-center text-slate-600 text-base">
                        <UserCheck className="w-5 h-5 mr-3 text-ocean-500" />
                        <span className="flex-1">ผู้เรียน: <span className="font-bold text-slate-900">{currentEnrolled}</span>/{course.capacity} คน</span>
                    </div>
                    <div className="flex items-center text-slate-600 text-base">
                      <ShieldCheck className="w-5 h-5 mr-3 text-ocean-500" />
                      <span>รับประกันผลการเรียน</span>
                    </div>
                  </div>

                  <div className="mt-auto">
                    <button 
                      onClick={() => setSelectedCourse(course)}
                      className="w-full py-3 bg-ocean-600 text-white rounded-2xl hover:bg-ocean-700 transition-colors font-bold shadow-lg shadow-ocean-500/30 flex items-center justify-center text-base"
                    >
                      <Info className="w-5 h-5 mr-2" /> ดูรายละเอียดเพิ่มเติม
                    </button>
                    {isSuperAdmin && (
                        <button 
                          onClick={(e) => { e.stopPropagation(); handleEditClick(course); }}
                          className="w-full mt-2 py-2 bg-yellow-50 text-yellow-600 rounded-xl hover:bg-yellow-100 transition-colors text-xs font-semibold"
                        >
                          แก้ไขคอร์ส (Admin)
                        </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Detail Modal */}
      {selectedCourse && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
          <div className="bg-white rounded-[2rem] max-w-5xl w-full max-h-[90vh] overflow-y-auto shadow-2xl overflow-hidden flex flex-col">
            {isEditing ? (
              // EDIT MODE (Admin)
              <div className="p-10">
                <h2 className="text-3xl font-bold mb-8 text-slate-800 flex items-center">
                  <Edit2 className="mr-3 h-8 w-8 text-ocean-600" /> แก้ไขคอร์สเรียน
                </h2>
                <div className="space-y-6">
                  
                  {/* Image Edit Section */}
                  <div className="mb-6">
                    <label className="block text-base font-bold text-slate-700 mb-2">รูปภาพคอร์ส</label>
                    <div className="flex flex-col md:flex-row gap-6">
                        <div className="w-full md:w-1/3 aspect-video bg-slate-100 rounded-xl overflow-hidden border border-slate-200 relative flex items-center justify-center">
                            <img 
                                src={imageFile ? URL.createObjectURL(imageFile) : (editForm.imageUrl || 'https://via.placeholder.com/400x300')} 
                                alt="Preview" 
                                className="w-full h-full object-contain"
                            />
                        </div>
                        <div className="w-full md:w-2/3 space-y-4">
                            <div>
                                <label className="text-sm text-slate-500 mb-1 block">อัปโหลดรูปภาพใหม่</label>
                                <div className="relative">
                                    <input
                                        type="file"
                                        accept="image/*"
                                        onChange={(e) => {
                                            if(e.target.files?.[0]) {
                                                setImageFile(e.target.files[0]);
                                            }
                                        }}
                                        className="block w-full text-sm text-slate-500 file:mr-4 file:py-2.5 file:px-4 file:rounded-xl file:border-0 file:text-sm file:font-bold file:bg-ocean-50 file:text-ocean-700 hover:file:bg-ocean-100 cursor-pointer border border-slate-200 rounded-xl"
                                    />
                                </div>
                            </div>
                            <div className="relative">
                                <div className="absolute inset-0 flex items-center">
                                    <div className="w-full border-t border-slate-200"></div>
                                </div>
                                <div className="relative flex justify-center text-xs uppercase">
                                    <span className="bg-white px-2 text-slate-500">หรือ</span>
                                </div>
                            </div>
                            <div>
                                <label className="text-sm text-slate-500 mb-1 block">ใช้ URL รูปภาพ</label>
                                <div className="relative">
                                    <ImageIcon className="absolute top-1/2 left-3 transform -translate-y-1/2 text-slate-400 w-4 h-4" />
                                    <input 
                                        value={editForm.imageUrl || ''} 
                                        onChange={e => {
                                            setEditForm({...editForm, imageUrl: e.target.value});
                                            setImageFile(null);
                                        }}
                                        placeholder="https://example.com/image.jpg"
                                        className="w-full pl-10 p-3 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-ocean-500 outline-none transition-all text-slate-800 text-sm"
                                    />
                                </div>
                            </div>
                        </div>
                    </div>
                  </div>

                  <div>
                    <label className="block text-base font-bold text-slate-700">ชื่อคอร์ส</label>
                    <input 
                      value={editForm.title || ''} 
                      onChange={e => setEditForm({...editForm, title: e.target.value})}
                      className={inputClasses}
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-6">
                    <div>
                      <label className="block text-base font-bold text-slate-700">ราคา</label>
                      <input 
                        type="number"
                        value={editForm.price || 0} 
                        onChange={e => setEditForm({...editForm, price: Number(e.target.value)})}
                        className={inputClasses}
                      />
                    </div>
                    <div>
                      <label className="block text-base font-bold text-slate-700">จำนวนที่รับ</label>
                      <input 
                        type="number"
                        value={editForm.capacity || 0} 
                        onChange={e => setEditForm({...editForm, capacity: Number(e.target.value)})}
                        className={inputClasses}
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-base font-bold text-slate-700">ช่วงเวลา</label>
                    <input 
                      value={editForm.timeSlot || ''} 
                      onChange={e => setEditForm({...editForm, timeSlot: e.target.value})}
                      className={inputClasses}
                    />
                  </div>
                  <div>
                     <label className="block text-base font-bold text-slate-700">ผู้สอนที่ดูแล (Optional)</label>
                     <input 
                       placeholder="เช่น ครูฟลุ๊ค"
                       value={editForm.instructorName || ''} 
                       onChange={e => setEditForm({...editForm, instructorName: e.target.value})}
                       className={inputClasses}
                     />
                  </div>
                  <div>
                     <label className="block text-base font-bold text-slate-700">สระว่ายน้ำ (Optional)</label>
                     <input 
                       placeholder="ระบุสถานที่เรียน"
                       value={editForm.poolLocation || ''} 
                       onChange={e => setEditForm({...editForm, poolLocation: e.target.value})}
                       className={inputClasses}
                     />
                  </div>
                   <div>
                    <label className="block text-base font-bold text-slate-700">สถานะเปิดรับสมัคร</label>
                    <select 
                        value={editForm.isOpen ? 'open' : 'closed'}
                        onChange={e => setEditForm({...editForm, isOpen: e.target.value === 'open'})}
                        className={inputClasses}
                    >
                        <option value="open">เปิดรับสมัคร</option>
                        <option value="closed">ปิดรับสมัคร</option>
                    </select>
                  </div>
                  <div className="flex justify-end space-x-4 mt-8">
                    <button onClick={() => setIsEditing(false)} disabled={saving} className="px-6 py-3 text-slate-600 hover:bg-slate-100 rounded-xl text-lg">ยกเลิก</button>
                    <button onClick={handleSaveEdit} disabled={saving} className="px-8 py-3 bg-ocean-600 text-white rounded-xl hover:bg-ocean-700 flex items-center text-lg font-bold disabled:opacity-70">
                      {saving ? <Loader2 className="animate-spin mr-2" /> : <Save className="w-5 h-5 mr-2" />} 
                      {saving ? 'กำลังบันทึก...' : 'บันทึก'}
                    </button>
                  </div>
                </div>
              </div>
            ) : (
              // VIEW MODE
              <div className="flex flex-col md:flex-row h-full">
                 {/* Left Side: Image - Updated for "Fit" display with Blurred Background */}
                 <div className="md:w-2/5 relative min-h-[300px] md:min-h-full flex items-center justify-center overflow-hidden bg-slate-100">
                    
                    {/* Blurred Background Layer */}
                    <div 
                        className="absolute inset-0 bg-cover bg-center blur-2xl opacity-60 scale-125 transition-all"
                        style={{ backgroundImage: `url(${selectedCourse.imageUrl})` }}
                    ></div>
                    <div className="absolute inset-0 bg-white/10"></div> {/* Very subtle lighten for brightness */}

                    {/* Main Image */}
                    <img 
                        src={selectedCourse.imageUrl} 
                        alt={selectedCourse.title} 
                        className="w-full h-full object-contain relative z-10 drop-shadow-xl" 
                    />
                    
                    {/* Close Button */}
                    <button 
                      onClick={() => setSelectedCourse(null)}
                      className="absolute top-6 right-6 bg-black/20 hover:bg-black/40 backdrop-blur-md p-2 rounded-full text-white transition z-20"
                    >
                      <XCircle className="w-8 h-8" />
                    </button>

                    {/* Mobile Only Overlay Text */}
                    <div className="absolute bottom-0 left-0 right-0 p-6 text-white md:hidden bg-gradient-to-t from-black/90 to-transparent z-20">
                        <h2 className="text-3xl font-bold shadow-black drop-shadow-md">{selectedCourse.title}</h2>
                        <p className="opacity-90 text-lg shadow-black drop-shadow-md">{selectedCourse.ageGroup}</p>
                    </div>
                 </div>

                 {/* Right Side: Details */}
                 <div className="md:w-3/5 p-10 overflow-y-auto bg-slate-50">
                    <div className="hidden md:block mb-8">
                        <div className="flex justify-between items-start">
                            <div>
                                <h2 className="text-4xl font-bold text-slate-900">{selectedCourse.title}</h2>
                                <div className="flex items-center space-x-3 mt-3">
                                    <span className="px-4 py-1.5 bg-ocean-100 text-ocean-700 rounded-full text-sm font-bold">{selectedCourse.ageGroup}</span>
                                    {selectedCourse.isOpen ? (
                                        <span className="px-4 py-1.5 bg-green-100 text-green-700 rounded-full text-sm font-bold">เปิดรับสมัคร</span>
                                    ) : (
                                        <span className="px-4 py-1.5 bg-red-100 text-red-700 rounded-full text-sm font-bold">ปิดรับสมัคร</span>
                                    )}
                                </div>
                            </div>
                            {/* Average Rating Badge */}
                            {averageRating > 0 && (
                                <div className="flex flex-col items-end">
                                    <div className="flex items-center bg-yellow-400 text-white px-3 py-1 rounded-xl shadow-md">
                                        <span className="text-2xl font-bold mr-1">{averageRating.toFixed(1)}</span>
                                        <Star fill="currentColor" size={24} />
                                    </div>
                                    <span className="text-xs text-slate-400 mt-1">จาก {courseReviews.length} รีวิว</span>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Description Box */}
                    <div className="bg-white border-l-4 border-ocean-500 p-6 rounded-r-2xl shadow-sm mb-10">
                         <h4 className="font-bold text-ocean-700 flex items-center mb-3 text-lg">
                            <BookOpen className="w-5 h-5 mr-2" /> รายละเอียด
                         </h4>
                         <p className="text-slate-700 text-base leading-relaxed">{selectedCourse.description}</p>
                         <p className="text-slate-500 text-sm mt-3 italic">* {selectedCourse.terms}</p>
                    </div>

                    {/* Stats Grid */}
                    <div className="grid grid-cols-2 gap-5 mb-10">
                        <div className="bg-white p-5 rounded-2xl shadow-sm flex flex-col items-center text-center border border-slate-100">
                             <div className="w-12 h-12 rounded-full bg-ocean-100 text-ocean-600 flex items-center justify-center mb-3">
                                <DollarSign size={24} />
                             </div>
                             <span className="text-sm text-slate-500">ราคา</span>
                             <span className="text-xl font-bold text-slate-800">{selectedCourse.price.toLocaleString()}</span>
                        </div>
                        <div className="bg-white p-5 rounded-2xl shadow-sm flex flex-col items-center text-center border border-slate-100">
                             <div className="w-12 h-12 rounded-full bg-sky-100 text-sky-600 flex items-center justify-center mb-3">
                                <Clock size={24} />
                             </div>
                             <span className="text-sm text-slate-500">ระยะเวลา</span>
                             <span className="text-xl font-bold text-slate-800">{selectedCourse.sessions} <span className="text-sm font-normal">ครั้ง/ชม.</span></span>
                        </div>
                        <div className="bg-white p-5 rounded-2xl shadow-sm flex flex-col items-center text-center border border-slate-100">
                             <div className="w-12 h-12 rounded-full bg-orange-100 text-orange-600 flex items-center justify-center mb-3">
                                <Users size={24} />
                             </div>
                             <span className="text-sm text-slate-500">จำนวนที่รับ</span>
                             <span className="text-xl font-bold text-slate-800">{realTimeEnrolled[selectedCourse.id] || 0}/{selectedCourse.capacity} <span className="text-sm font-normal">คน</span></span>
                        </div>
                        <div className="bg-white p-5 rounded-2xl shadow-sm flex flex-col items-center text-center border border-slate-100">
                             <div className="w-12 h-12 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center mb-3">
                                <Calendar size={24} />
                             </div>
                             <span className="text-sm text-slate-500">ตารางเรียน</span>
                             <span className="text-base font-bold text-slate-800 line-clamp-2">{selectedCourse.timeSlot.split(' ')[0]}...</span>
                        </div>
                    </div>

                    {/* Features List */}
                    <div className="mb-10">
                        <h4 className="font-bold text-slate-800 mb-4 text-lg">จุดเด่นของคอร์ส</h4>
                        <ul className="space-y-3">
                            <li className="flex items-start text-base text-slate-600">
                                <CheckCircle className="w-5 h-5 text-green-500 mr-3 mt-0.5 flex-shrink-0" />
                                <span>สอนเทคนิคการลอยตัวและหายใจถูกวิธี</span>
                            </li>
                            <li className="flex items-start text-base text-slate-600">
                                <CheckCircle className="w-5 h-5 text-green-500 mr-3 mt-0.5 flex-shrink-0" />
                                <span>เน้นความปลอดภัยและความมั่นใจในน้ำ</span>
                            </li>
                            <li className="flex items-start text-base text-slate-600">
                                <CheckCircle className="w-5 h-5 text-green-500 mr-3 mt-0.5 flex-shrink-0" />
                                <span>ครูผู้สอนมีประสบการณ์มากกว่า 10 ปี</span>
                            </li>
                            <li className="flex items-start text-base text-slate-600">
                                <CheckCircle className="w-5 h-5 text-green-500 mr-3 mt-0.5 flex-shrink-0" />
                                <span>สอนแบบกลุ่มเล็ก ดูแลทั่วถึง</span>
                            </li>
                        </ul>
                    </div>
                    
                    {selectedCourse.instructorName && (
                        <div className="bg-orange-50 text-orange-800 px-5 py-4 rounded-2xl mb-4 flex items-center text-base">
                            <User className="w-5 h-5 mr-3" />
                            <span>ครูผู้สอน: {selectedCourse.instructorName}</span>
                        </div>
                    )}
                    
                    {selectedCourse.poolLocation && (
                        <div className="bg-blue-50 text-blue-800 px-5 py-4 rounded-2xl mb-10 flex items-center text-base">
                            <Info className="w-5 h-5 mr-3" />
                            <span>สถานที่: {selectedCourse.poolLocation}</span>
                        </div>
                    )}

                    {/* Reviews List */}
                    {courseReviews.length > 0 ? (
                        <div className="mb-10 animate-fade-in">
                            <h4 className="font-bold text-slate-800 mb-6 text-xl flex items-center">
                                <div className="bg-ocean-100 p-2 rounded-lg mr-3">
                                  <MessageSquare className="w-5 h-5 text-ocean-600"/>
                                </div>
                                รีวิวจากผู้เรียนจริง ({courseReviews.length})
                            </h4>
                            <div className="grid grid-cols-1 gap-4 max-h-[500px] overflow-y-auto pr-2 custom-scrollbar">
                                {courseReviews.map((review) => (
                                    <div key={review.id} className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm hover:shadow-md transition-all">
                                        <div className="flex justify-between items-start mb-4">
                                            <div className="flex items-center gap-3">
                                                <div className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center text-slate-500 font-bold text-lg">
                                                    {review.studentName.charAt(0)}
                                                </div>
                                                <div>
                                                    <p className="font-bold text-slate-800 text-base">{review.studentName}</p>
                                                    <p className="text-xs text-slate-400">{new Date(review.date).toLocaleDateString('th-TH', { year: 'numeric', month: 'long', day: 'numeric' })}</p>
                                                </div>
                                            </div>
                                            <div className="flex bg-yellow-50 px-2 py-1 rounded-lg border border-yellow-100">
                                                {[...Array(5)].map((_, i) => (
                                                    <Star key={i} size={14} fill={i < review.rating ? "#eab308" : "none"} className={i < review.rating ? "text-yellow-500" : "text-slate-300"} />
                                                ))}
                                            </div>
                                        </div>
                                        <div className="pl-13">
                                            <p className="text-slate-600 text-base leading-relaxed">"{review.comment}"</p>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    ) : (
                        <div className="mb-10 text-center py-8 bg-slate-50 rounded-2xl border border-slate-100 border-dashed">
                             <MessageSquare className="w-10 h-10 text-slate-300 mx-auto mb-3" />
                             <p className="text-slate-500">ยังไม่มีรีวิวสำหรับคอร์สนี้</p>
                        </div>
                    )}

                    <button 
                      onClick={() => {
                        setSelectedCourse(null);
                        navigate(`/register?courseId=${selectedCourse.id}`);
                      }}
                      disabled={!selectedCourse.isOpen || (realTimeEnrolled[selectedCourse.id] || 0) >= selectedCourse.capacity}
                      className="w-full py-5 bg-ocean-600 text-white font-bold rounded-2xl shadow-xl shadow-ocean-500/30 hover:bg-ocean-700 disabled:bg-slate-300 disabled:shadow-none transition-all text-xl"
                    >
                      {selectedCourse.isOpen ? 'สมัครเรียนทันที' : 'ปิดรับสมัคร'}
                    </button>
                 </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default Courses;