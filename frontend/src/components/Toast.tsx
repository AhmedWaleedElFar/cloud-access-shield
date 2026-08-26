import { useEffect, useState } from 'react';

interface ToastProps {
  message: string;
  type: 'success' | 'error' | 'info';
  duration?: number;
  onClose: () => void;
}

const typeStyles = {
  success: 'bg-green-500',
  error: 'bg-red-500',
  info: 'bg-blue-500',
};

const typeIcons = {
  success: '✓',
  error: '✕',
  info: 'ℹ',
};

export default function Toast({ message, type, duration = 3000, onClose }: ToastProps) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    requestAnimationFrame(() => setVisible(true));
    const timer = setTimeout(() => {
      setVisible(false);
      setTimeout(onClose, 300);
    }, duration);
    return () => clearTimeout(timer);
  }, [duration, onClose]);

  return (
    <div
      role="status"
      aria-live="polite"
      className={`fixed top-6 left-1/2 -translate-x-1/2 px-5 py-3 rounded-lg shadow-xl text-white text-sm font-medium z-50 flex items-center gap-2 transition-all duration-300 ${typeStyles[type]} ${
        visible ? 'opacity-100 translate-y-0' : 'opacity-0 -translate-y-4'
      }`}
    >
      <span className="text-base font-bold">{typeIcons[type]}</span>
      {message}
    </div>
  );
}
