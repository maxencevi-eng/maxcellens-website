import type { Metadata } from 'next';
import { fetchProjectBySlug } from '../../../lib/helpers';
import VideoPlayer from '../../../components/VideoPlayer/VideoPlayer';
import Image from 'next/image';
import type { Project } from '../../../types';

type Params = { params: { slug: string } };

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const project = await fetchProjectBySlug(params.slug);
  if (!project) return { title: 'Projet introuvable' };
  return {
    title: project.title,
    description: project.description || undefined,
    openGraph: {
      title: project.title,
      description: project.description || undefined,
      images: project.image_url ? [project.image_url] : undefined,
    },
  };
}

export default async function ProjectPage({ params }: Params) {
  const project: Project | null = await fetchProjectBySlug(params.slug);
  if (!project) return <p>Projet introuvable</p>;

  return (
    <article className="py-12">
      <div className="container">
        <h1 className="text-2xl font-bold mb-4">{project.title}</h1>
        <p className="mb-6 text-slate-600">{project.description}</p>
        {project.type === 'video' && project.video_url ? (
          <VideoPlayer src={project.video_url} poster={project.image_url} />
        ) : (
          <div className="w-full max-w-3xl">
            <Image src={project.image_url} alt={project.title} width={project.width || 1200} height={project.height || 800} className="rounded" />
          </div>
        )}
      </div>
    </article>
  );
}
