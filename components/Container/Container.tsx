import React from 'react';
import styles from './Container.module.css';

type Props = {
  children: React.ReactNode;
  className?: string;
};

export default function Container({ children, className = '' }: Props) {
  return <div className={`${styles.container} ${className}`.trim()}>{children}</div>;
}
