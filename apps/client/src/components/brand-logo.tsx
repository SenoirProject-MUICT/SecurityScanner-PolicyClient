import { BRAND } from '@/constants/brand'

type BrandLogoProps = {
  className?: string
  inverse?: boolean
}

export function BrandLogo({ className = '', inverse = false }: BrandLogoProps) {
  return <span role="img" aria-label={BRAND.name} className={`brand-logo-lockup${inverse ? ' is-inverse' : ''}${className ? ` ${className}` : ''}`}>
    <img className="brand-logo-on-light" src={BRAND.logoDark} alt="" aria-hidden="true" />
    <img className="brand-logo-on-dark" src={BRAND.logoLight} alt="" aria-hidden="true" />
  </span>
}

export function BrandMark({ className = '' }: Pick<BrandLogoProps, 'className'>) {
  return <span className={`brand-mark${className ? ` ${className}` : ''}`} aria-hidden="true">
    <img className="brand-mark-on-light" src={BRAND.markDark} alt="" />
    <img className="brand-mark-on-dark" src={BRAND.markLight} alt="" />
  </span>
}
