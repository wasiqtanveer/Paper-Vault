import logoDark  from '../assets/logo-dark.png';
import logoLight from '../assets/logo-light.png';
import markDark  from '../assets/mark-dark.png';
import markLight from '../assets/mark-light.png';
import './ThemeLogo.css';

const VARIANTS = {
  full: { dark: logoDark, light: logoLight, width: 560, height: 425 },
  mark: { dark: markDark, light: markLight, width: 192, height: 169 },
};

// Both artworks stay mounted and cross-fade on the html[data-theme] attribute,
// so toggling the theme animates the logo in step with the rest of the page
// instead of swapping a frame late. `size` is the rendered width in px.
export default function ThemeLogo({ variant = 'full', size = 120, className = '', alt = 'PaperVault' }) {
  const v = VARIANTS[variant];
  return (
    <span
      className={`theme-logo ${className}`}
      style={{ width: size, aspectRatio: `${v.width} / ${v.height}` }}
      role="img"
      aria-label={alt}
    >
      <img className="theme-logo-dark"  src={v.dark}  width={v.width} height={v.height} alt="" draggable={false} />
      <img className="theme-logo-light" src={v.light} width={v.width} height={v.height} alt="" draggable={false} />
    </span>
  );
}
