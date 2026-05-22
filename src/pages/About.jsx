import { motion } from 'framer-motion';
import { Mail, Globe, ExternalLink, GitBranch, Heart, Code2, Github } from 'lucide-react';
import './About.css';

const fadeUp = (i = 0) => ({
  initial: { opacity: 0, y: 16 },
  animate: { opacity: 1, y: 0, transition: { duration: 0.28, delay: i * 0.07, ease: 'easeOut' } },
});

export default function About() {
  return (
    <div className="page-content">
      <div className="topbar">
        <span style={{ fontSize: 18, fontWeight: 700 }}>About Developer</span>
      </div>

      <div className="page-inner">
        <div className="about-wrap">

          {/* Hero card */}
          <motion.div className="about-hero-card" {...fadeUp(0)}>
            <div className="about-avatar">WT</div>
            <div className="about-hero-info">
              <div className="about-name">Wasiq Tanveer</div>
              <div className="about-tagline">Full-Stack Developer · CS Student</div>
              <div className="about-links">
                <a href="mailto:mwasiqt@gmail.com" className="about-link-btn">
                  <Mail size={14} /> mwasiqt@gmail.com
                </a>
                <a href="https://www.linkedin.com/in/wasiq-tanveer/" target="_blank" rel="noreferrer" className="about-link-btn">
                  <ExternalLink size={14} /> LinkedIn
                </a>
                <a href="https://wasiq-portfolio-delta.vercel.app/" target="_blank" rel="noreferrer" className="about-link-btn">
                  <Globe size={14} /> Portfolio
                </a>
                <a href="https://github.com/wasiqtanveer" target="_blank" rel="noreferrer" className="about-link-btn">
                  <Github size={14} /> GitHub
                </a>
              </div>
            </div>
          </motion.div>

          {/* Cards grid */}
          <div className="about-grid">

            {/* Why I built this */}
            <motion.div className="about-card" {...fadeUp(1)}>
              <div className="about-card-icon"><Heart size={18} /></div>
              <div className="about-card-title">Why I Built This</div>
              <div className="about-card-body">
                <p>As a CS student, I constantly struggled to find past exam papers. They were scattered across WhatsApp groups, random drives, and shared only if you knew the right person.</p>
                <p>PaperVault was built to fix that — a single organized platform where students can upload, browse, and access past papers by subject, teacher, term, and exam type.</p>
                <p>Everything here — design, backend, database, and moderation system — was built from scratch as a passion project to genuinely help university students study smarter.</p>
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
                <a href="mailto:mwasiqt@gmail.com" className="btn btn-primary">
                  <Mail size={14} /> Send an Email
                </a>
                <a href="https://www.linkedin.com/in/wasiq-tanveer/" target="_blank" rel="noreferrer" className="btn btn-ghost">
                  <ExternalLink size={14} /> Message on LinkedIn
                </a>
              </div>
            </motion.div>

            {/* Other project */}
            <motion.div className="about-card" {...fadeUp(4)}>
              <div className="about-card-icon project"><ExternalLink size={18} /></div>
              <div className="about-card-title">Another Project for Students</div>
              <div className="about-card-body">
                <p>Also built <strong>CR Attendance App</strong> — a university attendance tracking tool that helps students monitor their attendance across courses and get alerts before they fall short of the required percentage.</p>
              </div>
              <a href="https://crattendanceapp.vercel.app/login" target="_blank" rel="noreferrer"
                className="btn btn-ghost" style={{ marginTop: 16, alignSelf: 'flex-start' }}>
                <ExternalLink size={14} /> Open CR Attendance App
              </a>
            </motion.div>

          </div>

          <motion.div className="about-footer" {...fadeUp(5)}>
            Built with care for students · by <strong>WT</strong>
          </motion.div>

        </div>
      </div>
    </div>
  );
}
