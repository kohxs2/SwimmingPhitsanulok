import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { collection, getDocs, query, where, doc, updateDoc, onSnapshot, addDoc, arrayUnion, writeBatch, deleteDoc, orderBy } from 'firebase/firestore';
import { db } from '../services/firebase';
import { UserProfile, UserRole, Enrollment, Course, LeaveRequest } from '../types';
import { INITIAL_COURSES } from '../constants';
import { 
  PieChart, Pie, Cell, ResponsiveContainer, 
  BarChart, Bar, XAxis, YAxis, Tooltip, Legend, CartesianGrid 
} from 'recharts';
import { 
  Check, X, DollarSign, 
  UserCheck, AlertTriangle, Users, BookOpen, User, Eye, ZoomIn, XCircle, Loader2, 
  ChevronLeft, ChevronRight, CheckCircle, HelpCircle, ArrowLeft, CalendarCheck, 
  Search, Clock, Award, Bell, Megaphone, FileSpreadsheet, Send, FileText, CalendarX, History,
  Activity, School, Calendar, Phone, Trash2, Star, MessageSquare
} from 'lucide-react';

// --- Interface Extensions for Local Use ---
interface ExtendedEnrollment extends Enrollment {
    review?: {
        rating: number;
        comment: string;
        createdAt: string;
        reviewerName: string;
    };
}

interface NotificationData {
    id: string;
    title: string;
    message: string;
    read: boolean;
    type: string;
    date: string;
}

interface DashboardProps {
  user: UserProfile;
}

const COLORS = ['#0ea5e9', '#22c55e', '#eab308', '#f97316', '#ef4444', '#8b5cf6', '#ec4899', '#6366f1'];

