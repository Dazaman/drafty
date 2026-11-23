import Image from "next/image";
import { BRAND } from "@/lib/brand";

export default function BrandMark({ className="", size=44 }: { className?: string; size?: number }) {
  return <Image className={`club-crest ${className}`} src={BRAND.crest} width={size} height={Math.round(size*92/80)} alt="" unoptimized/>;
}
