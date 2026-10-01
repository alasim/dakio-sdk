import type { Store } from '@dakio/sdk'

export default function Footer({ store }: { store: Store }) {
  const { contact, social } = store
  const wa = contact.whatsapp?.replace(/\D/g, '').replace(/^88/, '')
  return (
    <footer className="footer">
      <div className="wrap footer-row">
        <div>
          <div className="footer-name">{store.name}</div>
          {store.description && <p>{store.description}</p>}
          <p>Cash on delivery all over Bangladesh.</p>
        </div>
        <div>
          {contact.phone && <p>Call <a href={`tel:${contact.phone}`}>{contact.phone}</a></p>}
          {wa && <p>WhatsApp <a href={`https://wa.me/88${wa}`}>{contact.whatsapp}</a></p>}
          {contact.email && <p><a href={`mailto:${contact.email}`}>{contact.email}</a></p>}
          {contact.address && <p>{contact.address}{contact.city ? `, ${contact.city}` : ''}</p>}
        </div>
        <div>
          {social.facebook && <p><a href={social.facebook} target="_blank" rel="noreferrer">Facebook</a></p>}
          {social.instagram && <p><a href={social.instagram} target="_blank" rel="noreferrer">Instagram</a></p>}
          <p className="powered">Powered by <a href="https://www.dakio.io" target="_blank" rel="noreferrer">Dakio</a></p>
        </div>
      </div>
    </footer>
  )
}
