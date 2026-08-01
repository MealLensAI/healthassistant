import React from 'react';

interface LogoProps {
    size?: 'sm' | 'md' | 'lg' | 'xl';
    className?: string;
}

const Logo: React.FC<LogoProps> = ({ size = 'md', className = '' }) => {
    const sizeConfig = {
        sm: 'text-base',
        md: 'text-lg',
        lg: 'text-xl',
        xl: 'text-2xl',
    };

    return (
        <span
            className={`font-display font-bold text-primary tracking-tight ${sizeConfig[size]} ${className}`}
        >
            MealLensAI
        </span>
    );
};

export default Logo;
