'use client'

import {
  CheckCircle as CheckCircleIcon,
  Home as HomeIcon,
  Notifications as NotificationsIcon,
  Person as PersonIcon,
  Restaurant as RestaurantIcon,
} from '@mui/icons-material'
import { useEffect, useState } from 'react'

interface AnimatedIconProps {
  type: 'home' | 'restaurant' | 'check' | 'notifications' | 'person'
  isActive: boolean
  className?: string
}

export default function AnimatedIcon({ type, isActive, className = '' }: AnimatedIconProps) {
  const [isAnimating, setIsAnimating] = useState(false)
  const [justActivated, setJustActivated] = useState(false)

  useEffect(() => {
    if (isActive && !justActivated) {
      setIsAnimating(true)
      setJustActivated(true)
      const timer = setTimeout(() => {
        setIsAnimating(false)
        setJustActivated(false)
      }, 800)
      return () => clearTimeout(timer)
    }
    if (!isActive) {
      setJustActivated(false)
    }
  }, [isActive])

  const getIconColors = () => {
    switch (type) {
      case 'home':
        return {
          active: 'text-orange-500',
          inactive: 'text-slate-400 hover:text-orange-300',
          glow: 'bg-orange-500/20',
          shadow: 'rgba(249, 115, 22, 0.4)',
          gradient: 'from-orange-400 to-red-500'
        }
      case 'restaurant':
        return {
          active: 'text-green-500',
          inactive: 'text-slate-400 hover:text-green-300',
          glow: 'bg-green-500/20',
          shadow: 'rgba(34, 197, 94, 0.4)',
          gradient: 'from-green-400 to-emerald-500'
        }
      case 'check':
        return {
          active: 'text-blue-500',
          inactive: 'text-slate-400 hover:text-blue-300',
          glow: 'bg-blue-500/20',
          shadow: 'rgba(59, 130, 246, 0.4)',
          gradient: 'from-blue-400 to-indigo-500'
        }
      case 'notifications':
        return {
          active: 'text-purple-500',
          inactive: 'text-slate-400 hover:text-purple-300',
          glow: 'bg-purple-500/20',
          shadow: 'rgba(168, 85, 247, 0.4)',
          gradient: 'from-purple-400 to-pink-500'
        }
      case 'person':
        return {
          active: 'text-cyan-500',
          inactive: 'text-slate-400 hover:text-cyan-300',
          glow: 'bg-cyan-500/20',
          shadow: 'rgba(6, 182, 212, 0.4)',
          gradient: 'from-cyan-400 to-blue-500'
        }
      default:
        return {
          active: 'text-orange-500',
          inactive: 'text-slate-400',
          glow: 'bg-orange-500/20',
          shadow: 'rgba(249, 115, 22, 0.4)',
          gradient: 'from-orange-400 to-red-500'
        }
    }
  }

  const getIcon = () => {
    const colors = getIconColors()
    const baseIconProps = {
      fontSize: 'medium' as const,
      className: `transition-all duration-500 ease-out transform ${
        isActive 
          ? `${colors.active} scale-110 rotate-[5deg]` 
          : `${colors.inactive} scale-100 rotate-0`
      } ${
        isAnimating 
          ? 'animate-bounce' 
          : ''
      } ${className}`,
      style: {
        filter: isActive 
          ? `drop-shadow(0 4px 8px ${colors.shadow}) brightness(1.1)` 
          : 'brightness(0.8)',
        transition: 'all 0.5s cubic-bezier(0.4, 0, 0.2, 1)'
      }
    }

    const IconComponent = (() => {
      switch (type) {
        case 'home': return HomeIcon
        case 'restaurant': return RestaurantIcon
        case 'check': return CheckCircleIcon
        case 'notifications': return NotificationsIcon
        case 'person': return PersonIcon
        default: return HomeIcon
      }
    })()

    return (
      <div className={`relative ${isAnimating ? 'animate-pulse' : ''}`}>
        <IconComponent {...baseIconProps} />
        
        {/* Animated background glow */}
        {isActive && (
          <>
            <div className={`absolute inset-0 ${colors.glow} rounded-full scale-150 animate-ping opacity-75`}></div>
            <div className={`absolute inset-0 bg-gradient-to-r ${colors.gradient} opacity-20 rounded-full scale-125 animate-pulse`}></div>
          </>
        )}
        
        {/* Extra animation on activation */}
        {isAnimating && (
          <div className={`absolute inset-0 ${colors.glow} rounded-full scale-200 animate-ping opacity-50`}></div>
        )}
      </div>
    )
  }

  return (
    <div className={`relative flex items-center justify-center transition-all duration-500 ease-out ${
      isActive ? 'transform scale-105' : 'scale-100'
    }`}>
      {getIcon()}
      
      {/* Ripple effect on tap */}
      {isAnimating && (
        <div className={`absolute inset-0 border-2 ${
          getIconColors().active.replace('text-', 'border-')
        } rounded-full scale-150 animate-ping opacity-30`}></div>
      )}
    </div>
  )
}
