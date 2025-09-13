import React from 'react';

/**
 * Shared Card Components
 * Used across all portals (Student, Employer, Admin)
 */

export interface CardProps {
  children: React.ReactNode;
  className?: string;
  padding?: 'none' | 'sm' | 'md' | 'lg';
  shadow?: 'none' | 'sm' | 'md' | 'lg' | 'xl';
  hoverable?: boolean;
  onClick?: () => void;
}

export const Card: React.FC<CardProps> = ({
  children,
  className = '',
  padding = 'md',
  shadow = 'md',
  hoverable = false,
  onClick
}) => {
  const paddingClasses = {
    none: '',
    sm: 'p-4',
    md: 'p-6',
    lg: 'p-8'
  };

  const shadowClasses = {
    none: '',
    sm: 'shadow-sm',
    md: 'shadow-md',
    lg: 'shadow-lg',
    xl: 'shadow-xl'
  };

  const hoverClasses = hoverable
    ? 'transition-all duration-200 hover:shadow-lg hover:scale-[1.02] cursor-pointer'
    : '';

  const baseClasses = 'bg-white rounded-lg border border-gray-200';

  return (
    <div
      className={`${baseClasses} ${paddingClasses[padding]} ${shadowClasses[shadow]} ${hoverClasses} ${className}`}
      onClick={onClick}
    >
      {children}
    </div>
  );
};

// Card Header Component
export interface CardHeaderProps {
  children: React.ReactNode;
  className?: string;
  actions?: React.ReactNode;
}

export const CardHeader: React.FC<CardHeaderProps> = ({
  children,
  className = '',
  actions
}) => {
  return (
    <div className={`flex items-center justify-between pb-4 border-b border-gray-200 ${className}`}>
      <div className="flex-1">{children}</div>
      {actions && <div className="ml-4">{actions}</div>}
    </div>
  );
};

// Card Body Component
export interface CardBodyProps {
  children: React.ReactNode;
  className?: string;
}

export const CardBody: React.FC<CardBodyProps> = ({
  children,
  className = ''
}) => {
  return (
    <div className={`py-4 ${className}`}>
      {children}
    </div>
  );
};

// Card Footer Component
export interface CardFooterProps {
  children: React.ReactNode;
  className?: string;
  align?: 'left' | 'center' | 'right';
}

export const CardFooter: React.FC<CardFooterProps> = ({
  children,
  className = '',
  align = 'right'
}) => {
  const alignClasses = {
    left: 'justify-start',
    center: 'justify-center',
    right: 'justify-end'
  };

  return (
    <div className={`flex ${alignClasses[align]} pt-4 border-t border-gray-200 ${className}`}>
      {children}
    </div>
  );
};

// Job Card Component
export interface JobCardProps {
  title: string;
  company: string;
  location: string;
  type: string;
  salary?: { min: number; max: number; period: string };
  description: string;
  postedAt: string;
  deadline: string;
  onClick?: () => void;
  actions?: React.ReactNode;
}

export const JobCard: React.FC<JobCardProps> = ({
  title,
  company,
  location,
  type,
  salary,
  description,
  postedAt,
  deadline,
  onClick,
  actions
}) => {
  return (
    <Card hoverable onClick={onClick} className="mb-4">
      <div className="flex justify-between items-start">
        <div className="flex-1">
          <h3 className="text-lg font-semibold text-gray-900">{title}</h3>
          <p className="text-md text-gray-700 mt-1">{company}</p>

          <div className="flex flex-wrap gap-3 mt-3 text-sm text-gray-600">
            <span className="flex items-center">
              <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
              {location}
            </span>
            <span className="flex items-center">
              <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
              </svg>
              {type}
            </span>
            {salary && (
              <span className="flex items-center">
                <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                ${salary.min.toLocaleString()} - ${salary.max.toLocaleString()} {salary.period}
              </span>
            )}
          </div>

          <p className="mt-3 text-gray-600 text-sm line-clamp-2">{description}</p>

          <div className="flex justify-between items-center mt-4 text-xs text-gray-500">
            <span>Posted: {postedAt}</span>
            <span>Deadline: {deadline}</span>
          </div>
        </div>

        {actions && (
          <div className="ml-4">
            {actions}
          </div>
        )}
      </div>
    </Card>
  );
};

// Stats Card Component
export interface StatsCardProps {
  title: string;
  value: string | number;
  icon?: React.ReactNode;
  trend?: {
    value: number;
    isPositive: boolean;
  };
  className?: string;
}

export const StatsCard: React.FC<StatsCardProps> = ({
  title,
  value,
  icon,
  trend,
  className = ''
}) => {
  return (
    <Card className={className}>
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-medium text-gray-600">{title}</p>
          <p className="text-2xl font-bold text-gray-900 mt-1">{value}</p>
          {trend && (
            <p className={`text-sm mt-2 ${trend.isPositive ? 'text-green-600' : 'text-red-600'}`}>
              {trend.isPositive ? '↑' : '↓'} {Math.abs(trend.value)}%
            </p>
          )}
        </div>
        {icon && (
          <div className="text-gray-400">
            {icon}
          </div>
        )}
      </div>
    </Card>
  );
};

export default Card;