import { Course } from './types';

export const BANK_INFO = {
  bankName: "ธนาคารไทยพาณิชย์ (SCB)",
  accountName: "นายธีรวัฒน์ กล่ำเจริญ",
  accountNumber: "4403815294",
  promptPayId: "0953457980"
};

export const CONTACT_INFO = {
  phone: "095-345-7980",
  email: "tswimming.25@gmail.com",
  facebookUrl: "https://www.facebook.com/profile.php?id=100068664380516",
  address: "สระว่ายน้ำ (Location Placeholder), พิษณุโลก"
};

export const INITIAL_COURSES: Course[] = [
  {
    id: "course-a",
    title: "Course A (4-6 ขวบ ปกติ)",
    ageGroup: "4-6 ขวบ",
    type: "Normal",
    sessions: 20,
    price: 3000,
    timeSlot: "16:30 น. - 19:00 น.",
    description: "เรียน 20 ครั้ง (ครั้งละ 1 ชั่วโมง) มีสอนทุกวัน เลือกวันเรียนได้ตามสะดวก",
    capacity: 20,
    enrolled: 12,
    // New Image: Course A
    imageUrl: "https://pic.in.th/image/CourseA.jXMt4x", 
    isOpen: true,
    terms: "ไม่มีหักไม่ตัดชั่วโมงเรียนเมื่อน้องป่วย หรือผู้ปกครองไม่สะดวกพามาเรียน",
    instructorName: "ครูฟลุ๊ค"
  },
  {
    id: "course-b",
    title: "Course B (4-6 ขวบ ส่วนตัว)",
    ageGroup: "4-6 ขวบ",
    type: "Private",
    sessions: 10,
    price: 4000,
    timeSlot: "10:00 น. - 20:30 น. (หยุดวันอาทิตย์)",
    description: "เรียน 10 ครั้ง (ครั้งละ 1 ชั่วโมง) เรียนตัวต่อตัว เลือกเวลาเรียนได้",
    capacity: 5,
    enrolled: 2,
    // New Image: Course B
    imageUrl: "https://pic.in.th/image/CourseB.jXMC3y",
    isOpen: true,
    terms: "ไม่มีหักไม่ตัดชั่วโมงเรียนเมื่อน้องป่วย",
    instructorName: "ครูส้ม"
  },
  {
    id: "course-c",
    title: "Course C (7 ปีขึ้นไป ปกติ)",
    ageGroup: "7 ปีขึ้นไป",
    type: "Normal",
    sessions: 20,
    price: 2500,
    timeSlot: "16:30 น. - 19:00 น.",
    description: "เรียน 20 ครั้ง (ครั้งละ 1 ชั่วโมง) เน้นทักษะพื้นฐานถึงขั้นสูง",
    capacity: 25,
    enrolled: 18,
    // New Image: Course C
    imageUrl: "https://pic.in.th/image/CourseC.jXMGUC",
    isOpen: true,
    terms: "ไม่มีหักไม่ตัดชั่วโมงเรียนเมื่อน้องป่วย",
    instructorName: "ครูฟลุ๊ค"
  },
  {
    id: "course-d",
    title: "Course D (7 ปีขึ้นไป ส่วนตัว)",
    ageGroup: "7 ปีขึ้นไป",
    type: "Private",
    sessions: 10,
    price: 3500,
    timeSlot: "10:00 น. - 20:30 น. (หยุดวันอาทิตย์)",
    description: "เรียน 10 ครั้ง (ครั้งละ 1 ชั่วโมง) กลุ่ม 3 คน เน้นการดูแลทั่วถึง",
    capacity: 15,
    enrolled: 5,
    // New Image: Course D
    imageUrl: "https://pic.in.th/image/CourseD.jXMe2H",
    isOpen: true,
    terms: "ไม่มีหักไม่ตัดชั่วโมงเรียนเมื่อน้องป่วย",
    instructorName: "ครูบอล"
  },
  {
    id: "baby-course",
    title: "BABY SWIMMING COURSE",
    ageGroup: "เด็กเล็ก",
    type: "Baby",
    sessions: 10,
    price: 4500,
    timeSlot: "09:00 น. - 15:00 น. (หยุดวันอาทิตย์)",
    description: "เรียน 10 ครั้ง (ครั้งละ 1 ชั่วโมง) สร้างความคุ้นเคยกับน้ำ พัฒนาการตามวัย",
    capacity: 10,
    enrolled: 8,
    // New Image: Baby Course
    imageUrl: "https://pic.in.th/image/CourseBabyswimming.jXM1jh",
    isOpen: true,
    terms: "ไม่มีหักไม่ตัดชั่วโมงเรียนเมื่อน้องป่วย",
    instructorName: "ครูส้ม"
  }
];