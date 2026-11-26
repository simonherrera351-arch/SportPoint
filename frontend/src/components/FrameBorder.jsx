import './FrameBorder.css'

/**
 * Borde con degradado verde + glow.
 * variant: 'card' (cards), 'page' (marco de cada vista), 'modal' (ventanas)
 * intro: al montarse el borde se "dibuja" (línea arriba que se abre y baja por los lados)
 * animated: degradado girando en loop
 */
export default function FrameBorder({ children, className = '', variant = 'card', intro = false, animated = false }) {
  const cls = ['frame-border', `frame-border--${variant}`, intro && 'frame-border--intro', animated && 'frame-border--spin', className]
    .filter(Boolean).join(' ')
  return <div className={cls}>{children}</div>
}
