import React, { useState, useEffect } from 'react';
import { HashRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom';
// @ts-ignore
import { onAuthStateChanged } from 'firebase/auth';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { auth, db } from './services/firebase';
import { UserProfile, UserRole } from './types';
import { Navbar } from './components/Navbar';
import { Footer } from './components/Footer';
import Home from './pages/Home';
import Courses from './pages/Courses';
import Registration from './pages/Registration';
import Dashboard from './pages/Dashboard';
import Profile from './pages/Profile';
import Login from './pages/Login';
import About from './pages/About';
import Contact from './pages/Contact';
import FAQ from './pages/FAQ';

const App: React.FC = () => {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser: any) => {
      if (firebaseUser) {
        // Fetch extended user profile from Firestore
        const userDocRef = doc(db, "users", firebaseUser.uid);
        const userSnap = await getDoc(userDocRef);

        if (userSnap.exists()) {
          setUser(userSnap.data() as UserProfile);
        } else {
          // Check for hardcoded admin/instructor emails
          let role = UserRole.STUDENT;
          if (firebaseUser.email === 'admin@example.com') role = UserRole.ADMIN;
          if (firebaseUser.email === 'instructor@example.com') role = UserRole.INSTRUCTOR;

          // Create default profile if new
          const newUser: UserProfile = {
            uid: firebaseUser.uid,
            email: firebaseUser.email || "",
            displayName: firebaseUser.displayName || firebaseUser.email?.split('@')[0] || "User",
            photoURL: firebaseUser.photoURL || "",
            role: role,
            phone: firebaseUser.phoneNumber || ""
          };
          await setDoc(userDocRef, newUser);
          setUser(newUser);
        }
      } else {
        setUser(null);
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-ocean-50">
        <div className="animate-spin rounded-full h-20 w-20 border-t-4 border-ocean-600"></div>
      </div>
    );
  }

  return (
    <HashRouter>
      <div className="flex flex-col min-h-screen font-sans text-slate-800 bg-slate-50 text-base md:text-lg">
        <Navbar user={user} />
        <main className="flex-grow pt-24">
          <ScrollToTop />
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/courses" element={<Courses user={user} />} />
            <Route path="/register" element={<Registration user={user} />} />
            <Route 
              path="/dashboard" 
              element={user ? <Dashboard user={user} /> : <Navigate to="/login" />} 
            />
            <Route 
              path="/profile" 
              element={user ? <Profile user={user} /> : <Navigate to="/login" />} 
            />
            <Route path="/about" element={<About />} />
            <Route path="/contact" element={<Contact />} />
            <Route path="/faq" element={<FAQ />} />
            <Route 
              path="/login" 
              element={!user ? <Login /> : <Navigate to="/dashboard" />} 
            />
          </Routes>
        </main>
        <Footer />
      </div>
    </HashRouter>
  );
};

// Helper to scroll to top on route change
const ScrollToTop = () => {
  const { pathname } = useLocation();
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [pathname]);
  return null;
}

export default App;