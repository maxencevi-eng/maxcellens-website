'use client';

import React from 'react';

type Props = {
  src: string;
  poster?: string;
  controls?: boolean;
};

export default function VideoPlayer({ src, poster, controls = true }: Props) {
  return (
    <div className="w-full">
      <video
        src={src}
        poster={poster}
        controls={controls}
        preload="metadata"
        className="w-full rounded bg-black"
        playsInline
      />
    </div>
  );
}
