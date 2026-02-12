import { Helmet } from 'react-helmet-async';

const SITE_URL = import.meta.env.VITE_SITE_URL || 'https://bicommunity.ru';
const DEFAULT_OG_IMAGE = `${SITE_URL}/favicon.svg`;

interface SeoHeadProps {
  title: string;
  description?: string;
  canonical?: string;
  noIndex?: boolean;
  ogImage?: string;
  jsonLd?: object;
}

export default function SeoHead({
  title,
  description,
  canonical,
  noIndex = false,
  ogImage = DEFAULT_OG_IMAGE,
  jsonLd,
}: SeoHeadProps) {
  const baseTitle = 'BI Community';
  const fullTitle = title === baseTitle ? title : `${title} | ${baseTitle}`;
  const canonicalUrl = canonical ? (canonical.startsWith('http') ? canonical : `${SITE_URL}${canonical}`) : undefined;

  return (
    <Helmet>
      <title>{fullTitle}</title>
      {description && <meta name="description" content={description} />}
      {canonicalUrl && <link rel="canonical" href={canonicalUrl} />}
      {noIndex && <meta name="robots" content="noindex, nofollow" />}

      <meta property="og:title" content={fullTitle} />
      {description && <meta property="og:description" content={description} />}
      <meta property="og:image" content={ogImage} />
      {canonicalUrl && <meta property="og:url" content={canonicalUrl} />}

      <meta name="twitter:title" content={fullTitle} />
      {description && <meta name="twitter:description" content={description} />}

      {jsonLd && (
        <script type="application/ld+json">{JSON.stringify(jsonLd)}</script>
      )}
    </Helmet>
  );
}
