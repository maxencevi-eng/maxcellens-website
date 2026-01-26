import PageHeader from '../PageHeader/PageHeader';

type Props = { initialBg?: string; page?: string; alt?: string };

export default function ContactHeaderEditor({ initialBg, page = 'contact', alt = '' }: Props) {
  const bg = initialBg;

  return (
    <>
      <PageHeader page="contact" title="Contact" subtitle="Contactez-nous pour vos projets photo & vidéo" bgImage={bg} />
    </>
  );
}
