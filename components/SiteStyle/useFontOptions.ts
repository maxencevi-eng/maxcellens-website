"use client";

import { useMemo } from 'react';
import { useSiteStyle } from './SiteStyleProvider';
import { STYLE_FONT_OPTIONS, fontFamilyOptions } from '../../lib/typography';

/**
 * Options communes à toutes les listes « Police » de l'administration :
 * valeur par défaut, polices des styles du site, polices importées
 * (regroupées par famille) puis polices système.
 * Une valeur enregistrée absente de la liste reste sélectionnable.
 */
export default function useFontOptions(current?: string, defaultLabel = 'Par défaut (style du site)') {
  const { style } = useSiteStyle();
  return useMemo(() => {
    const options = [{ value: '', label: defaultLabel }, ...STYLE_FONT_OPTIONS, ...fontFamilyOptions(style.fonts)];
    if (current && !options.some((o) => o.value === current)) options.push({ value: current, label: `${current} (actuelle)` });
    return options;
  }, [style.fonts, current, defaultLabel]);
}
