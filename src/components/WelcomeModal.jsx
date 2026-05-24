import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { X, BookOpen, Upload, ShieldCheck, GitBranch } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import './WelcomeModal.css';

const STORAGE_KEY = 'pv_welcome_seen';

export default function WelcomeModal() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (!user) return;
    const seen = localStorage.getItem(STORAGE_KEY);
    if (!seen) setVisible(true);
  }, [user]);

  function dismiss() {
    localStorage.setItem(STORAGE_KEY, '1');
    setVisible(false);
  }

  function goToAbout() {
    dismiss();
    navigate('/about');
  }

  return (
    <AnimatePresence>
      {visible && (
        <>
          <motion.div
            className="wm-backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            onClick={dismiss}
          />
          <motion.div
            className="wm-modal"
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1,    y: 0  }}
            exit={{    opacity: 0, scale: 0.96, y: 10 }}
            transition={{ duration: 0.25, ease: 'easeOut' }}
          >
            <button className="wm-close" onClick={dismiss} aria-label="Close">
              <X size={16} />
            </button>

            <div className="wm-header">
              <div className="wm-logo">PaperVault</div>
              <div className="wm-tagline">A student-built vault for past papers. Here's what you can do.</div>
            </div>

            <div className="wm-features">
              <div className="wm-feature">
                <div className="wm-feature-icon"><BookOpen size={16} /></div>
                <div>
                  <div className="wm-feature-title">Browse the Vault</div>
                  <div className="wm-feature-desc">Filter past papers by subject, teacher, year, and semester. Everything you'd ask a senior for — searchable.</div>
                </div>
              </div>
              <div className="wm-feature">
                <div className="wm-feature-icon"><Upload size={16} /></div>
                <div>
                  <div className="wm-feature-title">Upload What You Have</div>
                  <div className="wm-feature-desc">Got a paper? Share it. Uploads are quick — just snap a photo, fill in the details, and submit for review.</div>
                </div>
              </div>
              <div className="wm-feature">
                <div className="wm-feature-icon"><ShieldCheck size={16} /></div>
                <div>
                  <div className="wm-feature-title">Moderated for Quality</div>
                  <div className="wm-feature-desc">Every upload is checked by a moderator before going public. No junk, no duplicates — just useful papers.</div>
                </div>
              </div>
              <div className="wm-feature">
                <div className="wm-feature-icon"><GitBranch size={16} /></div>
                <div>
                  <div className="wm-feature-title">Help Make It Better</div>
                  <div className="wm-feature-desc">Spot a bug or want a feature? PaperVault is open to contributions — tell me what's missing and I'll build it.</div>
                </div>
              </div>
            </div>

            <div className="wm-footer">
              <button className="btn btn-ghost" onClick={dismiss}>
                Get Started
              </button>
              <button className="btn btn-primary" onClick={goToAbout}>
                About the Developer →
              </button>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
