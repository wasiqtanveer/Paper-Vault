import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { X, BookOpen, Upload, ShieldCheck, GitBranch, ArrowRight, Sparkles } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import './WelcomeModal.css';

const STORAGE_KEY = 'pv_welcome_seen';

const features = [
  {
    icon: BookOpen,
    title: 'Find Past Papers Fast',
    desc: 'Search by subject, teacher, year, or semester. Every approved paper is just a click away — no more digging through WhatsApp groups.',
  },
  {
    icon: Upload,
    title: 'Share What You Have',
    desc: 'Got a paper others would benefit from? Upload it in seconds. Each one is reviewed by mods to keep the vault clean and reliable.',
  },
  {
    icon: ShieldCheck,
    title: 'Trustworthy by Design',
    desc: 'Moderation, reports, and an activity log keep everything accountable. You see only what real students vouched for.',
  },
  {
    icon: GitBranch,
    title: 'Help Shape It',
    desc: 'PaperVault is a student-built passion project. Hit any rough edge? Tell me — or send a PR. This grows with the people using it.',
  },
];

const containerV = {
  hidden: {},
  show:   { transition: { staggerChildren: 0.07, delayChildren: 0.15 } },
};
const itemV = {
  hidden: { opacity: 0, y: 14, scale: 0.97 },
  show:   { opacity: 1, y: 0,  scale: 1, transition: { duration: 0.4, ease: [0.22, 1, 0.36, 1] } },
};

export default function WelcomeModal() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (!user) return;
    const seen = localStorage.getItem(STORAGE_KEY);
    if (!seen) {
      const t = setTimeout(() => setVisible(true), 350);
      return () => clearTimeout(t);
    }
  }, [user]);

  function dismiss() {
    localStorage.setItem(STORAGE_KEY, '1');
    setVisible(false);
  }

  function goToAbout() {
    dismiss();
    setTimeout(() => navigate('/about'), 220);
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
            transition={{ duration: 0.25 }}
            onClick={dismiss}
          />
          <motion.div
            className="wm-modal"
            initial={{ opacity: 0, y: 40, scale: 0.92 }}
            animate={{ opacity: 1, y: 0,  scale: 1 }}
            exit={{    opacity: 0, y: 20, scale: 0.96 }}
            transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
          >
            <button className="wm-close" onClick={dismiss} aria-label="Close">
              <X size={16} />
            </button>

            <motion.div
              className="wm-header"
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.45, delay: 0.1, ease: 'easeOut' }}
            >
              <div className="wm-badge">
                <Sparkles size={11} /> Welcome
              </div>
              <h2 className="wm-logo">PaperVault</h2>
              <p className="wm-tagline">
                Built by a student, for students. Here's the quick tour — then you're free to explore.
              </p>
            </motion.div>

            <motion.div
              className="wm-features"
              variants={containerV}
              initial="hidden"
              animate="show"
            >
              {features.map((f, i) => {
                const Icon = f.icon;
                return (
                  <motion.div className="wm-feature" key={i} variants={itemV}>
                    <div className="wm-feature-icon"><Icon size={17} /></div>
                    <div className="wm-feature-text">
                      <div className="wm-feature-title">{f.title}</div>
                      <div className="wm-feature-desc">{f.desc}</div>
                    </div>
                  </motion.div>
                );
              })}
            </motion.div>

            <motion.div
              className="wm-footer"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, delay: 0.55, ease: 'easeOut' }}
            >
              <button className="wm-btn wm-btn-ghost" onClick={dismiss}>
                Skip
              </button>
              <button className="wm-btn wm-btn-primary" onClick={goToAbout}>
                Meet the Developer <ArrowRight size={14} />
              </button>
            </motion.div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
