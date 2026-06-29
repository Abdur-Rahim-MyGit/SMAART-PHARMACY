import React, { useEffect, useState } from 'react';
import { useLocation } from 'react-router-dom';

export default function PageTransition({ children }) {
  const location = useLocation();
  const [visible, setVisible] = useState(false);
  const [key, setKey] = useState(location.pathname);

  useEffect(() => {
    setVisible(false);
    const t = setTimeout(() => {
      setKey(location.pathname);
      setVisible(true);
    }, 60);
    return () => clearTimeout(t);
  }, [location.pathname]);

  return (
    <div
      key={key}
      className={`
        transition-all duration-200 ease-out
        ${visible 
          ? 'opacity-100 translate-y-0' 
          : 'opacity-0 translate-y-2'
        }
      `}
    >
      {children}
    </div>
  );
}
