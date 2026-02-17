import { useQuery } from "@tanstack/react-query";
import { useEffect, useRef, useState, useCallback } from "react";
import { Link } from "wouter";
import { slugify } from "@shared/slugify";

interface GalleryItem {
  competitionId: number;
  competitionTitle: string;
  category: string;
  thumbnail: string | null;
  videoEmbedUrl: string | null;
  topContestantName: string | null;
  voteCount: number;
}

export default function HeroCoverflowGallery() {
  const { data: items = [] } = useQuery<GalleryItem[]>({
    queryKey: ["/api/hero-gallery"],
    staleTime: 60000,
  });

  const [currentIndex, setCurrentIndex] = useState(0);
  const [isAnimating, setIsAnimating] = useState(false);
  const autoplayRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const totalItems = items.length;

  const startAutoplay = useCallback(() => {
    if (autoplayRef.current) clearInterval(autoplayRef.current);
    autoplayRef.current = setInterval(() => {
      setCurrentIndex(prev => (prev + 1) % (totalItems || 1));
    }, 15000);
  }, [totalItems]);

  useEffect(() => {
    if (totalItems > 1) {
      startAutoplay();
    }
    return () => {
      if (autoplayRef.current) clearInterval(autoplayRef.current);
    };
  }, [totalItems, startAutoplay]);

  const navigate = useCallback((direction: number) => {
    if (isAnimating || totalItems === 0) return;
    setIsAnimating(true);
    setCurrentIndex(prev => {
      let next = prev + direction;
      if (next < 0) next = totalItems - 1;
      else if (next >= totalItems) next = 0;
      return next;
    });
    startAutoplay();
    setTimeout(() => setIsAnimating(false), 600);
  }, [isAnimating, totalItems, startAutoplay]);

  const goToIndex = useCallback((index: number) => {
    if (isAnimating || index === currentIndex) return;
    setIsAnimating(true);
    setCurrentIndex(index);
    startAutoplay();
    setTimeout(() => setIsAnimating(false), 600);
  }, [isAnimating, currentIndex, startAutoplay]);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    let touchStartX = 0;
    const handleTouchStart = (e: TouchEvent) => {
      touchStartX = e.changedTouches[0].screenX;
    };
    const handleTouchEnd = (e: TouchEvent) => {
      const diff = touchStartX - e.changedTouches[0].screenX;
      if (Math.abs(diff) > 50) {
        navigate(diff > 0 ? 1 : -1);
      }
    };

    el.addEventListener("touchstart", handleTouchStart, { passive: true });
    el.addEventListener("touchend", handleTouchEnd, { passive: true });
    return () => {
      el.removeEventListener("touchstart", handleTouchStart);
      el.removeEventListener("touchend", handleTouchEnd);
    };
  }, [navigate]);

  if (totalItems === 0) return null;

  return (
    <div className="w-full" data-testid="hero-coverflow-gallery">
      <div
        ref={containerRef}
        className="coverflow-container"
        style={{ perspective: "1200px" }}
      >
        <div className="coverflow-track">
          {items.map((item, index) => {
            let offset = index - currentIndex;
            if (offset > totalItems / 2) offset -= totalItems;
            else if (offset < -totalItems / 2) offset += totalItems;

            const absOffset = Math.abs(offset);
            const sign = Math.sign(offset);

            const translateX = offset * 200;
            const translateZ = -absOffset * 180;
            const rotateY = -sign * Math.min(absOffset * 55, 55);
            const opacity = absOffset > 3 ? 0 : 1 - absOffset * 0.2;
            const scale = 1 - absOffset * 0.08;
            const finalTranslateX = absOffset > 3 ? sign * 700 : translateX;

            return (
              <div
                key={item.competitionId}
                className="coverflow-item"
                style={{
                  transform: `translateX(${finalTranslateX}px) translateZ(${translateZ}px) rotateY(${rotateY}deg) scale(${scale})`,
                  opacity,
                  zIndex: 100 - absOffset,
                }}
                onClick={(e) => {
                  if (index !== currentIndex) {
                    e.preventDefault();
                    goToIndex(index);
                  }
                }}
                data-testid={`gallery-item-${item.competitionId}`}
              >
                <Link href={`/${slugify(item.category)}/${slugify(item.competitionTitle)}`}>
                  <div className="coverflow-cover">
                    {item.videoEmbedUrl && index === currentIndex ? (
                      <>
                        <iframe
                          src={item.videoEmbedUrl}
                          className="w-full h-full"
                          allow="autoplay; fullscreen"
                          frameBorder="0"
                          title={item.competitionTitle}
                          style={{ pointerEvents: "none" }}
                        />
                        <div className="absolute inset-0 z-10" />
                      </>
                    ) : (
                      <img
                        src={item.thumbnail || "/images/template/bg-1.jpg"}
                        alt={item.competitionTitle}
                        className="w-full h-full object-cover"
                        loading="lazy"
                      />
                    )}
                    <div className="coverflow-label">
                      <span className="coverflow-label-title">{item.competitionTitle}</span>
                      {item.topContestantName && (
                        <span className="coverflow-label-sub">{item.topContestantName}</span>
                      )}
                    </div>
                  </div>
                  <div className="coverflow-reflection" />
                </Link>
              </div>
            );
          })}
        </div>

        <button
          className="coverflow-nav coverflow-nav-prev"
          onClick={(e) => { e.stopPropagation(); navigate(-1); }}
          data-testid="gallery-nav-prev"
        >
          &#8249;
        </button>
        <button
          className="coverflow-nav coverflow-nav-next"
          onClick={(e) => { e.stopPropagation(); navigate(1); }}
          data-testid="gallery-nav-next"
        >
          &#8250;
        </button>

        <div className="coverflow-dots">
          {items.map((_, index) => (
            <button
              key={index}
              className={`coverflow-dot ${index === currentIndex ? "active" : ""}`}
              onClick={() => goToIndex(index)}
              data-testid={`gallery-dot-${index}`}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
