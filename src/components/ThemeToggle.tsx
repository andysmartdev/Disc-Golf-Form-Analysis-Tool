import type { Theme } from '../types';
import './ThemeToggle.css';

interface Props {
  theme: Theme;
  onToggle: () => void;
}

export function ThemeToggle({ theme, onToggle }: Props) {
  return (
    <div className="theme-toggle">
      <button
        className="theme-toggle__btn"
        onClick={onToggle}
        aria-label={`Switch to ${theme === 'dark' ? 'light' : 'dark'} theme`}
      >
        <span className="theme-toggle__track">
          <span className="theme-toggle__icon">🌙</span>
          <span className="theme-toggle__icon">☀️</span>
        </span>
        <span className="theme-toggle__thumb" />
      </button>
    </div>
  );
}
