"use client";

import React from "react";
import { motion, type Variants } from "framer-motion";

const viewport = { once: true, amount: 0.15 };
const transition = { duration: 0.5, ease: [0.25, 0.46, 0.45, 0.94] };

export const variants: Record<string, Variants> = {
  /** Texte : fondu + léger slide du bas */
  fadeUp: {
    hidden: { opacity: 0, y: 20 },
    visible: { opacity: 1, y: 0 },
  },
  /** Texte : fondu seul */
  fade: {
    hidden: { opacity: 0 },
    visible: { opacity: 1 },
  },
  /** Image : fondu + slide du haut vers le bas (entrée douce) */
  slideDown: {
    hidden: { opacity: 0, y: -24 },
    visible: { opacity: 1, y: 0 },
  },
  /** Image : fondu + slide du bas (plus marqué) */
  slideUp: {
    hidden: { opacity: 0, y: 28 },
    visible: { opacity: 1, y: 0 },
  },
  /** Contenu : entrée depuis la gauche */
  slideFromLeft: {
    hidden: { opacity: 0, x: -24 },
    visible: { opacity: 1, x: 0 },
  },
  /** Contenu : entrée depuis la droite */
  slideFromRight: {
    hidden: { opacity: 0, x: 24 },
    visible: { opacity: 1, x: 0 },
  },
  /** Carte / bloc : léger scale + fondu */
  scaleIn: {
    hidden: { opacity: 0, scale: 0.98 },
    visible: { opacity: 1, scale: 1 },
  },
  /** Enfants décalés (stagger) : le parent utilise staggerChildren */
  stagger: {
    visible: { transition: { staggerChildren: 0.08, delayChildren: 0.05 } },
    hidden: {},
  },
  staggerItem: {
    hidden: { opacity: 0, y: 16 },
    visible: { opacity: 1, y: 0 },
  },
};

export type AnimateVariant = keyof typeof variants;

type Props = {
  variant?: AnimateVariant;
  children: React.ReactNode;
  as?: keyof typeof motion;
  className?: string;
  style?: React.CSSProperties;
  /** Délai en secondes avant le début de l’animation */
  delay?: number;
};

export default function AnimateInView({
  variant = "fadeUp",
  children,
  as = "div",
  className,
  style,
  delay = 0,
}: Props) {
  const Component = motion[as] as typeof motion.div;
  const v = variants[variant];
  const isStagger = variant === "stagger";

  return (
    <Component
      initial="hidden"
      whileInView="visible"
      viewport={viewport}
      variants={v}
      transition={
        isStagger
          ? { staggerChildren: 0.08, delayChildren: 0.05 }
          : { ...transition, delay }
      }
      className={className}
      style={style}
    >
      {children}
    </Component>
  );
}

/** Enfant pour stagger : à utiliser à l’intérieur d’AnimateInView variant="stagger" */
export function AnimateStaggerItem({
  children,
  className,
  style,
}: {
  children: React.ReactNode;
  className?: string;
  style?: React.CSSProperties;
}) {
  return (
    <motion.div
      variants={variants.staggerItem}
      transition={transition}
      className={className}
      style={style}
    >
      {children}
    </motion.div>
  );
}
