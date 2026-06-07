import { useTheme } from '../context/ThemeContext';

export default function ThemeToggle() {
  const { theme, toggleTheme } = useTheme();
  const isDark = theme === 'dark';

  return (
    <button
      type="button"
      className="theme-toggle"
      onClick={toggleTheme}
      title={isDark ? '切换为浅色模式' : '切换为深色模式'}
      aria-label={isDark ? '切换为浅色模式' : '切换为深色模式'}
    >
      <span className="theme-toggle-icon" aria-hidden="true">{isDark ? '☀️' : '🌙'}</span>
      <span className="theme-toggle-label">
        {isDark ? '浅色' : '深色'}
      </span>
    </button>
  );
}
