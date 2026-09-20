/** Apply the new presentation once; subsequent admin saves retain all choices. */
export function editorialPresentation<T extends object>(key: string, data: T): T {
  if ((data as { presentationVersion?: number }).presentationVersion === 1) return data;
  const common = { borderRadiusTop: 0, borderRadiusBottom: 0, paddingTop: 44, paddingBottom: 44 };
  if (key === "home_stats") return { ...data, ...common, backgroundColor: "#f3f1ed" };
  if (key === "home_animation") return { ...data, ...common, paddingTop: 0, paddingBottom: 0, blockTitleFontSize: 36, blockSubtitleFontSize: 15, blockTitleAlign: "left", blockSubtitleAlign: "left", blockTitleStyle: "h2", backgroundColor: "#192425" };
  if (key === "home_quote") return { ...data, ...common, blockTitleFontSize: 11, blockSubtitleFontSize: 34, blockTitleAlign: "left", blockSubtitleAlign: "left", blockTitleStyle: "p", blockSubtitleStyle: "h2", backgroundColor: "#192425" };
  return data;
}

export function editorialClients(data: Record<string, string>) {
  if (data.clients_presentation_version === "1") return data;
  return { ...data, clients_bg: "#f3f1ed", clients_title_font_size: "10", clients_title_color: "#777b7e", clients_title_align: "left", clients_padding_top: "24", clients_padding_bottom: "24", clients_radius_top: "0", clients_radius_bottom: "0", clients_logo_filter: "grayscale" };
}
