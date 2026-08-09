import React from "react";

interface PageNavbarProps {
  title?: string;
  children?: React.ReactNode;
}

const PageNavbar: React.FC<PageNavbarProps> = ({ title = "Dashboard / Overview", children }) => {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--space-4)', width: '100%' }}>
      <div className="text-breadcrumb">{title}</div>
      {children && (
        <div style={{ display: 'flex', gap: 'var(--space-2)' }}>
          {children}
        </div>
      )}
    </div>
  );
};

export default PageNavbar;
