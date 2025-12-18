import React from 'react';
import { Link } from 'react-router-dom';
import { Facebook, Mail, Phone, MapPin } from 'lucide-react';
import { CONTACT_INFO } from '../constants';

export const Footer: React.FC = () => {
  return (
    <footer className="bg-slate-900 text-white pt-16 pb-10">
      <div className="max-w-7xl mx-auto px-6 sm:px-8 lg:px-10">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-12">
          <div>
            <h3 className="text-2xl font-bold text-ocean-400 mb-6">เรียนว่ายน้ำพิษณุโลก By ครูฟลุ๊ค</h3>
            <p className="text-slate-400 text-lg leading-relaxed">
              ศูนย์สอนว่ายน้ำที่มุ่งเน้นการเรียนการสอนอย่างเป็นระบบ โดยครูฟลุ๊คและทีมงานมืออาชีพ 
              ดูแลใกล้ชิด ใส่ใจความปลอดภัย สนุกสนาน และได้ผลลัพธ์จริง
            </p>
          </div>
          <div>
            <h3 className="text-xl font-bold text-white mb-6">เมนูลัด</h3>
            <ul className="space-y-4 text-lg text-slate-400">
              <li><Link to="/courses" className="hover:text-ocean-400 transition">คอร์สเรียนทั้งหมด</Link></li>
              <li><Link to="/register" className="hover:text-ocean-400 transition">ลงทะเบียนเรียน</Link></li>
              <li><Link to="/about" className="hover:text-ocean-400 transition">เกี่ยวกับครูฟลุ๊ค</Link></li>
              <li><Link to="/contact" className="hover:text-ocean-400 transition">ติดต่อเรา</Link></li>
            </ul>
          </div>
          <div>
            <h3 className="text-xl font-bold text-white mb-6">ติดต่อเรา</h3>
            <ul className="space-y-4 text-lg text-slate-400">
              <li className="flex items-center">
                <Phone className="h-5 w-5 mr-3 text-ocean-400" />
                <a href={`tel:${CONTACT_INFO.phone.replace(/-/g, '')}`}>{CONTACT_INFO.phone}</a>
              </li>
              <li className="flex items-center">
                <Mail className="h-5 w-5 mr-3 text-ocean-400" />
                <a href={`mailto:${CONTACT_INFO.email}`}>{CONTACT_INFO.email}</a>
              </li>
              <li className="flex items-center">
                <Facebook className="h-5 w-5 mr-3 text-ocean-400" />
                <a href={CONTACT_INFO.facebookUrl} target="_blank" rel="noopener noreferrer">Facebook Page</a>
              </li>
              <li className="flex items-center">
                <MapPin className="h-5 w-5 mr-3 text-ocean-400" />
                <span>{CONTACT_INFO.address}</span>
              </li>
            </ul>
          </div>
        </div>
        <div className="border-t border-slate-800 mt-12 pt-8 text-center text-sm text-slate-500">
          &copy; {new Date().getFullYear()} เรียนว่ายน้ำพิษณุโลก By ครูฟลุ๊ค. All rights reserved.
        </div>
      </div>
    </footer>
  );
};