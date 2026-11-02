import type { Mode } from "../../stores/uiStore";

const CONTENT: Record<Mode, { title: string; description: string }> = {
  assets: {
    title: "Asset Library",
    description: "Kelola gambar, video, dan audio untuk project ini. Panel aset akan tersedia pada milestone berikutnya.",
  },
  storyboard: {
    title: "Storyboard",
    description: "Susun urutan scene dan overlay sebelum masuk ke editor. Storyboard sedang disiapkan.",
  },
  editor: {
    title: "Editor",
    description: "Workspace editor belum tersedia.",
  },
};

interface ModePlaceholderProps {
  mode: Mode;
}

export function ModePlaceholder({ mode }: ModePlaceholderProps) {
  const content = CONTENT[mode];

  return (
    <section className="placeholder" aria-live="polite">
      <div>
        <h2>{content.title}</h2>
        <p>{content.description}</p>
      </div>
    </section>
  );
}
