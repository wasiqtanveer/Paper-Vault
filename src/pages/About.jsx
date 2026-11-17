import { fadeUp as baseFadeUp } from '../lib/motion';
import { useState } from 'react';
import { m } from 'framer-motion';
import { Mail, Globe, ExternalLink, GitBranch, Heart, Code2, Check } from 'lucide-react';
import { usePageMeta } from '../lib/usePageMeta';
import { CONTACT, copyText } from '../lib/contact';
import { useToast } from '../context/useToast';
import ThemeLogo from '../components/ThemeLogo';
import './About.css';

const EMAIL = CONTACT.email;

const fadeUp = i => baseFadeUp(i, { y: 16, duration: 0.28, step: 0.07 });

export default function About() {
  usePageMeta('About', 'About PaperVault, the community past-paper library, and why it was built.');
  const { addToast } = useToast();
  const [copied, setCopied] = useState(false);

  // Copy rather than mailto: a webmail user has no desktop client to hand off
  // to, so the address itself is the more useful thing to give them.
  const copyEmail = async () => {
    await copyText(EMAIL);
    addToast('Email copied to clipboard', 'success');
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };
  return (
    <div className="page-content">
      <div className="topbar">
        <span className="topbar-title">About</span>
      </div>

      <div className="page-inner">
        <div className="about-wrap">

          <m.div className="about-brand" {...fadeUp(0)}>
            <ThemeLogo size={170} />
          </m.div>

          {/* Cards grid */}
          <div className="about-grid">

            {/* Why I built this */}
            <m.div className="about-card" {...fadeUp(1)}>
              <div className="about-card-icon"><Heart size={18} /></div>
              <div className="about-card-title">About This App &amp; Why We Built It</div>
              <div className="about-card-body">
                <p>Past exam papers are hard to find. They end up scattered across WhatsApp groups and random drives, and you only get them if you know the right person.</p>
                <p>PaperVault is one organized place where students can upload, browse, and access past papers by subject, teacher, term, and exam type.</p>
                <p>It was built from scratch, including the design, backend, database, and moderation system, to help university students study smarter.</p>
              </div>
            </m.div>

            {/* Tech stack */}
            <m.div className="about-card" {...fadeUp(2)}>
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
            </m.div>

            {/* Contribute */}
            <m.div className="about-card about-card-contribute" {...fadeUp(3)}>
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
            </m.div>

          </div>

          <m.div className="about-footer" {...fadeUp(5)}>
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
          </m.div>

        </div>
      </div>
    </div>
  );
}
