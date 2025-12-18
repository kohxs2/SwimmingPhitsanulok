import React, { useState } from 'react';
import { HelpCircle, ChevronDown, ChevronUp } from 'lucide-react';

const FAQ: React.FC = () => {
  const [openIndex, setOpenIndex] = useState<number | null>(null);

  const faqs = [
    {
      q: "ครูฟลุ๊คสอนที่ไหน?",
      a: "สอนที่สระว่ายน้ำ (Location Placeholder) พิษณุโลก ครับ สระเป็นระบบเกลือ มาตรฐาน ปลอดภัย สะอาด และดูแลคุณภาพน้ำอย่างสม่ำเสมอ"
    },
    {
      q: "คอร์สเริ่มต้นเหมาะกับใคร?",
      a: "เหมาะสำหรับผู้ที่ว่ายน้ำไม่เป็นเลย หรือมีความกลัวน้ำ เราจะเริ่มสอนตั้งแต่การสร้างความคุ้นเคย การหายใจ และการลอยตัว จนสามารถว่ายท่าพื้นฐานได้"
    },
    {
      q: "เด็กอายุเท่าไหร่ถึงจะเรียนได้?",
      a: "เรารับสอนตั้งแต่อายุ 4 ขวบขึ้นไปสำหรับคอร์สปกติ และมีคอร์ส Baby Swimming สำหรับเด็กเล็ก (สอบถามเพิ่มเติมได้ครับ)"
    },
    {
      q: "ต้องเตรียมอะไรไปเรียนบ้าง?",
      a: "สิ่งที่ต้องเตรียมคือ ชุดว่ายน้ำ แว่นตาว่ายน้ำ และหมวกว่ายน้ำ ผ้าเช็ดตัว และอุปกรณ์อาบน้ำส่วนตัวครับ"
    },
    {
      q: "สามารถเปลี่ยนวันเรียนได้หรือไม่?",
      a: "สามารถแจ้งลาหรือขอเปลี่ยนวันเรียนล่วงหน้าได้ครับ โดยทางเราจะไม่มีการตัดชั่วโมงเรียนหากมีการแจ้งล่วงหน้าอย่างถูกต้อง"
    },
    {
      q: "มีระบบประเมินผลอย่างไร?",
      a: "เรามีการประเมินผลอย่างต่อเนื่อง และมีการสอบวัดระดับเมื่อจบคอร์ส เพื่อดูพัฒนาการและออกใบรับรอง (ถ้ามี) หรือแนะนำระดับถัดไป"
    },
    {
      q: "สามารถขอคืนเงินได้หรือไม่?",
      a: "ขอสงวนสิทธิ์ในการคืนเงินทุกกรณีหลังจากสมัครและชำระเงินแล้ว แต่สามารถเก็บชั่วโมงเรียนไว้ได้ตามระยะเวลาที่กำหนดครับ"
    },
    {
      q: "มีคอร์สส่วนตัว (Private) หรือไม่?",
      a: "มีครับ เรามีคอร์สเรียนตัวต่อตัว (Private) หรือเรียนกลุ่มเล็ก (Semi-Private) สำหรับผู้ที่ต้องการความเป็นส่วนตัวหรือต้องการเน้นทักษะเฉพาะจุด"
    }
  ];

  const toggleFAQ = (index: number) => {
    setOpenIndex(openIndex === index ? null : index);
  };

  return (
    <div className="min-h-screen bg-slate-50 py-12 px-4 sm:px-6">
      <div className="max-w-7xl mx-auto">
        
        {/* Banner Section */}
        <div className="bg-gradient-to-r from-ocean-500 to-ocean-400 rounded-2xl p-6 md:p-8 text-white shadow-lg mb-8 relative overflow-hidden flex flex-col md:flex-row items-center justify-between">
            <div className="relative z-10">
                <div className="flex items-center mb-2">
                    <div className="bg-white/20 p-2 rounded-xl mr-3 backdrop-blur-sm">
                        <HelpCircle className="w-6 h-6 md:w-8 md:h-8 text-white" />
                    </div>
                    {/* Header font size matches Registration/Courses pages as requested */}
                    <h1 className="text-2xl md:text-4xl font-bold">คำถามที่พบบ่อย</h1>
                </div>
                <p className="text-ocean-50 text-base md:text-lg font-light opacity-90 max-w-2xl pl-1">
                    คำตอบสำหรับคำถามทั่วไปเกี่ยวกับคอร์สว่ายน้ำของเรา
                </p>
            </div>
            <div className="mt-4 md:mt-0 relative z-10 hidden md:block">
                <HelpCircle className="w-24 h-24 opacity-20 transform rotate-12" />
            </div>
            {/* Decor Circles */}
            <div className="absolute top-0 right-0 w-48 h-48 bg-white opacity-5 rounded-full transform translate-x-1/2 -translate-y-1/2"></div>
            <div className="absolute bottom-0 left-0 w-32 h-32 bg-white opacity-5 rounded-full transform -translate-x-1/2 translate-y-1/2"></div>
        </div>
        
        {/* Accordion List */}
        <div className="space-y-4">
          {faqs.map((item, index) => (
            <div key={index} className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden hover:shadow-md transition-shadow">
               <button 
                 onClick={() => toggleFAQ(index)}
                 className="w-full flex items-center justify-between p-6 text-left focus:outline-none hover:bg-slate-50 transition-colors"
               >
                 <span className="font-bold text-lg text-slate-800 flex items-center">
                    <span className={`w-8 h-8 rounded-full flex items-center justify-center mr-4 text-sm font-bold flex-shrink-0 transition-colors ${openIndex === index ? 'bg-ocean-500 text-white' : 'bg-ocean-50 text-ocean-600'}`}>Q</span>
                    {item.q}
                 </span>
                 {openIndex === index ? <ChevronUp className="text-ocean-500" /> : <ChevronDown className="text-slate-400" />}
               </button>
               
               {openIndex === index && (
                 <div className="px-6 pb-6 pt-0 animate-fade-in bg-slate-50/50 border-t border-slate-50">
                    <div className="pt-4 pl-12">
                        <p className="text-slate-600 text-lg leading-relaxed">{item.a}</p>
                    </div>
                 </div>
               )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default FAQ;