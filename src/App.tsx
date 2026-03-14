import React from 'react';
import { useAuth } from './context/AuthContext';
import LoginPage from './pages/LoginPage';
import Dashboard from './pages/Dashboard';
import CatMoonDashboard from './pages/CatMoonDashboard';
import { Loader2 } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

export default function App() {
  const { user, isLoading: authLoading } = useAuth();

  return (
    <AnimatePresence mode="wait">
      {authLoading ? (
        <motion.div 
          key="loader" 
          className="min-h-screen flex items-center justify-center bg-[#F8F9FA]"
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
        >
          <Loader2 className="animate-spin text-emerald-600" size={32} />
        </motion.div>
      ) : !user ? (
        <motion.div 
          key="login"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0, y: -20 }}
          transition={{ duration: 0.3 }}
          className="w-full"
        >
          <LoginPage />
        </motion.div>
      ) : user.store === 'CATMOON' ? (
        <CatMoonDashboard key="catmoon-dashboard" />
      ) : (
        <Dashboard key="dashboard" />
      )}
    </AnimatePresence>
  );
}
