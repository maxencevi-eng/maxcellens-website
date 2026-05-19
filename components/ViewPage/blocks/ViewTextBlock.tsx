"use client";
import React from 'react';
import type { ViewBlock } from '../types';
import styles from './blocks.module.css';

export default function ViewTextBlock({ block }: { block: ViewBlock }) {
  const fontSize = block.fontSize && block.fontSize >= 8 && block.fontSize <= 120 ? block.fontSize : 15;
  const align = block.align || 'left';
  const color = block.textColor || undefined;
  const fontFamily = block.fontFamily || undefined;

  return (
    <div
      className={styles.textContent}
      style={{ fontSize, textAlign: align, color, fontFamily }}
      dangerouslySetInnerHTML={{ __html: block.textHtml || '' }}
    />
  );
}
