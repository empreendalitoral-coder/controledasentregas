import { useEffect, useState, type ImgHTMLAttributes } from "react";
import { downloadPrivatePhoto } from "@/lib/private-photo";

export function PrivatePhoto({ bucket, path, ...props }: Omit<ImgHTMLAttributes<HTMLImageElement>, "src"> & { bucket: "feed-photos" | "community-photos"; path: string }) {
  const [photo, setPhoto] = useState<{ path: string; url: string } | null>(null);
  useEffect(() => {
    let active = true;
    let url: string | undefined;
    setPhoto(null);
    void downloadPrivatePhoto(bucket, path).then((blob) => {
      if (!active) return;
      url = URL.createObjectURL(blob);
      setPhoto({ path, url });
    }).catch(() => { if (active) setPhoto(null); });
    return () => { active = false; if (url) URL.revokeObjectURL(url); };
  }, [bucket, path]);
  if (!photo || photo.path !== path) return <span role="img" aria-label="Foto indisponível" className={props.className} />;
  return <img {...props} src={photo.url} />;
}