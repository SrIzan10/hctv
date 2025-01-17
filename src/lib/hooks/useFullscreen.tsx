import { useState } from "react";

export default function useFullscreen(ref: React.RefObject<HTMLElement>) {
  const [isFullscreen, setIsFullscreen] = useState(false);

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      ref.current?.requestFullscreen();
      setIsFullscreen(true);
    } else {
      document.exitFullscreen();
      setIsFullscreen(false);
    }
  };

  return { isFullscreen, toggleFullscreen };
}