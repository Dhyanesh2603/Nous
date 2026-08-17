import React from 'react';
import { UserProfile } from '../types/user';

export interface UserCardProps {
  user: UserProfile;
  onSelect?: (id: string) => void;
}

export const UserCard: React.FC<UserCardProps> = ({ user, onSelect }) => {
  const handleClick = () => {
    if (onSelect) {
      onSelect(user.id);
    }
  };

  return (
    <div className="user-card" onClick={handleClick}>
      <h3>{user.username}</h3>
      <span className="badge">{user.role}</span>
    </div>
  );
};
