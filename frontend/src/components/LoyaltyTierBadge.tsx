import React from 'react';
import { Crown, Award, Medal } from 'lucide-react';

interface LoyaltyTierBadgeProps {
  tier: 'Bronze' | 'Silver' | 'Gold';
  size?: 'sm' | 'md' | 'lg';
  showLabel?: boolean;
}

const tierConfig = {
  Gold: {
    icon: Crown,
    bgColor: 'bg-amber-100',
    textColor: 'text-amber-700',
    borderColor: 'border-amber-300',
    iconColor: 'text-amber-500',
    label: 'Gold Member',
  },
  Silver: {
    icon: Award,
    bgColor: 'bg-slate-100',
    textColor: 'text-slate-600',
    borderColor: 'border-slate-300',
    iconColor: 'text-slate-400',
    label: 'Silver Member',
  },
  Bronze: {
    icon: Medal,
    bgColor: 'bg-orange-100',
    textColor: 'text-orange-700',
    borderColor: 'border-orange-300',
    iconColor: 'text-orange-500',
    label: 'Bronze Member',
  },
};

const sizeConfig = {
  sm: {
    container: 'px-2 py-0.5 text-xs',
    icon: 'w-3 h-3',
  },
  md: {
    container: 'px-3 py-1 text-sm',
    icon: 'w-4 h-4',
  },
  lg: {
    container: 'px-4 py-1.5 text-base',
    icon: 'w-5 h-5',
  },
};

export const LoyaltyTierBadge: React.FC<LoyaltyTierBadgeProps> = ({
  tier,
  size = 'md',
  showLabel = true,
}) => {
  const config = tierConfig[tier];
  const sizeStyles = sizeConfig[size];
  const Icon = config.icon;

  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full border font-medium
        ${config.bgColor} ${config.textColor} ${config.borderColor} ${sizeStyles.container}`}
    >
      <Icon className={`${sizeStyles.icon} ${config.iconColor}`} />
      {showLabel && <span>{tier}</span>}
    </span>
  );
};

interface TierProgressProps {
  currentPurchases: number;
  currentTier: 'Bronze' | 'Silver' | 'Gold';
}

export const TierProgress: React.FC<TierProgressProps> = ({
  currentPurchases,
  currentTier,
}) => {
  const thresholds = {
    Bronze: 0,
    Silver: 20000,
    Gold: 50000,
  };

  const getNextTier = () => {
    if (currentTier === 'Bronze') return 'Silver';
    if (currentTier === 'Silver') return 'Gold';
    return null;
  };

  const nextTier = getNextTier();
  
  if (!nextTier) {
    return (
      <div className="bg-amber-50 border border-amber-200 rounded-lg p-3">
        <div className="flex items-center gap-2">
          <Crown className="w-5 h-5 text-amber-500" />
          <span className="font-medium text-amber-700">You've reached the highest tier!</span>
        </div>
      </div>
    );
  }

  const currentThreshold = thresholds[currentTier];
  const nextThreshold = thresholds[nextTier];
  const progress = ((currentPurchases - currentThreshold) / (nextThreshold - currentThreshold)) * 100;
  const remaining = nextThreshold - currentPurchases;

  return (
    <div className="bg-muted/50 rounded-lg p-3">
      <div className="flex items-center justify-between mb-2">
        <span className="text-sm text-muted-foreground">Progress to {nextTier}</span>
        <span className="text-sm font-medium text-foreground">
          ₹{remaining.toLocaleString()} to go
        </span>
      </div>
      <div className="h-2 bg-muted rounded-full overflow-hidden">
        <div
          className={`h-full rounded-full transition-all ${
            nextTier === 'Gold' ? 'bg-amber-400' : 'bg-slate-400'
          }`}
          style={{ width: `${Math.min(progress, 100)}%` }}
        />
      </div>
      <p className="text-xs text-muted-foreground mt-1">
        Total purchases: ₹{currentPurchases.toLocaleString()}
      </p>
    </div>
  );
};
