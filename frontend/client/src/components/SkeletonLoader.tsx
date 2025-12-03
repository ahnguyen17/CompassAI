import React from 'react';
import styles from './SkeletonLoader.module.css';

interface SkeletonProps {
  width?: string;
  height?: string;
  borderRadius?: string;
  className?: string;
}

export const Skeleton: React.FC<SkeletonProps> = ({
  width = '100%',
  height = '20px',
  borderRadius = '4px',
  className = ''
}) => (
  <div
    className={`${styles.skeleton} ${className}`}
    style={{ width, height, borderRadius }}
  />
);

export const MessageSkeleton: React.FC = () => (
  <div className={styles.messageSkeleton}>
    <div className={styles.messageRowAi}>
      <Skeleton width="65%" height="80px" borderRadius="16px" />
    </div>
    <div className={styles.messageRowUser}>
      <Skeleton width="55%" height="60px" borderRadius="16px" />
    </div>
    <div className={styles.messageRowAi}>
      <Skeleton width="70%" height="100px" borderRadius="16px" />
    </div>
    <div className={styles.messageRowUser}>
      <Skeleton width="45%" height="50px" borderRadius="16px" />
    </div>
  </div>
);

export const SessionSkeleton: React.FC = () => (
  <div className={styles.sessionSkeleton}>
    {[1, 2, 3, 4, 5, 6].map(i => (
      <Skeleton key={i} height="52px" borderRadius="10px" className={styles.sessionItem} />
    ))}
  </div>
);

export const SettingsSkeleton: React.FC = () => (
  <div className={styles.settingsSkeleton}>
    <Skeleton width="200px" height="32px" borderRadius="8px" className={styles.titleSkeleton} />
    <div className={styles.settingsGroup}>
      <Skeleton width="150px" height="20px" borderRadius="4px" />
      <Skeleton width="100%" height="48px" borderRadius="12px" />
    </div>
    <div className={styles.settingsGroup}>
      <Skeleton width="180px" height="20px" borderRadius="4px" />
      <Skeleton width="100%" height="48px" borderRadius="12px" />
    </div>
    <div className={styles.settingsGroup}>
      <Skeleton width="120px" height="20px" borderRadius="4px" />
      <Skeleton width="100%" height="80px" borderRadius="12px" />
    </div>
  </div>
);
