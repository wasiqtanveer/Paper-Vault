import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { HelpCircle, ChevronDown, Mail, Check, ExternalLink, GitBranch } from 'lucide-react';
import { CONTACT, copyText } from '../lib/contact';
import { useToast } from '../context/ToastContext';
import './AuthHelp.css';

// Controlled so a page can open it itself when a request fails in a way that
// points at the paused project.
export default function AuthHelp({ open, onToggle }) {
  const { addToast } = useToast();
  const [copied, setCopied] = useState(false);

  async function copyEmail() {
    await copyText(CONTACT.email);
    addToast('Email copied to clipboard', 'success');
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <div className="auth-help">
      <button type="button" className={'auth-help-trigger' + (open ? ' open' : '')} onClick={onToggle} aria-expanded={open}>
        <HelpCircle size={14} /> Can&apos;t sign in?
        <ChevronDown size={13} className={'auth-help-chevron' + (open ? ' rotated' : '')} />
      </button>

      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.22, ease: 'easeInOut' }}
            style={{ overflow: 'hidden' }}
          >
            <div className="auth-help-card">
              <p>
                PaperVault runs on Supabase&apos;s free tier, which pauses a project after 7 days
                without activity. If you can&apos;t sign in, it has most likely been paused.
              </p>
              <p>If it&apos;s not working, just text me and I&apos;ll resume it. Thank you for your patience!</p>
              <div className="auth-help-links">
                <button type="button" className="about-link-btn" onClick={copyEmail}>
                  {copied ? <Check size={14} /> : <Mail size={14} />} {copied ? 'Copied!' : 'Copy email'}
                </button>
                <a href={CONTACT.linkedin} target="_blank" rel="noreferrer" className="about-link-btn">
                  <ExternalLink size={14} /> LinkedIn
                </a>
                <a href={CONTACT.github} target="_blank" rel="noreferrer" className="about-link-btn">
                  <GitBranch size={14} /> GitHub
                </a>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
