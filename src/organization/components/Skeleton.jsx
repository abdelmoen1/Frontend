import "../styles/Skeleton.css";

// كتلة هيكلية واحدة بأبعاد قابلة للتخصيص
export function Skeleton({ width = "100%", height = 14, radius = 6, className = "" }) {
  return (
    <span
      className={`sk ${className}`}
      style={{ width, height, borderRadius: radius }}
      aria-hidden="true"
    />
  );
}

// غلاف يعلن حالة التحميل لقارئات الشاشة ويخفي الأشكال نفسها
export function SkeletonGroup({ label = "جارٍ التحميل", className = "", children }) {
  return (
    <div className={className} role="status" aria-busy="true" aria-label={label}>
      {children}
    </div>
  );
}
