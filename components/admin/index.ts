/**
 * Point d'entrée unique du design system admin.
 *
 * Toute modale, tout écran et tout bouton d'administration importe depuis ici.
 * Aucun composant admin ne doit styler en inline ni redéfinir une couleur :
 * les valeurs vivent dans `tokens.css`.
 */

export { default as AdminModal } from './AdminModal/AdminModal';
export type { AdminModalProps, AdminModalSize } from './AdminModal/AdminModal';

export { default as AdminButton } from './AdminButton';
export type { AdminButtonProps, AdminButtonVariant } from './AdminButton';

export { default as AdminTabs } from './AdminTabs';
export type { AdminTab, AdminTabsProps } from './AdminTabs';

export {
  default as AdminSection,
  AdminCard,
  AdminNotice,
  AdminEmpty,
  AdminSpan,
} from './AdminSection';

export { default as AdminToolbar } from './AdminToolbar';

export { default as AdminDialogHost } from './AdminDialogHost';
export { confirmDialog, promptDialog, alertDialog } from './dialog';

export { default as Field } from './fields/Field';
export { default as TextField } from './fields/TextField';
export { default as NumberField } from './fields/NumberField';
export { default as SliderField } from './fields/SliderField';
export { default as ColorField } from './fields/ColorField';
export { default as SelectField } from './fields/SelectField';
export { default as ToggleField } from './fields/ToggleField';
export { default as SegmentedField } from './fields/SegmentedField';
export { default as ImageField } from './fields/ImageField';
export type { AdminImageValue } from './fields/ImageField';
export type { SelectOption } from './fields/SelectField';
export type { SegmentedOption } from './fields/SegmentedField';

export { default as useAdminForm } from './useAdminForm';
export type { AdminForm } from './useAdminForm';

export { default as useFocusTrap } from './useFocusTrap';

export { contrastRatio, contrastVerdict, parseColor, readableInk } from './contrast';
