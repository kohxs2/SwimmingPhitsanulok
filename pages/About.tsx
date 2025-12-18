import React from 'react';

const About: React.FC = () => {
  return (
    <div className="py-24 bg-white">
      <div className="max-w-7xl mx-auto px-6 sm:px-8 lg:px-10">
        <div className="flex flex-col md:flex-row items-center gap-16">
          <div className="md:w-1/2">
             <img 
               src="https://img5.pic.in.th/file/secure-sv1/33176_0ebeaee98b05003d1.jpg" 
               alt="ครูฟลุ๊ค" 
               className="rounded-3xl shadow-2xl w-full object-cover h-[600px]" 
             />
          </div>
          <div className="md:w-1/2">
            <h1 className="text-5xl font-bold text-ocean-900 mb-8">เกี่ยวกับเรา</h1>
            <h2 className="text-2xl font-bold text-ocean-600 mb-6">เรียนว่ายน้ำพิษณุโลก By ครูฟลุ๊ค</h2>
            <div className="prose text-slate-600 space-y-6 text-lg leading-relaxed">
              <p>
                เป็นศูนย์สอนว่ายน้ำที่มุ่งเน้นการเรียนการสอนอย่างเป็นระบบ โดยมีครูผู้ฝึกสอนที่มีประสบการณ์และใบรับรองมาตรฐาน 
                ครูฟลุ๊คดูแลใกล้ชิดทุกขั้นตอน ตั้งแต่พื้นฐานไปจนถึงเทคนิคการว่ายน้ำขั้นสูง
              </p>
              <p>
                เราใส่ใจทั้งความปลอดภัยและความสนุกสนานเพื่อให้นักเรียนทุกคน—ทั้งเด็กและผู้ใหญ่—มีทักษะการว่ายน้ำที่มั่นใจ
                และปลอดภัยในทุกสถานการณ์
              </p>
              <p>
                ด้วยประสบการณ์การสอนมายาวนาน เราเข้าใจธรรมชาติของผู้เรียนแต่ละคน จึงออกแบบหลักสูตรที่ยืดหยุ่น 
                เข้าใจง่าย และเห็นผลจริง ไม่ว่าเป้าหมายของคุณคือการออกกำลังกาย การแข่งขัน หรือเพื่อความปลอดภัยในชีวิต
              </p>
            </div>
            
            <div className="mt-10 grid grid-cols-2 gap-6">
               <div className="bg-ocean-50 p-6 rounded-2xl">
                  <h4 className="font-bold text-ocean-800 text-xl">วิสัยทัศน์</h4>
                  <p className="text-base text-ocean-600 mt-2">มุ่งสู่การเป็นศูนย์ฝึกว่ายน้ำชั้นนำที่สร้างมาตรฐานความปลอดภัยและทักษะกีฬาให้กับเยาวชน</p>
               </div>
               <div className="bg-ocean-50 p-6 rounded-2xl">
                  <h4 className="font-bold text-ocean-800 text-xl">ภารกิจ</h4>
                  <p className="text-base text-ocean-600 mt-2">สร้างรอยยิ้มและความมั่นใจในน้ำให้กับนักเรียนทุกคน</p>
               </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default About;