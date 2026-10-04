import { useState } from 'react';
import { motion } from 'framer-motion';
import { Mail, Globe, ExternalLink, GitBranch, Heart, Code2, Check } from 'lucide-react';
import { usePageMeta } from '../lib/usePageMeta';
import { useToast } from '../context/ToastContext';
import ThemeLogo from '../components/ThemeLogo';
import './About.css';

const EMAIL = 'mwasiqt@gmail.com';

const fadeUp = (i = 0) => ({
  initial: { opacity: 0, y: 16 },
  animate: { opacity: 1, y: 0, transition: { duration: 0.28, delay: i * 0.07, ease: 'easeOut' } },
});

export default function About() {
  usePageMeta('About', 'About PaperVault, the community past-paper library, and why it was built.');
  const { addToast } = useToast();
  const [copied, setCopied] = useState(false);

  // Copy rather than mailto: a webmail user has no desktop client to hand off
  // to, so the address itself is the more useful thing to give them.
  const copyEmail = async () => {
    try {
      await navigator.clipboard.writeText(EMAIL);
    } catch {
      // Clipboard API needs a secure context; fall back for plain http.
      const el = document.createElement('textarea');
      el.value = EMAIL;
      el.setAttribute('readonly', '');
      el.style.position = 'fixed';
      el.style.opacity = '0';
      document.body.appendChild(el);
      el.select();
      document.execCommand('copy');
      document.body.removeChild(el);
    }
    addToast('Email copied to clipboard', 'success');
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };
  return (
    <div className="page-content">
      <div className="topbar">
        <span style={{ fontSize: 18, fontWeight: 700 }}>About</span>
      </div>

      <div className="page-inner">
        <div className="about-wrap">

          <motion.div className="about-brand" {...fadeUp(0)}>
            <ThemeLogo size={170} />
          </motion.div>

          {/* Cards grid */}
          <div className="about-grid">

            {/* Why I built this */}
            <motion.div className="about-card" {...fadeUp(1)}>
              <div className="about-card-icon"><Heart size={18} /></div>
              <div className="about-card-title">About This App &amp; Why We Built It</div>
              <div className="about-card-body">
                <p>Past exam papers are hard to find. They end up scattered across WhatsApp groups and random drives, and you only get them if you know the right person.</p>
                <p>PaperVault is one organized place where students can upload, browse, and access past papers by subject, teacher, term, and exam type.</p>
                <p>It was built from scratch, including the design, backend, database, and moderation system, to help university students study smarter.</p>
              </div>
            </motion.div>

            {/* Tech stack */}
            <motion.div className="about-card" {...fadeUp(2)}>
              <div className="about-card-icon"><Code2 size={18} /></div>
              <div className="about-card-title">Built With</div>
              <div className="about-stack-grid">
                {[
                  { name: 'React 19',      desc: 'Frontend UI'     },
                  { name: 'Vite',          desc: 'Build tool'      },
                  { name: 'Supabase',      desc: 'Auth + Database' },
                  { name: 'PostgreSQL',    desc: 'Relational DB'   },
                  { name: 'Framer Motion', desc: 'Animations'      },
                  { name: 'Lucide React',  desc: 'Icons'           },
                  { name: 'Row Level Sec', desc: 'Data security'   },
                  { name: 'Vercel',        desc: 'Deployment'      },
                ].map(t => (
                  <div className="about-stack-item" key={t.name}>
                    <div className="about-stack-name">{t.name}</div>
                    <div className="about-stack-desc">{t.desc}</div>
                  </div>
                ))}
              </div>
            </motion.div>

            {/* Contribute */}
            <motion.div className="about-card about-card-contribute" {...fadeUp(3)}>
              <div className="about-card-icon contribute"><GitBranch size={18} /></div>
              <div className="about-card-title">Want to Contribute?</div>
              <div className="about-card-body">
                <p>PaperVault is open for contributions! Whether you want to fix a bug, suggest a feature, improve the UI, or add support for more universities — all help is welcome.</p>
                <p>Reach out via LinkedIn or email and let's build something useful together.</p>
              </div>
              <div className="about-contribute-actions">
                <button type="button" onClick={copyEmail} className="btn btn-primary">
                  {copied ? <Check size={14} /> : <Mail size={14} />}
                  {copied ? 'Copied!' : 'Send an Email'}
                </button>
                <a href="https://www.linkedin.com/in/wasiq-tanveer/" target="_blank" rel="noreferrer" className="btn btn-ghost">
                  <ExternalLink size={14} /> Message on LinkedIn
                </a>
              </div>
            </motion.div>

          </div>

          <motion.div className="about-footer" {...fadeUp(5)}>
            <div>Built by <strong>Wasiq Tanveer</strong></div>
            <div className="about-links">
              <a href={`mailto:${EMAIL}`} className="about-link-btn">
                <Mail size={14} /> Email
              </a>
              <a href="https://www.linkedin.com/in/wasiq-tanveer/" target="_blank" rel="noreferrer" className="about-link-btn">
                <ExternalLink size={14} /> LinkedIn
              </a>
              <a href="https://wasiq-portfolio-delta.vercel.app/" target="_blank" rel="noreferrer" className="about-link-btn">
                <Globe size={14} /> Portfolio
              </a>
              <a href="https://github.com/wasiqtanveer" target="_blank" rel="noreferrer" className="about-link-btn">
                <GitBranch size={14} /> GitHub
              </a>
            </div>
          </motion.div>

        </div>
      </div>
    </div>
  );
}
