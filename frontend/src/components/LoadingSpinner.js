/**
 * LoadingSpinner Component
 */
import React from 'react';
import { MdOutlineMemory } from 'react-icons/md';
import './LoadingSpinner.css';

export default function LoadingSpinner({ fullPage = false, size = 'md', text = '' }) {
  const spinner = (
    <div className={`ls-wrap ls-wrap--${size}`}>
      <div className="ls-ring">
        <div /><div /><div /><div />
      </div>
      {fullPage && (
        <>
          <MdOutlineMemory className="ls-icon animate-float" />
          <p className="ls-text">{text || 'Loading memories…'}</p>
        </>
      )}
    </div>
  );

  if (fullPage) {
    return <div className="ls-fullpage">{spinner}</div>;
  }
  return spinner;
}
