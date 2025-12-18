import React, { useEffect, useRef, useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { ChevronRight, Star, ShieldCheck, Heart, Users, Clock, ArrowRight } from 'lucide-react';
import { collection, onSnapshot } from 'firebase/firestore';
import { db } from '../services/firebase';
import { INITIAL_COURSES } from '../constants';
import { Course } from '../types';

// Utility Component for Scroll Animation
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

const Home: React.FC = () => {
  const [courses, setCourses] = useState<Course[]>(INITIAL_COURSES);

  // Gallery Images provided by user
  const galleryImages = [
    "https://img2.pic.in.th/pic/33155.jpg",
    "https://img2.pic.in.th/pic/33167_0b1fb2fb12172231f.jpg",
    "https://img5.pic.in.th/file/secure-sv1/33168_0f3b51eff3218db9e.jpg",
    "https://img5.pic.in.th/file/secure-sv1/33172_0.jpg",
    "https://img2.pic.in.th/pic/33174_007b21869636b6f14.jpg",
    "https://img2.pic.in.th/pic/33175_0.jpg",
    "https://img5.pic.in.th/file/secure-sv1/33176_0ebeaee98b05003d1.jpg"
  ];

  // Fetch courses from Firestore to get updated data/images
  useEffect(() => {
    const unsubscribe = onSnapshot(collection(db, "courses"), (snapshot) => {
      const firestoreCourses: Record<string, Course> = {};
      
      snapshot.forEach(doc => {
          firestoreCourses[doc.id] = { id: doc.id, ...doc.data() } as Course;
      });

      // Merge logic: Start with INITIAL_COURSES, override with Firestore data
      const mergedCourses = INITIAL_COURSES.map(initCourse => {
          if (firestoreCourses[initCourse.id]) {
              const updated = firestoreCourses[initCourse.id];
              delete firestoreCourses[initCourse.id];
              return updated;
          }
          return initCourse;
      });

      const finalCourses = [...mergedCourses, ...Object.values(firestoreCourses)];
      setCourses(finalCourses);
    }, (error) => {
      console.error("Error loading courses for home:", error);
    });

    return () => unsubscribe();
  }, []);

  // Get top 3 popular courses based on enrollment
  const popularCourses = useMemo(() => {
    return [...courses]
      .sort((a, b) => b.enrolled - a.enrolled)
      .slice(0, 3);
  }, [courses]);

  return (
    <div className="flex flex-col overflow-x-hidden">
      {/* Inject Custom Animations */}
      <style>{`
        @keyframes subtle-zoom {
          0% { transform: scale(1); }
          100% { transform: scale(1.1); }
        }
        .animate-subtle-zoom {
          animation: subtle-zoom 20s infinite alternate ease-in-out;
        }
        .text-shadow {
          text-shadow: 0 2px 4px rgba(0,0,0,0.3);
        }
        @keyframes scroll-left {
          0% { transform: translateX(0); }
          100% { transform: translateX(-50%); }
        }
        .animate-scroll {
          animation: scroll-left 40s linear infinite;
          display: flex;
          width: max-content;
        }
        .pause-on-hover:hover {
          animation-play-state: paused;
        }
      `}</style>

      {/* Hero Section */}
      <section className="relative h-[75vh] min-h-[600px] flex items-center overflow-hidden">
        {/* Background Image with Zoom Animation */}
        <div className="absolute inset-0 z-0">
           <div className="w-full h-full animate-subtle-zoom">
             <img 
               src="https://images.unsplash.com/photo-1530549387789-4c1017266635?ixlib=rb-1.2.1&auto=format&fit=crop&w=1950&q=80" 
               alt="Swimming Pool" 
               className="w-full h-full object-cover"
             />
           </div>
           {/* Overlay Gradients */}
           <div className="absolute inset-0 bg-slate-900/50 mix-blend-multiply"></div>
           <div className="absolute inset-0 bg-gradient-to-t from-slate-900 via-slate-900/20 to-transparent"></div>
           <div className="absolute inset-0 bg-gradient-to-r from-slate-900/80 via-slate-900/40 to-transparent"></div>
        </div>
        
        <div className="relative z-10 max-w-7xl mx-auto px-6 sm:px-8 lg:px-10 text-white pt-10">
          <div className="max-w-4xl">
            {/* New Badge */}
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/10 backdrop-blur-md border border-white/20 text-sky-100 font-medium mb-8 animate-[fadeInUp_1s_ease-out_0.1s_both] shadow-lg">
                <span className="relative flex h-3 w-3">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-3 w-3 bg-green-500"></span>
                </span>
                เปิดรับสมัครนักเรียนใหม่ตลอดปี
            </div>

            {/* Typography Improvements - Resized Down */}
            <h1 className="text-4xl md:text-6xl lg:text-7xl font-black leading-tight mb-6 tracking-tight drop-shadow-2xl animate-[fadeInUp_1s_ease-out_0.2s_both]">
              <span className="block mb-2 text-white">ว่ายน้ำเป็น...</span>
              <span className="block text-transparent bg-clip-text bg-gradient-to-r from-sky-300 via-white to-sky-100 py-1">
                ปลอดภัย
              </span>
              <span className="block text-white">มั่นใจทุกสโตรก</span>
            </h1>
            
            <p className="text-lg md:text-xl text-slate-200 mb-10 max-w-2xl leading-relaxed font-light animate-[fadeInUp_1s_ease-out_0.4s_both]">
              เรียนว่ายน้ำพิษณุโลก By ครูฟลุ๊ค ศูนย์ฝึกมาตรฐาน ดูแลใกล้ชิดโดยครูมืออาชีพ 
              เสริมสร้างทักษะ ความแข็งแรง และความปลอดภัยสำหรับทุกวัย
            </p>
            
            <div className="flex flex-col sm:flex-row gap-5 animate-[fadeInUp_1s_ease-out_0.6s_both]">
              <Link to="/courses">
                <button className="group w-full sm:w-auto px-8 py-4 bg-ocean-500 hover:bg-ocean-400 text-white font-bold rounded-2xl shadow-xl shadow-ocean-500/30 transition-all transform hover:-translate-y-1 flex items-center justify-center text-lg">
                  ดูคอร์สเรียน 
                  <ChevronRight className="ml-2 h-6 w-6 group-hover:translate-x-1 transition-transform" />
                </button>
              </Link>
              <Link to="/register">
                <button className="w-full sm:w-auto px-8 py-4 bg-white/10 backdrop-blur-md border border-white/30 text-white hover:bg-white hover:text-ocean-900 font-bold rounded-2xl shadow-lg transition-all transform hover:-translate-y-1 text-lg">
                  สมัครเรียนทันที
                </button>
              </Link>
            </div>

            {/* Trust Indicators */}
            <div className="mt-12 pt-8 border-t border-white/10 flex flex-wrap gap-8 animate-[fadeInUp_1s_ease-out_0.8s_both]">
               <div className="flex items-center gap-3">
                  <div className="p-2 rounded-full bg-white/10 backdrop-blur-sm">
                    <ShieldCheck className="w-6 h-6 text-green-400" />
                  </div>
                  <div>
                    <p className="font-bold text-white text-sm">ปลอดภัย 100%</p>
                    <p className="text-xs text-slate-300">ดูแลใกล้ชิด</p>
                  </div>
               </div>
               <div className="flex items-center gap-3">
                  <div className="p-2 rounded-full bg-white/10 backdrop-blur-sm">
                    <Users className="w-6 h-6 text-sky-400" />
                  </div>
                  <div>
                    <p className="font-bold text-white text-sm">กลุ่มเล็ก</p>
                    <p className="text-xs text-slate-300">ดูแลทั่วถึง</p>
                  </div>
               </div>
               <div className="flex items-center gap-3">
                  <div className="p-2 rounded-full bg-white/10 backdrop-blur-sm">
                    <Star className="w-6 h-6 text-yellow-400" />
                  </div>
                  <div>
                    <p className="font-bold text-white text-sm">การันตีผล</p>
                    <p className="text-xs text-slate-300">ว่ายเป็นแน่นอน</p>
                  </div>
               </div>
            </div>
          </div>
        </div>
      </section>

      {/* Popular Courses Section (NEW) */}
      <section className="py-24 bg-slate-50 relative">
         <div className="absolute top-0 left-0 w-full h-64 bg-gradient-to-b from-ocean-900/5 to-transparent"></div>
         <div className="max-w-7xl mx-auto px-6 sm:px-8 lg:px-10 relative z-10">
            <RevealOnScroll>
              <div className="flex flex-col md:flex-row justify-between items-end mb-12">
                <div>
                  <h2 className="text-3xl md:text-4xl font-bold text-slate-900 mb-4">คอร์สยอดนิยม</h2>
                  <p className="text-lg text-slate-600 max-w-2xl">หลักสูตรที่ได้รับความไว้วางใจจากผู้ปกครองและนักเรียนมากที่สุด</p>
                </div>
                <Link to="/courses" className="hidden md:flex items-center text-ocean-600 font-bold text-lg hover:text-ocean-700 transition-colors group">
                  ดูทั้งหมด <ArrowRight className="ml-2 w-5 h-5 group-hover:translate-x-1 transition-transform" />
                </Link>
              </div>
            </RevealOnScroll>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              {popularCourses.map((course, index) => (
                <RevealOnScroll key={course.id} className={`delay-${index * 100}`}>
                  <Link to={`/courses`} className="group block bg-white rounded-[2rem] shadow-sm hover:shadow-xl hover:shadow-ocean-900/10 transition-all duration-300 transform hover:-translate-y-2 overflow-hidden h-full border border-slate-100 flex flex-col">
                    <div className="relative h-64 overflow-hidden bg-slate-200">
                      <img 
                        src={course.imageUrl} 
                        alt={course.title} 
                        onError={(e) => {
                          e.currentTarget.src = 'https://images.unsplash.com/photo-1530549387789-4c1017266635?ixlib=rb-1.2.1&auto=format&fit=crop&w=1000&q=80';
                        }}
                        className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110" 
                      />
                      <div className="absolute top-4 right-4 bg-white/90 backdrop-blur text-ocean-700 px-4 py-1.5 rounded-full text-sm font-bold shadow-sm flex items-center">
                         <Star className="w-4 h-4 mr-1 text-yellow-500 fill-current" /> ยอดนิยม
                      </div>
                      <div className="absolute bottom-0 left-0 w-full p-6 bg-gradient-to-t from-black/80 to-transparent">
                         <h3 className="text-2xl font-bold text-white text-shadow">{course.title}</h3>
                      </div>
                    </div>
                    <div className="p-6 flex flex-col flex-grow">
                      <div className="flex items-center justify-between mb-4">
                         <span className="flex items-center text-slate-600 bg-slate-50 px-3 py-1 rounded-lg text-sm">
                            <Users className="w-4 h-4 mr-2 text-ocean-500" /> {course.ageGroup}
                         </span>
                         <span className="text-2xl font-bold text-ocean-600">฿{course.price.toLocaleString()}</span>
                      </div>
                      <p className="text-slate-600 mb-6 line-clamp-2">{course.description}</p>
                      
                      <div className="mt-auto flex items-center justify-between text-sm text-slate-500 pt-4 border-t border-slate-50">
                          <div className="flex items-center">
                            <Clock className="w-4 h-4 mr-1" /> {course.sessions} ครั้ง
                          </div>
                          <div className="flex items-center text-ocean-600 font-bold group-hover:underline">
                            รายละเอียด <ChevronRight className="w-4 h-4" />
                          </div>
                      </div>
                    </div>
                  </Link>
                </RevealOnScroll>
              ))}
            </div>

            <div className="mt-10 text-center md:hidden">
               <Link to="/courses">
                 <button className="w-full py-3 border-2 border-slate-200 rounded-xl font-bold text-slate-600 hover:border-ocean-500 hover:text-ocean-600 transition-colors">
                   ดูคอร์สทั้งหมด
                 </button>
               </Link>
            </div>
         </div>
      </section>

      {/* Features Section */}
      <section className="py-24 bg-white">
        <div className="max-w-7xl mx-auto px-6 sm:px-8 lg:px-10">
          <RevealOnScroll>
            <div className="text-center mb-20">
              <h2 className="text-3xl md:text-4xl font-bold text-slate-900">ทำไมต้องเรียนกับเรา?</h2>
              <p className="mt-5 text-lg text-slate-600">จุดเด่นที่ทำให้ผู้ปกครองและนักเรียนไว้วางใจเรามาตลอด</p>
            </div>
          </RevealOnScroll>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-12">
            <RevealOnScroll className="delay-100">
              <div className="p-10 bg-white rounded-[2.5rem] text-center shadow-lg shadow-slate-200/50 hover:shadow-2xl hover:shadow-ocean-100/50 transition-all duration-300 border border-slate-100 group cursor-default">
                <div className="w-24 h-24 bg-ocean-50 text-ocean-500 rounded-3xl flex items-center justify-center mx-auto mb-8 group-hover:scale-110 group-hover:rotate-3 group-hover:bg-ocean-500 group-hover:text-white transition-all duration-300">
                  <ShieldCheck className="h-12 w-12" />
                </div>
                <h3 className="text-2xl font-bold text-slate-800 mb-4">ปลอดภัย ได้มาตรฐาน</h3>
                <p className="text-lg text-slate-600 leading-relaxed">
                  ดูแลความปลอดภัยอย่างใกล้ชิด 100% โดยทีมครูผู้เชี่ยวชาญ สระว่ายน้ำระบบเกลือ สะอาด ไม่ระคายเคือง
                </p>
              </div>
            </RevealOnScroll>

            <RevealOnScroll className="delay-200">
              <div className="p-10 bg-white rounded-[2.5rem] text-center shadow-lg shadow-slate-200/50 hover:shadow-2xl hover:shadow-ocean-100/50 transition-all duration-300 border border-slate-100 group cursor-default">
                <div className="w-24 h-24 bg-red-50 text-red-500 rounded-3xl flex items-center justify-center mx-auto mb-8 group-hover:scale-110 group-hover:-rotate-3 group-hover:bg-red-500 group-hover:text-white transition-all duration-300">
                  <Heart className="h-12 w-12" />
                </div>
                <h3 className="text-2xl font-bold text-slate-800 mb-4">ใส่ใจ ทุกรายละเอียด</h3>
                <p className="text-lg text-slate-600 leading-relaxed">
                  สอนด้วยความเข้าใจจิตวิทยาเด็กและผู้ใหญ่ ปรับการสอนรายบุคคล ไม่กดดัน เรียนสนุกและมีความสุข
                </p>
              </div>
            </RevealOnScroll>

            <RevealOnScroll className="delay-300">
              <div className="p-10 bg-white rounded-[2.5rem] text-center shadow-lg shadow-slate-200/50 hover:shadow-2xl hover:shadow-ocean-100/50 transition-all duration-300 border border-slate-100 group cursor-default">
                <div className="w-24 h-24 bg-yellow-50 text-yellow-500 rounded-3xl flex items-center justify-center mx-auto mb-8 group-hover:scale-110 group-hover:rotate-3 group-hover:bg-yellow-500 group-hover:text-white transition-all duration-300">
                  <Star className="h-12 w-12" />
                </div>
                <h3 className="text-2xl font-bold text-slate-800 mb-4">การันตีผลลัพธ์</h3>
                <p className="text-lg text-slate-600 leading-relaxed">
                  เห็นผลจริงภายในคอร์สแรก นักเรียนมีพัฒนาการที่ดีขึ้นอย่างชัดเจน การันตีด้วยรีวิวจากผู้เรียนจริงมากมาย
                </p>
              </div>
            </RevealOnScroll>
          </div>
        </div>
      </section>

      {/* Atmosphere Section (New) */}
      <section className="py-24 bg-ocean-50/30 overflow-hidden border-y border-ocean-100/50">
        <div className="max-w-7xl mx-auto px-6 mb-12 text-center">
            <RevealOnScroll>
              <h2 className="text-3xl md:text-4xl font-bold text-slate-900 mb-4">บรรยากาศการเรียน</h2>
              <div className="w-20 h-1.5 bg-ocean-500 mx-auto rounded-full mb-6"></div>
              <p className="text-lg text-slate-600">ความสนุกและความสุขของน้องๆ ในทุกคลาสเรียน</p>
            </RevealOnScroll>
        </div>
        <div className="relative w-full">
          {/* Gradient Overlays */}
          <div className="absolute left-0 top-0 bottom-0 w-24 bg-gradient-to-r from-white via-white/80 to-transparent z-10 pointer-events-none"></div>
          <div className="absolute right-0 top-0 bottom-0 w-24 bg-gradient-to-l from-white via-white/80 to-transparent z-10 pointer-events-none"></div>

          <div className="animate-scroll pause-on-hover gap-6 px-6 py-4">
            {/* Duplicate for infinite loop */}
            {[...galleryImages, ...galleryImages].map((src, index) => (
              <div key={index} className="w-[300px] h-[200px] md:w-[400px] md:h-[280px] flex-shrink-0 rounded-2xl overflow-hidden shadow-md hover:shadow-2xl transition-all duration-300 border-4 border-white cursor-pointer transform hover:scale-[1.02] group">
                 <img 
                    src={src} 
                    alt={`บรรยากาศการเรียน ${index}`} 
                    className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700"
                    loading="lazy"
                 />
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-24 bg-gradient-to-r from-ocean-600 to-ocean-800 text-white relative overflow-hidden">
        {/* Decorative Background Elements */}
        <div className="absolute top-0 left-0 w-64 h-64 bg-white opacity-5 rounded-full transform -translate-x-1/2 -translate-y-1/2 blur-3xl"></div>
        <div className="absolute bottom-0 right-0 w-96 h-96 bg-ocean-400 opacity-20 rounded-full transform translate-x-1/3 translate-y-1/3 blur-3xl"></div>
        
        <div className="max-w-5xl mx-auto px-6 text-center relative z-10">
          <RevealOnScroll>
            <h2 className="text-3xl md:text-5xl font-bold mb-8 tracking-tight">พร้อมที่จะเริ่มว่ายน้ำหรือยัง?</h2>
            <p className="mb-12 text-ocean-100 text-lg md:text-xl font-light max-w-3xl mx-auto">
              อย่ารอช้า! สุขภาพที่ดีและทักษะชีวิตที่สำคัญเริ่มต้นได้ที่นี่ จองตารางเรียนที่คุณสะดวกที่สุดได้เลย
            </p>
            <Link to="/register">
              <button className="px-12 py-5 bg-white text-ocean-700 font-bold rounded-full hover:bg-ocean-50 shadow-2xl transition-all transform hover:-translate-y-1 hover:scale-105 text-lg flex items-center mx-auto">
                สมัครสมาชิก / ลงทะเบียน <ChevronRight className="ml-2 w-6 h-6" />
              </button>
            </Link>
          </RevealOnScroll>
        </div>
      </section>
    </div>
  );
};

export default Home;