// Types pour Bureau à la Carte
// ============================================================

export type ProfilType = 'admin' | 'technique' | 'groupe-acteur';
export type ActeType = '1' | '2' | '3' | '4' | 'intro' | 'final';
export type SessionStatut = 'en-preparation' | 'en-cours' | 'terminee' | 'archivee';
export type ChoixStatut = 'choisi' | 'valide';
export type VariantLettre = 'A' | 'B' | 'C';

// ---- Profils ----
export interface BacProfil {
  id: string;
  slug: string;
  nom: string;
  type: ProfilType;
  couleur: string;
  mot_de_passe_hash?: string;
  mot_de_passe_clair?: string;
  actif: boolean;
  ordre_affichage: number;
  nb_scenes_requis?: number; // default 4, for groupe-acteur
  created_at: string;
}

// ---- Rôles ----
export interface BacRole {
  id: string;
  groupe_slug: string;
  nom: string;
  description: string;
  couleur: string;
  actif: boolean;
  created_at: string;
  variants?: BacVariant[];
}

// ---- Variants ----
export interface BacVariant {
  id: string;
  role_id: string;
  lettre: VariantLettre;
  nom: string;
  description: string;
  emoji: string;
}

// ---- Thème ----
export interface BacTheme {
  id: string;
  titre: string;
  description: string;
  actif: boolean;
  created_at: string;
}

// ---- Révélation (formerly Thème) — scène d'intro scripted ----
export interface BacRevelation {
  id: string;
  titre: string;
  description: string;
  ton_principal: string;
  ton_secondaire: string;
  duree_min: number;
  duree_max: number;
  fil_rouge: string;
  groupes_concernes: string[];
  script_json: ScriptBloc[];
  itw_json: ItwQuestion[];
  notes_real_json: NotesRealisation;
  actif: boolean;
  created_at: string;
  updated_at: string;
}

// ---- Dénouement (formerly Révélation) — scène de finale scripted ----
export interface BacDenouement {
  id: string;
  titre: string;
  description: string;
  ton_principal: string;
  ton_secondaire: string;
  duree_min: number;
  duree_max: number;
  fil_rouge: string;
  groupes_concernes: string[];
  script_json: ScriptBloc[];
  itw_json: ItwQuestion[];
  notes_real_json: NotesRealisation;
  actif: boolean;
  created_at: string;
  updated_at: string;
}

// ---- Script blocks ----
export interface ScriptBlocDidascalie {
  type: 'didascalie';
  texte: string;
  style: 'ouverture' | 'intermediaire' | 'cloture' | 'regard-camera';
}

export interface ScriptBlocReplique {
  type: 'replique';
  role_id: string;
  directive: string;
  exemple: string;
  utilise_champ_perso: boolean;
  didascalie?: string;
}

export type ScriptBloc = ScriptBlocDidascalie | ScriptBlocReplique;

// ---- ITW ----
export interface ItwQuestion {
  role_id: string;
  question: string;
  reponse_variant_a: string;
  reponse_variant_b: string;
  reponse_variant_c: string;
}

// ---- Notes réalisation ----
export interface NotesRealisation {
  cadrage: string;
  rythme: string;
  silences: string;
  pieges: string;
  astuce: string;
}

// ---- Scènes ----
export interface BacScene {
  id: string;
  titre: string;
  acte: ActeType;
  ton_principal: string;
  ton_secondaire: string;
  duree_min: number;
  duree_max: number;
  difficulte: number;
  groupes_concernes: string[];
  groupe_acteur: string | null;
  nb_intervenants_min: number;
  nb_intervenants_max: number;
  fil_rouge: string;
  champ_perso_label: string | null;
  champ_perso_exemple: string | null;
  champ_perso_replique_cible: number | null;
  script_json: ScriptBloc[];
  itw_json: ItwQuestion[];
  notes_real_json: NotesRealisation;
  actif: boolean;
  created_at: string;
  updated_at: string;
}

// ---- Histoire ----
export interface BacHistoireScene {
  id: string;
  histoire_id: string;
  scene_id: string;
  ordre: number;
  created_at: string;
  // Joined
  scene?: BacScene;
}

export interface BacHistoire {
  id: string;
  titre: string;
  description: string;
  revelation_id: string | null;
  denouement_id: string | null;
  actif: boolean;
  created_at: string;
  updated_at: string;
  // Joined
  revelation?: BacRevelation;
  denouement?: BacDenouement;
  scenes?: BacHistoireScene[];
}

// ---- Sessions ----
export interface BacSession {
  id: string;
  nom_entreprise: string;
  date_jour_j: string | null;
  lieu: string;
  nb_participants: number;
  min_scenes?: number | null;
  max_scenes?: number | null;
  histoire_id: string | null;
  groupes_actifs: string[];
  statut: SessionStatut;
  snapshot_scenes_json: BacScene[];
  documents_generes_json: any | null;
  created_at: string;
  updated_at: string;
  // Joined
  histoire?: BacHistoire;
}

// ---- Casting ----
export interface BacCasting {
  id: string;
  session_id: string;
  groupe_slug: string;
  prenom: string;
  role_id: string | null;
  variant_id: string | null;
  ordre: number;
  created_at: string;
  updated_at: string;
  // Joined
  role?: BacRole;
  variant?: BacVariant;
}

// ---- Choix scènes ----
export interface BacChoixScene {
  id: string;
  session_id: string;
  groupe_slug: string;
  acte: string;
  scene_id: string;
  statut: ChoixStatut;
  created_at: string;
}

// ---- Saisies acteurs ----
export interface BacSaisie {
  id: string;
  session_id: string;
  groupe_slug: string;
  scene_id: string;
  bloc_index: number;
  texte_saisi: string;
  acteur_id: string | null;
  champ_perso_valeur: string | null;
  updated_at: string;
}

// ---- Auth ----
export interface BacAuthPayload {
  profil_slug: string;
  profil_type: ProfilType;
  session_id?: string;
  exp: number;
}

