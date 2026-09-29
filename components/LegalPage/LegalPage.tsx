import styles from './LegalPage.module.css';

interface LegalSection {
  title: string;
  content: string[];
}

interface LegalPageProps {
  title: string;
  intro: string;
  sections: LegalSection[];
}

export default function LegalPage({ title, intro, sections }: LegalPageProps) {
  return (
    <div className={styles.wrapper}>
      <div className={styles.container}>
        <header className={styles.header}>
          <p className={`${styles.eyebrow} style-h5`}>Informations légales</p>
          <h1 className={`${styles.title} style-h2`}>{title}</h1>
          <p className={styles.intro}>{intro}</p>
        </header>

        <div className={styles.content}>
          {sections.map((section, i) => (
            <section key={i} className={styles.section}>
              <h2 className={`${styles.sectionTitle} style-h5`}>{section.title}</h2>
              <div className={styles.sectionBody}>
                {section.content.map((line, j) => (
                  <p key={j} dangerouslySetInnerHTML={{ __html: line }} />
                ))}
              </div>
            </section>
          ))}
        </div>
      </div>
    </div>
  );
}
