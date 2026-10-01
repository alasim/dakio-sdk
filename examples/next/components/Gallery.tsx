'use client'
import { useState } from 'react'

export default function Gallery({ images, name }: { images: string[]; name: string }) {
  const [i, setI] = useState(0)
  return (
    <div className="gallery">
      <div className="gallery-main">{images[i] ? <img src={images[i]} alt={name} /> : <div className="img-empty" />}</div>
      {images.length > 1 && (
        <div className="thumbs">{images.map((src, k) => <button key={src} className={k === i ? 'on' : ''} onClick={() => setI(k)}><img src={src} alt="" /></button>)}</div>
      )}
    </div>
  )
}
