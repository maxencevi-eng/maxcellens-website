/**
 * Ancienne présentation « éditoriale » (fonds, arrondis et marges imposés) :
 * le design studio de la page d'accueil gère désormais ces valeurs par défaut,
 * les données sont donc transmises telles quelles.
 */
export function editorialPresentation<T extends object>(_key: string, data: T): T {
  return data;
}

export function editorialClients(data: Record<string, string>) {
  if (data.clients_presentation_version === "1") return data;
  return { ...data, clients_bg: "#f3f1ed", clients_title_font_size: "10", clients_title_color: "#777b7e", clients_title_align: "left", clients_padding_top: "24", clients_padding_bottom: "24", clients_radius_top: "0", clients_radius_bottom: "0", clients_logo_filter: "grayscale" };
}
