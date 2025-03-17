import React, { useEffect, useState } from 'react';

const Header: React.FC = () => {
  const [currentUrl, setCurrentUrl] = useState<string>('');

  useEffect(() => {
    // Set the current URL when the component mounts
    setCurrentUrl(window.location.href);
  }, []);

  return (
    <header>
      <h1>
        <a 
          href={currentUrl} 
          style={{ textDecoration: 'none', color: 'inherit' }}
        >
          backrooms.directory
        </a>
      </h1>
      <hr />
    </header>
  );
};

export default Header;