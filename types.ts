export enum UserRole {
  ADMIN = 'ADMIN',
  INSTRUCTOR = 'INSTRUCTOR',
  STUDENT = 'STUDENT'
}

export interface UserProfile {
  uid: string;
  email: string;
  displayName: string;
  photoURL?: string;
  role: UserRole;
  phone?: string;
  address?: string;
  emergencyContact?: string;
}

export interface Course {
  id: string;
  title: string;
  ageGroup: string;
  type: 'Normal' | 'Private' | 'Baby';
  sessions: number; // e.g., 20 hours or 10 times
  price: number;
  timeSlot: string;
  description: string;
  capacity: number;
  enrolled: number;
  imageUrl: string;
  isOpen: boolean;
  terms: string;
  instructorName?: string; // New: Assigned Instructor
  poolLocation?: string;   // New: Assigned Pool
}

export interface Enrollment {
  id: string;
  studentId?: string; // Generated ID (e.g., CA68001)
  userId: string;
  courseId: string;
  studentName: string;
  gender: string;
  age: number;
  weight: string;
  height: string;
  disease?: string;
  adhdCondition: boolean; // สมาธิสั้น
  school: string;
  startDate: string;
  expiryDate?: string | null; // New: Course Expiration Date
  phone: string;
  slipUrl: string;
  paymentStatus: 'PENDING' | 'PAID' | 'REJECTED';
  attendance: string[]; // Array of ISO date strings
  evaluation: 'PASS' | 'FAIL' | 'PENDING';
  assignedInstructorId?: string;
  review?: {
    rating: number;
    comment: string;
    createdAt: string;
  };
  createdAt: string;
}

export interface Notification {
  id: string;
  userId: string; // Recipient
  title: string;
  message: string;
  read: boolean;
  type?: 'PAYMENT' | 'EVALUATION' | 'SYSTEM' | 'EXPIRY';
  date: string;
}

export interface LeaveRequest {
  id: string;
  userId: string;
  studentName: string;
  enrollmentId: string;
  courseName: string;
  leaveDate: string;
  reason: string;
  status: 'PENDING' | 'APPROVED' | 'REJECTED';
  createdAt: string;
}