export default function Dashboard({ user }: DashboardProps) {
  const [enrollments, setEnrollments] = useState<ExtendedEnrollment[]>([]);
  const [courses, setCourses] = useState<Course[]>(INITIAL_COURSES);
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [leaveRequests, setLeaveRequests] = useState<LeaveRequest[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Tabs
  const [activeTab, setActiveTab] = useState<'overview' | 'payments' | 'schedule' | 'enrollments' | 'users' | 'history' | 'leaves'>(
      user.role === UserRole.INSTRUCTOR ? 'schedule' : 'overview'
  );
  
  const [selectedSlip, setSelectedSlip] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  
  const [processingId, setProcessingId] = useState<string | null>(null);
  const [confirmAction, setConfirmAction] = useState<{ id: string, type: 'PAID' | 'REJECTED' } | null>(null);

  const [currentDate, setCurrentDate] = useState(new Date());

  const [selectedCourseId, setSelectedCourseId] = useState<string | null>(null);
  const [selectedStudentIds, setSelectedStudentIds] = useState<string[]>([]);

  // --- LEAVE MODAL STATES ---
  const [showLeaveModal, setShowLeaveModal] = useState(false); // For Student Request
  const [leaveForm, setLeaveForm] = useState({ enrollmentId: '', date: '', reason: '' });
  const [submittingLeave, setSubmittingLeave] = useState(false);
  const [leaveActionTarget, setLeaveActionTarget] = useState<{ request: LeaveRequest, action: 'APPROVED' | 'REJECTED' } | null>(null); // For Admin/Instructor Approval

  // --- MODAL STATES ---
  const [deleteTargetId, setDeleteTargetId] = useState<string | null>(null);
  const [showBulkCheckInConfirm, setShowBulkCheckInConfirm] = useState(false);
  const [evaluationTarget, setEvaluationTarget] = useState<{ enrollmentId: string, result: 'PASS' | 'FAIL', userId: string, studentName: string } | null>(null);
  const [showBroadcastModal, setShowBroadcastModal] = useState(false); 
  const [showBroadcastConfirm, setShowBroadcastConfirm] = useState(false);
  const [roleChangeTarget, setRoleChangeTarget] = useState<{ uid: string, newRole: UserRole, currentRole: string } | null>(null);
  const [showExpiryConfirm, setShowExpiryConfirm] = useState(false);

  // --- AUTO POP-UP STATES ---
  const [reviewTarget, setReviewTarget] = useState<ExtendedEnrollment | null>(null);
  const [reviewForm, setReviewForm] = useState({ rating: 5, comment: '' });
  const [activeNotifications, setActiveNotifications] = useState<NotificationData[]>([]);
  const [showNotificationModal, setShowNotificationModal] = useState(false);
  const [showExpiryAlertModal, setShowExpiryAlertModal] = useState<{ courseName: string, daysLeft: number } | null>(null);

  const [stats, setStats] = useState({
    totalIncome: 0,
    totalStudents: 0,
    pendingPayments: 0,
  });
  const [monthlyRevenueData, setMonthlyRevenueData] = useState<any[]>([]);
  const [enrollmentStatusData, setEnrollmentStatusData] = useState<any[]>([]);
  
  const [chartMode, setChartMode] = useState<'revenue' | 'enrollment'>('revenue');
  const [monthlyEnrollmentData, setMonthlyEnrollmentData] = useState<any[]>([]);
  const [courseNames, setCourseNames] = useState<string[]>([]);
  const [instructorLoad, setInstructorLoad] = useState<Record<string, number>>({});

  const [broadcastForm, setBroadcastForm] = useState({ title: '', message: '', target: 'ALL' });
  const [broadcasting, setBroadcasting] = useState(false);

  const [showProfileModal, setShowProfileModal] = useState(false);
  const [showCalendarModal, setShowCalendarModal] = useState(false);
  const [targetStudent, setTargetStudent] = useState<ExtendedEnrollment | null>(null);

  const activeEnrollments = enrollments.filter(e => e.paymentStatus === 'PAID');

  // --- DATA FETCHING ---
  useEffect(() => {
    setLoading(true);
    const unsubs: (() => void)[] = [];

    const fetchCourses = async () => {
        try {
            const coursesSnap = await getDocs(collection(db, "courses"));
            if (!coursesSnap.empty) {
                setCourses(coursesSnap.docs.map(d => ({id: d.id, ...d.data()} as Course)));
            }
        } catch (e) {
            console.error("Error fetching courses", e);
        }
    };
    fetchCourses();

    let q;
    try {
        if (user.role === UserRole.ADMIN) {
          q = collection(db, "enrollments");
          getDocs(collection(db, "users")).then(snap => {
             setUsers(snap.docs.map(d => ({ uid: d.id, ...d.data() } as UserProfile)));
          });
        } else if (user.role === UserRole.INSTRUCTOR) {
           q = query(collection(db, "enrollments"), where("paymentStatus", "==", "PAID"));
           getDocs(collection(db, "users")).then(snap => {
             setUsers(snap.docs.map(d => ({ uid: d.id, ...d.data() } as UserProfile)));
           });
        } else {
           q = query(collection(db, "enrollments"), where("userId", "==", user.uid));
        }

        const unsubEnrollments = onSnapshot(q, (snapshot) => {
            const data = snapshot.docs.map(doc => {
                const d = doc.data();
                return { 
                    id: doc.id, 
                    ...d,
                    attendance: d.attendance || []
                } as ExtendedEnrollment;
            });
            data.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
            setEnrollments(data);
            setLoading(false);
        }, (error) => {
            console.error("Snapshot error:", error);
            setLoading(false);
        });
        unsubs.push(unsubEnrollments);
    } catch (err) {
        console.error("Error setting up listeners", err);
        setLoading(false);
    }

    // --- LEAVE REQUESTS LISTENER (Updated for Admin/Instructor) ---
    try {
        let qLeave;
        if (user.role === UserRole.STUDENT) {
            qLeave = query(collection(db, "leave_requests"), where("userId", "==", user.uid));
        } else {
            // Admin & Instructor see all requests (can filter later)
            qLeave = collection(db, "leave_requests");
        }
        
        const unsubLeaves = onSnapshot(qLeave, (snapshot) => {
            const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as LeaveRequest));
            data.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
            setLeaveRequests(data);
        });
        unsubs.push(unsubLeaves);
    } catch (e) { console.error(e); }

    // --- NOTIFICATIONS LISTENER (Updated for ALL Roles) ---
    try {
        const qNotif = query(
            collection(db, "notifications"), 
            where("userId", "==", user.uid),
            where("read", "==", false)
        );
        const unsubNotif = onSnapshot(qNotif, (snapshot) => {
             const notifs = snapshot.docs.map(d => ({ id: d.id, ...d.data() } as NotificationData));
             if(notifs.length > 0) {
                 setActiveNotifications(notifs);
                 setShowNotificationModal(true);
             }
        });
        unsubs.push(unsubNotif);
    } catch(e) { console.error(e); }

    return () => {
        unsubs.forEach(u => u());
    };
  }, [user]);

  // --- AUTO POP-UP LOGIC FOR STUDENTS (Reviews & Expiry) ---
  useEffect(() => {
     if (user.role === UserRole.STUDENT && enrollments.length > 0) {
         const unreviewed = enrollments.find(e => e.evaluation === 'PASS' && !e.review);
         if (unreviewed) {
             setReviewTarget(unreviewed);
         }

         if (!unreviewed) {
            const expiring = enrollments.find(e => {
                if(e.paymentStatus !== 'PAID') return false;
                const course = courses.find(c => c.id === e.courseId);
                const isNormalCourse = course?.type === 'Normal';
                let effectiveExpiry = e.expiryDate;
                if (!effectiveExpiry && isNormalCourse && e.startDate) {
                    const d = new Date(e.startDate);
                    d.setMonth(d.getMonth() + 3);
                    effectiveExpiry = d.toISOString();
                }
                const daysLeft = calculateDaysLeft(effectiveExpiry);
                return daysLeft <= 30 && daysLeft > 0;
            });

            if (expiring) {
                const course = courses.find(c => c.id === expiring.courseId);
                const hasShown = sessionStorage.getItem(`expiry_alert_${expiring.id}`);
                if (!hasShown) {
                    let effectiveExpiry = expiring.expiryDate;
                    if (!effectiveExpiry && course?.type === 'Normal' && expiring.startDate) {
                        const d = new Date(expiring.startDate);
                        d.setMonth(d.getMonth() + 3);
                        effectiveExpiry = d.toISOString();
                    }
                    setShowExpiryAlertModal({
                        courseName: course?.title || 'Unknown Course',
                        daysLeft: calculateDaysLeft(effectiveExpiry)
                    });
                    sessionStorage.setItem(`expiry_alert_${expiring.id}`, 'true');
                }
            }
         }
     }
  }, [enrollments, user.role, courses]);

  // --- ADMIN STATS CALCULATION ---
  useEffect(() => {
     if (user.role === UserRole.ADMIN && enrollments.length > 0) {
        let income = 0;
        const revenueByMonth: Record<string, number> = {};
        const enrollmentByMonth: Record<string, Record<string, number>> = {};
        const allCourseNames = new Set<string>();
        const loadMap: Record<string, number> = {};
        
        const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

        const chronEnrollments = [...enrollments].sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());

        chronEnrollments.forEach(curr => {
            const course = courses.find(c => c.id === curr.courseId) || INITIAL_COURSES.find(c => c.id === curr.courseId);
            const price = course?.price || 0;
            const courseTitle = course?.title || 'Unknown';
            const instructorName = course?.instructorName || 'ไม่ระบุ';

            if (curr.paymentStatus === 'PAID') {
                income += price;
                const date = new Date(curr.createdAt);
                const monthKey = `${months[date.getMonth()]} ${date.getFullYear().toString().substring(2,4)}`;
                
                revenueByMonth[monthKey] = (revenueByMonth[monthKey] || 0) + price;

                if (!enrollmentByMonth[monthKey]) {
                    enrollmentByMonth[monthKey] = {};
                }
                enrollmentByMonth[monthKey][courseTitle] = (enrollmentByMonth[monthKey][courseTitle] || 0) + 1;
                allCourseNames.add(courseTitle);

                loadMap[instructorName] = (loadMap[instructorName] || 0) + 1;
            }
        });

        const pendingCount = enrollments.filter(e => e.paymentStatus === 'PENDING').length;
        setStats({
            totalIncome: income,
            totalStudents: enrollments.length,
            pendingPayments: pendingCount
        });

        const revData = Object.keys(revenueByMonth).map(key => ({
            name: key,
            revenue: revenueByMonth[key]
        }));
        setMonthlyRevenueData(revData);

        const enrData = Object.keys(enrollmentByMonth).map(key => ({
            name: key,
            ...(enrollmentByMonth[key] || {})
        }));
        setMonthlyEnrollmentData(enrData);
        setCourseNames(Array.from(allCourseNames));
        setInstructorLoad(loadMap);

        setEnrollmentStatusData([
          { name: 'ชำระแล้ว', value: enrollments.filter(e => e.paymentStatus === 'PAID').length, color: '#10b981' },
          { name: 'รอตรวจสอบ', value: pendingCount, color: '#f59e0b' },
          { name: 'ปฏิเสธ/อื่นๆ', value: enrollments.filter(e => e.paymentStatus === 'REJECTED').length, color: '#ef4444' },
        ]);
     }
  }, [enrollments, courses, user.role]);

  // --- ACTIONS ---

  const sendNotification = async (userId: string, title: string, message: string, type: 'PAYMENT' | 'EVALUATION' | 'SYSTEM' | 'EXPIRY' | 'NEW_ENROLLMENT' | 'LEAVE') => {
      try {
          await addDoc(collection(db, "notifications"), {
              userId,
              title,
              message,
              read: false,
              type,
              date: new Date().toISOString()
          });
      } catch (e) {
          console.error("Failed to send notification", e);
      }
  };

  const handleBroadcast = async () => {
      setBroadcasting(true);
      try {
          let allUsers = users;
          if (allUsers.length === 0) {
             const userSnap = await getDocs(collection(db, "users"));
             allUsers = userSnap.docs.map(d => ({ uid: d.id, ...d.data() } as UserProfile));
          }

          let targetUsers: UserProfile[] = [];
          if (broadcastForm.target === 'ALL') targetUsers = allUsers;
          else if (broadcastForm.target === 'STUDENT') targetUsers = allUsers.filter(u => u.role === UserRole.STUDENT);
          else if (broadcastForm.target === 'INSTRUCTOR') targetUsers = allUsers.filter(u => u.role === UserRole.INSTRUCTOR);

          if (targetUsers.length === 0) {
              alert("ไม่พบผู้ใช้งานในกลุ่มเป้าหมาย");
              setBroadcasting(false);
              setShowBroadcastConfirm(false);
              return;
          }

          const batchSize = 500;
          for (let i = 0; i < targetUsers.length; i += batchSize) {
              const batch = writeBatch(db);
              const chunk = targetUsers.slice(i, i + batchSize);
              chunk.forEach(u => {
                  const ref = doc(collection(db, "notifications"));
                  batch.set(ref, {
                      userId: u.uid,
                      title: broadcastForm.title,
                      message: broadcastForm.message,
                      read: false,
                      type: 'SYSTEM',
                      date: new Date().toISOString()
                  });
              });
              await batch.commit();
          }
          
          alert(`ส่งประกาศสำเร็จไปยัง ${targetUsers.length} คน`);
          setShowBroadcastModal(false);
          setShowBroadcastConfirm(false);
          setBroadcastForm({ title: '', message: '', target: 'ALL' });
      } catch (error: any) {
          console.error("Broadcast failed", error);
          alert(`เกิดข้อผิดพลาด: ${error.message}`);
          setShowBroadcastConfirm(false);
      } finally {
          setBroadcasting(false);
      }
  };

  const handleDeleteEnrollment = async () => {
      if (!deleteTargetId) return;
      
      setLoading(true);
      try {
          await deleteDoc(doc(db, "enrollments", deleteTargetId)); 
          alert("ลบข้อมูลเรียบร้อยแล้ว");
      } catch (error: any) {
          console.error(">>> DELETE FAILED:", error);
          alert(`เกิดข้อผิดพลาด: ${error.message}`);
      } finally {
          setLoading(false);
          setDeleteTargetId(null);
      }
  };

  const handleBulkCheckIn = async () => {
      if (selectedStudentIds.length === 0) return;
      
      const today = new Date().toISOString();
      setLoading(true);
      try {
          const updates = selectedStudentIds.map(id => {
              const docRef = doc(db, "enrollments", id);
              return updateDoc(docRef, {
                  attendance: arrayUnion(today)
              });
          });
          await Promise.all(updates);
          alert(`บันทึกการเช็คชื่อเรียบร้อยแล้ว (${selectedStudentIds.length} คน)`);
          setSelectedStudentIds([]);
      } catch (error: any) {
          console.error("Bulk check-in error:", error);
          alert(`เกิดข้อผิดพลาด: ${error.message}`);
      } finally {
          setLoading(false);
          setShowBulkCheckInConfirm(false);
      }
  };

  const checkExpiringStudents = async () => {
    setLoading(true);
    let count = 0;
    try {
        const checkPromises = enrollments.map(async (en) => {
            if (en.paymentStatus !== 'PAID') return;
            
            const course = courses.find(c => c.id === en.courseId);
            const isNormalCourse = course?.type === 'Normal';
            let effectiveExpiry = en.expiryDate;
            if (!effectiveExpiry && isNormalCourse && en.startDate) {
                const d = new Date(en.startDate);
                d.setMonth(d.getMonth() + 3);
                effectiveExpiry = d.toISOString();
            }

            const daysLeft = calculateDaysLeft(effectiveExpiry);
            
            if (daysLeft <= 30 && daysLeft > 0) {
                await sendNotification(
                    en.userId,
                    "คอร์สเรียนใกล้หมดอายุ",
                    `คอร์ส ${course?.title || 'เรียนว่ายน้ำ'} ของคุณเหลือเวลาเรียนอีก ${daysLeft} วัน กรุณาวางแผนการเรียนให้ครบ`,
                    'EXPIRY'
                );
                count++;
            }
        });

        await Promise.all(checkPromises);
        alert(`ส่งการแจ้งเตือนสำเร็จ ทั้งหมด ${count} รายการ`);
    } catch (e) {
        console.error(e);
        alert("เกิดข้อผิดพลาดในการส่งแจ้งเตือน");
    } finally {
        setLoading(false);
        setShowExpiryConfirm(false);
    }
  };

  const handleEvaluation = async () => {
    if (!evaluationTarget) return;

    try {
        const docRef = doc(db, "enrollments", evaluationTarget.enrollmentId);
        await updateDoc(docRef, { evaluation: evaluationTarget.result });
        
        const title = "แจ้งผลการประเมินการเรียน";
        const msg = evaluationTarget.result === 'PASS' 
            ? `ยินดีด้วย! คุณ ${evaluationTarget.studentName} ได้ผ่านหลักสูตรการเรียนว่ายน้ำเรียบร้อยแล้ว`
            : `ผลการประเมิน: ยังไม่ผ่านเกณฑ์ กรุณาฝึกฝนเพิ่มเติมและพยายามต่อไป!`;
        
        await sendNotification(evaluationTarget.userId, title, msg, 'EVALUATION');
        
        alert(`บันทึกผล ${evaluationTarget.result === 'PASS' ? 'ผ่าน' : 'ไม่ผ่าน'} เรียบร้อยแล้ว`);

    } catch (error: any) { 
        console.error("Evaluation error:", error);
        alert(`เกิดข้อผิดพลาด: ${error.message}`);
    } finally {
        setEvaluationTarget(null);
    }
  };

  const handleLeaveAction = async () => {
    if (!leaveActionTarget) return;
    setLoading(true);
    try {
        const { request, action } = leaveActionTarget;
        await updateDoc(doc(db, "leave_requests", request.id), { status: action });
        
        // Notify Student
        const msg = action === 'APPROVED' ? `คำขอลาหยุดวันที่ ${new Date(request.leaveDate).toLocaleDateString('th-TH')} ได้รับการอนุมัติแล้ว` : `คำขอลาหยุดวันที่ ${new Date(request.leaveDate).toLocaleDateString('th-TH')} ถูกปฏิเสธ`;
        await sendNotification(request.userId, "แจ้งสถานะการลาหยุด", msg, 'LEAVE');

        alert(action === 'APPROVED' ? "อนุมัติการลาเรียบร้อย" : "ปฏิเสธการลาเรียบร้อย");
    } catch (e) {
        console.error(e);
        alert("เกิดข้อผิดพลาด");
    } finally {
        setLoading(false);
        setLeaveActionTarget(null);
    }
  };

  const handleReviewSubmit = async (e: React.FormEvent) => {
      e.preventDefault();
      if (!reviewTarget) return;

      try {
          const docRef = doc(db, "enrollments", reviewTarget.id);
          await updateDoc(docRef, {
              review: {
                  rating: reviewForm.rating,
                  comment: reviewForm.comment,
                  createdAt: new Date().toISOString(),
                  reviewerName: user.displayName || 'Anonymous'
              }
          });
          
          alert("ขอบคุณสำหรับการรีวิว!");
          setReviewTarget(null); 
      } catch (error) {
          console.error("Review submit error", error);
          alert("เกิดข้อผิดพลาดในการบันทึกรีวิว");
      }
  };

  const handleCloseNotifications = async () => {
      const batch = writeBatch(db);
      activeNotifications.forEach(n => {
          const ref = doc(db, "notifications", n.id);
          batch.update(ref, { read: true });
      });
      await batch.commit();
      setShowNotificationModal(false);
      setActiveNotifications([]);
  };

  const handleChangeRole = async () => {
     if(!roleChangeTarget) return;
     try {
        await updateDoc(doc(db, "users", roleChangeTarget.uid), { role: roleChangeTarget.newRole });
        setUsers(prev => prev.map(u => u.uid === roleChangeTarget.uid ? { ...u, role: roleChangeTarget.newRole } : u));
        alert(`เปลี่ยนบทบาทเรียบร้อยแล้ว`);
     } catch(e) { 
         console.error(e);
         alert("เกิดข้อผิดพลาด");
     } finally {
         setRoleChangeTarget(null);
     }
  };

  const handlePaymentVerify = async (e: React.MouseEvent, enrollmentId: string, status: 'PAID' | 'REJECTED', userId: string, courseId: string) => {
    e.preventDefault(); e.stopPropagation();
    if (processingId) return;

    if (confirmAction?.id === enrollmentId && confirmAction?.type === status) {
        setConfirmAction(null);
        setProcessingId(enrollmentId);

        try {
            await updateDoc(doc(db, "enrollments", enrollmentId), { paymentStatus: status });
            const title = status === 'PAID' ? "การชำระเงินสำเร็จ" : "การชำระเงินถูกปฏิเสธ";
            const msg = status === 'PAID' 
                ? "การลงทะเบียนของคุณเสร็จสมบูรณ์แล้ว คุณสามารถเริ่มเรียนได้ทันที" 
                : "กรุณาตรวจสอบหลักฐานการโอนเงินและดำเนินการส่งใหม่อีกครั้ง";
            await sendNotification(userId, title, msg, 'PAYMENT');

            // --- INSTRUCTOR NOTIFICATION LOGIC ---
            if (status === 'PAID') {
                const course = courses.find(c => c.id === courseId);
                if (course && course.instructorName) {
                    // Find instructor by name (assuming name match or you can improve this with instructor ID reference)
                    const instructor = users.find(u => u.role === UserRole.INSTRUCTOR && u.displayName === course.instructorName);
                    if (instructor) {
                         await sendNotification(
                            instructor.uid, 
                            "มีนักเรียนใหม่!", 
                            `คอร์ส ${course.title} มีนักเรียนชำระเงินเข้ามาใหม่`, 
                            'NEW_ENROLLMENT'
                         );
                    }
                }
            }

        } catch (error: any) {
            console.error("Update failed", error);
            alert(`เกิดข้อผิดพลาด: ${error.message}`);
        } finally {
            setProcessingId(null);
        }
    } else {
        setConfirmAction({ id: enrollmentId, type: status });
        setTimeout(() => setConfirmAction(prev => (prev?.id === enrollmentId && prev?.type === status) ? null : prev), 3000);
    }
  };

  // --- Helpers ---
  const toggleStudentSelection = (id: string) => {
      setSelectedStudentIds(prev => prev.includes(id) ? prev.filter(sid => sid !== id) : [...prev, id]);
  };

  const isCheckedInToday = (attendance: string[]) => {
      if (!attendance || !Array.isArray(attendance) || attendance.length === 0) return false;
      const todayStr = new Date().toDateString();
      return attendance.some(date => new Date(date).toDateString() === todayStr);
  };

  const calculateDaysLeft = (expiryDate?: string | null) => {
      if (!expiryDate) return Infinity; 
      const diffTime = new Date(expiryDate).getTime() - new Date().getTime();
      return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  };

  const renderCalendar = (specificEnrollments?: ExtendedEnrollment[]) => {
    const dataToRender = specificEnrollments || enrollments;
    const getDaysInMonth = (date: Date) => {
        const year = date.getFullYear();
        const month = date.getMonth();
        return { days: new Date(year, month + 1, 0).getDate(), firstDay: new Date(year, month, 1).getDay() };
    };
    const { days, firstDay } = getDaysInMonth(currentDate);
    const blanks = Array.from({ length: firstDay }, (_, i) => i);
    const daySlots = Array.from({ length: days }, (_, i) => i + 1);
    const monthName = currentDate.toLocaleDateString('th-TH', { month: 'long', year: 'numeric' });

    const getEventsForDay = (day: number) => {
        const targetStr = new Date(currentDate.getFullYear(), currentDate.getMonth(), day).toDateString();
        const events: any[] = [];
        dataToRender.forEach(en => {
            if (en.paymentStatus === 'PAID') {
                if (new Date(en.startDate).toDateString() === targetStr) events.push({ type: 'START', label: 'เริ่ม', color: 'bg-green-100 text-green-700', enrollment: en });
                if (en.attendance) en.attendance.forEach(att => {
                    if (new Date(att).toDateString() === targetStr) events.push({ type: 'ATTEND', label: 'มาเรียน', color: 'bg-blue-100 text-blue-700', enrollment: en });
                });
            }
        });
        return events;
    };

    return (
        <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-6 animate-fade-in">
            <div className="flex justify-between items-center mb-6">
                <button onClick={() => setCurrentDate(new Date(currentDate.setMonth(currentDate.getMonth() - 1)))} className="p-2 hover:bg-slate-100 rounded-full"><ChevronLeft /></button>
                <h2 className="text-xl font-bold text-slate-800">{monthName}</h2>
                <button onClick={() => setCurrentDate(new Date(currentDate.setMonth(currentDate.getMonth() + 1)))} className="p-2 hover:bg-slate-100 rounded-full"><ChevronRight /></button>
            </div>
            <div className="grid grid-cols-7 gap-2 mb-2 text-center text-sm font-bold text-slate-500"><div>อา.</div><div>จ.</div><div>อ.</div><div>พ.</div><div>พฤ.</div><div>ศ.</div><div>ส.</div></div>
            <div className="grid grid-cols-7 gap-2">
                {blanks.map((x, i) => <div key={`blank-${i}`} className="h-24 md:h-32 bg-slate-50/50 rounded-xl"></div>)}
                {daySlots.map(day => {
                    const events = getEventsForDay(day);
                    const isToday = new Date().toDateString() === new Date(currentDate.getFullYear(), currentDate.getMonth(), day).toDateString();
                    return (
                        <div key={`day-${day}`} className={`h-24 md:h-32 bg-white border border-slate-100 rounded-xl p-2 relative overflow-y-auto ${isToday ? 'ring-2 ring-ocean-500' : ''}`}>
                            <span className={`text-sm font-bold ${isToday ? 'text-ocean-600' : 'text-slate-700'}`}>{day}</span>
                            <div className="mt-1 space-y-1">{events.map((evt, idx) => <div key={idx} className={`text-[10px] md:text-xs px-1.5 py-1 rounded-lg truncate ${evt.color}`}>{user.role === UserRole.INSTRUCTOR || user.role === UserRole.ADMIN ? evt.enrollment.studentName : evt.label}</div>)}</div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
  };

  const TabButton = ({ id, label, icon: Icon, badge }: { id: any, label: string, icon?: React.ElementType, badge?: number }) => (
    <button type="button" className={`pb-4 px-4 md:px-6 text-base md:text-lg font-bold transition-colors whitespace-nowrap flex items-center gap-2 ${activeTab === id ? 'text-ocean-600 border-b-4 border-ocean-600' : 'text-slate-500 hover:text-slate-700'}`} onClick={() => { setActiveTab(id); if (id !== 'schedule') setSelectedCourseId(null); }}>
        {Icon && <Icon size={18} className="md:hidden lg:block" />}{label}{(badge !== undefined && badge > 0) && <span className="bg-red-500 text-white text-xs px-2 py-0.5 rounded-full">{badge}</span>}
    </button>
  );

  if (loading) return <div className="flex justify-center items-center min-h-[50vh]"><div className="animate-spin rounded-full h-16 w-16 border-t-4 border-b-4 border-ocean-600"></div></div>;

  // --- RENDER ---
  return (
    <div className="max-w-[1600px] mx-auto px-6 py-12 relative">
      {/* --- ADMIN VIEW --- */}
      {user.role === UserRole.ADMIN && (
        <>
            <div className="flex justify-between items-center mb-8">
                <h1 className="text-4xl font-bold text-slate-800">Admin Dashboard</h1>
                <div className="flex gap-3">
                    <button onClick={() => setShowBroadcastModal(true)} className="bg-ocean-600 text-white px-4 py-2 rounded-xl font-bold flex items-center text-sm hover:bg-ocean-700 shadow-md shadow-ocean-200">
                        <Megaphone size={18} className="mr-2" /> ประกาศข่าวสาร
                    </button>
                    <button onClick={() => setShowExpiryConfirm(true)} className="bg-orange-100 text-orange-700 px-4 py-2 rounded-xl font-bold flex items-center text-sm hover:bg-orange-200">
                        <AlertTriangle size={18} className="mr-2" /> แจ้งเตือนหมดอายุ
                    </button>
                </div>
            </div>
            {/* Tabs */}
            <div className="flex space-x-2 md:space-x-4 border-b border-slate-200 mb-10 overflow-x-auto pb-1 scrollbar-hide">
                <TabButton id="overview" label="ภาพรวม" />
                <TabButton id="payments" label="ตรวจสอบสลิป" badge={stats.pendingPayments} />
                <TabButton id="schedule" label="ข้อมูลนักเรียน" />
                <TabButton id="enrollments" label="ประวัติการสมัคร" />
                <TabButton id="users" label="ผู้ใช้งาน" />
                <TabButton id="leaves" label="การลาหยุด" />
            </div>

            {activeTab === 'overview' && (
                <div className="animate-fade-in">
                    {/* Stats Cards */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-10">
                        <div className="bg-white p-8 rounded-2xl shadow-sm border border-slate-100 flex items-center">
                            <div className="p-5 bg-green-100 rounded-full text-green-600 mr-6"><DollarSign size={32} /></div>
                            <div><p className="text-base text-slate-500 font-medium">รายได้รวม</p><p className="text-3xl font-bold text-slate-800">฿{stats.totalIncome.toLocaleString()}</p></div>
                        </div>
                        <div className="bg-white p-8 rounded-2xl shadow-sm border border-slate-100 flex items-center">
                            <div className="p-5 bg-blue-100 rounded-full text-blue-600 mr-6"><Users size={32} /></div>
                            <div><p className="text-base text-slate-500 font-medium">นักเรียนทั้งหมด</p><p className="text-3xl font-bold text-slate-800">{stats.totalStudents}</p></div>
                        </div>
                        <div className="bg-white p-8 rounded-2xl shadow-sm border border-slate-100 flex items-center cursor-pointer hover:shadow-md transition-shadow" onClick={() => setActiveTab('payments')}>
                            <div className="p-5 bg-orange-100 rounded-full text-orange-600 mr-6 relative">
                                <AlertTriangle size={32} />
                                {stats.pendingPayments > 0 && <span className="absolute top-0 right-0 w-4 h-4 bg-red-500 rounded-full animate-ping"></span>}
                            </div>
                            <div><p className="text-base text-slate-500 font-medium">รอชำระเงิน</p><p className="text-3xl font-bold text-slate-800">{stats.pendingPayments} <span className="text-sm font-normal text-slate-400">รายการ</span></p></div>
                        </div>
                    </div>
                    {/* Charts */}
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-10">
                        <div className="bg-white p-8 rounded-2xl shadow-sm border border-slate-100 lg:col-span-2">
                            <div className="flex justify-between items-center mb-8">
                                <h3 className="font-bold text-2xl text-slate-800">{chartMode === 'revenue' ? 'รายได้รายเดือน' : 'จำนวนผู้เรียนรายเดือน'}</h3>
                                <div className="flex bg-slate-100 rounded-lg p-1">
                                    <button onClick={() => setChartMode('revenue')} className={`px-4 py-1.5 rounded-md text-sm font-bold transition-all ${chartMode === 'revenue' ? 'bg-white text-ocean-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}>รายได้</button>
                                    <button onClick={() => setChartMode('enrollment')} className={`px-4 py-1.5 rounded-md text-sm font-bold transition-all ${chartMode === 'enrollment' ? 'bg-white text-ocean-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}>ผู้เรียน</button>
                                </div>
                            </div>
                            <div style={{ width: '100%', height: 400 }}>
                                <ResponsiveContainer width="100%" height="100%">
                                    {chartMode === 'revenue' ? (
                                        <BarChart data={monthlyRevenueData}><CartesianGrid strokeDasharray="3 3" vertical={false} /><XAxis dataKey="name" fontSize={14} /><YAxis tickFormatter={(value: number) => `฿${value/1000}k`} fontSize={14} /><Tooltip contentStyle={{ fontSize: '16px' }} formatter={(value: number) => [`฿${value.toLocaleString()}`, 'รายได้']} /><Bar dataKey="revenue" fill="#0ea5e9" radius={[6, 6, 0, 0]} name="รายได้" /></BarChart>
                                    ) : (
                                        <BarChart data={monthlyEnrollmentData}><CartesianGrid strokeDasharray="3 3" vertical={false} /><XAxis dataKey="name" fontSize={14} /><YAxis allowDecimals={false} fontSize={14} /><Tooltip cursor={{fill: 'transparent'}} contentStyle={{ fontSize: '14px', borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }} /><Legend />{courseNames.map((name, index) => (<Bar key={name} dataKey={name} stackId="a" fill={COLORS[index % COLORS.length]} radius={[4, 4, 0, 0]} />))}</BarChart>
                                    )}
                                </ResponsiveContainer>
                            </div>
                        </div>
                        {/* Side Stats */}
                        <div className="space-y-8">
                            <div className="bg-white p-8 rounded-2xl shadow-sm border border-slate-100">
                                <h3 className="font-bold text-xl mb-6 text-slate-800 flex items-center"><User size={20} className="mr-2"/> ภาระงานครูผู้สอน</h3>
                                <div className="space-y-4">
                                    {Object.entries(instructorLoad).map(([name, count], index) => {
                                        const max = Math.max(...Object.values(instructorLoad));
                                        const percent = max > 0 ? (count / max) * 100 : 0;
                                        return (
                                            <div key={index}><div className="flex justify-between text-sm mb-1"><span className="font-bold text-slate-700">ครู{name}</span><span className="text-slate-500">{count} คน</span></div><div className="w-full bg-slate-100 rounded-full h-2.5"><div className="bg-ocean-500 h-2.5 rounded-full" style={{ width: `${percent}%` }}></div></div></div>
                                        )
                                    })}
                                    {Object.keys(instructorLoad).length === 0 && <p className="text-slate-400 text-sm">ยังไม่มีข้อมูลผู้เรียน</p>}
                                </div>
                            </div>
                            <div className="bg-white p-8 rounded-2xl shadow-sm border border-slate-100">
                                <h3 className="font-bold text-xl mb-8 text-slate-800">สถานะการสมัคร</h3>
                                <div style={{ width: '100%', height: 250 }}>
                                    <ResponsiveContainer width="100%" height="100%">
                                        <PieChart><Pie data={enrollmentStatusData} dataKey="value" cx="50%" cy="50%" innerRadius={60} outerRadius={80} paddingAngle={5}>{enrollmentStatusData.map((entry, index) => (<Cell key={`cell-${index}`} fill={entry.color} />))}</Pie><Tooltip contentStyle={{ fontSize: '14px' }} /><Legend verticalAlign="bottom" height={36} wrapperStyle={{ fontSize: '12px' }}/></PieChart>
                                    </ResponsiveContainer>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            )}
            
            {activeTab === 'schedule' && (
                <div className="animate-fade-in">
                    {!selectedCourseId ? (
                        <div className="grid grid-cols-1 xl:grid-cols-2 gap-8">
                            {courses.map(course => {
                                const count = enrollments.filter(e => e.courseId === course.id && e.paymentStatus === 'PAID').length;
                                return (
                                    <div key={course.id} onClick={() => setSelectedCourseId(course.id)} className="bg-white rounded-3xl p-8 shadow-sm border border-slate-100 hover:shadow-xl cursor-pointer transition-all group flex flex-col h-full">
                                        <div className="flex items-start gap-6 mb-6">
                                            <div className="w-32 h-32 rounded-2xl bg-slate-100 overflow-hidden flex-shrink-0 shadow-sm border border-slate-50"><img src={course.imageUrl} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500" alt={course.title} /></div>
                                            <div className="flex-grow"><h3 className="text-2xl font-bold text-slate-800 leading-tight mb-2 group-hover:text-ocean-700 transition-colors">{course.title}</h3><span className="inline-block px-3 py-1 bg-ocean-50 text-ocean-700 rounded-lg text-sm font-bold mb-2">{course.ageGroup}</span><p className="text-base text-slate-500 flex items-center mt-1"><Clock size={16} className="mr-2" /> {course.timeSlot}</p></div>
                                        </div>
                                        <div className="mt-auto flex justify-between items-center text-base border-t border-slate-50 pt-5"><div className="flex items-center text-slate-600 font-medium"><div className="bg-slate-100 p-2 rounded-full mr-3"><Users size={20} className="text-slate-500"/> </div><span>ลงทะเบียนแล้ว <span className="font-bold text-slate-900 text-lg ml-1">{count}</span> คน</span></div><button className="px-6 py-2.5 bg-ocean-50 text-ocean-700 rounded-xl font-bold group-hover:bg-ocean-600 group-hover:text-white transition-all flex items-center">ดูรายชื่อ <ChevronRight size={18} className="ml-1" /></button></div>
                                    </div>
                                )
                            })}
                        </div>
                    ) : (
                        <div>
                            <button onClick={() => setSelectedCourseId(null)} className="mb-6 flex items-center text-slate-500 hover:text-ocean-600 font-bold transition-colors"><ArrowLeft className="mr-2" size={20} /> กลับไปหน้าเลือกคอร์ส</button>
                            <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
                                <div className="p-6 border-b border-slate-100 bg-slate-50/50 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                                    <div><h3 className="font-bold text-xl text-slate-800">{courses.find(c => c.id === selectedCourseId)?.title}</h3><p className="text-slate-500 text-sm mt-1">รายชื่อนักเรียนในคอร์ส</p></div>
                                    <div className="bg-white px-4 py-2 rounded-lg border border-slate-200 text-sm font-bold text-slate-600 shadow-sm"><Users size={16} className="inline mr-2 text-ocean-500"/>ทั้งหมด {enrollments.filter(e => e.courseId === selectedCourseId && e.paymentStatus === 'PAID').length} คน</div>
                                </div>
                                <div className="overflow-x-auto">
                                    <table className="w-full text-left">
                                        <thead className="bg-slate-50 text-slate-600 text-sm uppercase font-bold tracking-wider border-b border-slate-200"><tr><th className="p-5">รหัส นร.</th><th className="p-5">นักเรียน</th><th className="p-5">ความคืบหน้า</th><th className="p-5">สถานะ</th><th className="p-5 text-right">จัดการ</th></tr></thead>
                                        <tbody className="divide-y divide-slate-100">
                                            {enrollments.filter(e => e.courseId === selectedCourseId && e.paymentStatus === 'PAID').map(en => {
                                                const course = courses.find(c => c.id === en.courseId);
                                                const total = course?.sessions || 20;
                                                const attended = en.attendance?.length || 0;
                                                const percent = Math.min((attended/total)*100, 100);
                                                return (
                                                    <tr key={en.id} className="hover:bg-slate-50 transition-colors">
                                                        <td className="p-5 font-mono text-sm text-slate-500 font-bold">{en.studentId || '-'}</td>
                                                        <td className="p-5"><div className="flex items-center gap-3"><div className="w-10 h-10 rounded-full bg-ocean-100 text-ocean-600 flex items-center justify-center font-bold text-sm">{en.studentName.charAt(0)}</div><div><div className="font-bold text-slate-800 text-base">{en.studentName}</div><div className="text-xs text-slate-500 flex items-center mt-0.5"><Phone size={12} className="mr-1"/> {en.phone}</div></div></div></td>
                                                        <td className="p-5"><div className="flex justify-between text-xs font-bold mb-1.5 text-slate-600"><span>เรียนแล้ว</span><span>{attended}/{total} ครั้ง</span></div><div className="w-48 h-2.5 bg-slate-200 rounded-full overflow-hidden"><div className={`h-full rounded-full ${percent >= 100 ? 'bg-green-500' : 'bg-ocean-500'}`} style={{width: `${percent}%`}}></div></div></td>
                                                        <td className="p-5"><div className="flex items-center gap-2">{en.evaluation === 'PASS' ? <span className="inline-flex items-center text-xs font-bold text-green-700 bg-green-100 px-3 py-1 rounded-full border border-green-200"><CheckCircle size={12} className="mr-1"/> ผ่านแล้ว</span> : en.evaluation === 'FAIL' ? <span className="inline-flex items-center text-xs font-bold text-red-700 bg-red-100 px-3 py-1 rounded-full border border-red-200"><XCircle size={12} className="mr-1"/> ไม่ผ่าน</span> : <span className="inline-flex items-center text-xs font-bold text-blue-700 bg-blue-100 px-3 py-1 rounded-full border border-blue-200"><Loader2 size={12} className="mr-1 animate-spin"/> กำลังเรียน</span>}
                                                            {en.evaluation !== 'PASS' && (<div className="flex gap-1 ml-2"><button type="button" onClick={(e) => { e.preventDefault(); e.stopPropagation(); setEvaluationTarget({ enrollmentId: en.id, result: 'PASS', userId: en.userId, studentName: en.studentName }) }} className="p-1 bg-green-100 text-green-600 rounded hover:bg-green-200" title="ให้ผ่าน"><Check size={14} /></button><button type="button" onClick={(e) => { e.preventDefault(); e.stopPropagation(); setEvaluationTarget({ enrollmentId: en.id, result: 'FAIL', userId: en.userId, studentName: en.studentName }) }} className="p-1 bg-red-100 text-red-600 rounded hover:bg-red-200" title="ไม่ผ่าน"><X size={14} /></button></div>)}</div></td>
                                                        <td className="p-5 text-right"><div className="flex justify-end gap-2"><button onClick={() => { setTargetStudent(en); setShowProfileModal(true); }} className="flex items-center px-3 py-1.5 text-sm font-bold text-slate-600 hover:text-blue-600 bg-white border border-slate-200 hover:border-blue-200 rounded-lg hover:bg-blue-50 transition-all shadow-sm"><FileText size={16} className="mr-1.5" /> ประวัติ</button><button onClick={() => { setTargetStudent(en); setShowCalendarModal(true); }} className="flex items-center px-3 py-1.5 text-sm font-bold text-slate-600 hover:text-ocean-600 bg-white border border-slate-200 hover:border-ocean-200 rounded-lg hover:bg-ocean-50 transition-all shadow-sm"><CalendarCheck size={16} className="mr-1.5" /> ปฏิทิน</button></div></td>
                                                    </tr>
                                                )
                                            })}
                                            {enrollments.filter(e => e.courseId === selectedCourseId && e.paymentStatus === 'PAID').length === 0 && (<tr><td colSpan={5} className="p-12 text-center text-slate-400">ไม่มีนักเรียนในคอร์สนี้</td></tr>)}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            )}

            {/* Payments Tab */}
            {activeTab === 'payments' && (
                <div className="animate-fade-in">
                    <div className="flex items-center justify-between mb-6"><h2 className="text-2xl font-bold text-slate-800">รายการรอตรวจสอบ ({stats.pendingPayments})</h2><button type="button" onClick={() => setActiveTab('enrollments')} className="text-ocean-600 hover:underline">ดูประวัติทั้งหมด</button></div>
                    {enrollments.filter(e => e.paymentStatus === 'PENDING').length === 0 ? <div className="bg-white rounded-2xl p-16 text-center border border-slate-100"><div className="bg-green-100 w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-4 text-green-600"><Check size={40} /></div><h3 className="text-2xl font-bold text-slate-800">ยอดเยี่ยม!</h3><p className="text-slate-500 text-lg mt-2">ไม่มีรายการที่ต้องตรวจสอบในขณะนี้</p></div> : 
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {enrollments.filter(e => e.paymentStatus === 'PENDING').map((enrollment) => {
                            const course = courses.find(c => c.id === enrollment.courseId);
                            const isProcessing = processingId === enrollment.id;
                            const isConfirmingPaid = confirmAction?.id === enrollment.id && confirmAction?.type === 'PAID';
                            const isConfirmingRejected = confirmAction?.id === enrollment.id && confirmAction?.type === 'REJECTED';
                            return (
                                <div key={enrollment.id} className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden hover:shadow-md transition-shadow flex flex-col">
                                    <div className="h-48 bg-slate-100 relative group cursor-pointer" onClick={() => setSelectedSlip(enrollment.slipUrl)}><img src={enrollment.slipUrl} alt="Slip" className="w-full h-full object-cover object-top" /><div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white"><ZoomIn size={32} /> <span className="ml-2 font-bold">ขยายรูปภาพ</span></div></div>
                                    <div className="p-6 flex-grow flex flex-col"><div className="mb-4"><h3 className="text-xl font-bold text-slate-900">{enrollment.studentName}</h3><p className="text-sm text-slate-500">สมัครเมื่อ: {new Date(enrollment.createdAt).toLocaleDateString('th-TH')}</p></div><div className="space-y-2 mb-6 bg-slate-50 p-4 rounded-xl text-sm"><div className="flex justify-between"><span className="text-slate-500">คอร์ส:</span><span className="font-semibold text-slate-800 text-right">{course?.title}</span></div><div className="flex justify-between"><span className="text-slate-500">ยอดโอน:</span><span className="font-bold text-ocean-600 text-lg">฿{course?.price.toLocaleString()}</span></div></div><div className="mt-auto grid grid-cols-2 gap-3 relative z-10"><button type="button" disabled={isProcessing || isConfirmingRejected} onClick={(e) => handlePaymentVerify(e, enrollment.id, 'PAID', enrollment.userId, enrollment.courseId)} className={`py-3 rounded-xl font-bold flex items-center justify-center transition-all ${isConfirmingPaid ? 'bg-green-700 text-white shadow-inner scale-95' : 'bg-green-50 text-white hover:bg-green-600 shadow-lg shadow-green-500/30'} disabled:opacity-50`} title="ยืนยันการชำระเงิน">{isProcessing ? <Loader2 className="animate-spin mr-2" size={20} /> : (isConfirmingPaid ? <span className="animate-pulse">ยืนยัน?</span> : <><Check size={20} className="mr-2" /> อนุมัติ</>)}</button><button type="button" disabled={isProcessing || isConfirmingPaid} onClick={(e) => handlePaymentVerify(e, enrollment.id, 'REJECTED', enrollment.userId, enrollment.courseId)} className={`py-3 rounded-xl font-bold flex items-center justify-center transition-all ${isConfirmingRejected ? 'bg-red-200 text-red-800 shadow-inner scale-95' : 'bg-red-50 text-red-600 hover:bg-red-100 border border-red-200'} disabled:opacity-50`} title="ปฏิเสธ">{isProcessing ? <Loader2 className="animate-spin mr-2" size={20} /> : (isConfirmingRejected ? <span className="animate-pulse">แน่ใจ?</span> : <><X size={20} className="mr-2" /> ปฏิเสธ</>)}</button></div></div>
                                </div>
                            );
                        })}
                    </div>}
                </div>
            )}

            {/* Enrollments Tab */}
            {activeTab === 'enrollments' && (
                 <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden animate-fade-in relative">
                      <div className="p-4 flex justify-end"><button onClick={() => {/*CSV logic*/}} className="flex items-center gap-2 text-green-600 hover:bg-green-50 px-4 py-2 rounded-lg font-bold transition-colors"><FileSpreadsheet size={18} /> Export Excel (CSV)</button></div>
                      <div className="overflow-x-auto">
                        <table className="w-full text-base text-left">
                            <thead className="text-slate-600 bg-slate-50 border-b border-slate-200 uppercase tracking-wider"><tr><th className="p-6 font-bold">รหัส นร.</th><th className="p-6 font-bold">วันที่สมัคร</th><th className="p-6 font-bold">ชื่อผู้เรียน</th><th className="p-6 font-bold">คอร์สเรียน</th><th className="p-6 font-bold">หลักฐาน</th><th className="p-6 font-bold">สถานะ</th><th className="p-6 font-bold text-right">จัดการ</th></tr></thead>
                            <tbody className="divide-y divide-slate-100">
                                {enrollments.map(enrollment => {
                                   const courseName = courses.find(c => c.id === enrollment.courseId)?.title || enrollment.courseId;
                                   const isProcessing = processingId === enrollment.id;
                                   const isConfirmingPaid = confirmAction?.id === enrollment.id && confirmAction?.type === 'PAID';
                                   const isConfirmingRejected = confirmAction?.id === enrollment.id && confirmAction?.type === 'REJECTED';
                                   return (
                                    <tr key={enrollment.id} className="hover:bg-slate-50 transition-colors">
                                        <td className="p-6 font-mono text-slate-500 font-bold">{enrollment.studentId || '-'}</td>
                                        <td className="p-6 text-slate-600">{new Date(enrollment.createdAt).toLocaleDateString('th-TH')}</td>
                                        <td className="p-6 font-semibold text-slate-900">{enrollment.studentName}<div className="text-sm text-slate-500 font-normal mt-1">{enrollment.phone}</div></td>
                                        <td className="p-6 text-slate-700">{courseName}</td>
                                        <td className="p-6"><button type="button" onClick={() => setSelectedSlip(enrollment.slipUrl)} className="text-ocean-600 hover:text-ocean-800 underline font-medium flex items-center"><Eye size={16} className="mr-1"/> ดูสลิป</button></td>
                                        <td className="p-6"><span className={`px-3 py-1.5 rounded-full text-sm font-bold ${enrollment.paymentStatus === 'PAID' ? 'bg-green-100 text-green-700' : enrollment.paymentStatus === 'REJECTED' ? 'bg-red-100 text-red-700' : 'bg-yellow-100 text-yellow-700'}`}>{enrollment.paymentStatus}</span></td>
                                        <td className="p-6 text-right">
                                            {enrollment.paymentStatus === 'PENDING' ? (
                                                <div className="flex justify-end space-x-3">
                                                    <button disabled={isProcessing} onClick={(e) => handlePaymentVerify(e, enrollment.id, 'PAID', enrollment.userId, enrollment.courseId)} className={`p-3 rounded-xl transition-all ${isConfirmingPaid ? 'bg-green-600 text-white' : 'bg-green-50 text-green-600 hover:bg-green-100 border border-green-200'}`} title="ยืนยันการชำระเงิน">{isConfirmingPaid ? <CheckCircle size={20} /> : <Check size={20}/>}</button>
                                                    <button disabled={isProcessing} onClick={(e) => handlePaymentVerify(e, enrollment.id, 'REJECTED', enrollment.userId, enrollment.courseId)} className={`p-3 rounded-xl transition-all ${isConfirmingRejected ? 'bg-red-600 text-white' : 'bg-red-50 text-red-600 hover:bg-red-100 border border-red-200'}`} title="ปฏิเสธ">{isConfirmingRejected ? <HelpCircle size={20} /> : <X size={20}/>}</button>
                                                </div>
                                            ) : (
                                                <div className="flex justify-end gap-2 items-center">
                                                    {enrollment.paymentStatus === 'PAID' && <button type="button" onClick={(e) => handlePaymentVerify(e, enrollment.id, 'REJECTED', enrollment.userId, enrollment.courseId)} className="text-xs text-red-500 hover:underline">ยกเลิก</button>}
                                                    {enrollment.paymentStatus === 'REJECTED' && <button type="button" onClick={(e) => handlePaymentVerify(e, enrollment.id, 'PAID', enrollment.userId, enrollment.courseId)} className="text-xs text-green-500 hover:underline">อนุมัติคืน</button>}
                                                    <button onClick={() => { setTargetStudent(enrollment); setShowProfileModal(true); }} className="text-slate-400 hover:text-blue-600 p-2 rounded-full hover:bg-blue-50 transition-colors" title="ดูประวัติ"><User size={18} /></button>
                                                   <button type="button" onClick={(e) => { e.preventDefault(); e.stopPropagation(); setDeleteTargetId(enrollment.id); }} className="text-slate-400 hover:text-red-600 p-2 rounded-full hover:bg-red-50 transition-colors ml-2" title="ลบข้อมูล"><Trash2 size={18} /></button>
                                                </div>
                                            )}
                                        </td>
                                    </tr>
                                   );
                                })}
                            </tbody>
                        </table>
                      </div>
                </div>
            )}

            {activeTab === 'users' && (
                 <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden animate-fade-in relative">
                      <div className="p-6 border-b border-slate-100 flex flex-col md:flex-row md:items-center justify-between gap-4">
                        <h3 className="font-bold text-xl text-slate-800 flex items-center"><Users className="mr-2 text-ocean-600"/> จัดการผู้ใช้งาน ({users.length})</h3>
                        <div className="relative w-full md:w-auto"><Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 w-5 h-5" /><input type="text" placeholder="ค้นหาชื่อ, อีเมล..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="w-full md:w-64 pl-10 pr-4 py-2 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-ocean-500 bg-slate-50 focus:bg-white transition-all" /></div>
                      </div>
                      <div className="overflow-x-auto">
                        <table className="w-full text-base text-left">
                            <thead className="text-slate-600 bg-slate-50 border-b border-slate-200 uppercase tracking-wider text-sm"><tr><th className="p-5 font-bold">ผู้ใช้งาน</th><th className="p-5 font-bold">บทบาท</th><th className="p-5 font-bold">เบอร์โทร</th><th className="p-5 font-bold text-right">เปลี่ยนบทบาท</th></tr></thead>
                            <tbody className="divide-y divide-slate-100">
                                {users.filter(u => u.displayName.toLowerCase().includes(searchTerm.toLowerCase()) || u.email.toLowerCase().includes(searchTerm.toLowerCase())).map(u => (
                                    <tr key={u.uid} className="hover:bg-slate-50 transition-colors">
                                        <td className="p-5"><div className="flex items-center gap-3"><div className="w-10 h-10 rounded-full bg-ocean-100 text-ocean-600 flex items-center justify-center font-bold flex-shrink-0">{u.photoURL ? <img src={u.photoURL} className="w-full h-full rounded-full object-cover" /> : u.displayName.charAt(0)}</div><div><p className="font-bold text-slate-900">{u.displayName}</p><p className="text-sm text-slate-500">{u.email}</p></div></div></td>
                                        <td className="p-5"><span className={`px-3 py-1 rounded-full text-xs font-bold border ${u.role === 'ADMIN' ? 'bg-red-50 text-red-700 border-red-100' : u.role === 'INSTRUCTOR' ? 'bg-orange-50 text-orange-700 border-orange-100' : 'bg-blue-50 text-blue-700 border-blue-100'}`}>{u.role}</span></td>
                                        <td className="p-5 text-slate-600 font-medium">{u.phone || '-'}</td>
                                        <td className="p-5 text-right">
                                            <select 
                                                value={u.role}
                                                onChange={(e) => setRoleChangeTarget({ uid: u.uid, newRole: e.target.value as UserRole, currentRole: u.role })}
                                                className="p-2 pl-3 pr-8 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-ocean-500 outline-none bg-white cursor-pointer hover:border-ocean-300 transition-colors appearance-none"
                                                disabled={u.uid === user.uid}
                                            >
                                                <option value={UserRole.STUDENT}>STUDENT</option><option value={UserRole.INSTRUCTOR}>INSTRUCTOR</option><option value={UserRole.ADMIN}>ADMIN</option>
                                            </select>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                      </div>
                </div>
            )}
            
            {activeTab === 'leaves' && (
                <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden animate-fade-in relative">
                    <div className="p-6 border-b border-slate-100">
                        <h3 className="font-bold text-xl text-slate-800 flex items-center"><CalendarX className="mr-2 text-ocean-600"/> คำขอลาหยุด ({leaveRequests.filter(r => r.status === 'PENDING').length} รายการรอ)</h3>
                    </div>
                    <div className="overflow-x-auto">
                        <table className="w-full text-left">
                            <thead className="bg-slate-50 text-slate-600 uppercase text-sm font-bold border-b border-slate-200"><tr><th className="p-5">วันที่แจ้ง</th><th className="p-5">นักเรียน</th><th className="p-5">คอร์ส</th><th className="p-5">วันที่ลา</th><th className="p-5">เหตุผล</th><th className="p-5">สถานะ</th><th className="p-5 text-right">จัดการ</th></tr></thead>
                            <tbody className="divide-y divide-slate-100">
                                {leaveRequests.map(req => (
                                    <tr key={req.id} className="hover:bg-slate-50 transition-colors">
                                        <td className="p-5 text-sm text-slate-500">{new Date(req.createdAt).toLocaleDateString('th-TH')}</td>
                                        <td className="p-5 font-bold text-slate-800">{req.studentName}</td>
                                        <td className="p-5 text-slate-700">{req.courseName}</td>
                                        <td className="p-5 font-bold text-orange-600">{new Date(req.leaveDate).toLocaleDateString('th-TH')}</td>
                                        <td className="p-5 text-sm text-slate-600 max-w-xs truncate">{req.reason}</td>
                                        <td className="p-5"><span className={`px-3 py-1 rounded-full text-xs font-bold ${req.status === 'APPROVED' ? 'bg-green-100 text-green-700' : req.status === 'REJECTED' ? 'bg-red-100 text-red-700' : 'bg-yellow-100 text-yellow-700'}`}>{req.status}</span></td>
                                        <td className="p-5 text-right">
                                            {req.status === 'PENDING' && (
                                                <div className="flex justify-end gap-2">
                                                    <button onClick={() => setLeaveActionTarget({ request: req, action: 'APPROVED' })} className="bg-green-100 text-green-700 px-3 py-1 rounded-lg text-xs font-bold hover:bg-green-200">อนุมัติ</button>
                                                    <button onClick={() => setLeaveActionTarget({ request: req, action: 'REJECTED' })} className="bg-red-100 text-red-700 px-3 py-1 rounded-lg text-xs font-bold hover:bg-red-200">ปฏิเสธ</button>
                                                </div>
                                            )}
                                        </td>
                                    </tr>
                                ))}
                                {leaveRequests.length === 0 && <tr><td colSpan={7} className="p-12 text-center text-slate-400">ไม่มีคำขอลาหยุด</td></tr>}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}
        </>
      )}

      {/* --- INSTRUCTOR VIEW --- */}
      {user.role === UserRole.INSTRUCTOR && (
           <div className="max-w-[1600px] mx-auto px-6 py-12">
            <div className="flex justify-between items-center mb-8">
                <h1 className="text-4xl font-bold text-slate-800">Instructor Dashboard</h1>
                <button onClick={() => setShowExpiryConfirm(true)} className="bg-orange-100 text-orange-700 px-4 py-2 rounded-xl font-bold flex items-center text-sm hover:bg-orange-200"><AlertTriangle size={18} className="mr-2" /> ส่งแจ้งเตือนคนใกล้หมดอายุ</button>
            </div>
            
            <div className="flex space-x-2 md:space-x-4 border-b border-slate-200 mb-10 overflow-x-auto pb-1 scrollbar-hide">
                <TabButton id="schedule" label="ตารางสอน" />
                <TabButton id="leaves" label="การลาหยุด" badge={leaveRequests.filter(r => r.status === 'PENDING').length} />
            </div>

            {activeTab === 'schedule' && (
                <>
                {!selectedCourseId && (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 animate-fade-in">
                        {courses.map(course => (
                            <div key={course.id} onClick={() => setSelectedCourseId(course.id)} className="bg-white rounded-3xl shadow-sm border border-slate-100 hover:shadow-xl hover:border-ocean-200 transition-all cursor-pointer overflow-hidden group flex flex-col h-full">
                                <div className="h-40 overflow-hidden relative"><img src={course.imageUrl} alt={course.title} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700" /><div className="absolute inset-0 bg-gradient-to-t from-black/70 to-transparent"></div><h3 className="absolute bottom-4 left-6 text-xl font-bold text-white shadow-sm">{course.title}</h3></div>
                                <div className="p-6 flex-grow flex flex-col justify-between"><div><div className="flex items-center text-slate-600 mb-2"><Users className="w-5 h-5 mr-2 text-ocean-500" /><span>นักเรียน: <span className="font-bold text-slate-900">{enrollments.filter(e => e.courseId === course.id && e.paymentStatus === 'PAID').length}</span> คน</span></div><div className="flex items-center text-slate-600 mb-4"><Clock className="w-5 h-5 mr-2 text-ocean-500" /><span>เวลาเรียน: {course.timeSlot}</span></div></div><button className="w-full py-3 bg-slate-50 text-ocean-600 font-bold rounded-xl group-hover:bg-ocean-600 group-hover:text-white transition-colors flex items-center justify-center">จัดการรายชื่อ <ChevronRight className="ml-2 w-5 h-5" /></button></div>
                            </div>
                        ))}
                    </div>
                )}

                {selectedCourseId && (
                    <div className="animate-fade-in">
                        <button onClick={() => { setSelectedCourseId(null); setSelectedStudentIds([]); }} className="flex items-center text-slate-500 hover:text-ocean-600 mb-6 font-bold transition-colors"><ArrowLeft className="mr-2" /> กลับไปหน้าเลือกคอร์ส</button>
                        <div className="flex flex-col md:flex-row justify-between items-end mb-8 gap-4">
                            <div><h1 className="text-3xl font-bold text-slate-900">{courses.find(c => c.id === selectedCourseId)?.title}</h1><p className="text-slate-500 mt-2">รายชื่อนักเรียนในคอร์ส • จำนวน {enrollments.filter(e => e.courseId === selectedCourseId && e.paymentStatus === 'PAID').length} คน</p></div>
                            <div className="bg-white p-3 rounded-xl shadow-sm border border-slate-100 flex items-center gap-4"><span className="text-sm text-slate-500 font-medium px-2">เลือก: {selectedStudentIds.length} คน</span><button onClick={() => setShowBulkCheckInConfirm(true)} disabled={selectedStudentIds.length === 0} className="bg-ocean-600 text-white px-6 py-3 rounded-lg font-bold shadow-md shadow-ocean-500/30 hover:bg-ocean-700 disabled:opacity-50 disabled:shadow-none transition-all flex items-center"><CalendarCheck className="mr-2 w-5 h-5" /> เช็คชื่อเข้าเรียน</button></div>
                        </div>
                        <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
                            <div className="overflow-x-auto">
                                <table className="w-full text-left border-collapse">
                                    <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 uppercase text-sm tracking-wider"><tr><th className="p-5 w-16 text-center"><input type="checkbox" className="w-5 h-5 rounded border-gray-300 text-ocean-600 focus:ring-ocean-500 cursor-pointer" checked={selectedStudentIds.length > 0 && selectedStudentIds.length === enrollments.filter(e => e.courseId === selectedCourseId && e.paymentStatus === 'PAID' && !isCheckedInToday(e.attendance)).length} onChange={() => { if (selectedStudentIds.length > 0) setSelectedStudentIds([]); else setSelectedStudentIds(enrollments.filter(e => e.courseId === selectedCourseId && e.paymentStatus === 'PAID' && !isCheckedInToday(e.attendance)).map(s => s.id)); }} /></th><th className="p-5 font-bold">ชื่อนักเรียน</th><th className="p-5 font-bold">ความคืบหน้า</th><th className="p-5 font-bold">ข้อมูล & ตารางเรียน</th><th className="p-5 font-bold">ประเมินผล</th></tr></thead>
                                    <tbody className="divide-y divide-slate-100">
                                        {enrollments.filter(e => e.courseId === selectedCourseId && e.paymentStatus === 'PAID').map(student => {
                                            const attendedCount = student.attendance ? student.attendance.length : 0;
                                            const totalSessions = courses.find(c => c.id === selectedCourseId)?.sessions || 20;
                                            const checkedInToday = isCheckedInToday(student.attendance);
                                            return (
                                                <tr key={student.id} className={`hover:bg-slate-50 transition-colors ${checkedInToday ? 'bg-green-50/30' : ''}`}>
                                                    <td className="p-5 text-center">{!checkedInToday && (<input type="checkbox" className="w-5 h-5 rounded border-gray-300 text-ocean-600 focus:ring-ocean-500 cursor-pointer" checked={selectedStudentIds.includes(student.id)} onChange={() => toggleStudentSelection(student.id)} />)}{checkedInToday && <CheckCircle className="w-5 h-5 text-green-500 mx-auto" />}</td>
                                                    <td className="p-5"><div className="font-bold text-slate-800 text-lg">{student.studentName}</div><div className="text-xs text-slate-500">รหัส: {student.studentId || '-'}</div></td>
                                                    <td className="p-5"><div className="flex items-center gap-2 mb-1"><span className="text-sm font-bold text-slate-700">{attendedCount}/{totalSessions}</span></div><div className="w-32 bg-slate-200 rounded-full h-2"><div className="bg-ocean-500 h-2 rounded-full" style={{ width: `${Math.min((attendedCount/totalSessions)*100, 100)}%` }}></div></div></td>
                                                    <td className="p-5"><div className="flex gap-2"><button onClick={(e) => { e.stopPropagation(); setTargetStudent(student); setShowProfileModal(true); }} className="px-3 py-1.5 bg-blue-50 text-blue-600 rounded-lg text-xs font-bold hover:bg-blue-100 flex items-center transition-colors"><FileText size={14} className="mr-1" /> ประวัติ</button><button onClick={(e) => { e.stopPropagation(); setTargetStudent(student); setShowCalendarModal(true); }} className="px-3 py-1.5 bg-ocean-50 text-ocean-600 rounded-lg text-xs font-bold hover:bg-ocean-100 flex items-center transition-colors"><CalendarCheck size={14} className="mr-1" /> ตารางเรียน</button></div></td>
                                                    <td className="p-5">{student.evaluation === 'PENDING' ? (<div className="flex gap-2"><button type="button" onClick={(e) => { e.preventDefault(); e.stopPropagation(); setEvaluationTarget({ enrollmentId: student.id, result: 'PASS', userId: student.userId, studentName: student.studentName }); }} className="px-3 py-1 bg-green-50 text-green-600 rounded-lg text-xs font-bold border border-green-200 hover:bg-green-100">ผ่าน</button><button type="button" onClick={(e) => { e.preventDefault(); e.stopPropagation(); setEvaluationTarget({ enrollmentId: student.id, result: 'FAIL', userId: student.userId, studentName: student.studentName }); }} className="px-3 py-1 bg-red-50 text-red-600 rounded-lg text-xs font-bold border border-red-200 hover:bg-red-100">ไม่ผ่าน</button></div>) : (<span className={`text-sm font-bold ${student.evaluation === 'PASS' ? 'text-green-600' : 'text-red-600'}`}>{student.evaluation === 'PASS' ? 'ผ่านแล้ว' : 'ไม่ผ่าน'}</span>)}</td>
                                                </tr>
                                            );
                                        })}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    </div>
                )}
                </>
            )}

            {activeTab === 'leaves' && (
                <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden animate-fade-in relative">
                    <div className="p-6 border-b border-slate-100">
                        <h3 className="font-bold text-xl text-slate-800 flex items-center"><CalendarX className="mr-2 text-ocean-600"/> คำขอลาหยุด ({leaveRequests.filter(r => r.status === 'PENDING').length} รายการรอ)</h3>
                    </div>
                    <div className="overflow-x-auto">
                        <table className="w-full text-left">
                            <thead className="bg-slate-50 text-slate-600 uppercase text-sm font-bold border-b border-slate-200"><tr><th className="p-5">วันที่แจ้ง</th><th className="p-5">นักเรียน</th><th className="p-5">คอร์ส</th><th className="p-5">วันที่ลา</th><th className="p-5">เหตุผล</th><th className="p-5">สถานะ</th><th className="p-5 text-right">จัดการ</th></tr></thead>
                            <tbody className="divide-y divide-slate-100">
                                {leaveRequests.map(req => (
                                    <tr key={req.id} className="hover:bg-slate-50 transition-colors">
                                        <td className="p-5 text-sm text-slate-500">{new Date(req.createdAt).toLocaleDateString('th-TH')}</td>
                                        <td className="p-5 font-bold text-slate-800">{req.studentName}</td>
                                        <td className="p-5 text-slate-700">{req.courseName}</td>
                                        <td className="p-5 font-bold text-orange-600">{new Date(req.leaveDate).toLocaleDateString('th-TH')}</td>
                                        <td className="p-5 text-sm text-slate-600 max-w-xs truncate">{req.reason}</td>
                                        <td className="p-5"><span className={`px-3 py-1 rounded-full text-xs font-bold ${req.status === 'APPROVED' ? 'bg-green-100 text-green-700' : req.status === 'REJECTED' ? 'bg-red-100 text-red-700' : 'bg-yellow-100 text-yellow-700'}`}>{req.status}</span></td>
                                        <td className="p-5 text-right">
                                            {req.status === 'PENDING' && (
                                                <div className="flex justify-end gap-2">
                                                    <button onClick={() => setLeaveActionTarget({ request: req, action: 'APPROVED' })} className="bg-green-100 text-green-700 px-3 py-1 rounded-lg text-xs font-bold hover:bg-green-200">อนุมัติ</button>
                                                    <button onClick={() => setLeaveActionTarget({ request: req, action: 'REJECTED' })} className="bg-red-100 text-red-700 px-3 py-1 rounded-lg text-xs font-bold hover:bg-red-200">ปฏิเสธ</button>
                                                </div>
                                            )}
                                        </td>
                                    </tr>
                                ))}
                                {leaveRequests.length === 0 && <tr><td colSpan={7} className="p-12 text-center text-slate-400">ไม่มีคำขอลาหยุด</td></tr>}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}
           </div>
      )}

      {/* --- STUDENT VIEW --- */}
      {user.role === UserRole.STUDENT && (
         <div className="max-w-[1600px] mx-auto px-6 py-12">
            <h1 className="text-4xl font-bold text-slate-800 mb-10">ยินดีต้อนรับ, {user.displayName}</h1>
            <div className="flex space-x-2 md:space-x-4 border-b border-slate-200 mb-10 overflow-x-auto pb-1 scrollbar-hide"><TabButton id="overview" label="ภาพรวม" /><TabButton id="schedule" label="ตารางเรียน" /><TabButton id="history" label="ประวัติการชำระเงิน" icon={History} /><TabButton id="leaves" label="แจ้งลาหยุด" icon={CalendarX} /></div>
            
            {activeTab === 'overview' && (
                <div className="animate-fade-in space-y-8">
                     <div className="bg-gradient-to-r from-ocean-500 to-ocean-600 rounded-3xl p-8 md:p-10 text-white shadow-lg flex flex-col md:flex-row items-center justify-between"><div className="mb-6 md:mb-0"><h2 className="text-3xl font-bold mb-2">สวัสดี, {user.displayName}! 👋</h2><p className="opacity-90 text-lg">พร้อมสำหรับการฝึกซ้อมในวันนี้หรือยัง?</p></div><Link to="/courses"><button className="px-8 py-3 bg-white text-ocean-600 rounded-full font-bold shadow-md hover:bg-ocean-50 transition-colors">ดูคอร์สเรียนทั้งหมด</button></Link></div>
                     
                     {/* My Courses */}
                     <h3 className="text-2xl font-bold text-slate-800 mt-8">คอร์สเรียนของฉัน</h3>
                     <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                         {activeEnrollments.map(en => {
                             const course = courses.find(c => c.id === en.courseId);
                             const totalSessions = course?.sessions || 20;
                             const attended = en.attendance ? en.attendance.length : 0;
                             return (
                                 <div key={en.id} className="bg-white rounded-3xl p-8 shadow-sm border border-slate-100 relative overflow-hidden">
                                     <div className="absolute top-6 right-6">{en.evaluation === 'PASS' ? <span className="bg-green-100 text-green-700 px-3 py-1 rounded-full text-xs font-bold flex items-center"><Award size={14} className="mr-1"/> จบหลักสูตร</span> : <span className="bg-ocean-100 text-ocean-700 px-3 py-1 rounded-full text-xs font-bold">กำลังเรียน</span>}</div>
                                     <h4 className="font-bold text-xl text-slate-800 pr-20">{course?.title}</h4><p className="text-slate-500 text-sm mt-1 mb-6">เริ่มเรียน: {new Date(en.startDate).toLocaleDateString('th-TH')}</p>
                                     <div className="space-y-6"><div><div className="flex justify-between text-sm mb-2"><span className="text-slate-600 flex items-center"><CheckCircle size={16} className="mr-2 text-ocean-500" /> จำนวนครั้งที่เรียน</span><span className="font-bold text-slate-800">{attended} / {totalSessions}</span></div><div className="w-full bg-slate-100 rounded-full h-3"><div className="bg-ocean-500 h-3 rounded-full transition-all duration-1000" style={{ width: `${Math.min((attended / totalSessions) * 100, 100)}%` }}></div></div></div></div>
                                 </div>
                             );
                         })}
                     </div>
                </div>
            )}
            
            {activeTab === 'schedule' && renderCalendar()}
            {activeTab === 'history' && (
                <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden animate-fade-in"><div className="p-6 border-b border-slate-100"><h3 className="font-bold text-xl text-slate-800 flex items-center"><History className="mr-2 text-ocean-600" /> ประวัติการชำระเงิน ({enrollments.length})</h3></div>
                <div className="overflow-x-auto"><table className="w-full text-left"><thead className="bg-slate-50 text-slate-600 uppercase text-sm font-bold border-b border-slate-200"><tr><th className="p-5">วันที่ชำระ</th><th className="p-5">คอร์สเรียน</th><th className="p-5">ราคา</th><th className="p-5">สถานะ</th><th className="p-5 text-right">หลักฐาน</th></tr></thead><tbody className="divide-y divide-slate-100">{enrollments.map(en => (<tr key={en.id} className="hover:bg-slate-50 transition-colors"><td className="p-5 text-slate-600">{new Date(en.createdAt).toLocaleDateString('th-TH')}</td><td className="p-5 font-bold text-slate-800">{courses.find(c => c.id === en.courseId)?.title}</td><td className="p-5 text-ocean-600 font-bold">฿{courses.find(c => c.id === en.courseId)?.price.toLocaleString()}</td><td className="p-5"><span className={`px-3 py-1 rounded-full text-xs font-bold ${en.paymentStatus === 'PAID' ? 'bg-green-100 text-green-700' : en.paymentStatus === 'REJECTED' ? 'bg-red-100 text-red-700' : 'bg-yellow-100 text-yellow-700'}`}>{en.paymentStatus}</span></td><td className="p-5 text-right"><button onClick={() => setSelectedSlip(en.slipUrl)} className="flex items-center ml-auto text-sm text-slate-500 hover:text-ocean-600 font-medium transition-colors"><FileText className="w-4 h-4 mr-1" /> ดูสลิป</button></td></tr>))}</tbody></table></div></div>
            )}
            {activeTab === 'leaves' && (
                <div className="space-y-8 animate-fade-in"><div className="flex justify-between items-center"><h3 className="font-bold text-xl text-slate-800 flex items-center"><CalendarX className="mr-2 text-ocean-600" /> การแจ้งลาหยุด</h3><button onClick={() => setShowLeaveModal(true)} className="bg-ocean-600 text-white px-5 py-2.5 rounded-xl font-bold shadow-md hover:bg-ocean-700 transition-colors flex items-center"><CalendarX className="w-5 h-5 mr-2" /> แจ้งลาหยุด</button></div>
                <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden"><div className="overflow-x-auto"><table className="w-full text-left"><thead className="bg-slate-50 text-slate-600 uppercase text-sm font-bold border-b border-slate-200"><tr><th className="p-5">วันที่แจ้ง</th><th className="p-5">คอร์สเรียน</th><th className="p-5">วันที่ลา</th><th className="p-5">เหตุผล</th><th className="p-5 text-right">สถานะ</th></tr></thead><tbody className="divide-y divide-slate-100">{leaveRequests.map(req => (<tr key={req.id} className="hover:bg-slate-50 transition-colors"><td className="p-5 text-slate-500 text-sm">{new Date(req.createdAt).toLocaleDateString('th-TH')}</td><td className="p-5 font-bold text-slate-800">{req.courseName}</td><td className="p-5 font-medium text-orange-600">{new Date(req.leaveDate).toLocaleDateString('th-TH')}</td><td className="p-5 text-slate-600 text-sm">{req.reason}</td><td className="p-5 text-right"><span className={`px-3 py-1 rounded-full text-xs font-bold ${req.status === 'APPROVED' ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'}`}>{req.status}</span></td></tr>))}</tbody></table></div></div></div>
            )}
         </div>
      )}

      {/* --- ALL MODALS --- */}

      {/* 1. View Slip Modal */}
      {selectedSlip && (
            <div className="fixed inset-0 z-[100] bg-black/90 backdrop-blur-sm flex items-center justify-center p-4 animate-fade-in" onClick={() => setSelectedSlip(null)}>
                <button type="button" className="absolute top-6 right-6 text-white hover:text-red-500 transition-colors"><XCircle size={40} /></button>
                <img src={selectedSlip} alt="Full Slip" className="max-w-full max-h-[90vh] rounded-lg shadow-2xl" onClick={(e) => e.stopPropagation()} />
            </div>
      )}

      {/* 2. Broadcast Input Modal */}
      {showBroadcastModal && (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
                <div className="bg-white rounded-[2rem] max-w-lg w-full p-8 shadow-2xl relative">
                    <button onClick={() => setShowBroadcastModal(false)} className="absolute top-6 right-6 p-2 rounded-full hover:bg-slate-100 text-slate-400 hover:text-slate-600 transition"><X size={24} /></button>
                    <h3 className="text-2xl font-bold text-slate-800 mb-6 text-center flex items-center justify-center"><Megaphone className="mr-2 text-ocean-600"/> ประกาศข่าวสาร</h3>
                    <div className="space-y-4">
                        <div><label className="block text-sm font-bold text-slate-700 mb-1">หัวข้อประกาศ</label><input value={broadcastForm.title} onChange={e => setBroadcastForm({...broadcastForm, title: e.target.value})} placeholder="หัวข้อ" className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-ocean-500 outline-none" /></div>
                        <div><label className="block text-sm font-bold text-slate-700 mb-1">ข้อความ</label><textarea rows={4} value={broadcastForm.message} onChange={e => setBroadcastForm({...broadcastForm, message: e.target.value})} placeholder="รายละเอียด..." className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-ocean-500 outline-none" /></div>
                        <div><label className="block text-sm font-bold text-slate-700 mb-2">ส่งถึงใคร?</label><div className="flex gap-4"><label className="flex items-center cursor-pointer"><input type="radio" checked={broadcastForm.target === 'ALL'} onChange={() => setBroadcastForm({...broadcastForm, target: 'ALL'})} className="mr-2 text-ocean-600 focus:ring-ocean-500" /> ทุกคน</label><label className="flex items-center cursor-pointer"><input type="radio" checked={broadcastForm.target === 'STUDENT'} onChange={() => setBroadcastForm({...broadcastForm, target: 'STUDENT'})} className="mr-2 text-ocean-600 focus:ring-ocean-500" /> นักเรียน</label><label className="flex items-center cursor-pointer"><input type="radio" checked={broadcastForm.target === 'INSTRUCTOR'} onChange={() => setBroadcastForm({...broadcastForm, target: 'INSTRUCTOR'})} className="mr-2 text-ocean-600 focus:ring-ocean-500" /> ครูผู้สอน</label></div></div>
                        <button onClick={() => setShowBroadcastConfirm(true)} className="w-full py-3 bg-ocean-600 text-white font-bold rounded-xl hover:bg-ocean-700 transition-colors shadow-lg shadow-ocean-500/30 text-lg flex items-center justify-center mt-4">ตรวจสอบก่อนส่ง</button>
                    </div>
                </div>
            </div>
      )}

      {/* 3. Common Confirmation Modal (Used for Delete, Broadcast Confirm, Check-in, Expiry Manual, Role Change, Leave Action) */}
      {(deleteTargetId || showBulkCheckInConfirm || evaluationTarget || showBroadcastConfirm || showExpiryConfirm || roleChangeTarget || leaveActionTarget) && (
          <div className="fixed inset-0 z-[200] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 animate-fade-in">
             <div className="bg-white rounded-3xl p-8 shadow-2xl max-w-sm w-full text-center">
                 {/* Dynamic Content based on State */}
                 {deleteTargetId && (
                     <>
                        <div className="w-20 h-20 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-6 text-red-600"><Trash2 size={40} /></div>
                        <h3 className="text-2xl font-bold text-slate-800 mb-2">ยืนยันการลบ?</h3>
                        <p className="text-slate-500 mb-8">ข้อมูลนี้จะหายไปถาวร</p>
                        <div className="flex gap-4"><button onClick={() => setDeleteTargetId(null)} className="flex-1 py-3 rounded-xl font-bold text-slate-600 bg-slate-100 hover:bg-slate-200">ยกเลิก</button><button onClick={handleDeleteEnrollment} className="flex-1 py-3 rounded-xl font-bold text-white bg-red-600 hover:bg-red-700 shadow-lg">ลบทันที</button></div>
                     </>
                 )}
                 {showBulkCheckInConfirm && (
                     <>
                        <div className="w-20 h-20 bg-ocean-100 rounded-full flex items-center justify-center mx-auto mb-6 text-ocean-600"><CalendarCheck size={40} /></div>
                        <h3 className="text-2xl font-bold text-slate-800 mb-2">เช็คชื่อ {selectedStudentIds.length} คน?</h3>
                        <div className="flex gap-4 mt-8"><button onClick={() => setShowBulkCheckInConfirm(false)} className="flex-1 py-3 rounded-xl font-bold text-slate-600 bg-slate-100 hover:bg-slate-200">ยกเลิก</button><button onClick={handleBulkCheckIn} className="flex-1 py-3 rounded-xl font-bold text-white bg-ocean-600 hover:bg-ocean-700 shadow-lg">ยืนยัน</button></div>
                     </>
                 )}
                 {evaluationTarget && (
                     <>
                         <div className={`w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-6 ${evaluationTarget.result === 'PASS' ? 'bg-green-100 text-green-600' : 'bg-red-100 text-red-600'}`}>{evaluationTarget.result === 'PASS' ? <Award size={40} /> : <XCircle size={40} />}</div>
                         <h3 className="text-2xl font-bold text-slate-800 mb-2">ยืนยันผล: {evaluationTarget.result === 'PASS' ? 'ผ่าน' : 'ไม่ผ่าน'}?</h3>
                         <p className="text-slate-500 mb-6">{evaluationTarget.studentName}</p>
                         <div className="flex gap-4"><button onClick={() => setEvaluationTarget(null)} className="flex-1 py-3 rounded-xl font-bold text-slate-600 bg-slate-100 hover:bg-slate-200">ยกเลิก</button><button onClick={handleEvaluation} className={`flex-1 py-3 rounded-xl font-bold text-white shadow-lg ${evaluationTarget.result === 'PASS' ? 'bg-green-600 hover:bg-green-700' : 'bg-red-600 hover:bg-red-700'}`}>ยืนยัน</button></div>
                     </>
                 )}
                 {showBroadcastConfirm && (
                     <>
                         <div className="w-20 h-20 bg-ocean-100 rounded-full flex items-center justify-center mx-auto mb-6 text-ocean-600"><Megaphone size={40} /></div>
                         <h3 className="text-2xl font-bold text-slate-800 mb-2">ยืนยันการส่งประกาศ?</h3>
                         <p className="text-slate-500 mb-6">ไปยังกลุ่ม: {broadcastForm.target}</p>
                         <div className="flex gap-4"><button onClick={() => setShowBroadcastConfirm(false)} className="flex-1 py-3 rounded-xl font-bold text-slate-600 bg-slate-100 hover:bg-slate-200">แก้ไข</button><button onClick={handleBroadcast} disabled={broadcasting} className="flex-1 py-3 rounded-xl font-bold text-white bg-ocean-600 hover:bg-ocean-700 shadow-lg">{broadcasting ? 'กำลังส่ง...' : 'ส่งทันที'}</button></div>
                     </>
                 )}
                 {showExpiryConfirm && (
                     <>
                         <div className="w-20 h-20 bg-orange-100 rounded-full flex items-center justify-center mx-auto mb-6 text-orange-600"><Bell size={40} /></div>
                         <h3 className="text-2xl font-bold text-slate-800 mb-2">ส่งแจ้งเตือนหมดอายุ?</h3>
                         <p className="text-slate-500 mb-6">ระบบจะส่งถึงทุกคนที่เหลือเวลาน้อยกว่า 30 วัน</p>
                         <div className="flex gap-4"><button onClick={() => setShowExpiryConfirm(false)} className="flex-1 py-3 rounded-xl font-bold text-slate-600 bg-slate-100 hover:bg-slate-200">ยกเลิก</button><button onClick={checkExpiringStudents} className="flex-1 py-3 rounded-xl font-bold text-white bg-orange-600 hover:bg-orange-700 shadow-lg">ยืนยัน</button></div>
                     </>
                 )}
                 {roleChangeTarget && (
                     <>
                         <div className="w-20 h-20 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-6 text-blue-600"><UserCheck size={40} /></div>
                         <h3 className="text-2xl font-bold text-slate-800 mb-2">เปลี่ยนบทบาท?</h3>
                         <p className="text-slate-500 mb-6">{roleChangeTarget.currentRole} {'->'} <span className="font-bold text-slate-800">{roleChangeTarget.newRole}</span></p>
                         <div className="flex gap-4"><button onClick={() => setRoleChangeTarget(null)} className="flex-1 py-3 rounded-xl font-bold text-slate-600 bg-slate-100 hover:bg-slate-200">ยกเลิก</button><button onClick={handleChangeRole} className="flex-1 py-3 rounded-xl font-bold text-white bg-blue-600 hover:bg-blue-700 shadow-lg">ยืนยัน</button></div>
                     </>
                 )}
                 {leaveActionTarget && (
                     <>
                         <div className={`w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-6 ${leaveActionTarget.action === 'APPROVED' ? 'bg-green-100 text-green-600' : 'bg-red-100 text-red-600'}`}>{leaveActionTarget.action === 'APPROVED' ? <CheckCircle size={40} /> : <XCircle size={40} />}</div>
                         <h3 className="text-2xl font-bold text-slate-800 mb-2">{leaveActionTarget.action === 'APPROVED' ? 'อนุมัติ' : 'ปฏิเสธ'}การลา?</h3>
                         <p className="text-slate-500 mb-6">{leaveActionTarget.request.studentName}</p>
                         <div className="flex gap-4"><button onClick={() => setLeaveActionTarget(null)} className="flex-1 py-3 rounded-xl font-bold text-slate-600 bg-slate-100 hover:bg-slate-200">ยกเลิก</button><button onClick={handleLeaveAction} className={`flex-1 py-3 rounded-xl font-bold text-white shadow-lg ${leaveActionTarget.action === 'APPROVED' ? 'bg-green-600 hover:bg-green-700' : 'bg-red-600 hover:bg-red-700'}`}>ยืนยัน</button></div>
                     </>
                 )}
             </div>
          </div>
      )}

      {/* 4. Student Review Modal (Auto Pop-up) */}
      {reviewTarget && (
          <div className="fixed inset-0 z-[200] bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 animate-fade-in">
             <div className="bg-white rounded-[2rem] max-w-lg w-full p-8 shadow-2xl relative">
                 <div className="text-center mb-6">
                    <div className="w-20 h-20 bg-yellow-100 rounded-full flex items-center justify-center mx-auto mb-4 text-yellow-500 animate-bounce"><Star size={40} fill="currentColor"/></div>
                    <h2 className="text-2xl font-bold text-slate-800">ยินดีด้วย! คุณเรียนจบแล้ว 🎉</h2>
                    <p className="text-slate-500 mt-2">ให้คะแนนคอร์สเรียนของคุณเพื่อเป็นกำลังใจให้เรา</p>
                 </div>
                 <form onSubmit={handleReviewSubmit} className="space-y-6">
                     <div className="flex justify-center gap-2">
                        {[1, 2, 3, 4, 5].map(star => (
                            <button key={star} type="button" onClick={() => setReviewForm({...reviewForm, rating: star})} className="transition-transform hover:scale-110 focus:outline-none">
                                <Star size={40} className={star <= reviewForm.rating ? "text-yellow-400 fill-yellow-400" : "text-slate-300"} />
                            </button>
                        ))}
                     </div>
                     <textarea required rows={3} placeholder="เขียนความประทับใจ..." value={reviewForm.comment} onChange={e => setReviewForm({...reviewForm, comment: e.target.value})} className="w-full p-4 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-yellow-400 outline-none resize-none"></textarea>
                     <button type="submit" className="w-full py-3 bg-yellow-500 text-white font-bold rounded-xl hover:bg-yellow-600 shadow-lg shadow-yellow-200 transition-colors">ส่งรีวิว</button>
                 </form>
             </div>
          </div>
      )}

      {/* 5. Notification Modal (Auto Pop-up) */}
      {showNotificationModal && activeNotifications.length > 0 && (
          <div className="fixed inset-0 z-[200] bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 animate-fade-in">
             <div className="bg-white rounded-[2rem] max-w-lg w-full p-8 shadow-2xl relative">
                 <div className="flex items-center justify-between mb-6 border-b border-slate-100 pb-4">
                     <h3 className="text-xl font-bold text-slate-800 flex items-center"><Bell className="mr-2 text-ocean-600"/> การแจ้งเตือนใหม่ ({activeNotifications.length})</h3>
                     <button onClick={handleCloseNotifications} className="p-2 rounded-full hover:bg-slate-100"><X size={20}/></button>
                 </div>
                 <div className="space-y-4 max-h-[60vh] overflow-y-auto">
                     {activeNotifications.map(n => (
                         <div key={n.id} className="bg-slate-50 p-4 rounded-xl border border-slate-200">
                             <div className="flex justify-between items-start mb-1">
                                 <h4 className="font-bold text-slate-900">{n.title}</h4>
                                 <span className="text-[10px] text-slate-400">{new Date(n.date).toLocaleDateString('th-TH')}</span>
                             </div>
                             <p className="text-sm text-slate-600">{n.message}</p>
                         </div>
                     ))}
                 </div>
                 <button onClick={handleCloseNotifications} className="w-full mt-6 py-3 bg-ocean-600 text-white font-bold rounded-xl hover:bg-ocean-700">รับทราบ</button>
             </div>
          </div>
      )}

      {/* 6. Expiry Alert Modal (Auto Pop-up for Student) */}
      {showExpiryAlertModal && (
          <div className="fixed inset-0 z-[200] bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 animate-fade-in">
              <div className="bg-white rounded-3xl p-8 shadow-2xl max-w-sm w-full text-center">
                   <div className="w-20 h-20 bg-orange-100 rounded-full flex items-center justify-center mx-auto mb-6 text-orange-600 animate-pulse"><Clock size={40} /></div>
                   <h3 className="text-2xl font-bold text-slate-800 mb-2">คอร์สใกล้หมดอายุ!</h3>
                   <p className="text-slate-600 mb-2 font-bold">{showExpiryAlertModal.courseName}</p>
                   <p className="text-slate-500 mb-8">เหลือเวลาเรียนอีก <span className="text-orange-600 font-bold text-xl">{showExpiryAlertModal.daysLeft}</span> วัน</p>
                   <button onClick={() => setShowExpiryAlertModal(null)} className="w-full py-3 bg-ocean-600 text-white font-bold rounded-xl hover:bg-ocean-700 shadow-lg">เข้าใจแล้ว</button>
              </div>
          </div>
      )}

      {/* Leave Request Modal (For Student) */}
      {showLeaveModal && (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
                <div className="bg-white rounded-[2rem] max-w-lg w-full p-8 shadow-2xl relative">
                    <button onClick={() => setShowLeaveModal(false)} className="absolute top-6 right-6 p-2 rounded-full hover:bg-slate-100 text-slate-400 hover:text-slate-600 transition"><X size={24} /></button>
                    <h3 className="text-2xl font-bold text-slate-800 mb-6 text-center flex items-center justify-center"><CalendarX className="mr-2 text-ocean-600"/> แจ้งลาหยุด</h3>
                    <form onSubmit={(e) => {
                        e.preventDefault();
                        if(!leaveForm.enrollmentId || !leaveForm.date) { alert("กรุณากรอกข้อมูลให้ครบ"); return; }
                        setSubmittingLeave(true);
                        const selectedEnrollment = enrollments.find(en => en.id === leaveForm.enrollmentId);
                        const course = courses.find(c => c.id === selectedEnrollment?.courseId);
                        addDoc(collection(db, "leave_requests"), {
                            userId: user.uid, studentName: user.displayName, enrollmentId: leaveForm.enrollmentId,
                            courseName: course?.title || 'Unknown', leaveDate: leaveForm.date, reason: leaveForm.reason,
                            status: 'PENDING', createdAt: new Date().toISOString()
                        }).then(() => { alert("ส่งคำขอเรียบร้อย"); setShowLeaveModal(false); setLeaveForm({enrollmentId: '', date: '', reason: ''}); })
                        .catch(() => alert("เกิดข้อผิดพลาด"))
                        .finally(() => setSubmittingLeave(false));
                    }} className="space-y-4">
                        <div><label className="block text-sm font-bold text-slate-700 mb-1">เลือกคอร์สเรียน</label><select required value={leaveForm.enrollmentId} onChange={e => setLeaveForm({...leaveForm, enrollmentId: e.target.value})} className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-ocean-500 outline-none"><option value="">-- เลือกคอร์ส --</option>{enrollments.filter(e => e.paymentStatus === 'PAID').map(en => (<option key={en.id} value={en.id}>{courses.find(c => c.id === en.courseId)?.title}</option>))}</select></div>
                        <div><label className="block text-sm font-bold text-slate-700 mb-1">วันที่ต้องการลา</label><input type="date" required value={leaveForm.date} onChange={e => setLeaveForm({...leaveForm, date: e.target.value})} className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-ocean-500 outline-none" /></div>
                        <div><label className="block text-sm font-bold text-slate-700 mb-1">เหตุผล</label><textarea required rows={3} placeholder="เช่น ติดธุระ, ไม่สบาย" value={leaveForm.reason} onChange={e => setLeaveForm({...leaveForm, reason: e.target.value})} className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-ocean-500 outline-none" /></div>
                        <button type="submit" disabled={submittingLeave} className="w-full py-3 bg-ocean-600 text-white font-bold rounded-xl hover:bg-ocean-700 transition-colors shadow-lg shadow-ocean-500/30 text-lg flex items-center justify-center mt-4">{submittingLeave ? <Loader2 className="animate-spin mr-2"/> : <Send className="mr-2 size={20}"/>}{submittingLeave ? 'กำลังส่ง...' : 'ส่งคำขอ'}</button>
                    </form>
                </div>
            </div>
      )}
      
      {/* Profile & Calendar Modal (Shared) */}
      {showProfileModal && targetStudent && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
              <div className="bg-white rounded-[2rem] max-w-2xl w-full p-8 shadow-2xl relative max-h-[90vh] overflow-y-auto">
                  <button onClick={() => setShowProfileModal(false)} className="absolute top-6 right-6 p-2 rounded-full hover:bg-slate-100 text-slate-400 hover:text-slate-600 transition"><X size={24} /></button>
                  <h3 className="text-2xl font-bold text-slate-800 mb-6 flex items-center border-b border-slate-100 pb-4"><User className="mr-3 text-ocean-600 h-8 w-8" /> ประวัติผู้เรียน: {targetStudent.studentName}</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-slate-700">
                        <div className="space-y-4"><div><label className="text-xs font-bold text-slate-400 uppercase">ชื่อ-นามสกุล</label><div className="text-lg font-semibold">{targetStudent.studentName}</div></div><div><label className="text-xs font-bold text-slate-400 uppercase">รหัสนักเรียน</label><div className="text-lg font-mono text-ocean-600 font-bold">{targetStudent.studentId || '-'}</div></div><div><label className="text-xs font-bold text-slate-400 uppercase">เพศ</label><div className="text-lg">{targetStudent.gender}</div></div><div className="grid grid-cols-2 gap-4"><div><label className="text-xs font-bold text-slate-400 uppercase">อายุ</label><div className="text-lg">{targetStudent.age} ปี</div></div><div><label className="text-xs font-bold text-slate-400 uppercase">เบอร์โทร</label><div className="text-lg">{targetStudent.phone}</div></div></div><div className="grid grid-cols-2 gap-4"><div><label className="text-xs font-bold text-slate-400 uppercase">น้ำหนัก</label><div className="text-lg">{targetStudent.weight} กก.</div></div><div><label className="text-xs font-bold text-slate-400 uppercase">ส่วนสูง</label><div className="text-lg">{targetStudent.height} ซม.</div></div></div></div>
                        <div className="space-y-4"><div><label className="text-xs font-bold text-slate-400 uppercase">โรงเรียน</label><div className="flex items-center text-lg"><School className="w-4 h-4 mr-2 text-ocean-500" /> {targetStudent.school || '-'}</div></div><div className="bg-red-50 p-4 rounded-xl border border-red-100"><label className="text-xs font-bold text-red-400 uppercase mb-1 block">ข้อมูลสุขภาพ</label><div className="flex items-start mb-2"><Activity className="w-4 h-4 mr-2 text-red-500 mt-1 flex-shrink-0" /><div><span className="font-bold text-sm text-red-700">โรคประจำตัว:</span><div className="text-red-900">{targetStudent.disease || 'ไม่มี'}</div></div></div><div className="flex items-start"><Activity className="w-4 h-4 mr-2 text-red-500 mt-1 flex-shrink-0" /><div><span className="font-bold text-sm text-red-700">สมาธิสั้น (ADHD):</span><div className="text-red-900">{targetStudent.adhdCondition ? 'มี' : 'ไม่มี'}</div></div></div></div><div className="bg-ocean-50 p-4 rounded-xl border border-ocean-100"><label className="text-xs font-bold text-ocean-400 uppercase mb-1 block">ข้อมูลคอร์ส</label><div><span className="font-bold text-sm text-ocean-700">เริ่มเรียน:</span><div className="text-ocean-900">{new Date(targetStudent.startDate).toLocaleDateString('th-TH')}</div></div></div></div>
                  </div>
              </div>
          </div>
      )}
      {showCalendarModal && targetStudent && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
              <div className="bg-white rounded-[2rem] max-w-4xl w-full p-8 shadow-2xl relative max-h-[90vh] overflow-y-auto">
                  <button onClick={() => setShowCalendarModal(false)} className="absolute top-6 right-6 p-2 rounded-full hover:bg-slate-100 text-slate-400 hover:text-slate-600 transition"><X size={24} /></button>
                  <div className="mb-6"><h2 className="text-2xl font-bold text-slate-800">ตารางเรียน: {targetStudent.studentName}</h2><p className="text-slate-500">ประวัติการเข้าเรียนทั้งหมด</p></div>
                  {renderCalendar([targetStudent])}
              </div>
          </div>
      )}
    </div>
  );
}