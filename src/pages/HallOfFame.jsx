import { useEffect, useState, useRef } from 'react';
import { motion } from 'framer-motion';
import { Trophy, GitBranch, ExternalLink, Globe, Mail, AlertTriangle, Copy, Check, Music, VolumeX } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { usePageMeta } from '../lib/usePageMeta';
import { SkeletonRow } from '../components/Skeleton';
import './HallOfFame.css';

const fadeUp = (i = 0) => ({
  initial: { opacity: 0, y: 14 },
  animate: { opacity: 1, y: 0, transition: { duration: 0.26, delay: i * 0.07, ease: 'easeOut' } },
});

/** Regular link — opens in new tab */
function SocialLink({ href, icon: Icon, label }) {
  if (!href) return null;
  return (
    <a href={href} target="_blank" rel="noreferrer" className="hof-social-btn" title={label}>
      <Icon size={12} />
      <span>{label}</span>
    </a>
  );
}

/** Email button — copies address to clipboard */
function EmailCopyBtn({ email }) {
  const [copied, setCopied] = useState(false);
  if (!email) return null;

  function handleCopy() {
    navigator.clipboard.writeText(email).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }

  return (
    <button className={'hof-social-btn' + (copied ? ' hof-social-btn-copied' : '')} onClick={handleCopy} title={copied ? 'Copied!' : email}>
      {copied ? <Check size={12} /> : <Copy size={12} />}
      <span>{copied ? 'Copied!' : 'Email'}</span>
    </button>
  );
}

