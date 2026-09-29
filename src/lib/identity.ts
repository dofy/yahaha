import domains from '../data/domains.json' with { type: 'json' }

export function siteIdentity(hostname: string) {
  const host = hostname.toLowerCase().replace(/\.$/u, '')
  const knownDomain = domains.find(
    ({ url }) => new URL(url).hostname === host.replace(/^www\./u, '')
  )

  return {
    name: knownDomain?.name ?? (host || 'Seven'),
    domain: knownDomain ? new URL(knownDomain.url).hostname : host
  }
}
