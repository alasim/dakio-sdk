import { useStore } from '../StoreContext.jsx'

export default function Footer() {
  const { store } = useStore()
  if (!store) return null
  const { contact, social } = store
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
          {contact.whatsapp && <p>WhatsApp <a href={`https://wa.me/88${contact.whatsapp.replace(/\D/g, '').replace(/^88/, '')}`}>{contact.whatsapp}</a></p>}
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