export default function HallOfFame() {
  const [contributors, setContributors] = useState([]);
  const [loading,      setLoading]      = useState(true);
  const [fetchError,   setFetchError]   = useState(null);
  const [playing, setPlaying] = useState(false);
  const audioRef = useRef(null);
  usePageMeta('Hall of Fame', 'The top contributors who keep the PaperVault library growing.');

  // Autoplay on mount; stop and reset when leaving the page.
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;
    audio.volume = 0.4;
    audio.play().then(() => setPlaying(true)).catch(() => setPlaying(false));
    return () => {
      audio.pause();
      audio.currentTime = 0;
      setPlaying(false);
    };
  }, []);

  function toggleMusic() {
    const audio = audioRef.current;
    if (!audio) return;
    if (playing) {
      audio.pause();
      setPlaying(false);
    } else {
      audio.play().then(() => setPlaying(true)).catch(() => {});
    }
  }

  useEffect(() => {
    async function load() {
      try {
        const { data, error } = await supabase
          .from('hall_of_fame')
          .select('*')
          .order('created_at', { ascending: true });

        if (error) setFetchError(error.message);
        else       setContributors(data ?? []);
      } catch (err) {
        setFetchError(err?.message ?? 'Unexpected error');
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  return (
    <div className="page-content">
      {/* Hidden audio element — looping background track */}
      <audio ref={audioRef} src="/sounds/hall of fame.mp3" loop preload="auto" />

      {/* Floating music toggle — bottom-right corner */}
      <button
        className="hof-music-fab"
        onClick={toggleMusic}
        title={playing ? 'Pause music' : 'Play music'}
        aria-label={playing ? 'Pause background music' : 'Play background music'}
        aria-pressed={playing}
      >
        {playing ? <VolumeX size={13} /> : <Music size={13} />}
        {playing ? 'Pause' : 'Music'}
      </button>

      <div className="topbar">
        <span style={{ fontSize: 18, fontWeight: 700 }}>Hall of Fame</span>
      </div>

      <div className="page-inner">

        {/* Banner card heading */}
        <motion.div className="hof-banner" {...fadeUp(0)}>
          <div className="hof-banner-icon">
            <Trophy size={22} />
          </div>
          <div className="hof-banner-body">
            <div className="hof-banner-title">Our Amazing Contributors</div>
            <div className="hof-banner-desc">
              PaperVault exists because of the people who believed in it. This page honours everyone
              who has contributed — whether by sharing papers, reporting bugs, suggesting features,
              spreading the word, or simply helping a fellow student. Every contribution, big or small,
              makes this platform better for students.
            </div>
          </div>
        </motion.div>

        {/* Contributors table card */}
        <motion.div className="admin-section" {...fadeUp(1)}>
          <div className="admin-section-header">
            <div className="section-title">Contributors</div>
            {!loading && !fetchError && (
              <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                {contributors.length} {contributors.length === 1 ? 'person' : 'people'}
              </span>
            )}
          </div>

          {loading ? (
            <div className="table-wrap">
              <table className="hof-table">
                <thead>
                  <tr>
                    <th style={{ width: '24%' }}>Name</th>
                    <th style={{ width: '18%', textAlign: 'center' }}>Contribution</th>
                    <th style={{ textAlign: 'center' }}>Note</th>
                    <th style={{ width: '30%', textAlign: 'center' }}>Socials</th>
                  </tr>
                </thead>
                <tbody>
                  {Array.from({ length: 6 }).map((_, i) => <SkeletonRow key={i} cols={4} />)}
                </tbody>
              </table>
            </div>
          ) : fetchError ? (
            <div style={{ padding: '20px 18px' }}>
              <div className="inline-error" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <AlertTriangle size={14} />
                <span>Could not load contributors: {fetchError}</span>
              </div>
            </div>
          ) : contributors.length === 0 ? (
            <div className="empty-state">
              <Trophy size={28} style={{ marginBottom: 10, opacity: 0.3 }} />
              <div>No contributors listed yet.</div>
              <div style={{ marginTop: 4, fontSize: 12 }}>
                Contribute to PaperVault and the admin will add you here.
              </div>
            </div>
          ) : (
            <div className="table-wrap">
              <table className="hof-table">
                <thead>
                  <tr>
                    <th style={{ width: '24%' }}>Name</th>
                    <th style={{ width: '18%', textAlign: 'center' }}>Contribution</th>
                    <th style={{ textAlign: 'center' }}>Note</th>
                    <th style={{ width: '30%', textAlign: 'center' }}>Socials</th>
                  </tr>
                </thead>
                <tbody>
                  {contributors.map(c => (
                    <tr key={c.id}>
                      {/* Name — left aligned with avatar, matches how users table looks */}
                      <td>
                        <div className="hof-name-cell">
                          <div className="hof-avatar-sm">
                            {(c.name ?? '?').split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase()}
                          </div>
                          <span style={{ color: 'var(--text-primary)', fontWeight: 600 }}>{c.name}</span>
                        </div>
                      </td>
                      <td style={{ textAlign: 'center' }}>
                        {c.role
                          ? <span className="hof-role-pill">{c.role}</span>
                          : <span style={{ color: 'var(--text-muted)' }}>—</span>
                        }
                      </td>
                      <td style={{ textAlign: 'center', color: 'var(--text-secondary)', fontSize: 12 }}>
                        {c.note ?? '—'}
                      </td>
                      <td style={{ textAlign: 'center' }}>
                        <div className="hof-socials-row" style={{ justifyContent: 'center' }}>
                          <SocialLink href={c.github}   icon={GitBranch}    label="GitHub"   />
                          <SocialLink href={c.linkedin}  icon={ExternalLink} label="LinkedIn" />
                          <SocialLink href={c.website}   icon={Globe}        label="Website"  />
                          <EmailCopyBtn email={c.email} />
                          {!c.github && !c.linkedin && !c.website && !c.email && (
                            <span style={{ color: 'var(--text-muted)', fontSize: 12 }}>—</span>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </motion.div>

        <motion.div className="hof-footer" {...fadeUp(2)}>
          Want to be featured here? Contribute to PaperVault and the admin will add you.
        </motion.div>

      </div>
    </div>
  );
}
