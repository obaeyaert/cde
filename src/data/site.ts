export const site = {
  name: 'CDE Groupe',
  legalName: 'Comptoir Distribution Exportation',
  url: 'https://www.cdegroupe.com',
  logo: '/media/2026/07/cde-logo2-white.png',
  phone: '+33 4 74 58 18 05',
  phoneHref: '+33474581805',
  email: 'contact@cdegroupe.com',
  address: {
    street: '6 rue Eugène Genet, Place de la Passerelle',
    postalCode: '69420',
    city: 'Condrieu',
    country: 'FR',
  },
  tagline:
    "CDE Groupe est le spécialiste de l’équipement hôtelier en France métropolitaine et dans les DomTom. " +
    "Art de la table, produits d’hygiène, produits d’accueil, tissus d’ameublement, literie, mobilier " +
    "d’extérieur, accessoires de salle de bain.",
  since: 2018,
} as const;

export type NavItem = { label: string; href: string; children?: NavItem[] };

/* Menu relevé à l'identique sur le site WordPress */
export const nav: NavItem[] = [
  {
    label: 'Matériel hôtelier',
    href: '/materiel-hotelier/linge-hotel/',
    children: [
      { label: 'Produits d’accueil', href: '/materiel-hotelier/produit-d-accueil-hotel/' },
      { label: 'Mobilier d’intérieur', href: '/materiel-hotelier/mobilier-interieur-hotel/' },
      { label: 'Mobilier d’extérieur', href: '/materiel-hotelier/mobilier-exterieur-hotellerie/' },
      { label: 'Art de la table', href: '/materiel-hotelier/art-de-la-table/' },
      { label: 'Literie', href: '/materiel-hotelier/literie-hotel/' },
      { label: 'Accessoires de salle de bain', href: '/materiel-hotelier/accessoire-de-salle-de-bain-hotel/' },
      { label: 'Linge', href: '/materiel-hotelier/linge-hotel/' },
      { label: 'Tissus d’ameublement', href: '/materiel-hotelier/tissu-d-ameublement-hotel/' },
    ],
  },
  {
    label: 'Aménagement et équipement',
    href: '/amenagement-et-equipement/equipement-hotel-ocean-indien/',
    children: [
      { label: 'Dans l’océan indien', href: '/amenagement-et-equipement/equipement-hotel-ocean-indien/' },
      { label: 'Dans les caraïbes', href: '/amenagement-et-equipement/equipement-hotel-caraibes/' },
      { label: 'En Polynésie française', href: '/amenagement-et-equipement/equipement-hotel-polynesie-francaise/' },
      { label: 'En Afrique', href: '/amenagement-et-equipement/equipement-hotel-afrique/' },
      { label: 'En France', href: '/amenagement-et-equipement/equipement-hotel-france/' },
    ],
  },
  { label: 'Marques', href: '/marques-partenaires/' },
  {
    label: 'Réalisations',
    href: '/nos-clients/les-antilles/',
    children: [
      { label: 'Les Antilles', href: '/nos-clients/les-antilles/' },
      { label: 'L’Océan Indien', href: '/nos-clients/ocean-indien/' },
      { label: 'La Polynésie française', href: '/nos-clients/polynesie-francaise/' },
      { label: 'Le reste du monde', href: '/nos-clients/le-reste-du-monde/' },
    ],
  },
  { label: 'Contact', href: '/contact/' },
];
