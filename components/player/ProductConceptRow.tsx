"use client";

import Image from "next/image";
import * as DialogPrimitive from "@radix-ui/react-dialog";
import { ArrowUpRight, Play, X } from "lucide-react";
import { Dialog, DialogClose, DialogDescription, DialogPortal, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { DANTE_PRODUCT_CONCEPTS } from "@/lib/preview-lockers/getty-product-concepts";
import styles from "./product-concept-row.module.css";

const price = (amount: number) => new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 }).format(amount);

/** Static meeting showcase. No checkout, order creation, or purchasing actions. */
export function ProductConceptRow({ onResume }: { onResume?: () => void }) {
  return <section className={styles.section} aria-labelledby="product-concepts-heading" data-demo="true">
    <div className={styles.header}>
      <div>
        <p className={styles.eyebrow}>GETTY ARCHIVE IMAGERY</p>
        <h2 id="product-concepts-heading">Print-on-demand concepts</h2>
      </div>
      {onResume && <button type="button" className={styles.resume} onClick={onResume} aria-label="Resume slideshow" title="Resume slideshow"><Play aria-hidden="true" /></button>}
    </div>
    <div className={styles.row} aria-label="Five product examples">
      {DANTE_PRODUCT_CONCEPTS.map(product => <Dialog key={product.id}>
        <DialogTrigger asChild>
          <button type="button" className={styles.card} aria-label={`Preview ${product.title}`}>
            <span className={styles.visual}>
              <Image src={product.image} alt={product.alt} width={1000} height={1000} unoptimized loading="lazy" />
              <span className={styles.preview}>View concept <ArrowUpRight aria-hidden="true" /></span>
            </span>
            <span className={styles.cardTitle}>{product.title}</span>
          </button>
        </DialogTrigger>
        <DialogPortal>
          <DialogPrimitive.Overlay className={styles.backdrop} />
          <DialogPrimitive.Content className={styles.modal} aria-modal="true">
            <DialogClose className={styles.close} aria-label="Close product concept"><X aria-hidden="true" /></DialogClose>
            <p className={styles.eyebrow}>PRODUCT CONCEPT</p>
            <DialogTitle className={styles.title}>{product.title}</DialogTitle>
            <Image className={styles.modalImage} src={product.image} alt={product.alt} width={1000} height={1000} unoptimized />
            <DialogDescription className={styles.description}>{product.description}</DialogDescription>
            <div className={styles.purchase}>
              <div className={styles.price}><span>Estimated price · USD</span><strong>{price(product.estimatedPriceUsd)}</strong></div>
              <button type="button" className={styles.buy} disabled>Buy Now</button>
            </div>
            <p className={styles.note}>Concept mockup with illustrative pricing. Not available for purchase.</p>
            <div className={styles.sources} aria-label="Getty source images">
              {product.sources.map(source => <a key={source.id} href={source.url} target="_blank" rel="noopener noreferrer">Getty source · {source.id} <ArrowUpRight aria-hidden="true" /><span className={styles.srOnly}> (opens in a new tab)</span></a>)}
            </div>
          </DialogPrimitive.Content>
        </DialogPortal>
      </Dialog>)}
    </div>
    <p className={styles.caption}>Five product concepts, inspired by Dante’s career archive.</p>
  </section>;
}
